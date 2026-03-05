import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { StorageService } from '../../common/services/storage.service';

@Module({
    imports: [PrismaModule],
    controllers: [DocumentsController],
    providers: [DocumentsService, StorageService],
    exports: [DocumentsService, StorageService],
})
export class DocumentsModule { }
