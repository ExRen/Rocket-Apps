import { Module } from '@nestjs/common';
import { RiskAnalysisController } from './risk-analysis.controller';
import { RiskAnalysisService } from './risk-analysis.service';

@Module({
    controllers: [RiskAnalysisController],
    providers: [RiskAnalysisService],
    exports: [RiskAnalysisService],
})
export class RiskAnalysisModule { }
