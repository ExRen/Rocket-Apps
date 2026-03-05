import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubmitReviewDto {
    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    comment?: string;
}
