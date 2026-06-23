import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { MailModule } from './mail/mail.module';
import { AuthModule } from './auth/auth.module';
import { ProfileModule } from './profile/profile.module';
import { LmsAdminModule } from './lms-admin/lms-admin.module';
import { CoursesModule } from './courses/courses.module';
import { AdminAnalyticsModule } from './admin-analytics/admin-analytics.module';
import { SimulatorModule } from './simulator/simulator.module';
import { ScheduleModule } from '@nestjs/schedule';
import { LabsModule } from './labs/labs.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    MailModule,
    AuthModule,
    ProfileModule,
    LmsAdminModule,
    CoursesModule,
    LabsModule,
    AdminAnalyticsModule,
    SimulatorModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
