import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class SearchService {
    constructor(private prisma: PrismaService) { }

    async globalSearch(query: string, userId: string, userRole: UserRole) {
        if (!query || query.trim().length < 2) {
            return { projects: [], comments: [], total: 0 };
        }

        const searchTerms = query.trim().split(/\s+/);
        const likePatterns = searchTerms.map((t) => `%${t}%`);

        // Search projects using ILIKE (works without tsvector setup)
        const roleFilter = userRole === UserRole.LEVEL_3 ? { pic_user_id: userId } : {};

        const projects = await this.prisma.project.findMany({
            where: {
                deleted_at: null,
                ...roleFilter,
                OR: searchTerms.flatMap((term) => [
                    { name: { contains: term, mode: 'insensitive' as any } },
                    { update_notes: { contains: term, mode: 'insensitive' as any } },
                    { client: { contains: term, mode: 'insensitive' as any } },
                    { keterangan: { contains: term, mode: 'insensitive' as any } },
                ]),
            },
            include: { pic: { select: { id: true, full_name: true } } },
            take: 10,
            orderBy: { updated_at: 'desc' },
        });

        // Search comments
        const comments = await this.prisma.projectComment.findMany({
            where: {
                OR: searchTerms.map((term) => ({
                    message: { contains: term, mode: 'insensitive' as any },
                })),
                project: { deleted_at: null },
            },
            include: {
                author: { select: { id: true, full_name: true } },
                project: { select: { id: true, name: true } },
            },
            take: 10,
            orderBy: { created_at: 'desc' },
        });

        return {
            projects: projects.map((p) => ({
                id: p.id, name: p.name, status: p.status, due_date: p.due_date,
                pic_name: p.pic.full_name, type: 'project',
            })),
            comments: comments.map((c) => ({
                id: c.id, message: c.message.substring(0, 120), project_id: c.project.id,
                project_name: c.project.name, author_name: c.author.full_name, type: 'comment',
            })),
            total: projects.length + comments.length,
        };
    }
}
