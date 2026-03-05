import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationType, UserRole } from '@prisma/client';

@Injectable()
export class NotificationsService {
    constructor(private prisma: PrismaService) { }

    async findUserNotifications(userId: string) {
        return this.prisma.notification.findMany({
            where: { user_id: userId },
            orderBy: { created_at: 'desc' },
            take: 50,
        });
    }

    async markAsRead(id: string) {
        return this.prisma.notification.update({
            where: { id },
            data: { is_read: true },
        });
    }

    async markAllAsRead(userId: string) {
        return this.prisma.notification.updateMany({
            where: { user_id: userId, is_read: false },
            data: { is_read: true },
        });
    }

    async getUnreadCount(userId: string) {
        return this.prisma.notification.count({
            where: { user_id: userId, is_read: false },
        });
    }

    async create(data: {
        user_id: string;
        type: NotificationType;
        title: string;
        message: string;
        project_id?: string;
    }) {
        return this.prisma.notification.create({ data });
    }

    /**
     * Buat notifikasi review ke target yang tepat:
     * - REVIEW_REQUESTED → semua Kabid (Level 2)
     * - REVIEW_TO_KADIV → semua Kadiv/Sesper (Level 1)
     * - REVIEW_APPROVED → PIC (Staff)
     * - REVIEW_REVISION → PIC (Staff)
     */
    async createReviewNotification(projectId: string, type: string, customMessage?: string) {
        const project = await this.prisma.project.findUnique({
            where: { id: projectId },
            include: { pic: true },
        });

        if (!project) return;

        const notifType = type as NotificationType;
        let targetUsers: { id: string }[] = [];
        let title = '';
        let message = customMessage || '';

        switch (type) {
            case 'REVIEW_REQUESTED':
                // Staff ajukan review → notif ke semua Kabid (Level 2) + SuperUser
                targetUsers = await this.prisma.user.findMany({
                    where: { role: { in: [UserRole.LEVEL_2, UserRole.SUPER_USER] }, is_active: true },
                    select: { id: true },
                });
                title = '📋 Review Baru Diajukan';
                if (!message) message = `${project.pic.full_name} mengajukan review untuk project "${project.name}"`;
                break;

            case 'REVIEW_TO_KADIV':
                // Kabid approve → notif ke Kadiv/Sesper (Level 1) + SuperUser
                targetUsers = await this.prisma.user.findMany({
                    where: { role: { in: [UserRole.LEVEL_1, UserRole.SUPER_USER] }, is_active: true },
                    select: { id: true },
                });
                title = '📋 Review Menunggu Persetujuan Akhir';
                if (!message) message = `Project "${project.name}" menunggu persetujuan dari Kadiv/Sesper`;
                break;

            case 'REVIEW_APPROVED':
                // Kadiv approve → notif ke PIC Staff
                targetUsers = [{ id: project.pic_user_id }];
                title = '✅ Project Disetujui';
                if (!message) message = `Project "${project.name}" telah disetujui dan berstatus FINISHED`;
                break;

            case 'REVIEW_REVISION':
                // Kabid/Kadiv revise → notif ke PIC Staff
                targetUsers = [{ id: project.pic_user_id }];
                title = '🔄 Project Perlu Revisi';
                if (!message) message = `Project "${project.name}" dikembalikan untuk direvisi`;
                break;
        }

        // Buat notifikasi untuk setiap target user
        const notifications = targetUsers.map(user =>
            this.create({
                user_id: user.id,
                type: notifType,
                title,
                message,
                project_id: projectId,
            })
        );

        await Promise.all(notifications);
    }

    async createDueDateReminder(projectId: string, picUserId: string, projectName: string, dueDate: Date) {
        await this.create({
            user_id: picUserId,
            type: NotificationType.DUE_DATE_REMINDER,
            title: '⏰ Peringatan Due Date H-3',
            message: `Project "${projectName}" akan jatuh tempo pada ${dueDate.toLocaleDateString('id-ID')}`,
            project_id: projectId,
        });
    }
}
