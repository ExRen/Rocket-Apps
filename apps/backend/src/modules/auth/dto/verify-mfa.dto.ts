import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyMfaDto {
    @ApiProperty() @IsNotEmpty() @IsString()
    mfa_token: string;

    @ApiProperty() @IsNotEmpty() @IsString() @MinLength(6)
    totp_code: string;
}

export class ConfirmMfaDto {
    @ApiProperty() @IsNotEmpty() @IsString() @MinLength(6)
    totp_code: string;
}
