import { Module } from '@nestjs/common';
import { LinkPentingService } from './link-penting.service';
import { LinkPentingController } from './link-penting.controller';

@Module({
    controllers: [LinkPentingController],
    providers: [LinkPentingService],
    exports: [LinkPentingService],
})
export class LinkPentingModule { }
