import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CompleteLabDto } from './dto/complete-lab.dto';
import { LabsService } from './labs.service';

@Controller('labs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('student')
export class LabsController {
  constructor(private readonly labsService: LabsService) {}

  @Get()
  listPublishedLabs() {
    return this.labsService.listPublishedLabs();
  }

  @Get(':slugOrId')
  getLab(@Param('slugOrId') slugOrId: string) {
    return this.labsService.getLab(slugOrId);
  }

  @Post(':slugOrId/complete')
  completeLab(
    @Param('slugOrId') slugOrId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CompleteLabDto,
  ) {
    return this.labsService.completeLab(slugOrId, user, dto);
  }
}
