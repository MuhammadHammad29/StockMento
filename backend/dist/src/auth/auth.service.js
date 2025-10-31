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
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const bcrypt_1 = require("bcrypt");
const crypto_1 = require("crypto");
const mail_service_1 = require("../mail/mail.service");
const client_2 = require("@prisma/client");
const OTP_EXPIRATION_MINUTES = 10;
const PASSWORD_RESET_EXPIRATION_MINUTES = 30;
let AuthService = AuthService_1 = class AuthService {
    prisma;
    jwtService;
    configService;
    mailService;
    logger = new common_1.Logger(AuthService_1.name);
    constructor(prisma, jwtService, configService, mailService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.configService = configService;
        this.mailService = mailService;
    }
    async register(dto) {
        try {
            const existing = await this.prisma.identity.findUnique({
                where: { email: dto.email },
            });
            if (existing) {
                if (existing.status === client_1.IdentityStatus.pending) {
                    await this.createAndSendVerification(existing.id, existing.email);
                    return {
                        message: 'Verification code re-sent. Please check your email.',
                    };
                }
                throw new common_1.ConflictException('An account with this email already exists. Please sign in instead.');
            }
            const passwordHash = await (0, bcrypt_1.hash)(dto.password, 10);
            const trimmedFirstName = dto.firstName.trim();
            const trimmedLastName = dto.lastName.trim();
            const trimmedBio = dto.bio?.trim() ?? '';
            const identity = await this.prisma.identity.create({
                data: {
                    email: dto.email,
                    passwordHash,
                    status: client_1.IdentityStatus.pending,
                    profile: {
                        create: {
                            firstName: trimmedFirstName,
                            lastName: trimmedLastName,
                            avatarUrl: dto.avatarId ?? null,
                            bio: trimmedBio.length > 0 ? trimmedBio : null,
                        },
                    },
                    memberships: {
                        create: {
                            app: client_1.MembershipApp.lms,
                            status: client_1.MembershipStatus.active,
                        },
                    },
                },
                include: {
                    profile: true,
                },
            });
            await this.createAndSendVerification(identity.id, identity.email);
            return {
                message: 'Account created successfully! Please check your email for the verification code.',
            };
        }
        catch (error) {
            if (error instanceof common_1.ConflictException ||
                error instanceof common_1.BadRequestException) {
                throw error;
            }
            if (error instanceof client_2.Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2002') {
                    throw new common_1.ConflictException('An account with this email already exists.');
                }
                this.logger.error(`Prisma error during registration: ${error.message}`, error.stack);
                throw new common_1.InternalServerErrorException('A database error occurred. Please try again later.');
            }
            this.logger.error('Unexpected error during registration', error instanceof Error ? error.stack : undefined);
            throw new common_1.InternalServerErrorException('An unexpected error occurred. Please try again later.');
        }
    }
    async sendVerificationCode(dto) {
        try {
            const identity = await this.prisma.identity.findUnique({
                where: { email: dto.email },
            });
            if (!identity) {
                throw new common_1.BadRequestException('No account found with this email address.');
            }
            if (identity.status === client_1.IdentityStatus.active) {
                return { message: 'Your account is already verified.' };
            }
            await this.createAndSendVerification(identity.id, identity.email);
            return {
                message: 'Verification code sent successfully. Please check your email.',
            };
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            this.logger.error('Error sending verification code', error instanceof Error ? error.stack : undefined);
            throw new common_1.InternalServerErrorException('Failed to send verification code. Please try again later.');
        }
    }
    async verifyEmail(dto) {
        try {
            const tokenRecord = await this.prisma.emailOtpToken.findUnique({
                where: { email: dto.email },
            });
            if (!tokenRecord || tokenRecord.used) {
                throw new common_1.BadRequestException('Invalid or expired verification code. Please request a new code.');
            }
            if (tokenRecord.expiresAt < new Date()) {
                throw new common_1.BadRequestException('Verification code has expired. Please request a new code.');
            }
            const codeMatches = await (0, bcrypt_1.compare)(dto.code, tokenRecord.codeHash);
            if (!codeMatches) {
                throw new common_1.BadRequestException('Invalid verification code. Please check and try again.');
            }
            const identity = await this.prisma.identity.findUnique({
                where: { email: dto.email },
                include: { profile: true },
            });
            if (!identity) {
                throw new common_1.BadRequestException('Account not found. Please register first.');
            }
            const updatedIdentity = await this.prisma.identity.update({
                where: { id: identity.id },
                data: {
                    status: client_1.IdentityStatus.active,
                    lastLoginAt: new Date(),
                },
                include: { profile: true },
            });
            await this.prisma.emailOtpToken.update({
                where: { email: dto.email },
                data: {
                    used: true,
                },
            });
            const tokens = this.generateTokens(updatedIdentity, 'student');
            return {
                user: this.mapToAuthUser(updatedIdentity),
                tokens,
            };
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException ||
                error instanceof common_1.UnauthorizedException) {
                throw error;
            }
            this.logger.error('Error verifying email', error instanceof Error ? error.stack : undefined);
            throw new common_1.InternalServerErrorException('Failed to verify email. Please try again later.');
        }
    }
    async login(dto) {
        try {
            const identity = await this.prisma.identity.findUnique({
                where: { email: dto.email },
                include: { profile: true },
            });
            if (!identity) {
                throw new common_1.UnauthorizedException('Invalid email or password. Please check your credentials and try again.');
            }
            const isValidPassword = await (0, bcrypt_1.compare)(dto.password, identity.passwordHash);
            if (!isValidPassword) {
                throw new common_1.UnauthorizedException('Invalid email or password. Please check your credentials and try again.');
            }
            if (identity.status !== client_1.IdentityStatus.active) {
                throw new common_1.UnauthorizedException('Please verify your email before signing in. Check your inbox for the verification code.');
            }
            await this.prisma.identity.update({
                where: { id: identity.id },
                data: { lastLoginAt: new Date() },
            });
            const tokens = this.generateTokens(identity, 'student');
            return {
                user: this.mapToAuthUser(identity),
                tokens,
            };
        }
        catch (error) {
            if (error instanceof common_1.UnauthorizedException) {
                throw error;
            }
            this.logger.error('Error during login', error instanceof Error ? error.stack : undefined);
            throw new common_1.InternalServerErrorException('An error occurred during login. Please try again later.');
        }
    }
    async loginAdmin(dto) {
        try {
            const adminIdentity = await this.prisma.adminIdentity.findUnique({
                where: { email: dto.email },
            });
            if (!adminIdentity) {
                throw new common_1.UnauthorizedException('Invalid email or password. Please check your credentials and try again.');
            }
            const isValidPassword = await (0, bcrypt_1.compare)(dto.password, adminIdentity.passwordHash);
            if (!isValidPassword) {
                throw new common_1.UnauthorizedException('Invalid email or password. Please check your credentials and try again.');
            }
            if (adminIdentity.status !== client_1.AdminStatus.active) {
                throw new common_1.UnauthorizedException('This administrator account is disabled. Contact support for assistance.');
            }
            await this.prisma.adminIdentity.update({
                where: { id: adminIdentity.id },
                data: { lastLoginAt: new Date() },
            });
            const tokens = this.generateTokens(adminIdentity, 'admin');
            return {
                user: this.mapAdminToAuthUser(adminIdentity),
                tokens,
            };
        }
        catch (error) {
            if (error instanceof common_1.UnauthorizedException) {
                throw error;
            }
            this.logger.error('Error during admin login', error instanceof Error ? error.stack : undefined);
            throw new common_1.InternalServerErrorException('An error occurred during login. Please try again later.');
        }
    }
    async refreshTokens(dto) {
        try {
            if (!dto.refreshToken) {
                throw new common_1.UnauthorizedException('Refresh token is required');
            }
            const payload = await this.jwtService.verifyAsync(dto.refreshToken, {
                secret: this.configService.getOrThrow('JWT_REFRESH_SECRET'),
            });
            if (payload.role === 'admin') {
                const adminIdentity = await this.prisma.adminIdentity.findUnique({
                    where: { id: payload.sub },
                });
                if (!adminIdentity || adminIdentity.status !== client_1.AdminStatus.active) {
                    throw new common_1.UnauthorizedException();
                }
                const tokens = this.generateTokens(adminIdentity, 'admin');
                return {
                    user: this.mapAdminToAuthUser(adminIdentity),
                    tokens,
                };
            }
            const identity = await this.prisma.identity.findUnique({
                where: { id: payload.sub },
                include: { profile: true },
            });
            if (!identity || identity.status !== client_1.IdentityStatus.active) {
                throw new common_1.UnauthorizedException();
            }
            const tokens = this.generateTokens(identity, 'student');
            return {
                user: this.mapToAuthUser(identity),
                tokens,
            };
        }
        catch (error) {
            this.logger.error('Failed to refresh tokens', error instanceof Error ? error.stack : undefined);
            throw new common_1.UnauthorizedException('Invalid refresh token.');
        }
    }
    logout() {
        return { message: 'Logged out successfully.' };
    }
    async requestPasswordReset(dto) {
        const identity = await this.prisma.identity.findUnique({
            where: { email: dto.email },
        });
        if (!identity) {
            return {
                message: 'If an account exists for that email, a reset link has been sent.',
            };
        }
        const rawToken = (0, crypto_1.randomBytes)(32).toString('hex');
        const tokenHash = this.hashToken(rawToken);
        const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRATION_MINUTES * 60 * 1000);
        await this.prisma.passwordResetToken.create({
            data: {
                userId: identity.id,
                tokenHash,
                expiresAt,
            },
        });
        const frontendUrl = this.configService.get('FRONTEND_URL', 'http://localhost:3000');
        const resetLink = `${frontendUrl.replace(/\/$/, '')}/reset-password?token=${rawToken}&email=${encodeURIComponent(dto.email)}`;
        await this.mailService.sendPasswordResetEmail(dto.email, resetLink);
        return {
            message: 'If an account exists for that email, a reset link has been sent.',
        };
    }
    async confirmPasswordReset(dto) {
        const identity = await this.prisma.identity.findUnique({
            where: { email: dto.email },
        });
        if (!identity) {
            throw new common_1.BadRequestException('Invalid password reset token.');
        }
        const tokenHash = this.hashToken(dto.token);
        const tokenRecord = await this.prisma.passwordResetToken.findFirst({
            where: {
                userId: identity.id,
                tokenHash,
                used: false,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
            throw new common_1.BadRequestException('Invalid or expired password reset token.');
        }
        const passwordMatches = await (0, bcrypt_1.compare)(dto.password, identity.passwordHash);
        if (passwordMatches) {
            throw new common_1.BadRequestException('New password must be different from your current password.');
        }
        const newPasswordHash = await (0, bcrypt_1.hash)(dto.password, 10);
        await this.prisma.$transaction([
            this.prisma.identity.update({
                where: { id: identity.id },
                data: {
                    passwordHash: newPasswordHash,
                },
            }),
            this.prisma.passwordResetToken.update({
                where: { id: tokenRecord.id },
                data: { used: true },
            }),
        ]);
        return { message: 'Password reset successfully.' };
    }
    async getCurrentUser(payload) {
        if (payload.role === 'admin') {
            const adminIdentity = await this.prisma.adminIdentity.findUnique({
                where: { id: payload.sub },
            });
            if (!adminIdentity || adminIdentity.status !== client_1.AdminStatus.active) {
                throw new common_1.UnauthorizedException();
            }
            return this.mapAdminToAuthUser(adminIdentity);
        }
        const identity = await this.prisma.identity.findUnique({
            where: { id: payload.sub },
            include: { profile: true },
        });
        if (!identity || identity.status !== client_1.IdentityStatus.active) {
            throw new common_1.UnauthorizedException();
        }
        return this.mapToAuthUser(identity);
    }
    generateTokens(identity, role) {
        const payload = {
            sub: identity.id,
            email: identity.email,
            role,
        };
        const accessToken = this.jwtService.sign(payload, {
            secret: this.configService.getOrThrow('JWT_ACCESS_SECRET'),
            expiresIn: this.getTokenExpiry('JWT_ACCESS_EXPIRES', 900),
        });
        const refreshToken = this.jwtService.sign(payload, {
            secret: this.configService.getOrThrow('JWT_REFRESH_SECRET'),
            expiresIn: this.getTokenExpiry('JWT_REFRESH_EXPIRES', 2_592_000),
        });
        return { accessToken, refreshToken };
    }
    async createAndSendVerification(userId, email) {
        const code = this.generateOtpCode();
        const codeHash = await (0, bcrypt_1.hash)(code, 10);
        const expiresAt = new Date(Date.now() + OTP_EXPIRATION_MINUTES * 60 * 1000);
        await this.prisma.emailOtpToken.upsert({
            where: { email },
            create: {
                email,
                codeHash,
                expiresAt,
                payload: { userId },
            },
            update: {
                codeHash,
                used: false,
                expiresAt,
                payload: { userId },
            },
        });
        await this.mailService.sendVerificationEmail(email, code);
    }
    generateOtpCode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }
    hashToken(token) {
        return (0, crypto_1.createHash)('sha256').update(token).digest('hex');
    }
    getTokenExpiry(key, fallback) {
        const value = this.configService.get(key);
        const parsed = value !== undefined ? Number(value) : fallback;
        return Number.isNaN(parsed) ? fallback : parsed;
    }
    mapToAuthUser(identity) {
        return {
            id: identity.id,
            email: identity.email,
            firstName: identity.profile?.firstName ?? '',
            lastName: identity.profile?.lastName ?? '',
            avatarId: identity.profile?.avatarUrl ?? null,
            role: 'student',
            status: identity.status,
        };
    }
    mapAdminToAuthUser(admin) {
        return {
            id: admin.id,
            email: admin.email,
            firstName: admin.name,
            lastName: '',
            avatarId: null,
            role: 'admin',
            status: admin.status === client_1.AdminStatus.active
                ? client_1.IdentityStatus.active
                : client_1.IdentityStatus.disabled,
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        config_1.ConfigService,
        mail_service_1.MailService])
], AuthService);
//# sourceMappingURL=auth.service.js.map