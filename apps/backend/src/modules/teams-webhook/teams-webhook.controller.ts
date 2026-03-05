import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { TeamsWebhookService } from './teams-webhook.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Teams Webhook')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_USER, UserRole.LEVEL_1)
@Controller('teams-webhook')
export class TeamsWebhookController {
    constructor(private service: TeamsWebhookService) { }

    @Get()
    findAll() { return this.service.findAll(); }

    @Post()
    create(@Body() dto: any) { return this.service.create(dto); }

    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: any) { return this.service.update(id, dto); }

    @Delete(':id')
    remove(@Param('id') id: string) { return this.service.remove(id); }

    @Post('test')
    testWebhook() {
        return this.service.sendToTeams('TEST', 'Test Notifikasi', 'Ini adalah notifikasi percobaan dari ROCKET');
    }
}
