import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReviseReviewDto {
    @ApiProperty({ example: 'Mohon perbaiki format laporan dan tambahkan data pendukung' })
    @IsString()
    @IsNotEmpty()
    comment: string;
}
