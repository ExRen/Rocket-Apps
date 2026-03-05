import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SubProjectsService } from './sub-projects.service';
import { CreateSubProjectDto } from './dto/create-sub-project.dto';
import { UpdateSubProjectDto } from './dto/update-sub-project.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Sub-Projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/sub-projects')
export class SubProjectsController {
    constructor(private subProjectsService: SubProjectsService) { }

    @Get()
    findAll(@Param('projectId') projectId: string) {
        return this.subProjectsService.findAll(projectId);
    }

    @Post()
    create(@Param('projectId') projectId: string, @Body() dto: CreateSubProjectDto) {
        return this.subProjectsService.create(projectId, dto);
    }

    @Patch(':id')
    update(
        @Param('projectId') projectId: string,
        @Param('id') id: string,
        @Body() dto: UpdateSubProjectDto,
    ) {
        return this.subProjectsService.update(projectId, id, dto);
    }

    @Delete(':id')
    remove(@Param('projectId') projectId: string, @Param('id') id: string) {
        return this.subProjectsService.remove(projectId, id);
    }
}
