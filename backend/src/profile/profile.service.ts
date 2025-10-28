import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto, UpdatePasswordDto, DeleteAccountDto } from './dto';
import * as bcrypt from 'bcrypt';

type ProfileMeta = Record<string, unknown>;

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const identity = await this.prisma.identity.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!identity) {
      throw new NotFoundException('User not found.');
    }

    return this.toProfileResponse(identity);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const identity = await this.prisma.identity.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!identity) {
      throw new NotFoundException('User not found.');
    }

    const metaTouched = dto.meta !== undefined;
    const profileTouched =
      dto.firstName !== undefined ||
      dto.lastName !== undefined ||
      dto.bio !== undefined ||
      dto.avatarId !== undefined;

    if (!profileTouched && !metaTouched) {
      throw new BadRequestException('No changes submitted.');
    }

    const existingMeta = (identity.profile?.meta ?? {}) as ProfileMeta;
    let nextMeta = existingMeta;

    if (metaTouched) {
      nextMeta = { ...existingMeta };

      if (dto.meta) {
        nextMeta = {
          ...nextMeta,
          ...dto.meta,
        };
      }
    }

    const profileUpdateData: Prisma.UserProfileUpdateInput = {};

    if (dto.firstName !== undefined) {
      profileUpdateData.firstName = dto.firstName.trim();
    }

    if (dto.lastName !== undefined) {
      profileUpdateData.lastName = dto.lastName.trim();
    }

    if (dto.bio !== undefined) {
      const trimmedBio = dto.bio ? dto.bio.trim() : '';
      profileUpdateData.bio = trimmedBio.length > 0 ? trimmedBio : null;
    }

    if (dto.avatarId !== undefined) {
      const trimmedAvatar = dto.avatarId ? dto.avatarId.trim() : '';
      profileUpdateData.avatarUrl =
        trimmedAvatar.length > 0 ? trimmedAvatar : null;
    }

    if (metaTouched) {
      if (Object.keys(nextMeta).length === 0) {
        profileUpdateData.meta = Prisma.JsonNull;
      } else {
        profileUpdateData.meta = nextMeta as Prisma.JsonObject;
      }
    }

    profileUpdateData.updatedAt = new Date();

    try {
      await this.prisma.$transaction(async (tx) => {
        if (identity.profile) {
          await tx.userProfile.update({
            where: { userId },
            data: profileUpdateData,
          });
        } else {
          await tx.userProfile.create({
            data: {
              userId,
              firstName: dto.firstName?.trim() ?? identity.email.split('@')[0],
              lastName: dto.lastName?.trim() ?? '',
              bio: dto.bio && dto.bio.trim().length > 0 ? dto.bio.trim() : null,
              avatarUrl:
                dto.avatarId && dto.avatarId.trim().length > 0
                  ? dto.avatarId.trim()
                  : null,
              meta:
                metaTouched && Object.keys(nextMeta).length === 0
                  ? Prisma.JsonNull
                  : (nextMeta as Prisma.JsonObject),
            },
          });
        }

        await tx.identity.update({
          where: { id: userId },
          data: {
            updatedAt: new Date(),
          },
        });
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException('Failed to update profile.');
    }

    return this.getProfile(userId);
  }

  async updatePassword(userId: string, dto: UpdatePasswordDto) {
    const identity = await this.prisma.identity.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!identity) {
      throw new NotFoundException('User not found.');
    }

    const currentPasswordMatches = await bcrypt.compare(
      dto.currentPassword,
      identity.passwordHash,
    );

    if (!currentPasswordMatches) {
      throw new BadRequestException('Current password is incorrect.');
    }

    const newPasswordMatches = await bcrypt.compare(
      dto.newPassword,
      identity.passwordHash,
    );

    if (newPasswordMatches) {
      throw new BadRequestException(
        'New password must be different from your current password.',
      );
    }

    const newPasswordHash = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.identity.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
        updatedAt: new Date(),
      },
    });

    return { message: 'Password updated successfully.' };
  }

  async deleteAccount(userId: string, dto: DeleteAccountDto) {
    const identity = await this.prisma.identity.findUnique({
      where: { id: userId },
    });

    if (!identity) {
      throw new NotFoundException('User not found.');
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      identity.passwordHash,
    );

    if (!passwordMatches) {
      throw new BadRequestException('Incorrect password.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.emailOtpToken.deleteMany({
        where: { email: identity.email },
      });

      await tx.passwordResetToken.deleteMany({
        where: { userId },
      });

      await tx.appMembership.deleteMany({
        where: { userId },
      });

      await tx.userProfile.deleteMany({
        where: { userId },
      });

      await tx.identity.delete({
        where: { id: userId },
      });
    });

    return { message: 'Account deleted successfully.' };
  }

  private toProfileResponse(identity: {
    id: string;
    email: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    profile: {
      firstName: string;
      lastName: string;
      avatarUrl: string | null;
      bio: string | null;
      meta: Prisma.JsonValue | null;
    } | null;
  }) {
    const meta = (identity.profile?.meta ?? {}) as ProfileMeta;

    return {
      id: identity.id,
      email: identity.email,
      status: identity.status,
      firstName: identity.profile?.firstName ?? '',
      lastName: identity.profile?.lastName ?? '',
      avatarId: identity.profile?.avatarUrl ?? null,
      bio: identity.profile?.bio ?? null,
      meta,
      createdAt: identity.createdAt,
      updatedAt: identity.updatedAt,
    };
  }
}
