import { Injectable, Res } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Response } from 'express';
import * as ExcelJS from 'exceljs';

@Injectable()
export class ExportService {
    constructor(private prisma: PrismaService) { }

    async exportProjectsExcel(res: Response, filters?: any) {
        const where: any = { deleted_at: null };
        if (filters?.status) where.status = filters.status;
        if (filters?.month) where.month = Number(filters.month);
        if (filters?.year) where.year = Number(filters.year);

        const projects = await this.prisma.project.findMany({
            where,
            include: { pic: { select: { full_name: true } } },
            orderBy: { due_date: 'asc' },
        });

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Working Tracker');

        // Header styling
        sheet.columns = [
            { header: 'No', key: 'no', width: 5 },
            { header: 'Nama Project', key: 'name', width: 40 },
            { header: 'PIC', key: 'pic', width: 20 },
            { header: 'Due Date', key: 'due_date', width: 15 },
            { header: 'Status', key: 'status', width: 18 },
            { header: 'Bulan', key: 'month', width: 10 },
            { header: 'Tahun', key: 'year', width: 10 },
            { header: 'Client', key: 'client', width: 20 },
            { header: 'Update Notes', key: 'update_notes', width: 40 },
        ];

        // Style header row
        sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D2B6B' } };

        projects.forEach((project, index) => {
            sheet.addRow({
                no: index + 1,
                name: project.name,
                pic: project.pic.full_name,
                due_date: new Date(project.due_date).toLocaleDateString('id-ID'),
                status: project.status,
                month: project.month,
                year: project.year,
                client: project.client || '-',
                update_notes: project.update_notes || '-',
            });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=working-tracker.xlsx');

        await workbook.xlsx.write(res);
        res.end();
    }

    async exportProjectsCsv(res: Response, filters?: any) {
        const where: any = { deleted_at: null };
        if (filters?.status) where.status = filters.status;

        const projects = await this.prisma.project.findMany({
            where,
            include: { pic: { select: { full_name: true } } },
            orderBy: { due_date: 'asc' },
        });

        const headers = ['No', 'Nama Project', 'PIC', 'Due Date', 'Status', 'Bulan', 'Tahun', 'Client', 'Update Notes'];
        const rows = projects.map((p, i) => [
            i + 1,
            `"${p.name}"`,
            `"${p.pic.full_name}"`,
            new Date(p.due_date).toLocaleDateString('id-ID'),
            p.status,
            p.month,
            p.year,
            `"${p.client || '-'}"`,
            `"${(p.update_notes || '-').replace(/"/g, '""')}"`,
        ]);

        const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=working-tracker.csv');
        res.send(csv);
    }

    async exportProjectsPdf(res: Response, filters?: any) {
        // PDF generation using a simple HTML template approach
        const where: any = { deleted_at: null };
        if (filters?.status) where.status = filters.status;

        const projects = await this.prisma.project.findMany({
            where,
            include: { pic: { select: { full_name: true } } },
            orderBy: { due_date: 'asc' },
        });

        const html = `
      <html>
      <head><style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #0D2B6B; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background: #0D2B6B; color: white; padding: 8px; text-align: left; }
        td { border: 1px solid #ddd; padding: 6px; }
        tr:nth-child(even) { background: #f9f9f9; }
      </style></head>
      <body>
        <h1>ROCKET — Working Tracker Report</h1>
        <p>PT ASABRI (Persero) | Bidang Komunikasi dan Protokoler</p>
        <table>
          <thead>
            <tr><th>No</th><th>Nama Project</th><th>PIC</th><th>Due Date</th><th>Status</th></tr>
          </thead>
          <tbody>
            ${projects.map((p, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${p.name}</td>
                <td>${p.pic.full_name}</td>
                <td>${new Date(p.due_date).toLocaleDateString('id-ID')}</td>
                <td>${p.status}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <p style="margin-top: 20px;color:#888;">Dicetak pada: ${new Date().toLocaleString('id-ID')}</p>
      </body>
      </html>
    `;

        // If Puppeteer is available, use it for PDF generation
        try {
            const puppeteer = require('puppeteer');
            const browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            });
            const page = await browser.newPage();
            await page.setContent(html, { waitUntil: 'networkidle0' });
            const pdf = await page.pdf({ format: 'A4', landscape: true, printBackground: true });
            await browser.close();

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename=working-tracker.pdf');
            res.send(pdf);
        } catch (e) {
            // Fallback: send HTML if Puppeteer is not available
            res.setHeader('Content-Type', 'text/html');
            res.send(html);
        }
    }
}
