import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class CommentsService {
    constructor(private prisma: PrismaService) { }

    async findAllByProject(projectId: string) {
        return this.prisma.projectComment.findMany({
            where: { project_id: projectId, parent_id: null },
            include: {
                author: { select: { id: true, full_name: true, role: true } },
                replies: {
                    include: {
                        author: { select: { id: true, full_name: true, role: true } },
                    },
                    orderBy: { created_at: 'asc' },
                },
            },
            orderBy: { created_at: 'asc' },
        });
    }

    async create(projectId: string, authorId: string, dto: CreateCommentDto) {
        const project = await this.prisma.project.findFirst({
            where: { id: projectId, deleted_at: null },
        });
        if (!project) throw new NotFoundException('Project tidak ditemukan');

        const comment = await this.prisma.projectComment.create({
            data: {
                project_id: projectId,
                author_id: authorId,
                message: dto.message,
                parent_id: dto.parent_id || null,
            },
            include: {
                author: { select: { id: true, full_name: true, role: true } },
            },
        });

        // Kirim notifikasi ke PIC jika yang komen bukan PIC
        if (project.pic_user_id !== authorId) {
            await this.prisma.notification.create({
                data: {
                    user_id: project.pic_user_id,
                    type: 'NEW_COMMENT',
                    title: '💬 Komentar Baru',
                    message: `${comment.author.full_name} mengomentari project "${project.name}"`,
                    project_id: projectId,
                },
            });
        }

        return comment;
    }

    async remove(commentId: string, userId: string, userRole: UserRole) {
        const comment = await this.prisma.projectComment.findUnique({
            where: { id: commentId },
        });
        if (!comment) throw new NotFoundException('Komentar tidak ditemukan');

        const canDelete = comment.author_id === userId ||
            ([UserRole.SUPER_USER, UserRole.LEVEL_1, UserRole.LEVEL_2] as UserRole[]).includes(userRole);

        if (!canDelete) {
            throw new ForbiddenException('Anda tidak bisa menghapus komentar ini');
        }

        return this.prisma.projectComment.delete({ where: { id: commentId } });
    }
}
