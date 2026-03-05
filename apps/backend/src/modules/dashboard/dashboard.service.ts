import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AnggaranService } from '../anggaran/anggaran.service';
import { ProjectStatus, UserRole } from '@prisma/client';

@Injectable()
export class DashboardService {
    constructor(
        private prisma: PrismaService,
        private anggaranService: AnggaranService,
    ) { }

    async getDashboardData(userId: string, userRole: UserRole) {
        const currentYear = new Date().getFullYear();
        const baseWhere: any = { deleted_at: null };
        if (userRole === UserRole.LEVEL_3) baseWhere.pic_user_id = userId;

        const [projectsByStatus, projectsByPic, upcomingDeadlines, serapanAnggaran, totalProjects, riskSummary] =
            await Promise.all([
                this.prisma.project.groupBy({ by: ['status'], where: baseWhere, _count: { id: true } }),
                this.prisma.project.groupBy({ by: ['pic_user_id'], where: baseWhere, _count: { id: true } }),
                this.prisma.project.findMany({
                    where: {
                        ...baseWhere,
                        status: { notIn: [ProjectStatus.FINISHED, ProjectStatus.CANCELLED] },
                        due_date: { gte: new Date() },
                    },
                    orderBy: { due_date: 'asc' }, take: 5,
                    include: { pic: { select: { id: true, full_name: true } } },
                }),
                this.anggaranService.getSerapanPerPos(currentYear),
                this.prisma.project.count({ where: baseWhere }),
                this.prisma.projectRiskScore.groupBy({ by: ['risk_level'], _count: { id: true } }),
            ]);

        const picIds = projectsByPic.map((p) => p.pic_user_id);
        const picUsers = await this.prisma.user.findMany({
            where: { id: { in: picIds } }, select: { id: true, full_name: true },
        });

        return {
            projectsByStatus: projectsByStatus.map((p) => ({ status: p.status, count: p._count.id })),
            projectsByPic: projectsByPic.map((p) => ({
                pic_user_id: p.pic_user_id,
                full_name: picUsers.find((u) => u.id === p.pic_user_id)?.full_name || 'Unknown',
                count: p._count.id,
            })),
            upcomingDeadlines,
            serapanAnggaran,
            totalProjects,
            riskSummary: riskSummary.reduce((acc, r) => {
                acc[r.risk_level.toLowerCase()] = r._count.id;
                return acc;
            }, {} as Record<string, number>),
        };
    }

    // ========== EXECUTIVE DASHBOARD (4.2) ==========

    async getExecDashboard() {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;

        const [
            totalActive, totalFinished, totalCancelled,
            statusBreakdown, monthlyTrend, riskBreakdown,
            overdueCount, topPerformers,
        ] = await Promise.all([
            this.prisma.project.count({
                where: {
                    deleted_at: null,
                    status: { in: [ProjectStatus.ON_GOING, ProjectStatus.TO_DO_NEXT, ProjectStatus.NEED_FOLLOW_UP, ProjectStatus.REVISI] },
                },
            }),
            this.prisma.project.count({
                where: { deleted_at: null, status: ProjectStatus.FINISHED, year: currentYear },
            }),
            this.prisma.project.count({
                where: { deleted_at: null, status: ProjectStatus.CANCELLED, year: currentYear },
            }),
            this.prisma.project.groupBy({
                by: ['status'],
                where: { deleted_at: null, year: currentYear },
                _count: { id: true },
            }),
            this.prisma.project.groupBy({
                by: ['month'],
                where: { deleted_at: null, year: currentYear, status: ProjectStatus.FINISHED },
                _count: { id: true },
            }),
            this.prisma.projectRiskScore.groupBy({
                by: ['risk_level'],
                _count: { id: true },
            }),
            this.prisma.project.count({
                where: {
                    deleted_at: null,
                    due_date: { lt: now },
                    status: { notIn: [ProjectStatus.FINISHED, ProjectStatus.CANCELLED] },
                },
            }),
            this.prisma.picHistoricalStats.findMany({
                include: { user: { select: { full_name: true, role: true } } },
                orderBy: { total_completed: 'desc' },
                take: 5,
            }),
        ]);

        const completionRate = (totalActive + totalFinished) > 0
            ? Math.round((totalFinished / (totalActive + totalFinished)) * 100)
            : 0;

        return {
            summary: { totalActive, totalFinished, totalCancelled, overdueCount, completionRate },
            statusBreakdown: statusBreakdown.map((s) => ({ status: s.status, count: s._count.id })),
            monthlyTrend: Array.from({ length: 12 }, (_, i) => ({
                month: i + 1,
                completed: monthlyTrend.find((m) => m.month === i + 1)?._count.id || 0,
            })),
            riskBreakdown: riskBreakdown.reduce((acc, r) => {
                acc[r.risk_level.toLowerCase()] = r._count.id;
                return acc;
            }, {} as Record<string, number>),
            topPerformers,
        };
    }
}
