import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { AnggaranModule } from '../anggaran/anggaran.module';

@Module({
    imports: [AnggaranModule],
    controllers: [DashboardController],
    providers: [DashboardService],
})
export class DashboardModule { }
