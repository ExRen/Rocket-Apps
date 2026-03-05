import { IsString, IsNotEmpty, IsNumber, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateAnggaranPosDto {
    @ApiProperty({ example: 'Biaya Publikasi Media Cetak' })
    @IsString()
    @IsNotEmpty()
    nama_pos: string;

    @ApiProperty({ example: 500000000 })
    @IsNumber()
    @Min(0)
    @Type(() => Number)
    total_anggaran: number;

    @ApiProperty({ example: 2025 })
    @IsInt()
    @Type(() => Number)
    tahun: number;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    keterangan?: string;
}
