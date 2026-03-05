import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ActivityLogService {
    constructor(private prisma: PrismaService) { }

    async findByEntity(entityType: string, entityId: string) {
        return this.prisma.activityLog.findMany({
            where: { entity_type: entityType, entity_id: entityId },
            include: {
                user: { select: { id: true, full_name: true, role: true } },
            },
            orderBy: { created_at: 'desc' },
            take: 50,
        });
    }

    async findAll(query: { page?: number; limit?: number; entity_type?: string }) {
        const page = query.page || 1;
        const limit = query.limit || 20;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (query.entity_type) where.entity_type = query.entity_type;

        const [data, total] = await Promise.all([
            this.prisma.activityLog.findMany({
                where,
                include: {
                    user: { select: { id: true, full_name: true, role: true } },
                },
                orderBy: { created_at: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.activityLog.count({ where }),
        ]);

        return { data, meta: { total, page, limit } };
    }

    async createLog(data: {
        user_id: string;
        entity_type: string;
        entity_id: string;
        action: string;
        old_value?: any;
        new_value?: any;
        description?: string;
    }) {
        return this.prisma.activityLog.create({ data });
    }
}
