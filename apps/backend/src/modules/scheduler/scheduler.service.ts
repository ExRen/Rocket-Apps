import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ProjectStatus, UserRole } from '@prisma/client';
import { getDatePlusDays } from '../../common/utils/date.util';

@Injectable()
export class SchedulerService {
    private readonly logger = new Logger(SchedulerService.name);

    constructor(
        private prisma: PrismaService,
        private notificationsService: NotificationsService,
    ) { }

    /**
     * Customizable due date reminders — per user preference
     * Runs every day at 06:00 WIB
     */
    @Cron('0 6 * * *')
    async checkDueDateReminder() {
        this.logger.log('🔔 Running customizable due date reminder check...');

        // Get all user preferences
        const preferences = await this.prisma.userNotificationPreference.findMany({
            include: { user: true },
        });

        // Default preference users (not yet set)
        const usersWithPrefs = new Set(preferences.map((p) => p.user_id));
        const usersWithoutPrefs = await this.prisma.user.findMany({
            where: { is_active: true, id: { notIn: Array.from(usersWithPrefs) } },
        });

        // Combine: explicit + default (3 days before)
        const allPrefs = [
            ...preferences.map((p) => ({ userId: p.user_id, days: p.reminder_days_before, emailEnabled: p.email_notifications_enabled })),
            ...usersWithoutPrefs.map((u) => ({ userId: u.id, days: 3, emailEnabled: true })),
        ];

        for (const pref of allPrefs) {
            const reminderDate = getDatePlusDays(pref.days);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const projects = await this.prisma.project.findMany({
                where: {
                    deleted_at: null,
                    pic_user_id: pref.userId,
                    status: { notIn: [ProjectStatus.FINISHED, ProjectStatus.CANCELLED] },
                    due_date: { gte: today, lte: reminderDate },
                },
            });

            for (const project of projects) {
                const existingNotif = await this.prisma.notification.findFirst({
                    where: {
                        user_id: pref.userId,
                        project_id: project.id,
                        type: 'DUE_DATE_REMINDER',
                        created_at: { gte: today },
                    },
                });

                if (!existingNotif) {
                    await this.notificationsService.createDueDateReminder(
                        project.id, pref.userId, project.name, project.due_date,
                    );
                }
            }
        }

        this.logger.log('✅ Customizable reminder check completed');
    }

    /**
     * Workload snapshot — every day at 23:00 WIB
     * Captures jumlah project aktif per user untuk trend chart
     */
    @Cron('0 23 * * *')
    async captureWorkloadSnapshot() {
        this.logger.log('📊 Capturing workload snapshots...');

        const staff = await this.prisma.user.findMany({
            where: { is_active: true, role: UserRole.LEVEL_3 },
        });

        for (const user of staff) {
            const activeCount = await this.prisma.project.count({
                where: {
                    pic_user_id: user.id,
                    deleted_at: null,
                    status: { in: [ProjectStatus.ON_GOING, ProjectStatus.TO_DO_NEXT, ProjectStatus.NEED_FOLLOW_UP, ProjectStatus.REVISI] },
                },
            });

            await this.prisma.workloadSnapshot.create({
                data: { user_id: user.id, active_count: activeCount },
            });
        }

        this.logger.log('✅ Workload snapshots captured');
    }
}
