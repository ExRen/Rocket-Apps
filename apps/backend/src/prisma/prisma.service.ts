import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AsyncLocalStorage } from 'async_hooks';

// AsyncLocalStorage menyimpan userId per-request
export const requestContext = new AsyncLocalStorage<{ userId: string }>();

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
    async onModuleInit() {
        await this.$connect();
        this.setupLoggingMiddleware();
    }

    private setupLoggingMiddleware() {
        const TRACKED_MODELS = ['Project', 'SubProject', 'AnggaranPos', 'RealisasiAnggaran'];

        this.$use(async (params, next) => {
            if (!params.model || !TRACKED_MODELS.includes(params.model)) {
                return next(params);
            }

            const isWriteOperation = ['create', 'update', 'delete'].includes(params.action);
            if (!isWriteOperation) {
                return next(params);
            }

            let oldValue = null;
            if (params.action === 'update' || params.action === 'delete') {
                try {
                    const modelName = params.model.charAt(0).toLowerCase() + params.model.slice(1);
                    oldValue = await (this as any)[modelName].findUnique({
                        where: params.args.where,
                    });
                } catch { /* ignore */ }
            }

            const result = await next(params);

            const context = requestContext.getStore();
            const userId = context?.userId;

            if (userId) {
                try {
                    await this.activityLog.create({
                        data: {
                            user_id: userId,
                            entity_type: params.model!,
                            entity_id: result?.id || params.args?.where?.id || 'unknown',
                            action: params.action.toUpperCase(),
                            old_value: oldValue ? this.sanitizeValue(oldValue) : null,
                            new_value: result ? this.sanitizeValue(result) : null,
                            description: this.generateDescription(params.model!, params.action, oldValue, result),
                        },
                    });
                } catch { /* jangan block operasi utama */ }
            }

            return result;
        });
    }

    private sanitizeValue(value: any) {
        if (!value || typeof value !== 'object') return value;
        const { created_at, updated_at, deleted_at, ...rest } = value;
        return rest;
    }

    private generateDescription(model: string, action: string, oldVal: any, newVal: any): string {
        if (action === 'create') return `Membuat ${model} baru`;
        if (action === 'delete') return `Menghapus ${model}`;
        if (action === 'update' && oldVal?.status !== newVal?.status) {
            return `Mengubah status dari '${oldVal?.status}' menjadi '${newVal?.status}'`;
        }
        if (action === 'update' && oldVal?.due_date?.toString() !== newVal?.due_date?.toString()) {
            return `Mengubah due date`;
        }
        return `Memperbarui ${model}`;
    }
}
