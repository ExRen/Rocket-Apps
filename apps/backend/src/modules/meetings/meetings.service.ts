import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ActionItemStatus, ProjectStatus } from '@prisma/client';

@Injectable()
export class MeetingsService {
    constructor(private prisma: PrismaService) { }

    async findAll() {
        return this.prisma.meeting.findMany({
            include: { created_by: { select: { full_name: true } }, _count: { select: { action_items: true } } },
            orderBy: { meeting_date: 'desc' },
        });
    }

    async findOne(id: string) {
        return this.prisma.meeting.findUniqueOrThrow({
            where: { id },
            include: {
                created_by: { select: { full_name: true } },
                action_items: {
                    include: {
                        assignee: { select: { id: true, full_name: true } },
                        converted_project: { select: { id: true, name: true, status: true } },
                        converted_by: { select: { full_name: true } },
                    },
                    orderBy: { created_at: 'asc' },
                },
            },
        });
    }

    async create(dto: any, creatorId: string) {
        return this.prisma.meeting.create({
            data: {
                title: dto.title, meeting_date: new Date(dto.meeting_date), location: dto.location,
                attendees: dto.attendees || [], summary: dto.summary, minutes_url: dto.minutes_url,
                created_by_id: creatorId,
                action_items: {
                    create: (dto.action_items || []).map((item: any) => ({
                        description: item.description, due_date: new Date(item.due_date),
                        assignee_id: item.assignee_id, status: ActionItemStatus.OPEN,
                    })),
                },
            },
            include: { action_items: { include: { assignee: { select: { full_name: true } } } } },
        });
    }

    async update(id: string, dto: any) {
        return this.prisma.meeting.update({
            where: { id },
            data: { title: dto.title, meeting_date: dto.meeting_date ? new Date(dto.meeting_date) : undefined, location: dto.location, summary: dto.summary, attendees: dto.attendees, minutes_url: dto.minutes_url },
        });
    }

    async addActionItem(meetingId: string, dto: any) {
        return this.prisma.actionItem.create({
            data: { meeting_id: meetingId, description: dto.description, due_date: new Date(dto.due_date), assignee_id: dto.assignee_id },
            include: { assignee: { select: { full_name: true } } },
        });
    }

    async updateActionItem(id: string, dto: any) {
        return this.prisma.actionItem.update({ where: { id }, data: dto });
    }

    async convertToProject(actionItemId: string, dto: any, userId: string) {
        const item = await this.prisma.actionItem.findUniqueOrThrow({ where: { id: actionItemId }, include: { meeting: true } });
        if (item.converted_project_id) throw new BadRequestException('Action item sudah dikonversi ke project');

        return this.prisma.$transaction(async (tx) => {
            const dueDate = new Date(item.due_date);
            const project = await tx.project.create({
                data: {
                    name: dto.project_name || item.description.substring(0, 100),
                    due_date: dueDate, status: ProjectStatus.TO_DO_NEXT,
                    month: dueDate.getMonth() + 1, year: dueDate.getFullYear(),
                    pic_user_id: item.assignee_id,
                    keterangan: `Dari action item rapat: ${item.meeting.title}`,
                },
            });

            await tx.actionItem.update({
                where: { id: actionItemId },
                data: { status: ActionItemStatus.IN_PROGRESS, converted_project_id: project.id, converted_at: new Date(), converted_by_id: userId },
            });

            return project;
        });
    }

    async remove(id: string) {
        return this.prisma.meeting.delete({ where: { id } });
    }
}
