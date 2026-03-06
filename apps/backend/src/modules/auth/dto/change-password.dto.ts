import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
    @ApiProperty() @IsNotEmpty() @IsString()
    current_password: string;

    @ApiProperty() @IsNotEmpty() @IsString() @MinLength(8)
    new_password: string;
}

export class ResetPasswordDto {
    @ApiProperty() @IsNotEmpty() @IsString()
    user_id: string;

    @ApiProperty() @IsNotEmpty() @IsString() @MinLength(8)
    new_password: string;
}
