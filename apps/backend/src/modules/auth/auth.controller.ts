import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { VerifyMfaDto, ConfirmMfaDto } from './dto/verify-mfa.dto';
import { ChangePasswordDto, ResetPasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    // ---- Login Step 1: Username + Password ----
    @Post('login')
    async login(@Body() loginDto: LoginDto) {
        return this.authService.login(loginDto);
    }

    // ---- Login Step 2: Verify MFA TOTP code ----
    @Post('verify-mfa')
    async verifyMfa(@Body() dto: VerifyMfaDto) {
        return this.authService.verifyMfa(dto);
    }

    // ---- Setup MFA: Get QR code ----
    @Post('setup-mfa')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    async setupMfa(@CurrentUser() user: any) {
        return this.authService.setupMfa(user.id);
    }

    // ---- Confirm MFA: Verify first TOTP to activate ----
    @Post('confirm-mfa')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    async confirmMfa(@CurrentUser() user: any, @Body() dto: ConfirmMfaDto) {
        return this.authService.confirmMfa(user.id, dto);
    }

    // ---- Disable MFA ----
    @Post('disable-mfa')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    async disableMfa(@CurrentUser() user: any) {
        return this.authService.disableMfa(user.id);
    }

    // ---- Change own password ----
    @Post('change-password')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    async changePassword(@CurrentUser() user: any, @Body() dto: ChangePasswordDto) {
        return this.authService.changePassword(user.id, dto);
    }

    // ---- Admin: Reset another user's password ----
    @Post('reset-password')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('SUPER_USER', 'LEVEL_1')
    @ApiBearerAuth()
    async resetPassword(@Body() dto: ResetPasswordDto) {
        return this.authService.resetPassword(dto);
    }

    // ---- Logout ----
    @Post('logout')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    async logout() {
        return { message: 'Logged out successfully' };
    }

    // ---- Get current user info ----
    @Get('me')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    async getMe(@CurrentUser() user: any) {
        return this.authService.getMe(user.id);
    }
}
