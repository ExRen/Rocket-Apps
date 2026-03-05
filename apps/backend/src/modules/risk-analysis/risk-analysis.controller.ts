import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { RiskAnalysisService } from './risk-analysis.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Risk Analysis')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_USER, UserRole.LEVEL_1, UserRole.LEVEL_2)
@Controller('risk-analysis')
export class RiskAnalysisController {
    constructor(private service: RiskAnalysisService) { }

    @Get('summary')
    getRiskSummary() {
        return this.service.getRiskSummary();
    }

    @Post('recalculate')
    @Roles(UserRole.SUPER_USER)
    recalculate() {
        return this.service.calculateAllRiskScores();
    }
}
