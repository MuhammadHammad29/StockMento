import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';

@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const transport = config.get<string>('MAIL_TRANSPORT');

        if (transport) {
          return {
            transport,
            defaults: {
              from: config.get<string>('MAIL_FROM'),
            },
          };
        }

        /**
         * Allow developers to control the transport either through a composed URL or discrete host/port props.
         */
        const host = config.get<string>('MAIL_HOST', 'smtp.gmail.com');
        const port = Number(config.get<string>('MAIL_PORT') ?? '587');
        const secureFlag = config.get<string>('MAIL_SECURE', 'false');
        const secure =
          typeof secureFlag === 'string'
            ? secureFlag.toLowerCase() === 'true'
            : Boolean(secureFlag);

        return {
          transport: {
            host,
            port,
            secure,
            auth: {
              user: config.get<string>('MAIL_USER'),
              pass: config.get<string>('MAIL_PASS'),
            },
          },
          defaults: {
            from: config.get<string>('MAIL_FROM'),
          },
        };
      },
    }),
  ],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
