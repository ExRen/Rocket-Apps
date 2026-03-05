import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAnggaranPosDto } from './dto/create-anggaran-pos.dto';
import { UpdateAnggaranPosDto } from './dto/update-anggaran-pos.dto';

@Injectable()
export class AnggaranService {
    constructor(private prisma: PrismaService) { }

    async findAll(tahun?: number) {
        const where: any = {};
        if (tahun) where.tahun = tahun;
        return this.prisma.anggaranPos.findMany({
            where,
            orderBy: { nama_pos: 'asc' },
            include: { _count: { select: { realisasi: true } } },
        });
    }

    async create(dto: CreateAnggaranPosDto) {
        return this.prisma.anggaranPos.create({ data: dto as any });
    }

    async update(id: string, dto: UpdateAnggaranPosDto) {
        const pos = await this.prisma.anggaranPos.findUnique({ where: { id } });
        if (!pos) throw new NotFoundException('Pos anggaran tidak ditemukan');
        return this.prisma.anggaranPos.update({ where: { id }, data: dto as any });
    }

    async remove(id: string) {
        const pos = await this.prisma.anggaranPos.findUnique({ where: { id } });
        if (!pos) throw new NotFoundException('Pos anggaran tidak ditemukan');
        return this.prisma.anggaranPos.delete({ where: { id } });
    }

    async getSerapanPerPos(tahun: number) {
        const result = await this.prisma.$queryRaw`
      SELECT
        ap.id,
        ap.nama_pos,
        ap.total_anggaran::float,
        COALESCE(SUM(ra.jumlah), 0)::float AS total_terserap,
        CASE
          WHEN ap.total_anggaran > 0
          THEN COALESCE(SUM(ra.jumlah), 0) / ap.total_anggaran * 100
          ELSE 0
        END::float AS persentase_serapan
      FROM anggaran_pos ap
      LEFT JOIN realisasi_anggaran ra ON ra.anggaran_pos_id = ap.id
      WHERE ap.tahun = ${tahun}
      GROUP BY ap.id, ap.nama_pos, ap.total_anggaran
      ORDER BY ap.nama_pos
    `;
        return result;
    }
}
