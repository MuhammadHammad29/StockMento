import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RolesGuard } from '../common/guards/roles.guard';
import { LabsController } from './labs.controller';
import { LabsService } from './labs.service';

@Module({
  imports: [PrismaModule],
  controllers: [LabsController],
  providers: [LabsService, RolesGuard],
})
export class LabsModule {}
