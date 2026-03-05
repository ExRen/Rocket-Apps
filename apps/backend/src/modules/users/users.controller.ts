import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
    constructor(private usersService: UsersService) { }

    @Get()
    findAll() {
        return this.usersService.findAll();
    }

    @Get('preferences/notifications')
    getNotificationPreferences(@CurrentUser() user: any) {
        return this.usersService.getNotificationPreferences(user.id);
    }

    @Patch('preferences/notifications')
    updateNotificationPreferences(@CurrentUser() user: any, @Body() dto: any) {
        return this.usersService.updateNotificationPreferences(user.id, dto);
    }

    @Get('workload')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_USER, UserRole.LEVEL_1, UserRole.LEVEL_2)
    getTeamWorkload() {
        return this.usersService.getTeamWorkload();
    }

    @Patch(':id/capacity')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_USER, UserRole.LEVEL_1, UserRole.LEVEL_2)
    updateCapacity(@Param('id') id: string, @Body('max_active_projects') maxProjects: number) {
        return this.usersService.updateCapacity(id, maxProjects);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.usersService.findOne(id);
    }

    @Patch(':id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_USER)
    update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
        return this.usersService.update(id, dto);
    }
}
