import { Module } from '@nestjs/common';
import { RealisasiService } from './realisasi.service';
import { RealisasiController } from './realisasi.controller';

@Module({
    controllers: [RealisasiController],
    providers: [RealisasiService],
    exports: [RealisasiService],
})
export class RealisasiModule { }
