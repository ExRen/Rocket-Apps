import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ProjectStatus, UserRole } from '@prisma/client';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) { }

    async findAll() {
        return this.prisma.user.findMany({ orderBy: { full_name: 'asc' } });
    }

    async findOne(id: string) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user) throw new NotFoundException('User tidak ditemukan');
        return user;
    }

    async update(id: string, dto: UpdateUserDto) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user) throw new NotFoundException('User tidak ditemukan');
        return this.prisma.user.update({ where: { id }, data: dto });
    }

    // ========== NOTIFICATION PREFERENCES (1.3) ==========

    async getNotificationPreferences(userId: string) {
        let pref = await this.prisma.userNotificationPreference.findUnique({ where: { user_id: userId } });
        if (!pref) {
            pref = await this.prisma.userNotificationPreference.create({
                data: { user_id: userId },
            });
        }
        return pref;
    }

    async updateNotificationPreferences(userId: string, dto: any) {
        return this.prisma.userNotificationPreference.upsert({
            where: { user_id: userId },
            update: dto,
            create: { user_id: userId, ...dto },
        });
    }

    // ========== WORKLOAD (3.2) ==========

    async getTeamWorkload() {
        const staff = await this.prisma.user.findMany({
            where: { is_active: true, role: UserRole.LEVEL_3 },
            select: { id: true, full_name: true, max_active_projects: true },
        });

        const workloadData = await Promise.all(
            staff.map(async (member) => {
                const activeCount = await this.prisma.project.count({
                    where: {
                        pic_user_id: member.id,
                        deleted_at: null,
                        status: { in: [ProjectStatus.ON_GOING, ProjectStatus.TO_DO_NEXT, ProjectStatus.NEED_FOLLOW_UP, ProjectStatus.REVISI] },
                    },
                });

                const now = new Date();
                const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                const upcomingDeadlines = await this.prisma.project.count({
                    where: {
                        pic_user_id: member.id,
                        deleted_at: null,
                        due_date: { gte: now, lte: weekLater },
                        status: { notIn: [ProjectStatus.FINISHED, ProjectStatus.CANCELLED] },
                    },
                });

                const capacityPct = Math.round((activeCount / member.max_active_projects) * 100);

                return {
                    user: member,
                    active_count: activeCount,
                    max_capacity: member.max_active_projects,
                    capacity_percentage: Math.min(capacityPct, 100),
                    is_overloaded: activeCount > member.max_active_projects,
                    upcoming_deadlines: upcomingDeadlines,
                    load_label: capacityPct >= 100 ? 'Penuh' : capacityPct >= 75 ? 'Sibuk' : capacityPct >= 40 ? 'Normal' : 'Ringan',
                };
            }),
        );

        return workloadData.sort((a, b) => b.capacity_percentage - a.capacity_percentage);
    }

    async updateCapacity(id: string, maxProjects: number) {
        return this.prisma.user.update({
            where: { id },
            data: { max_active_projects: maxProjects },
        });
    }
}
