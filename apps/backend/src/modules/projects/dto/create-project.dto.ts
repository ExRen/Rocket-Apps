import { IsString, IsNotEmpty, IsOptional, IsEnum, IsInt, IsUUID, Min, Max, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ProjectStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateProjectDto {
    @ApiProperty({ example: 'Pembuatan Video Company Profile 2025' })
    @IsString()
    @IsNotEmpty()
    @MinLength(3)
    name: string;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    working_folder?: string;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    update_notes?: string;

    @ApiProperty({ example: '2025-06-30' })
    @IsString()
    @IsNotEmpty()
    due_date: string;

    @ApiProperty({ enum: ProjectStatus, required: false })
    @IsEnum(ProjectStatus)
    @IsOptional()
    status?: ProjectStatus;

    @ApiProperty({ example: 6 })
    @IsInt()
    @Min(1)
    @Max(12)
    @Type(() => Number)
    month: number;

    @ApiProperty({ example: 2025 })
    @IsInt()
    @Type(() => Number)
    year: number;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    client?: string;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    keterangan?: string;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    document_url?: string;

    @ApiProperty()
    @IsUUID()
    @IsNotEmpty()
    pic_user_id: string;
}
