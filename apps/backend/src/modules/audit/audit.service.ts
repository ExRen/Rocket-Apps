import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProjectStatus, ReviewStatus, AuditAnomalyType } from '@prisma/client';

@Injectable()
export class AuditService {
    private readonly logger = new Logger(AuditService.name);

    constructor(private prisma: PrismaService) { }

    // --- Anomaly Detection ---
    async detectAnomalies() {
        const anomalies: any[] = [];
        const threshold = new Date('2025-01-01');

        // 1: FINISHED without approval
        const noApproval = await this.prisma.project.findMany({
            where: { status: ProjectStatus.FINISHED, deleted_at: null, created_at: { gte: threshold }, reviews: { none: { status: ReviewStatus.APPROVED } } },
        });
        noApproval.forEach((p) => anomalies.push({
            type: AuditAnomalyType.PROJECT_NO_APPROVAL_DOC, description: `Project "${p.name}" FINISHED tanpa persetujuan formal`,
            entity_type: 'Project', entity_id: p.id, severity: 'HIGH',
        }));

        // 2: Large realisasi without docs
        const largRealisasi = await this.prisma.realisasiAnggaran.findMany({
            where: { jumlah: { gte: 10000000 }, dokumen_url: null },
            include: { anggaran_pos: { select: { nama_pos: true } } },
        });
        largRealisasi.forEach((r) => anomalies.push({
            type: AuditAnomalyType.LARGE_REALISASI_NO_DOCS,
            description: `Realisasi Rp ${Number(r.jumlah).toLocaleString('id-ID')} untuk "${r.kegiatan}" tanpa dokumen`,
            entity_type: 'RealisasiAnggaran', entity_id: r.id, severity: 'HIGH',
        }));

        // 3: Stale projects (ON_GOING >90 days without update)
        const staleDate = new Date(); staleDate.setDate(staleDate.getDate() - 90);
        const stale = await this.prisma.project.findMany({
            where: { status: ProjectStatus.ON_GOING, deleted_at: null, updated_at: { lt: staleDate } },
        });
        stale.forEach((p) => anomalies.push({
            type: AuditAnomalyType.STALE_PROJECT, description: `Project "${p.name}" ON_GOING >90 hari tanpa update`,
            entity_type: 'Project', entity_id: p.id, severity: 'MEDIUM',
        }));

        // Save new anomalies
        for (const a of anomalies) {
            const exists = await this.prisma.auditAnomaly.findFirst({ where: { entity_type: a.entity_type, entity_id: a.entity_id, type: a.type, is_resolved: false } });
            if (!exists) await this.prisma.auditAnomaly.create({ data: a });
        }
        this.logger.log(`Anomaly detection: ${anomalies.length} found`);
        return { detected: anomalies.length };
    }

    // --- Anomaly CRUD ---
    async getAnomalies(severity?: string, resolved?: boolean) {
        return this.prisma.auditAnomaly.findMany({
            where: { ...(severity ? { severity } : {}), ...(resolved !== undefined ? { is_resolved: resolved } : {}) },
            orderBy: { detected_at: 'desc' },
        });
    }

    async resolveAnomaly(id: string, note: string, userId: string) {
        return this.prisma.auditAnomaly.update({
            where: { id },
            data: { is_resolved: true, resolution_note: note, resolved_at: new Date(), resolved_by_id: userId },
        });
    }

    // --- Report Templates ---
    async getTemplates() { return this.prisma.auditReportTemplate.findMany({ include: { created_by: { select: { full_name: true } } } }); }

    async createTemplate(dto: any, userId: string) {
        return this.prisma.auditReportTemplate.create({ data: { name: dto.name, description: dto.description, sections: dto.sections, created_by_id: userId } });
    }

    // --- Report Generation ---
    async generateReport(periodStart: Date, periodEnd: Date, sections: string[], userId: string) {
        const [projectSummary, anomalies, activityCount] = await Promise.all([
            this.prisma.project.groupBy({ by: ['status'], where: { created_at: { gte: periodStart, lte: periodEnd }, deleted_at: null }, _count: true }),
            this.prisma.auditAnomaly.findMany({ where: { detected_at: { gte: periodStart, lte: periodEnd } } }),
            this.prisma.activityLog.count({ where: { created_at: { gte: periodStart, lte: periodEnd } } }),
        ]);

        const report = await this.prisma.generatedAuditReport.create({
            data: {
                period_start: periodStart, period_end: periodEnd,
                title: `Laporan Audit ${periodStart.toLocaleDateString('id-ID')} - ${periodEnd.toLocaleDateString('id-ID')}`,
                file_path: 'reports/pending-generation', generated_by_id: userId,
                summary_stats: { project_status: projectSummary, anomaly_count: anomalies.length, activity_count: activityCount, sections },
            },
        });
        return report;
    }

    async getReports() {
        return this.prisma.generatedAuditReport.findMany({
            include: { generated_by: { select: { full_name: true } } },
            orderBy: { generated_at: 'desc' },
        });
    }

    async getStats(periodStart: Date, periodEnd: Date) {
        const [projectsByStatus, totalAnomalies, resolvedAnomalies, totalActivities] = await Promise.all([
            this.prisma.project.groupBy({ by: ['status'], where: { created_at: { gte: periodStart, lte: periodEnd }, deleted_at: null }, _count: true }),
            this.prisma.auditAnomaly.count({ where: { detected_at: { gte: periodStart, lte: periodEnd } } }),
            this.prisma.auditAnomaly.count({ where: { detected_at: { gte: periodStart, lte: periodEnd }, is_resolved: true } }),
            this.prisma.activityLog.count({ where: { created_at: { gte: periodStart, lte: periodEnd } } }),
        ]);
        return { projectsByStatus, totalAnomalies, resolvedAnomalies, totalActivities };
    }
}
