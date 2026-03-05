import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { ActivityLogService } from './activity-log.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Activity Log')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('activity-log')
export class ActivityLogController {
    constructor(private activityLogService: ActivityLogService) { }

    @Get('project/:projectId')
    findByProject(@Param('projectId') projectId: string) {
        return this.activityLogService.findByEntity('Project', projectId);
    }

    @Get()
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_USER, UserRole.LEVEL_1)
    findAll(@Query() query: any) {
        return this.activityLogService.findAll(query);
    }
}
