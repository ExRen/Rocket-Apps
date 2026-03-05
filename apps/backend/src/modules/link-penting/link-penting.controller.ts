import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { LinkPentingService } from './link-penting.service';
import { CreateLinkDto } from './dto/create-link.dto';
import { UpdateLinkDto } from './dto/update-link.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Link Penting')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('links')
export class LinkPentingController {
    constructor(private linkPentingService: LinkPentingService) { }

    @Get()
    findAll() {
        return this.linkPentingService.findAll();
    }

    @Post()
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_USER, UserRole.LEVEL_1, UserRole.LEVEL_2)
    create(@Body() dto: CreateLinkDto) {
        return this.linkPentingService.create(dto);
    }

    @Patch(':id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_USER, UserRole.LEVEL_1, UserRole.LEVEL_2)
    update(@Param('id') id: string, @Body() dto: UpdateLinkDto) {
        return this.linkPentingService.update(id, dto);
    }

    @Delete(':id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_USER, UserRole.LEVEL_1, UserRole.LEVEL_2)
    remove(@Param('id') id: string) {
        return this.linkPentingService.remove(id);
    }
}
