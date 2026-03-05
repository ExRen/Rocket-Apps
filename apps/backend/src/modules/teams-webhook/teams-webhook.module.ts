import { Module } from '@nestjs/common';
import { TeamsWebhookController } from './teams-webhook.controller';
import { TeamsWebhookService } from './teams-webhook.service';

@Module({
    controllers: [TeamsWebhookController],
    providers: [TeamsWebhookService],
    exports: [TeamsWebhookService],
})
export class TeamsWebhookModule { }
