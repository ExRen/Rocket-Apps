import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProjectStatus } from '@prisma/client';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class RiskAnalysisService {
    constructor(private prisma: PrismaService) { }

    @Cron(CronExpression.EVERY_6_HOURS)
    async calculateAllRiskScores() {
        const projects = await this.prisma.project.findMany({
            where: {
                deleted_at: null,
                status: { notIn: [ProjectStatus.FINISHED, ProjectStatus.CANCELLED] },
            },
            include: {
                sub_projects: true,
                pic: { select: { id: true } },
                reviews: true,
            },
        });

        for (const project of projects) {
            const score = this.calculateRiskScore(project);
            await this.prisma.projectRiskScore.upsert({
                where: { project_id: project.id },
                update: { ...score, calculated_at: new Date() },
                create: { project_id: project.id, ...score },
            });
        }

        // Update PIC historical stats
        await this.updateHistoricalStats();
    }

    private calculateRiskScore(project: any) {
        const now = new Date();
        const dueDate = new Date(project.due_date);
        const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / 86400000);
        const createdDaysAgo = Math.ceil((now.getTime() - new Date(project.created_at).getTime()) / 86400000);
        const updatedDaysAgo = Math.ceil((now.getTime() - new Date(project.updated_at).getTime()) / 86400000);

        // Timeline Score (0-30): Semakin dekat deadline, semakin tinggi
        let timeline_score = 0;
        if (daysUntilDue <= 0) timeline_score = 30; // Sudah lewat
        else if (daysUntilDue <= 3) timeline_score = 25;
        else if (daysUntilDue <= 7) timeline_score = 20;
        else if (daysUntilDue <= 14) timeline_score = 10;

        // Stagnation Score (0-30): Semakin lama tidak update, semakin tinggi
        let stagnation_score = 0;
        if (updatedDaysAgo >= 14) stagnation_score = 30;
        else if (updatedDaysAgo >= 7) stagnation_score = 20;
        else if (updatedDaysAgo >= 3) stagnation_score = 10;

        // Complexity Score (0-20): Berdasarkan jumlah sub-project
        const subCount = project.sub_projects?.length || 0;
        let complexity_score = Math.min(subCount * 4, 20);

        // PIC History Score (0-20): Akan diisi dari historical stats
        let pic_history_score = 0;

        const risk_score = timeline_score + stagnation_score + complexity_score + pic_history_score;

        let risk_level = 'LOW';
        if (risk_score >= 70) risk_level = 'CRITICAL';
        else if (risk_score >= 50) risk_level = 'HIGH';
        else if (risk_score >= 30) risk_level = 'MEDIUM';

        return { risk_score, timeline_score, stagnation_score, complexity_score, pic_history_score, risk_level };
    }

    private async updateHistoricalStats() {
        const users = await this.prisma.user.findMany({
            where: { is_active: true },
            select: { id: true },
        });

        for (const user of users) {
            const completed = await this.prisma.project.count({
                where: { pic_user_id: user.id, status: ProjectStatus.FINISHED, deleted_at: null },
            });
            const rescheduled = await this.prisma.project.count({
                where: { pic_user_id: user.id, status: ProjectStatus.RESCHEDULED, deleted_at: null },
            });
            const total = completed + rescheduled;
            const rescheduleRate = total > 0 ? rescheduled / total : 0;

            await this.prisma.picHistoricalStats.upsert({
                where: { user_id: user.id },
                update: {
                    total_completed: completed,
                    total_rescheduled: rescheduled,
                    reschedule_rate: rescheduleRate,
                    last_updated: new Date(),
                },
                create: {
                    user_id: user.id,
                    total_completed: completed,
                    total_rescheduled: rescheduled,
                    reschedule_rate: rescheduleRate,
                },
            });
        }
    }

    async getRiskSummary() {
        const [critical, high, medium, low] = await Promise.all([
            this.prisma.projectRiskScore.count({ where: { risk_level: 'CRITICAL' } }),
            this.prisma.projectRiskScore.count({ where: { risk_level: 'HIGH' } }),
            this.prisma.projectRiskScore.count({ where: { risk_level: 'MEDIUM' } }),
            this.prisma.projectRiskScore.count({ where: { risk_level: 'LOW' } }),
        ]);
        return { critical, high, medium, low, total: critical + high + medium + low };
    }
}
