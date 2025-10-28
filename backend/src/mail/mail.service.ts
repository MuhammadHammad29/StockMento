import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly mailerService: MailerService) {}

  async sendVerificationEmail(to: string, code: string): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to,
        subject: 'Verify your StockMento account',
        text: `Use the following code to verify your email: ${code}`,
        html: `<p>Use the following code to verify your email:</p><p style="font-size: 24px; font-weight: bold;">${code}</p>`,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send verification email to ${to}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async sendPasswordResetEmail(to: string, resetLink: string): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to,
        subject: 'Reset your StockMento password',
        text: `Reset your password using the following link: ${resetLink}`,
        html: `<p>Reset your password using the following link:</p><p><a href="${resetLink}">${resetLink}</a></p>`,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email to ${to}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
