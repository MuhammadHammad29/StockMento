import { MailerService } from '@nestjs-modules/mailer';
export declare class MailService {
    private readonly mailerService;
    private readonly logger;
    constructor(mailerService: MailerService);
    sendVerificationEmail(to: string, code: string): Promise<void>;
    sendPasswordResetEmail(to: string, resetLink: string): Promise<void>;
}
