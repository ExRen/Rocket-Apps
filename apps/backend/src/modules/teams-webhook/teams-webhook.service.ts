import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import axios from 'axios';

@Injectable()
export class TeamsWebhookService {
    private readonly logger = new Logger(TeamsWebhookService.name);

    constructor(private prisma: PrismaService) { }

    async findAll() {
        return this.prisma.teamsWebhookConfig.findMany({ orderBy: { channel_name: 'asc' } });
    }

    async create(dto: any) {
        return this.prisma.teamsWebhookConfig.create({
            data: {
                channel_name: dto.channel_name,
                webhook_url: dto.webhook_url,
                notification_types: dto.notification_types || [],
            },
        });
    }

    async update(id: string, dto: any) {
        const config = await this.prisma.teamsWebhookConfig.findUnique({ where: { id } });
        if (!config) throw new NotFoundException('Webhook config tidak ditemukan');
        return this.prisma.teamsWebhookConfig.update({ where: { id }, data: dto });
    }

    async remove(id: string) {
        return this.prisma.teamsWebhookConfig.delete({ where: { id } });
    }

    async sendToTeams(type: string, title: string, message: string, projectName?: string) {
        const configs = await this.prisma.teamsWebhookConfig.findMany({
            where: { is_active: true },
        });

        const relevantConfigs = configs.filter(
            (c) => c.notification_types.length === 0 || c.notification_types.includes(type),
        );

        for (const config of relevantConfigs) {
            try {
                const card = {
                    '@type': 'MessageCard',
                    '@context': 'http://schema.org/extensions',
                    summary: title,
                    themeColor: type.includes('RISK') ? 'FF4444' : '0D2B6B',
                    sections: [{
                        activityTitle: `🚀 ROCKET — ${title}`,
                        activitySubtitle: projectName || '',
                        text: message,
                        markdown: true,
                    }],
                };
                await axios.post(config.webhook_url, card, { timeout: 5000 });
            } catch (err) {
                this.logger.warn(`Gagal kirim ke Teams channel ${config.channel_name}: ${err.message}`);
            }
        }
    }
}
