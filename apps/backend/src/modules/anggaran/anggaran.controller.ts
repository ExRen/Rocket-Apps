import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { AnggaranService } from './anggaran.service';
import { CreateAnggaranPosDto } from './dto/create-anggaran-pos.dto';
import { UpdateAnggaranPosDto } from './dto/update-anggaran-pos.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Anggaran')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('anggaran')
export class AnggaranController {
    constructor(private anggaranService: AnggaranService) { }

    @Get()
    findAll(@Query('tahun') tahun?: number) {
        return this.anggaranService.findAll(tahun ? Number(tahun) : undefined);
    }

    @Post()
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_USER, UserRole.LEVEL_1, UserRole.LEVEL_2)
    create(@Body() dto: CreateAnggaranPosDto) {
        return this.anggaranService.create(dto);
    }

    @Patch(':id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_USER, UserRole.LEVEL_1, UserRole.LEVEL_2)
    update(@Param('id') id: string, @Body() dto: UpdateAnggaranPosDto) {
        return this.anggaranService.update(id, dto);
    }

    @Delete(':id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_USER, UserRole.LEVEL_1, UserRole.LEVEL_2)
    remove(@Param('id') id: string) {
        return this.anggaranService.remove(id);
    }

    @Get('serapan')
    getSerapan(@Query('tahun') tahun: number) {
        return this.anggaranService.getSerapanPerPos(Number(tahun) || new Date().getFullYear());
    }
}
