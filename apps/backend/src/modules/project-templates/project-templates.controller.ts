import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { ProjectTemplatesService } from './project-templates.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Project Templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('project-templates')
export class ProjectTemplatesController {
    constructor(private service: ProjectTemplatesService) { }

    @Get()
    findAll() {
        return this.service.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.service.findOne(id);
    }

    @Post()
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_USER, UserRole.LEVEL_1, UserRole.LEVEL_2)
    create(@Body() dto: any, @CurrentUser() user: any) {
        return this.service.create(dto, user.id);
    }

    @Patch(':id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_USER, UserRole.LEVEL_1, UserRole.LEVEL_2)
    update(@Param('id') id: string, @Body() dto: any) {
        return this.service.update(id, dto);
    }

    @Delete(':id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_USER, UserRole.LEVEL_1, UserRole.LEVEL_2)
    remove(@Param('id') id: string) {
        return this.service.remove(id);
    }

    @Post(':templateId/apply')
    applyTemplate(
        @Param('templateId') templateId: string,
        @Body() dto: any,
        @CurrentUser() user: any,
    ) {
        return this.service.applyTemplate(templateId, dto, user.id, user.role);
    }
}
