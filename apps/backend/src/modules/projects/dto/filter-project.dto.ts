import { IsOptional, IsEnum, IsInt, IsString, IsUUID, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ProjectStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class FilterProjectDto {
    @ApiProperty({ required: false })
    @IsUUID()
    @IsOptional()
    pic_user_id?: string;

    @ApiProperty({ enum: ProjectStatus, required: false })
    @IsEnum(ProjectStatus)
    @IsOptional()
    status?: ProjectStatus;

    @ApiProperty({ required: false })
    @IsInt()
    @Min(1)
    @Max(12)
    @IsOptional()
    @Type(() => Number)
    month?: number;

    @ApiProperty({ required: false })
    @IsInt()
    @IsOptional()
    @Type(() => Number)
    year?: number;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    search?: string;

    @ApiProperty({ required: false, default: 1 })
    @IsInt()
    @Min(1)
    @IsOptional()
    @Type(() => Number)
    page?: number = 1;

    @ApiProperty({ required: false, default: 20 })
    @IsInt()
    @Min(1)
    @Max(100)
    @IsOptional()
    @Type(() => Number)
    limit?: number = 20;
}
