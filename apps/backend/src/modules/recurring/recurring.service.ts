import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RecurringPattern, ProjectStatus } from '@prisma/client';

@Injectable()
export class RecurringService {
    private readonly logger = new Logger(RecurringService.name);

    constructor(private prisma: PrismaService) { }

    async findAll() {
        return this.prisma.recurringConfig.findMany({
            include: { created_by: { select: { full_name: true } }, _count: { select: { execution_logs: true } } },
            orderBy: { created_at: 'desc' },
        });
    }

    async findOne(id: string) {
        return this.prisma.recurringConfig.findUniqueOrThrow({
            where: { id },
            include: { created_by: { select: { full_name: true } }, execution_logs: { orderBy: { executed_at: 'desc' }, take: 20 } },
        });
    }

    async create(dto: any, userId: string) {
        return this.prisma.recurringConfig.create({
            data: { name: dto.name, pattern: dto.pattern, day_of_week: dto.day_of_week, day_of_month: dto.day_of_month, month_in_quarter: dto.month_in_quarter, advance_days: dto.advance_days ?? 7, project_template: dto.project_template, created_by_id: userId },
        });
    }

    async update(id: string, dto: any) {
        return this.prisma.recurringConfig.update({ where: { id }, data: dto });
    }

    async remove(id: string) {
        return this.prisma.recurringConfig.update({ where: { id }, data: { is_active: false } });
    }

    async getExecutionLogs(id: string) {
        return this.prisma.recurringExecutionLog.findMany({
            where: { config_id: id },
            include: { project: { select: { id: true, name: true, status: true } } },
            orderBy: { executed_at: 'desc' },
            take: 50,
        });
    }

    async processRecurringProjects() {
        this.logger.log('Processing recurring project configurations...');
        const activeConfigs = await this.prisma.recurringConfig.findMany({ where: { is_active: true } });

        for (const config of activeConfigs) {
            try {
                const today = new Date();
                const dueDate = this.calculateDueDate(config);
                if (!dueDate) continue;

                const targetDate = new Date(dueDate);
                targetDate.setDate(targetDate.getDate() - config.advance_days);

                if (today.toDateString() !== targetDate.toDateString()) continue;

                // Check if already created
                const existing = await this.prisma.recurringExecutionLog.findFirst({
                    where: { config_id: config.id, status: 'SUCCESS', executed_at: { gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()) } },
                });
                if (existing) continue;

                const template = config.project_template as any;
                const projectName = this.interpolateName(template.name || config.name, dueDate);

                const project = await this.prisma.project.create({
                    data: {
                        name: projectName, due_date: dueDate, status: ProjectStatus.TO_DO_NEXT,
                        month: dueDate.getMonth() + 1, year: dueDate.getFullYear(),
                        pic_user_id: template.pic_user_id, client: template.client,
                        keterangan: `Dibuat otomatis dari recurring: ${config.name}`,
                    },
                });

                await this.prisma.recurringExecutionLog.create({
                    data: { config_id: config.id, project_id: project.id, status: 'SUCCESS' },
                });
                this.logger.log(`Recurring project created: ${projectName}`);
            } catch (error) {
                await this.prisma.recurringExecutionLog.create({
                    data: { config_id: config.id, status: 'FAILED', error_message: error.message },
                });
                this.logger.error(`Recurring failed for ${config.id}: ${error.message}`);
            }
        }
    }

    private calculateDueDate(config: any): Date | null {
        const now = new Date();
        switch (config.pattern) {
            case RecurringPattern.DAILY:
                return new Date(now.getFullYear(), now.getMonth(), now.getDate() + config.advance_days);
            case RecurringPattern.WEEKLY:
                const daysUntil = ((config.day_of_week ?? 1) - now.getDay() + 7) % 7 || 7;
                return new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntil);
            case RecurringPattern.MONTHLY:
                return new Date(now.getFullYear(), now.getMonth() + 1, config.day_of_month ?? 1);
            case RecurringPattern.QUARTERLY:
                const quarterMonth = Math.floor(now.getMonth() / 3) * 3 + 3 + (config.month_in_quarter ?? 1) - 1;
                return new Date(now.getFullYear(), quarterMonth, 1);
            default:
                return null;
        }
    }

    private interpolateName(template: string, date: Date): string {
        const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        return template
            .replace('{MONTH}', months[date.getMonth()])
            .replace('{YEAR}', date.getFullYear().toString())
            .replace('{QUARTER}', `Q${Math.floor(date.getMonth() / 3) + 1}`);
    }
}
