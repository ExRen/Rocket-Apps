import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DocumentsService {
    constructor(private prisma: PrismaService) { }

    async findAll(category?: string) {
        return this.prisma.document.findMany({
            where: { is_active: true, ...(category ? { category } : {}) },
            include: {
                uploaded_by: { select: { id: true, full_name: true } },
                versions: { where: { is_latest: true }, take: 1 },
                _count: { select: { project_links: true, versions: true } },
            },
            orderBy: { updated_at: 'desc' },
        });
    }

    async findOne(id: string) {
        return this.prisma.document.findUniqueOrThrow({
            where: { id },
            include: {
                uploaded_by: { select: { id: true, full_name: true } },
                versions: { orderBy: { version_number: 'desc' }, include: { uploaded_by: { select: { id: true, full_name: true } } } },
                project_links: { include: { project: { select: { id: true, name: true, status: true } }, linked_by: { select: { full_name: true } } } },
            },
        });
    }

    async create(dto: { title: string; description?: string; category?: string }, file: { originalname: string; size: number; mimetype: string }, filePath: string, uploaderId: string) {
        return this.prisma.$transaction(async (tx) => {
            const document = await tx.document.create({
                data: { title: dto.title, description: dto.description, category: dto.category, uploaded_by_id: uploaderId },
            });
            await tx.documentVersion.create({
                data: {
                    document_id: document.id, version_number: 1, file_name: file.originalname,
                    file_path: filePath, file_size: file.size, mime_type: file.mimetype,
                    change_notes: 'Versi pertama', uploaded_by_id: uploaderId, is_latest: true,
                },
            });
            return document;
        });
    }

    async addVersion(documentId: string, file: { originalname: string; size: number; mimetype: string }, filePath: string, uploaderId: string, changeNotes?: string) {
        return this.prisma.$transaction(async (tx) => {
            const latest = await tx.documentVersion.findFirst({ where: { document_id: documentId }, orderBy: { version_number: 'desc' } });
            const nextVersion = (latest?.version_number ?? 0) + 1;
            await tx.documentVersion.updateMany({ where: { document_id: documentId }, data: { is_latest: false } });
            return tx.documentVersion.create({
                data: {
                    document_id: documentId, version_number: nextVersion, file_name: file.originalname,
                    file_path: filePath, file_size: file.size, mime_type: file.mimetype,
                    change_notes: changeNotes, uploaded_by_id: uploaderId, is_latest: true,
                },
            });
        });
    }

    async linkToProject(documentId: string, projectId: string, userId: string) {
        return this.prisma.projectDocument.create({
            data: { document_id: documentId, project_id: projectId, linked_by_id: userId },
        });
    }

    async unlinkFromProject(documentId: string, projectId: string) {
        return this.prisma.projectDocument.deleteMany({ where: { document_id: documentId, project_id: projectId } });
    }

    async getProjectDocuments(projectId: string) {
        return this.prisma.projectDocument.findMany({
            where: { project_id: projectId },
            include: {
                document: { include: { versions: { where: { is_latest: true }, take: 1 }, uploaded_by: { select: { full_name: true } } } },
                linked_by: { select: { full_name: true } },
            },
        });
    }

    async remove(id: string) {
        return this.prisma.document.update({ where: { id }, data: { is_active: false } });
    }
}
