import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { SubProjectsModule } from './modules/sub-projects/sub-projects.module';
import { ReviewModule } from './modules/review/review.module';
import { AnggaranModule } from './modules/anggaran/anggaran.module';
import { RealisasiModule } from './modules/realisasi/realisasi.module';
import { LinkPentingModule } from './modules/link-penting/link-penting.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ExportModule } from './modules/export/export.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';

// New modules from Kelompok 1-4
import { CommentsModule } from './modules/comments/comments.module';
import { ActivityLogModule } from './modules/activity-log/activity-log.module';
import { ProjectTemplatesModule } from './modules/project-templates/project-templates.module';
import { RiskAnalysisModule } from './modules/risk-analysis/risk-analysis.module';
import { TeamsWebhookModule } from './modules/teams-webhook/teams-webhook.module';

// New modules from Kelompok 5-7
import { DocumentsModule } from './modules/documents/documents.module';
import { SearchModule } from './modules/search/search.module';
import { RecurringModule } from './modules/recurring/recurring.module';
import { KpiModule } from './modules/kpi/kpi.module';
import { MeetingsModule } from './modules/meetings/meetings.module';
import { AuditModule } from './modules/audit/audit.module';

import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

@Module({
    imports: [
        // Konfigurasi .env file
        ConfigModule.forRoot({ isGlobal: true }),

        // Scheduler (cron jobs)
        ScheduleModule.forRoot(),

        // Database (Prisma) — global
        PrismaModule,

        // Feature modules — existing
        AuthModule,
        UsersModule,
        ProjectsModule,
        SubProjectsModule,
        ReviewModule,
        AnggaranModule,
        RealisasiModule,
        LinkPentingModule,
        DashboardModule,
        NotificationsModule,
        ExportModule,
        SchedulerModule,

        // Feature modules — Kelompok 1-4
        CommentsModule,
        ActivityLogModule,
        ProjectTemplatesModule,
        RiskAnalysisModule,
        TeamsWebhookModule,

        // Feature modules — Kelompok 5-7
        DocumentsModule,
        SearchModule,
        RecurringModule,
        KpiModule,
        MeetingsModule,
        AuditModule,
    ],
    providers: [
        // Global response transformation
        { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
        { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
        { provide: APP_FILTER, useClass: HttpExceptionFilter },
    ],
})
export class AppModule { }
