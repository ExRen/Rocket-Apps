import { PartialType } from '@nestjs/swagger';
import { CreateAnggaranPosDto } from './create-anggaran-pos.dto';

export class UpdateAnggaranPosDto extends PartialType(CreateAnggaranPosDto) { }
