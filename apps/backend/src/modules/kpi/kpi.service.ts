import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { KpiCalcMethod, ProjectStatus } from '@prisma/client';

@Injectable()
export class KpiService {
    constructor(private prisma: PrismaService) { }

    async findAll(year?: number) {
        return this.prisma.kpiTarget.findMany({
            where: { is_active: true, ...(year ? { period_year: year } : {}) },
            include: { created_by: { select: { full_name: true } }, _count: { select: { project_links: true } } },
            orderBy: { created_at: 'desc' },
        });
    }

    async findOne(id: string) {
        return this.prisma.kpiTarget.findUniqueOrThrow({
            where: { id },
            include: {
                created_by: { select: { full_name: true } },
                project_links: { include: { project: { select: { id: true, name: true, status: true, due_date: true } }, linked_by: { select: { full_name: true } } } },
                progress_notes: { orderBy: { noted_at: 'desc' }, take: 20, include: { noted_by: { select: { full_name: true } } } },
            },
        });
    }

    async create(dto: any, userId: string) {
        return this.prisma.kpiTarget.create({
            data: { name: dto.name, description: dto.description, period_year: dto.period_year, period_type: dto.period_type, target_value: dto.target_value, unit: dto.unit, higher_is_better: dto.higher_is_better ?? true, calc_method: dto.calc_method, created_by_id: userId },
        });
    }

    async update(id: string, dto: any) {
        return this.prisma.kpiTarget.update({ where: { id }, data: dto });
    }

    async linkProject(kpiId: string, projectId: string, weight: number | null, userId: string) {
        return this.prisma.kpiProjectLink.create({
            data: { kpi_id: kpiId, project_id: projectId, weight, linked_by_id: userId },
        });
    }

    async unlinkProject(kpiId: string, projectId: string) {
        return this.prisma.kpiProjectLink.deleteMany({ where: { kpi_id: kpiId, project_id: projectId } });
    }

    async addProgressNote(kpiId: string, value: number, note: string, userId: string) {
        await this.prisma.kpiProgressNote.create({ data: { kpi_id: kpiId, value, note, noted_by_id: userId } });
        await this.prisma.kpiTarget.update({ where: { id: kpiId }, data: { current_value: value } });
        return { success: true };
    }

    async calculateAchievement(kpiId: string): Promise<number> {
        const kpi = await this.prisma.kpiTarget.findUniqueOrThrow({
            where: { id: kpiId },
            include: { project_links: { include: { project: true } } },
        });

        switch (kpi.calc_method) {
            case KpiCalcMethod.AUTO_COUNT_FINISHED: {
                return kpi.project_links.filter((l) => l.project.status === ProjectStatus.FINISHED).length;
            }
            case KpiCalcMethod.AUTO_PERCENTAGE: {
                const linked = kpi.project_links.map((l) => l.project);
                if (linked.length === 0) return 0;
                const onTime = linked.filter((p) => p.status === ProjectStatus.FINISHED && new Date(p.updated_at) <= new Date(p.due_date)).length;
                return (onTime / linked.length) * 100;
            }
            case KpiCalcMethod.MANUAL: {
                const latest = await this.prisma.kpiProgressNote.findFirst({ where: { kpi_id: kpiId }, orderBy: { noted_at: 'desc' } });
                return latest?.value ?? 0;
            }
            default: return 0;
        }
    }

    async refreshAllKpiValues() {
        const all = await this.prisma.kpiTarget.findMany({ where: { is_active: true } });
        for (const kpi of all) {
            const value = await this.calculateAchievement(kpi.id);
            await this.prisma.kpiTarget.update({ where: { id: kpi.id }, data: { current_value: value } });
        }
    }

    async getSummary(year: number) {
        const kpis = await this.prisma.kpiTarget.findMany({
            where: { is_active: true, period_year: year },
        });
        return kpis.map((k) => ({
            id: k.id, name: k.name, target: k.target_value, current: k.current_value, unit: k.unit,
            percentage: k.target_value > 0 ? Math.min(Math.round((k.current_value / k.target_value) * 100), 100) : 0,
            higher_is_better: k.higher_is_better,
        }));
    }
}
