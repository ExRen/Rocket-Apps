import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSubProjectDto } from './dto/create-sub-project.dto';
import { UpdateSubProjectDto } from './dto/update-sub-project.dto';

@Injectable()
export class SubProjectsService {
    constructor(private prisma: PrismaService) { }

    async findAll(projectId: string) {
        await this.validateProject(projectId);
        return this.prisma.subProject.findMany({
            where: { project_id: projectId },
            include: { pic: { select: { id: true, full_name: true } } },
            orderBy: { due_date: 'asc' },
        });
    }

    async create(projectId: string, dto: CreateSubProjectDto) {
        await this.validateProject(projectId);
        return this.prisma.subProject.create({
            data: {
                name: dto.name,
                due_date: new Date(dto.due_date),
                status: dto.status || 'TO_DO_NEXT',
                update_notes: dto.update_notes,
                keterangan: dto.keterangan,
                project_id: projectId,
                pic_user_id: dto.pic_user_id,
            },
            include: { pic: { select: { id: true, full_name: true } } },
        });
    }

    async update(projectId: string, id: string, dto: UpdateSubProjectDto) {
        await this.validateProject(projectId);
        const sub = await this.prisma.subProject.findFirst({ where: { id, project_id: projectId } });
        if (!sub) throw new NotFoundException('Sub project tidak ditemukan');

        const data: any = { ...dto };
        if (dto.due_date) data.due_date = new Date(dto.due_date);

        return this.prisma.subProject.update({
            where: { id },
            data,
            include: { pic: { select: { id: true, full_name: true } } },
        });
    }

    async remove(projectId: string, id: string) {
        await this.validateProject(projectId);
        const sub = await this.prisma.subProject.findFirst({ where: { id, project_id: projectId } });
        if (!sub) throw new NotFoundException('Sub project tidak ditemukan');
        return this.prisma.subProject.delete({ where: { id } });
    }

    private async validateProject(projectId: string) {
        const project = await this.prisma.project.findFirst({
            where: { id: projectId, deleted_at: null },
        });
        if (!project) throw new NotFoundException('Project induk tidak ditemukan');
    }
}
