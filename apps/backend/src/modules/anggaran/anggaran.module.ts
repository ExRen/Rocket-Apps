import { Module } from '@nestjs/common';
import { AnggaranService } from './anggaran.service';
import { AnggaranController } from './anggaran.controller';

@Module({
    controllers: [AnggaranController],
    providers: [AnggaranService],
    exports: [AnggaranService],
})
export class AnggaranModule { }
