import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MeetingsService } from './meetings.service';
import { UserRole } from '@prisma/client';

@Controller('meetings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MeetingsController {
    constructor(private meetingsService: MeetingsService) { }

    @Get()
    findAll() { return this.meetingsService.findAll(); }

    @Get(':id')
    findOne(@Param('id') id: string) { return this.meetingsService.findOne(id); }

    @Post()
    @Roles(UserRole.LEVEL_2, UserRole.LEVEL_1, UserRole.SUPER_USER)
    create(@Body() dto: any, @CurrentUser() user: any) { return this.meetingsService.create(dto, user.id); }

    @Patch(':id')
    @Roles(UserRole.LEVEL_2, UserRole.LEVEL_1, UserRole.SUPER_USER)
    update(@Param('id') id: string, @Body() dto: any) { return this.meetingsService.update(id, dto); }

    @Post(':id/action-items')
    @Roles(UserRole.LEVEL_2, UserRole.LEVEL_1, UserRole.SUPER_USER)
    addActionItem(@Param('id') id: string, @Body() dto: any) { return this.meetingsService.addActionItem(id, dto); }

    @Patch('action-items/:itemId')
    updateActionItem(@Param('itemId') id: string, @Body() dto: any) { return this.meetingsService.updateActionItem(id, dto); }

    @Post('action-items/:itemId/convert')
    convertToProject(@Param('itemId') id: string, @Body() dto: any, @CurrentUser() user: any) {
        return this.meetingsService.convertToProject(id, dto, user.id);
    }

    @Delete(':id')
    @Roles(UserRole.LEVEL_2, UserRole.LEVEL_1, UserRole.SUPER_USER)
    remove(@Param('id') id: string) { return this.meetingsService.remove(id); }
}
