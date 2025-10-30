"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const bcrypt_1 = require("bcrypt");
let ProfileService = class ProfileService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getProfile(userId) {
        const identity = await this.prisma.identity.findUnique({
            where: { id: userId },
            include: { profile: true },
        });
        if (!identity) {
            throw new common_1.NotFoundException('User not found.');
        }
        return this.toProfileResponse(identity);
    }
    async updateProfile(userId, dto) {
        const identity = await this.prisma.identity.findUnique({
            where: { id: userId },
            include: { profile: true },
        });
        if (!identity) {
            throw new common_1.NotFoundException('User not found.');
        }
        const metaTouched = dto.meta !== undefined;
        const profileTouched = dto.firstName !== undefined ||
            dto.lastName !== undefined ||
            dto.bio !== undefined ||
            dto.avatarId !== undefined;
        if (!profileTouched && !metaTouched) {
            throw new common_1.BadRequestException('No changes submitted.');
        }
        const existingMeta = (identity.profile?.meta ?? {});
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
        const profileUpdateData = {};
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
                profileUpdateData.meta = client_1.Prisma.JsonNull;
            }
            else {
                profileUpdateData.meta = nextMeta;
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
                }
                else {
                    await tx.userProfile.create({
                        data: {
                            userId,
                            firstName: dto.firstName?.trim() ?? identity.email.split('@')[0],
                            lastName: dto.lastName?.trim() ?? '',
                            bio: dto.bio && dto.bio.trim().length > 0 ? dto.bio.trim() : null,
                            avatarUrl: dto.avatarId && dto.avatarId.trim().length > 0
                                ? dto.avatarId.trim()
                                : null,
                            meta: metaTouched && Object.keys(nextMeta).length === 0
                                ? client_1.Prisma.JsonNull
                                : nextMeta,
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
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException('Failed to update profile.');
        }
        return this.getProfile(userId);
    }
    async updatePassword(userId, dto) {
        const identity = await this.prisma.identity.findUnique({
            where: { id: userId },
            include: { profile: true },
        });
        if (!identity) {
            throw new common_1.NotFoundException('User not found.');
        }
        const currentPasswordMatches = await (0, bcrypt_1.compare)(dto.currentPassword, identity.passwordHash);
        if (!currentPasswordMatches) {
            throw new common_1.BadRequestException('Current password is incorrect.');
        }
        const newPasswordMatches = await (0, bcrypt_1.compare)(dto.newPassword, identity.passwordHash);
        if (newPasswordMatches) {
            throw new common_1.BadRequestException('New password must be different from your current password.');
        }
        const newPasswordHash = await (0, bcrypt_1.hash)(dto.newPassword, 10);
        await this.prisma.identity.update({
            where: { id: userId },
            data: {
                passwordHash: newPasswordHash,
                updatedAt: new Date(),
            },
        });
        return { message: 'Password updated successfully.' };
    }
    async deleteAccount(userId, dto) {
        const identity = await this.prisma.identity.findUnique({
            where: { id: userId },
        });
        if (!identity) {
            throw new common_1.NotFoundException('User not found.');
        }
        const passwordMatches = await (0, bcrypt_1.compare)(dto.password, identity.passwordHash);
        if (!passwordMatches) {
            throw new common_1.BadRequestException('Incorrect password.');
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
    toProfileResponse(identity) {
        const meta = (identity.profile?.meta ?? {});
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
};
exports.ProfileService = ProfileService;
exports.ProfileService = ProfileService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ProfileService);
//# sourceMappingURL=profile.service.js.map