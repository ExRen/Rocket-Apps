import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuditService } from './audit.service';
import { UserRole } from '@prisma/client';

@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_USER, UserRole.LEVEL_1)
export class AuditController {
    constructor(private auditService: AuditService) { }

    @Get('anomalies')
    getAnomalies(@Query('severity') severity?: string, @Query('resolved') resolved?: string) {
        return this.auditService.getAnomalies(severity, resolved === 'true' ? true : resolved === 'false' ? false : undefined);
    }

    @Patch('anomalies/:id/resolve')
    resolveAnomaly(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
        return this.auditService.resolveAnomaly(id, body.resolution_note, user.id);
    }

    @Post('detect')
    detect() { return this.auditService.detectAnomalies(); }

    @Get('templates')
    getTemplates() { return this.auditService.getTemplates(); }

    @Post('templates')
    createTemplate(@Body() dto: any, @CurrentUser() user: any) { return this.auditService.createTemplate(dto, user.id); }

    @Post('reports/generate')
    generateReport(@Body() body: any, @CurrentUser() user: any) {
        return this.auditService.generateReport(new Date(body.period_start), new Date(body.period_end), body.sections || [], user.id);
    }

    @Get('reports')
    getReports() { return this.auditService.getReports(); }

    @Get('stats')
    getStats(@Query('start') start: string, @Query('end') end: string) {
        const s = start ? new Date(start) : new Date(new Date().getFullYear(), 0, 1);
        const e = end ? new Date(end) : new Date();
        return this.auditService.getStats(s, e);
    }
}
