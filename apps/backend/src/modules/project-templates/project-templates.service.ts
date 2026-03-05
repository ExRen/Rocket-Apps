import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProjectStatus } from '@prisma/client';

@Injectable()
export class ProjectTemplatesService {
    constructor(private prisma: PrismaService) { }

    async findAll() {
        return this.prisma.projectTemplate.findMany({
            where: { is_active: true },
            include: { sub_templates: true, created_by: { select: { full_name: true } } },
            orderBy: { name: 'asc' },
        });
    }

    async findOne(id: string) {
        const template = await this.prisma.projectTemplate.findUnique({
            where: { id },
            include: { sub_templates: true, created_by: { select: { full_name: true } } },
        });
        if (!template) throw new NotFoundException('Template tidak ditemukan');
        return template;
    }

    async create(dto: any, userId: string) {
        return this.prisma.projectTemplate.create({
            data: {
                name: dto.name,
                description: dto.description,
                created_by_id: userId,
                sub_templates: {
                    create: (dto.sub_templates || []).map((s: any) => ({
                        name: s.name,
                        day_offset: s.day_offset || 0,
                        keterangan: s.keterangan,
                    })),
                },
            },
            include: { sub_templates: true },
        });
    }

    async update(id: string, dto: any) {
        await this.findOne(id);

        // Delete old sub_templates and recreate
        if (dto.sub_templates) {
            await this.prisma.subProjectTemplate.deleteMany({ where: { template_id: id } });
        }

        return this.prisma.projectTemplate.update({
            where: { id },
            data: {
                name: dto.name,
                description: dto.description,
                ...(dto.sub_templates ? {
                    sub_templates: {
                        create: dto.sub_templates.map((s: any) => ({
                            name: s.name,
                            day_offset: s.day_offset || 0,
                            keterangan: s.keterangan,
                        })),
                    },
                } : {}),
            },
            include: { sub_templates: true },
        });
    }

    async remove(id: string) {
        await this.findOne(id);
        return this.prisma.projectTemplate.update({
            where: { id },
            data: { is_active: false },
        });
    }

    async applyTemplate(templateId: string, projectData: any, userId: string, userRole: string) {
        const template = await this.prisma.projectTemplate.findUniqueOrThrow({
            where: { id: templateId },
            include: { sub_templates: true },
        });

        const picId = userRole === 'LEVEL_3' ? userId : projectData.pic_user_id;
        const dueDate = new Date(projectData.due_date);

        const project = await this.prisma.project.create({
            data: {
                name: projectData.name,
                due_date: dueDate,
                status: ProjectStatus.TO_DO_NEXT,
                month: dueDate.getMonth() + 1,
                year: dueDate.getFullYear(),
                pic_user_id: picId,
                client: projectData.client,
                keterangan: `Dibuat dari template: ${template.name}`,
            },
        });

        // Create sub-projects from sub-templates
        const subProjectPromises = template.sub_templates.map((sub) =>
            this.prisma.subProject.create({
                data: {
                    project_id: project.id,
                    name: sub.name,
                    keterangan: sub.keterangan,
                    pic_user_id: picId,
                    due_date: new Date(dueDate.getTime() + sub.day_offset * 86400000),
                    status: ProjectStatus.TO_DO_NEXT,
                },
            }),
        );

        await Promise.all(subProjectPromises);

        return this.prisma.project.findUnique({
            where: { id: project.id },
            include: { pic: { select: { id: true, full_name: true } }, sub_projects: true },
        });
    }
}
