import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { VerifyMfaDto, ConfirmMfaDto } from './dto/verify-mfa.dto';
import { ChangePasswordDto, ResetPasswordDto } from './dto/change-password.dto';
import * as bcrypt from 'bcrypt';
import { generateSecret, verifySync, generateURI } from 'otplib';
import * as QRCode from 'qrcode';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private configService: ConfigService,
    ) { }

    // =========================================================
    // STEP 1: Login (username + password)
    // =========================================================
    async login(loginDto: LoginDto) {
        const user = await this.prisma.user.findUnique({
            where: { ad_username: loginDto.username },
        });

        if (!user) {
            throw new UnauthorizedException('Username atau password salah');
        }

        if (!user.is_active) {
            throw new UnauthorizedException('Akun Anda telah dinonaktifkan. Hubungi administrator.');
        }

        // Verify password (dev mode: accept any password if no hash set)
        if (user.password_hash) {
            const valid = await bcrypt.compare(loginDto.password, user.password_hash);
            if (!valid) {
                throw new UnauthorizedException('Username atau password salah');
            }
        } else if (process.env.NODE_ENV === 'production') {
            throw new UnauthorizedException('Password belum di-set. Hubungi administrator.');
        } else {
            this.logger.warn(`Dev fallback: password kosong diterima untuk ${user.ad_username}`);
        }

        // Check if MFA is required
        if (user.mfa_enabled && user.mfa_verified) {
            // Issue temporary MFA token (short-lived, 5 min)
            const mfaPayload = { sub: user.id, type: 'mfa_pending' };
            const mfaToken = this.jwtService.sign(mfaPayload, { expiresIn: '5m' });

            return {
                requires_mfa: true,
                mfa_token: mfaToken,
            };
        }

        // No MFA → issue full JWT
        return this.issueToken(user);
    }

    // =========================================================
    // STEP 2: Verify MFA (TOTP code)
    // =========================================================
    async verifyMfa(dto: VerifyMfaDto) {
        let payload: any;
        try {
            payload = this.jwtService.verify(dto.mfa_token);
        } catch {
            throw new UnauthorizedException('MFA token expired. Silakan login ulang.');
        }

        if (payload.type !== 'mfa_pending') {
            throw new UnauthorizedException('Invalid MFA token');
        }

        const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
        if (!user || !user.mfa_secret) {
            throw new UnauthorizedException('User tidak ditemukan');
        }

        const result = verifySync({ token: dto.totp_code, secret: user.mfa_secret });
        if (!result.valid) {
            throw new UnauthorizedException('Kode MFA salah. Coba lagi.');
        }

        return this.issueToken(user);
    }

    // =========================================================
    // MFA SETUP: Generate QR code
    // =========================================================
    async setupMfa(userId: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new BadRequestException('User tidak ditemukan');

        if (user.mfa_enabled && user.mfa_verified) {
            throw new BadRequestException('MFA sudah aktif. Nonaktifkan terlebih dahulu.');
        }

        const issuer = this.configService.get('MFA_ISSUER') || 'ROCKET ASABRI';
        const secret = generateSecret();
        const otpauth = generateURI({ issuer, label: user.ad_username, secret });
        const qrDataUrl = await QRCode.toDataURL(otpauth);

        // Save secret (not yet verified)
        await this.prisma.user.update({
            where: { id: userId },
            data: { mfa_secret: secret, mfa_enabled: true, mfa_verified: false },
        });

        return {
            secret,
            qr_code: qrDataUrl,
            otpauth_url: otpauth,
        };
    }

    // =========================================================
    // MFA CONFIRM: Verify first-time TOTP to activate
    // =========================================================
    async confirmMfa(userId: string, dto: ConfirmMfaDto) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.mfa_secret) throw new BadRequestException('Setup MFA terlebih dahulu');

        const result = verifySync({ token: dto.totp_code, secret: user.mfa_secret });
        if (!result.valid) {
            throw new BadRequestException('Kode MFA salah. Pastikan waktu perangkat sinkron.');
        }

        await this.prisma.user.update({
            where: { id: userId },
            data: { mfa_verified: true },
        });

        return { message: 'MFA berhasil diaktifkan' };
    }

    // =========================================================
    // MFA DISABLE
    // =========================================================
    async disableMfa(userId: string) {
        await this.prisma.user.update({
            where: { id: userId },
            data: { mfa_enabled: false, mfa_verified: false, mfa_secret: null },
        });
        return { message: 'MFA berhasil dinonaktifkan' };
    }

    // =========================================================
    // CHANGE PASSWORD
    // =========================================================
    async changePassword(userId: string, dto: ChangePasswordDto) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new BadRequestException('User tidak ditemukan');

        // Verify current password (skip in dev if no hash)
        if (user.password_hash) {
            const valid = await bcrypt.compare(dto.current_password, user.password_hash);
            if (!valid) throw new BadRequestException('Password saat ini salah');
        }

        const hash = await bcrypt.hash(dto.new_password, 10);
        await this.prisma.user.update({
            where: { id: userId },
            data: { password_hash: hash, password_changed_at: new Date() },
        });

        return { message: 'Password berhasil diubah' };
    }

    // =========================================================
    // ADMIN: Reset password user lain
    // =========================================================
    async resetPassword(dto: ResetPasswordDto) {
        const user = await this.prisma.user.findUnique({ where: { id: dto.user_id } });
        if (!user) throw new BadRequestException('User tidak ditemukan');

        const hash = await bcrypt.hash(dto.new_password, 10);
        await this.prisma.user.update({
            where: { id: dto.user_id },
            data: { password_hash: hash, password_changed_at: new Date() },
        });

        return { message: `Password ${user.full_name} berhasil di-reset` };
    }

    // =========================================================
    // GET ME
    // =========================================================
    async getMe(userId: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new UnauthorizedException('User tidak ditemukan');

        return {
            id: user.id,
            ad_username: user.ad_username,
            email: user.email,
            full_name: user.full_name,
            role: user.role,
            is_active: user.is_active,
            mfa_enabled: user.mfa_enabled && user.mfa_verified,
            password_changed_at: user.password_changed_at,
        };
    }

    // =========================================================
    // Helper: Issue JWT token
    // =========================================================
    private issueToken(user: any) {
        const payload = {
            sub: user.id,
            ad_username: user.ad_username,
            email: user.email,
            full_name: user.full_name,
            role: user.role,
        };
        const token = this.jwtService.sign(payload);
        return {
            access_token: token,
            user: {
                id: user.id,
                ad_username: user.ad_username,
                email: user.email,
                full_name: user.full_name,
                role: user.role,
                mfa_enabled: user.mfa_enabled && user.mfa_verified,
            },
        };
    }
}
