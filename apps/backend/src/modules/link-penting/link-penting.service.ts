import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLinkDto } from './dto/create-link.dto';
import { UpdateLinkDto } from './dto/update-link.dto';

@Injectable()
export class LinkPentingService {
    constructor(private prisma: PrismaService) { }

    async findAll() {
        return this.prisma.linkPenting.findMany({
            where: { is_active: true },
            orderBy: { urutan: 'asc' },
        });
    }

    async create(dto: CreateLinkDto) {
        return this.prisma.linkPenting.create({ data: dto });
    }

    async update(id: string, dto: UpdateLinkDto) {
        const link = await this.prisma.linkPenting.findUnique({ where: { id } });
        if (!link) throw new NotFoundException('Link tidak ditemukan');
        return this.prisma.linkPenting.update({ where: { id }, data: dto });
    }

    async remove(id: string) {
        const link = await this.prisma.linkPenting.findUnique({ where: { id } });
        if (!link) throw new NotFoundException('Link tidak ditemukan');
        return this.prisma.linkPenting.delete({ where: { id } });
    }
}
