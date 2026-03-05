import { IsString, IsNotEmpty, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateRealisasiDto {
    @ApiProperty()
    @IsUUID()
    @IsNotEmpty()
    anggaran_pos_id: string;

    @ApiProperty({ example: 'Pembuatan Spanduk HUT ASABRI' })
    @IsString()
    @IsNotEmpty()
    kegiatan: string;

    @ApiProperty({ example: 15000000 })
    @IsNumber()
    @Min(0)
    @Type(() => Number)
    jumlah: number;

    @ApiProperty({ example: '2025-03-15' })
    @IsString()
    @IsNotEmpty()
    tanggal_input: string;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    nd_realisasi?: string;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    dokumen_url?: string;
}
