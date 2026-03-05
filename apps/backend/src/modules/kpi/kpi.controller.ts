import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { KpiService } from './kpi.service';
import { UserRole } from '@prisma/client';

@Controller('kpi')
@UseGuards(JwtAuthGuard, RolesGuard)
export class KpiController {
    constructor(private kpiService: KpiService) { }

    @Get()
    findAll(@Query('year') year?: string) { return this.kpiService.findAll(year ? parseInt(year) : undefined); }

    @Get('summary')
    getSummary(@Query('year') year?: string) { return this.kpiService.getSummary(year ? parseInt(year) : new Date().getFullYear()); }

    @Get(':id')
    findOne(@Param('id') id: string) { return this.kpiService.findOne(id); }

    @Post()
    @Roles(UserRole.LEVEL_2, UserRole.LEVEL_1, UserRole.SUPER_USER)
    create(@Body() dto: any, @CurrentUser() user: any) { return this.kpiService.create(dto, user.id); }

    @Patch(':id')
    @Roles(UserRole.LEVEL_2, UserRole.LEVEL_1, UserRole.SUPER_USER)
    update(@Param('id') id: string, @Body() dto: any) { return this.kpiService.update(id, dto); }

    @Post(':id/link-project')
    @Roles(UserRole.LEVEL_2, UserRole.LEVEL_1, UserRole.SUPER_USER)
    linkProject(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
        return this.kpiService.linkProject(id, body.project_id, body.weight, user.id);
    }

    @Delete(':id/unlink-project/:projectId')
    @Roles(UserRole.LEVEL_2, UserRole.LEVEL_1, UserRole.SUPER_USER)
    unlinkProject(@Param('id') id: string, @Param('projectId') projectId: string) {
        return this.kpiService.unlinkProject(id, projectId);
    }

    @Post(':id/progress')
    @Roles(UserRole.LEVEL_2, UserRole.LEVEL_1, UserRole.SUPER_USER)
    addProgress(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
        return this.kpiService.addProgressNote(id, body.value, body.note, user.id);
    }

    @Post('refresh')
    @Roles(UserRole.SUPER_USER)
    refresh() { return this.kpiService.refreshAllKpiValues(); }
}
