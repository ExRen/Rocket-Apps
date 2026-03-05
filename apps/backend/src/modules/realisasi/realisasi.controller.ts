import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { RealisasiService } from './realisasi.service';
import { CreateRealisasiDto } from './dto/create-realisasi.dto';
import { UpdateRealisasiDto } from './dto/update-realisasi.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Realisasi')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('realisasi')
export class RealisasiController {
    constructor(private realisasiService: RealisasiService) { }

    @Get()
    findAll(@Query('anggaran_pos_id') anggaranPosId?: string) {
        return this.realisasiService.findAll(anggaranPosId);
    }

    @Post()
    create(@Body() dto: CreateRealisasiDto, @CurrentUser() user: any) {
        return this.realisasiService.create(dto, user.id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: UpdateRealisasiDto, @CurrentUser() user: any) {
        return this.realisasiService.update(id, dto, user.id, user.role);
    }

    @Delete(':id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_USER, UserRole.LEVEL_1, UserRole.LEVEL_2)
    remove(@Param('id') id: string) {
        return this.realisasiService.remove(id);
    }
}
