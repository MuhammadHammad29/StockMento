# Email Delivery (Gmail + Nodemailer)

When the Nest.js backend is scaffolded, use the following steps to enable transactional email delivery (verification codes, password resets) through Gmail with Nodemailer.

## 1. Create a Gmail App Password

1. Enable two-factor authentication on the Gmail account you plan to use.
2. Visit [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords).
3. Generate a new app password (use “Mail” + “Other” for the labels) and copy the 16-character password Google provides.

## 2. Environment Variables

Create/update `backend/.env.local` (or whichever environment file you use) with the following variables:

```env
MAIL_TRANSPORT=smtp://USER%40gmail.com:APP_PASSWORD@smtp.gmail.com:587
MAIL_FROM="StockMento Support <USER@gmail.com>"
```

Alternatively, keep the credentials split:

```env
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=USER@gmail.com
MAIL_PASS=APP_PASSWORD
MAIL_FROM="StockMento Support <USER@gmail.com>"
```

## 3. Install Dependencies

In the Nest backend project:

```bash
npm install @nestjs-modules/mailer nodemailer
```

## 4. Configure the Mailer Module

```ts
// backend/src/mail/mail.module.ts
import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';

@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        transport: config.get<string>('MAIL_TRANSPORT', {
          host: config.get('MAIL_HOST'),
          port: parseInt(config.get('MAIL_PORT', '587'), 10),
          auth: {
            user: config.get('MAIL_USER'),
            pass: config.get('MAIL_PASS'),
          },
        }),
        defaults: {
          from: config.get('MAIL_FROM'),
        },
      }),
    }),
    ConfigModule.forRoot({ isGlobal: true }),
  ],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
```

```ts
// backend/src/mail/mail.service.ts
import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  constructor(private readonly mailer: MailerService) {}

  async sendVerificationEmail(to: string, code: string) {
    await this.mailer.sendMail({
      to,
      subject: 'StockMento Email Verification',
      text: `Use the following code to verify your email: ${code}`,
      html: `<p>Use the following code to verify your email:</p><h2>${code}</h2>`,
    });
  }

  async sendPasswordReset(to: string, resetLink: string) {
    await this.mailer.sendMail({
      to,
      subject: 'StockMento Password Reset',
      text: `Reset your password using the following link: ${resetLink}`,
      html: `<p>Reset your password using the following link:</p><a href="${resetLink}">${resetLink}</a>`,
    });
  }
}
```

## 5. Usage in Auth Flows

Inject `MailService` into the Nest auth module and call the helper methods when issuing verification codes or password reset links.

Example:

```ts
await this.mailService.sendVerificationEmail(user.email, otpCode);
```

## 6. Local Testing

Keep your Gmail account’s “Less secure apps” disabled—App passwords replace that flow. For local testing, consider using [MailHog](https://github.com/mailhog/MailHog) or [Ethereal Email](https://ethereal.email/) to capture emails without sending real messages. Swap the transport URL accordingly when you don’t want to hit Gmail.
