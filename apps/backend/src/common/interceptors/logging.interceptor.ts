import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { requestContext } from '../../prisma/prisma.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    private readonly logger = new Logger('HTTP');

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const { method, url } = request;
        const now = Date.now();
        const userId = request.user?.id;

        // Jalankan handler dalam requestContext agar Prisma middleware bisa akses userId
        return new Observable((observer) => {
            requestContext.run({ userId }, () => {
                next.handle().pipe(
                    tap(() => {
                        const response = context.switchToHttp().getResponse();
                        const duration = Date.now() - now;
                        this.logger.log(`${method} ${url} ${response.statusCode} — ${duration}ms`);
                    }),
                ).subscribe({
                    next: (value) => observer.next(value),
                    error: (err) => observer.error(err),
                    complete: () => observer.complete(),
                });
            });
        });
    }
}
