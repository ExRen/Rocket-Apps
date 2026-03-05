import { PartialType } from '@nestjs/swagger';
import { CreateRealisasiDto } from './create-realisasi.dto';

export class UpdateRealisasiDto extends PartialType(CreateRealisasiDto) { }
