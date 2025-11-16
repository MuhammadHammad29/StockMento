import { Module } from '@nestjs/common';
import { LmsAdminService } from './lms-admin.service';
import { LmsAdminController } from './lms-admin.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LmsAdminController],
  providers: [LmsAdminService],
})
export class LmsAdminModule {}
