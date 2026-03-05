import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { FilterProjectDto } from './dto/filter-project.dto';
import { getPagination, createPaginationResult } from '../../common/utils/pagination.util';
import { UserRole, ProjectStatus } from '@prisma/client';

@Injectable()
export class ProjectsService {
    constructor(private prisma: PrismaService) { }

    async create(dto: CreateProjectDto, userId: string, userRole: UserRole) {
        const picId = userRole === UserRole.LEVEL_3 ? userId : dto.pic_user_id;
        return this.prisma.project.create({
            data: {
                name: dto.name, working_folder: dto.working_folder, update_notes: dto.update_notes,
                due_date: new Date(dto.due_date), status: dto.status || 'TO_DO_NEXT',
                month: dto.month, year: dto.year, client: dto.client,
                keterangan: dto.keterangan, document_url: dto.document_url, pic_user_id: picId,
            },
            include: { pic: { select: { id: true, full_name: true } } },
        });
    }

    async findAll(filter: FilterProjectDto) {
        const { skip, take, page, limit } = getPagination(filter.page, filter.limit);
        const where: any = { deleted_at: null };
        if (filter.pic_user_id) where.pic_user_id = filter.pic_user_id;
        if (filter.status) where.status = filter.status;
        if (filter.month) where.month = filter.month;
        if (filter.year) where.year = filter.year;
        if (filter.search) where.name = { contains: filter.search, mode: 'insensitive' };

        const [data, total] = await Promise.all([
            this.prisma.project.findMany({
                where, skip, take, orderBy: { due_date: 'asc' },
                include: {
                    pic: { select: { id: true, full_name: true } },
                    _count: { select: { sub_projects: true, comments: true } },
                    risk_score: { select: { risk_score: true, risk_level: true, stagnation_score: true, pic_history_score: true, complexity_score: true, timeline_score: true } },
                },
            }),
            this.prisma.project.count({ where }),
        ]);
        return createPaginationResult(data, total, page, limit);
    }

    async findOne(id: string) {
        const project = await this.prisma.project.findFirst({
            where: { id, deleted_at: null },
            include: {
                pic: { select: { id: true, full_name: true } },
                sub_projects: {
                    include: { pic: { select: { id: true, full_name: true } } },
                    orderBy: { due_date: 'asc' },
                },
                reviews: {
                    include: { reviewer: { select: { id: true, full_name: true } } },
                    orderBy: { reviewed_at: 'desc' },
                },
                risk_score: true,
            },
        });
        if (!project) throw new NotFoundException('Project tidak ditemukan');
        return project;
    }

    async update(id: string, dto: UpdateProjectDto, userId: string, userRole: UserRole) {
        const project = await this.prisma.project.findFirst({ where: { id, deleted_at: null } });
        if (!project) throw new NotFoundException('Project tidak ditemukan');
        if (userRole === UserRole.LEVEL_3 && project.pic_user_id !== userId) {
            throw new ForbiddenException('Anda hanya bisa mengedit project milik sendiri');
        }
        const data: any = { ...dto };
        if (dto.due_date) data.due_date = new Date(dto.due_date);
        return this.prisma.project.update({
            where: { id }, data,
            include: { pic: { select: { id: true, full_name: true } } },
        });
    }

    async startWorking(id: string, userId: string) {
        const project = await this.prisma.project.findFirst({ where: { id, deleted_at: null } });
        if (!project) throw new NotFoundException('Project tidak ditemukan');
        if (project.pic_user_id !== userId) throw new ForbiddenException('Hanya PIC yang bisa memulai pengerjaan');
        const allowed: ProjectStatus[] = [ProjectStatus.TO_DO_NEXT, ProjectStatus.REVISI];
        if (!allowed.includes(project.status)) throw new BadRequestException('Status tidak valid untuk memulai');
        return this.prisma.project.update({
            where: { id }, data: { status: ProjectStatus.ON_GOING },
            include: { pic: { select: { id: true, full_name: true } } },
        });
    }

    async remove(id: string, userId: string, userRole: UserRole) {
        const project = await this.prisma.project.findFirst({ where: { id, deleted_at: null } });
        if (!project) throw new NotFoundException('Project tidak ditemukan');
        if (userRole === UserRole.LEVEL_3 && project.pic_user_id !== userId) {
            throw new ForbiddenException('Anda hanya bisa menghapus project milik sendiri');
        }
        return this.prisma.project.update({ where: { id }, data: { deleted_at: new Date() } });
    }

    // ========== KALENDER (2.1) ==========

    async getCalendarView(year: number, month: number | undefined, userId: string, userRole: UserRole) {
        const startDate = month
            ? new Date(year, month - 1, 1)
            : new Date(year, 0, 1);
        const endDate = month
            ? new Date(year, month, 0, 23, 59, 59)
            : new Date(year, 11, 31, 23, 59, 59);

        const where: any = {
            deleted_at: null,
            due_date: { gte: startDate, lte: endDate },
            status: { notIn: [ProjectStatus.CANCELLED] },
        };
        if (userRole === UserRole.LEVEL_3) where.pic_user_id = userId;

        const projects = await this.prisma.project.findMany({
            where,
            include: {
                pic: { select: { full_name: true } },
                sub_projects: { select: { name: true, due_date: true } },
            },
        });

        return projects.map((p) => ({
            id: p.id, title: p.name,
            start: p.due_date.toISOString().split('T')[0],
            end: p.due_date.toISOString().split('T')[0],
            color: p.color_tag || this.getStatusColor(p.status),
            extendedProps: {
                status: p.status, pic_name: p.pic.full_name,
                client: p.client, sub_count: p.sub_projects.length,
            },
        }));
    }

    async reschedule(id: string, newDueDate: string) {
        const project = await this.prisma.project.findFirst({ where: { id, deleted_at: null } });
        if (!project) throw new NotFoundException('Project tidak ditemukan');
        return this.prisma.project.update({
            where: { id },
            data: { due_date: new Date(newDueDate), status: ProjectStatus.RESCHEDULED },
        });
    }

    // ========== BOARD VIEW / KANBAN (3.1) ==========

    async getBoardView(userId: string, userRole: UserRole, query: any) {
        const where: any = { deleted_at: null };
        if (userRole === UserRole.LEVEL_3) where.pic_user_id = userId;
        if (query?.month) where.month = Number(query.month);
        if (query?.year) where.year = Number(query.year);

        const projects = await this.prisma.project.findMany({
            where,
            include: {
                pic: { select: { id: true, full_name: true } },
                _count: { select: { sub_projects: true, comments: true } },
            },
            orderBy: [{ board_order: 'asc' }, { due_date: 'asc' }],
        });

        const statusOrder = ['TO_DO_NEXT', 'ON_GOING', 'NEED_FOLLOW_UP', 'REVISI', 'RESCHEDULED', 'FINISHED', 'CANCELLED'];
        return statusOrder.map((status) => ({
            id: status,
            title: this.getStatusLabel(status),
            color: this.getStatusColor(status),
            projects: projects.filter((p) => p.status === status),
            count: projects.filter((p) => p.status === status).length,
        }));
    }

    async reorderBoard(dto: any) {
        const updates = [
            this.prisma.project.update({
                where: { id: dto.projectId },
                data: { status: dto.newStatus as ProjectStatus, board_order: dto.newOrder },
            }),
            ...(dto.affectedItems || []).map((item: any) =>
                this.prisma.project.update({ where: { id: item.id }, data: { board_order: item.newOrder } }),
            ),
        ];
        return this.prisma.$transaction(updates);
    }

    // ========== AT-RISK PROJECTS (4.1) ==========

    async getAtRiskProjects(minLevel: string = 'HIGH') {
        const levels = minLevel === 'CRITICAL' ? ['CRITICAL'] : ['HIGH', 'CRITICAL'];
        return this.prisma.projectRiskScore.findMany({
            where: { risk_level: { in: levels } },
            include: { project: { include: { pic: { select: { full_name: true } } } } },
            orderBy: { risk_score: 'desc' },
            take: 10,
        });
    }

    // ========== HELPERS ==========

    private getStatusColor(status: string): string {
        const map: Record<string, string> = {
            FINISHED: '#52c41a', ON_GOING: '#1677ff', TO_DO_NEXT: '#8c8c8c',
            NEED_FOLLOW_UP: '#fa8c16', CANCELLED: '#ff4d4f', RESCHEDULED: '#722ed1', REVISI: '#eb2f96',
        };
        return map[status] || '#0D2B6B';
    }

    private getStatusLabel(status: string): string {
        const map: Record<string, string> = {
            FINISHED: 'Selesai', ON_GOING: 'Sedang Berjalan', TO_DO_NEXT: 'Akan Dikerjakan',
            NEED_FOLLOW_UP: 'Perlu Follow Up', CANCELLED: 'Dibatalkan',
            RESCHEDULED: 'Dijadwalkan Ulang', REVISI: 'Revisi',
        };
        return map[status] || status;
    }
}
