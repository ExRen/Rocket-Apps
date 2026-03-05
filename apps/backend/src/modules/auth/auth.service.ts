import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { LdapService } from './ldap.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private ldapService: LdapService,
    ) { }

    async login(loginDto: LoginDto) {
        let adUser: any;

        try {
            // Coba autentikasi ke LDAP / Active Directory
            adUser = await this.ldapService.authenticate(loginDto.username, loginDto.password);
        } catch (error) {
            // Fallback development: jika LDAP tidak tersedia
            if (process.env.NODE_ENV !== 'production') {
                this.logger.warn('LDAP tidak tersedia, fallback ke login development');

                // Cari user di database lokal (password apapun diterima di dev mode)
                let localUser = await this.prisma.user.findUnique({
                    where: { ad_username: loginDto.username },
                }).catch(() => null);

                // Jika user tidak ditemukan DAN yang dimasukkan username 'admin', buat otomatis
                if (!localUser && loginDto.username === 'admin') {
                    this.logger.warn('Creating default admin user for development');
                    localUser = await this.prisma.user.create({
                        data: {
                            ad_username: 'admin',
                            email: 'admin@asabri.co.id',
                            full_name: 'Administrator Dev',
                            role: 'SUPER_USER',
                        },
                    }).catch(() => null);
                }

                if (!localUser) {
                    throw new UnauthorizedException(
                        'Username tidak ditemukan. Di dev mode, gunakan username dari seed data atau "admin".'
                    );
                }

                adUser = {
                    ad_username: localUser.ad_username,
                    email: localUser.email,
                    full_name: localUser.full_name,
                };
            } else {
                throw new UnauthorizedException('Username atau password salah');
            }
        }

        // Just-in-time provisioning: buat atau perbarui user di database lokal
        const user = await this.prisma.user.upsert({
            where: { ad_username: adUser.ad_username },
            update: {
                email: adUser.email,
                full_name: adUser.full_name,
            },
            create: {
                ad_username: adUser.ad_username,
                email: adUser.email,
                full_name: adUser.full_name,
            },
        });

        if (!user.is_active) {
            throw new UnauthorizedException('Akun Anda telah dinonaktifkan. Hubungi administrator.');
        }

        // Buat JWT token
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
            },
        };
    }

    async getMe(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new UnauthorizedException('User tidak ditemukan');
        }

        return {
            id: user.id,
            ad_username: user.ad_username,
            email: user.email,
            full_name: user.full_name,
            role: user.role,
            is_active: user.is_active,
        };
    }
}
