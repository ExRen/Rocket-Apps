import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { FilterProjectDto } from './dto/filter-project.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
    constructor(private projectsService: ProjectsService) { }

    // ===== Calendar (2.1) =====
    @Get('calendar')
    getCalendarView(
        @Query('year') year: string,
        @Query('month') month: string,
        @CurrentUser() user: any,
    ) {
        return this.projectsService.getCalendarView(
            Number(year) || new Date().getFullYear(),
            month ? Number(month) : undefined,
            user.id, user.role,
        );
    }

    // ===== Board View (3.1) =====
    @Get('board')
    getBoardView(@CurrentUser() user: any, @Query() query: any) {
        return this.projectsService.getBoardView(user.id, user.role, query);
    }

    // ===== At-Risk (4.1) =====
    @Get('at-risk')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_USER, UserRole.LEVEL_1, UserRole.LEVEL_2)
    getAtRiskProjects(@Query('min_level') minLevel: string) {
        return this.projectsService.getAtRiskProjects(minLevel);
    }

    @Get()
    findAll(@Query() filter: FilterProjectDto) {
        return this.projectsService.findAll(filter);
    }

    @Post()
    create(@Body() dto: CreateProjectDto, @CurrentUser() user: any) {
        return this.projectsService.create(dto, user.id, user.role);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.projectsService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: UpdateProjectDto, @CurrentUser() user: any) {
        return this.projectsService.update(id, dto, user.id, user.role);
    }

    @Post(':id/start-working')
    startWorking(@Param('id') id: string, @CurrentUser() user: any) {
        return this.projectsService.startWorking(id, user.id);
    }

    // ===== Reschedule (2.1) =====
    @Patch(':id/reschedule')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_USER, UserRole.LEVEL_1, UserRole.LEVEL_2)
    reschedule(@Param('id') id: string, @Body('new_due_date') newDueDate: string) {
        return this.projectsService.reschedule(id, newDueDate);
    }

    // ===== Board Reorder (3.1) =====
    @Patch('board/reorder')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_USER, UserRole.LEVEL_1, UserRole.LEVEL_2)
    reorderBoard(@Body() dto: any) {
        return this.projectsService.reorderBoard(dto);
    }

    @Delete(':id')
    remove(@Param('id') id: string, @CurrentUser() user: any) {
        return this.projectsService.remove(id, user.id, user.role);
    }
}
