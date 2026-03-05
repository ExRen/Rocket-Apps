import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRealisasiDto } from './dto/create-realisasi.dto';
import { UpdateRealisasiDto } from './dto/update-realisasi.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class RealisasiService {
    constructor(private prisma: PrismaService) { }

    async findAll(anggaranPosId?: string) {
        const where: any = {};
        if (anggaranPosId) where.anggaran_pos_id = anggaranPosId;
        return this.prisma.realisasiAnggaran.findMany({
            where,
            include: {
                pic: { select: { id: true, full_name: true } },
                anggaran_pos: { select: { id: true, nama_pos: true } },
            },
            orderBy: { tanggal_input: 'desc' },
        });
    }

    async create(dto: CreateRealisasiDto, userId: string) {
        const pos = await this.prisma.anggaranPos.findUnique({ where: { id: dto.anggaran_pos_id } });
        if (!pos) throw new NotFoundException('Pos anggaran tidak ditemukan');

        return this.prisma.realisasiAnggaran.create({
            data: {
                anggaran_pos_id: dto.anggaran_pos_id,
                pic_user_id: userId,
                kegiatan: dto.kegiatan,
                jumlah: dto.jumlah,
                nd_realisasi: dto.nd_realisasi,
                dokumen_url: dto.dokumen_url,
                tanggal_input: new Date(dto.tanggal_input),
            },
            include: { pic: { select: { id: true, full_name: true } } },
        });
    }

    async update(id: string, dto: UpdateRealisasiDto, userId: string, userRole: UserRole) {
        const realisasi = await this.prisma.realisasiAnggaran.findUnique({ where: { id } });
        if (!realisasi) throw new NotFoundException('Realisasi tidak ditemukan');

        if (userRole === UserRole.LEVEL_3 && realisasi.pic_user_id !== userId) {
            throw new ForbiddenException('Anda hanya bisa mengedit realisasi milik sendiri');
        }

        const data: any = { ...dto };
        if (dto.tanggal_input) data.tanggal_input = new Date(dto.tanggal_input);

        return this.prisma.realisasiAnggaran.update({ where: { id }, data });
    }

    async remove(id: string) {
        const realisasi = await this.prisma.realisasiAnggaran.findUnique({ where: { id } });
        if (!realisasi) throw new NotFoundException('Realisasi tidak ditemukan');
        return this.prisma.realisasiAnggaran.delete({ where: { id } });
    }
}
