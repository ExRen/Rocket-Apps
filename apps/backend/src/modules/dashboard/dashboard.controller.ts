import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
    constructor(private dashboardService: DashboardService) { }

    @Get()
    getDashboard(@CurrentUser() user: any) {
        return this.dashboardService.getDashboardData(user.id, user.role);
    }

    @Get('executive')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_USER, UserRole.LEVEL_1)
    getExecDashboard() {
        return this.dashboardService.getExecDashboard();
    }
}
