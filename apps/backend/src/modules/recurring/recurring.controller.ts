import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RecurringService } from './recurring.service';
import { UserRole } from '@prisma/client';

@Controller('recurring')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RecurringController {
    constructor(private recurringService: RecurringService) { }

    @Get()
    findAll() { return this.recurringService.findAll(); }

    @Get(':id')
    findOne(@Param('id') id: string) { return this.recurringService.findOne(id); }

    @Post()
    @Roles(UserRole.LEVEL_2, UserRole.LEVEL_1, UserRole.SUPER_USER)
    create(@Body() dto: any, @CurrentUser() user: any) { return this.recurringService.create(dto, user.id); }

    @Patch(':id')
    @Roles(UserRole.LEVEL_2, UserRole.LEVEL_1, UserRole.SUPER_USER)
    update(@Param('id') id: string, @Body() dto: any) { return this.recurringService.update(id, dto); }

    @Delete(':id')
    @Roles(UserRole.LEVEL_2, UserRole.LEVEL_1, UserRole.SUPER_USER)
    remove(@Param('id') id: string) { return this.recurringService.remove(id); }

    @Get(':id/logs')
    getLogs(@Param('id') id: string) { return this.recurringService.getExecutionLogs(id); }

    @Post('trigger')
    @Roles(UserRole.SUPER_USER)
    trigger() { return this.recurringService.processRecurringProjects(); }
}
