import { IsString, MinLength, IsOptional, IsUUID } from 'class-validator';

export class CreateCommentDto {
    @IsString()
    @MinLength(1, { message: 'Komentar tidak boleh kosong' })
    message: string;

    @IsOptional()
    @IsUUID()
    parent_id?: string;
}
