import { IsString, IsNotEmpty, IsOptional, IsEnum, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ProjectStatus } from '@prisma/client';

export class CreateSubProjectDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    due_date: string;

    @ApiProperty()
    @IsUUID()
    @IsNotEmpty()
    pic_user_id: string;

    @ApiProperty({ enum: ProjectStatus, required: false })
    @IsEnum(ProjectStatus)
    @IsOptional()
    status?: ProjectStatus;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    update_notes?: string;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    keterangan?: string;
}
