import { IsString, IsNotEmpty, IsOptional, IsInt, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateLinkDto {
    @ApiProperty({ example: 'RKAP 2024' })
    @IsString()
    @IsNotEmpty()
    nama_link: string;

    @ApiProperty({ example: 'https://yourcloud.sharepoint.com' })
    @IsString()
    @IsNotEmpty()
    url: string;

    @ApiProperty({ example: 1 })
    @IsInt()
    @Type(() => Number)
    urutan: number;
}
