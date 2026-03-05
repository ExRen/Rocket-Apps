import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { ExportService } from './export.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Export')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('export')
export class ExportController {
    constructor(private exportService: ExportService) { }

    @Get('projects/pdf')
    exportPdf(@Res() res: Response, @Query() filters: any) {
        return this.exportService.exportProjectsPdf(res, filters);
    }

    @Get('projects/excel')
    exportExcel(@Res() res: Response, @Query() filters: any) {
        return this.exportService.exportProjectsExcel(res, filters);
    }

    @Get('projects/csv')
    exportCsv(@Res() res: Response, @Query() filters: any) {
        return this.exportService.exportProjectsCsv(res, filters);
    }
}
