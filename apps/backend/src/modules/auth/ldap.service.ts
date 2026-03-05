import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as ldap from 'ldapjs';

@Injectable()
export class LdapService {
    private readonly logger = new Logger(LdapService.name);

    constructor(private configService: ConfigService) { }

    /**
     * Verifikasi username dan password pengguna ke Active Directory.
     * Jika berhasil, kembalikan atribut user dari AD.
     */
    async authenticate(username: string, password: string): Promise<any> {
        return new Promise((resolve, reject) => {
            const ldapUrl = this.configService.get('LDAP_URL');
            const userDnFormat = this.configService.get('LDAP_USER_DN_FORMAT');
            const baseDn = this.configService.get('LDAP_BASE_DN');

            const userDn = userDnFormat.replace('{username}', username);

            const client = ldap.createClient({ url: ldapUrl });

            client.on('error', (err) => {
                this.logger.error(`Koneksi LDAP error: ${err.message}`);
                reject(new UnauthorizedException('Tidak dapat terhubung ke server autentikasi'));
            });

            client.bind(userDn, password, (bindErr) => {
                if (bindErr) {
                    this.logger.warn(`Login gagal untuk user: ${username}`);
                    client.destroy();
                    reject(new UnauthorizedException('Username atau password salah'));
                    return;
                }

                const searchOptions: ldap.SearchOptions = {
                    filter: `(sAMAccountName=${username})`,
                    scope: 'sub',
                    attributes: ['mail', 'displayName', 'sAMAccountName'],
                };

                client.search(baseDn, searchOptions, (searchErr, res) => {
                    if (searchErr) {
                        client.destroy();
                        reject(new UnauthorizedException('Gagal mengambil data user'));
                        return;
                    }

                    let userEntry: any = null;

                    res.on('searchEntry', (entry) => {
                        userEntry = {
                            ad_username: entry.pojo.attributes.find(a => a.type === 'sAMAccountName')?.values[0] || username,
                            email: entry.pojo.attributes.find(a => a.type === 'mail')?.values[0] || '',
                            full_name: entry.pojo.attributes.find(a => a.type === 'displayName')?.values[0] || username,
                        };
                    });

                    res.on('end', () => {
                        client.destroy();
                        if (userEntry) {
                            resolve(userEntry);
                        } else {
                            reject(new UnauthorizedException('Data user tidak ditemukan di direktori'));
                        }
                    });

                    res.on('error', () => {
                        client.destroy();
                        reject(new UnauthorizedException('Error saat mencari data user'));
                    });
                });
            });
        });
    }
}
