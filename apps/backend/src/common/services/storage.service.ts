import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class StorageService {
    private uploadDir: string;

    constructor() {
        this.uploadDir = process.env.UPLOAD_DEST || path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
        }
    }

    async save(file: Express.Multer.File, subfolder: string): Promise<string> {
        const subDir = path.join(this.uploadDir, subfolder);
        if (!fs.existsSync(subDir)) {
            fs.mkdirSync(subDir, { recursive: true });
        }
        const uniqueName = `${subfolder}/${Date.now()}-${file.originalname}`;
        const destPath = path.join(this.uploadDir, uniqueName);
        await fs.promises.writeFile(destPath, file.buffer);
        return uniqueName;
    }

    async getSignedUrl(filePath: string): Promise<string> {
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
        return `${backendUrl}/files/${filePath}`;
    }

    getAbsolutePath(filePath: string): string {
        return path.join(this.uploadDir, filePath);
    }
}
