import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DocumentsService } from './documents.service';
import { StorageService } from '../../common/services/storage.service';

@Controller('documents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DocumentsController {
    constructor(private documentsService: DocumentsService, private storageService: StorageService) { }

    @Get()
    findAll(@Query('category') category?: string) {
        return this.documentsService.findAll(category);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.documentsService.findOne(id);
    }

    @Post()
    @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
    async create(@Body() body: any, @UploadedFile() file: Express.Multer.File, @CurrentUser() user: any) {
        const filePath = await this.storageService.save(file, 'documents');
        return this.documentsService.create({ title: body.title, description: body.description, category: body.category }, file, filePath, user.id);
    }

    @Post(':id/versions')
    @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
    async addVersion(@Param('id') id: string, @Body() body: any, @UploadedFile() file: Express.Multer.File, @CurrentUser() user: any) {
        const filePath = await this.storageService.save(file, 'documents');
        return this.documentsService.addVersion(id, file, filePath, user.id, body.change_notes);
    }

    @Post(':id/link/:projectId')
    linkToProject(@Param('id') id: string, @Param('projectId') projectId: string, @CurrentUser() user: any) {
        return this.documentsService.linkToProject(id, projectId, user.id);
    }

    @Delete(':id/link/:projectId')
    unlinkFromProject(@Param('id') id: string, @Param('projectId') projectId: string) {
        return this.documentsService.unlinkFromProject(id, projectId);
    }

    @Get('project/:projectId')
    getProjectDocuments(@Param('projectId') projectId: string) {
        return this.documentsService.getProjectDocuments(projectId);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.documentsService.remove(id);
    }
}
