import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
  InternalServerErrorException,
  ConflictException,
} from '@nestjs/common';
import {
  IdentityStatus,
  MembershipApp,
  MembershipStatus,
  AdminStatus,
  AdminIdentity,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { hash, compare } from 'bcrypt';
import { randomBytes, createHash } from 'crypto';
import { MailService } from '../mail/mail.service';
import { Prisma } from '@prisma/client';
import {
  RegisterDto,
  LoginDto,
  AdminLoginDto,
  SendVerificationDto,
  VerifyEmailDto,
  RequestPasswordResetDto,
  ConfirmPasswordResetDto,
  RefreshTokenDto,
} from './dto';
import { AuthTokens, JwtPayload } from './auth.types';
import { AuthUser } from './interfaces/auth-user.interface';

/**
 * Verification codes are short lived so users cannot reuse stale codes.
 */
const OTP_EXPIRATION_MINUTES = 10;

/**
 * Password reset links expire after 30 minutes for security.
 */
const PASSWORD_RESET_EXPIRATION_MINUTES = 30;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Creates a new identity in a pending state and emails an OTP for verification.
   */
  async register(dto: RegisterDto): Promise<{ message: string }> {
    try {
      const existing = await this.prisma.identity.findUnique({
        where: { email: dto.email },
      });

      if (existing) {
        if (existing.status === IdentityStatus.pending) {
          await this.createAndSendVerification(existing.id, existing.email);
          return {
            message: 'Verification code re-sent. Please check your email.',
          };
        }
        throw new ConflictException(
          'An account with this email already exists. Please sign in instead.',
        );
      }

      const passwordHash = await hash(dto.password, 10);
      const trimmedFirstName = dto.firstName.trim();
      const trimmedLastName = dto.lastName.trim();
      const trimmedBio = dto.bio?.trim() ?? '';

      const identity = await this.prisma.identity.create({
        data: {
          email: dto.email,
          passwordHash,
          status: IdentityStatus.pending,
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
              app: MembershipApp.lms,
              status: MembershipStatus.active,
            },
          },
        },
        include: {
          profile: true,
        },
      });

      await this.createAndSendVerification(identity.id, identity.email);

      return {
        message:
          'Account created successfully! Please check your email for the verification code.',
      };
    } catch (error) {
      // Re-throw known exceptions
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      // Handle Prisma-specific errors
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          // Unique constraint violation
          throw new ConflictException(
            'An account with this email already exists.',
          );
        }
        this.logger.error(
          `Prisma error during registration: ${error.message}`,
          error.stack,
        );
        throw new InternalServerErrorException(
          'A database error occurred. Please try again later.',
        );
      }

      // Log unexpected errors
      this.logger.error(
        'Unexpected error during registration',
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(
        'An unexpected error occurred. Please try again later.',
      );
    }
  }

  /**
   * Re-sends an OTP for accounts that have not been activated yet.
   */
  async sendVerificationCode(
    dto: SendVerificationDto,
  ): Promise<{ message: string }> {
    try {
      const identity = await this.prisma.identity.findUnique({
        where: { email: dto.email },
      });

      if (!identity) {
        throw new BadRequestException(
          'No account found with this email address.',
        );
      }

      if (identity.status === IdentityStatus.active) {
        return { message: 'Your account is already verified.' };
      }

      await this.createAndSendVerification(identity.id, identity.email);
      return {
        message:
          'Verification code sent successfully. Please check your email.',
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(
        'Error sending verification code',
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(
        'Failed to send verification code. Please try again later.',
      );
    }
  }

  /**
   * Confirms an OTP, activates the account, and returns fresh auth tokens.
   */
  async verifyEmail(
    dto: VerifyEmailDto,
  ): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    try {
      const tokenRecord = await this.prisma.emailOtpToken.findUnique({
        where: { email: dto.email },
      });

      if (!tokenRecord || tokenRecord.used) {
        throw new BadRequestException(
          'Invalid or expired verification code. Please request a new code.',
        );
      }

      if (tokenRecord.expiresAt < new Date()) {
        throw new BadRequestException(
          'Verification code has expired. Please request a new code.',
        );
      }

      const codeMatches = await compare(dto.code, tokenRecord.codeHash);
      if (!codeMatches) {
        throw new BadRequestException(
          'Invalid verification code. Please check and try again.',
        );
      }

      const identity = await this.prisma.identity.findUnique({
        where: { email: dto.email },
        include: { profile: true },
      });

      if (!identity) {
        throw new BadRequestException(
          'Account not found. Please register first.',
        );
      }

      const updatedIdentity = await this.prisma.identity.update({
        where: { id: identity.id },
        data: {
          status: IdentityStatus.active,
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
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }

      this.logger.error(
        'Error verifying email',
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(
        'Failed to verify email. Please try again later.',
      );
    }
  }

  /**
   * Authenticates an active user via email/password and returns JWTs.
   */
  async login(dto: LoginDto): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    try {
      const identity = await this.prisma.identity.findUnique({
        where: { email: dto.email },
        include: { profile: true },
      });

      if (!identity) {
        throw new UnauthorizedException(
          'Invalid email or password. Please check your credentials and try again.',
        );
      }

      const isValidPassword = await compare(
        dto.password,
        identity.passwordHash,
      );

      if (!isValidPassword) {
        throw new UnauthorizedException(
          'Invalid email or password. Please check your credentials and try again.',
        );
      }

      if (identity.status !== IdentityStatus.active) {
        throw new UnauthorizedException(
          'Please verify your email before signing in. Check your inbox for the verification code.',
        );
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
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.error(
        'Error during login',
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(
        'An error occurred during login. Please try again later.',
      );
    }
  }

  /**
   * Authenticates the seeded admin user via email/password.
   */
  async loginAdmin(
    dto: AdminLoginDto,
  ): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    try {
      const adminIdentity = await this.prisma.adminIdentity.findUnique({
        where: { email: dto.email },
      });

      if (!adminIdentity) {
        throw new UnauthorizedException(
          'Invalid email or password. Please check your credentials and try again.',
        );
      }

      const isValidPassword = await compare(
        dto.password,
        adminIdentity.passwordHash,
      );

      if (!isValidPassword) {
        throw new UnauthorizedException(
          'Invalid email or password. Please check your credentials and try again.',
        );
      }

      if (adminIdentity.status !== AdminStatus.active) {
        throw new UnauthorizedException(
          'This administrator account is disabled. Contact support for assistance.',
        );
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
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.error(
        'Error during admin login',
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(
        'An error occurred during login. Please try again later.',
      );
    }
  }

  /**
   * Exchanges a valid refresh token for a fresh access/refresh pair.
   */
  async refreshTokens(
    dto: RefreshTokenDto,
  ): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    try {
      // Validate that refresh token is provided
      if (!dto.refreshToken) {
        throw new UnauthorizedException('Refresh token is required');
      }

      const payload = await this.jwtService.verifyAsync<JwtPayload>(
        dto.refreshToken,
        {
          secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        },
      );

      if (payload.role === 'admin') {
        const adminIdentity = await this.prisma.adminIdentity.findUnique({
          where: { id: payload.sub },
        });

        if (!adminIdentity || adminIdentity.status !== AdminStatus.active) {
          throw new UnauthorizedException();
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

      if (!identity || identity.status !== IdentityStatus.active) {
        throw new UnauthorizedException();
      }

      const tokens = this.generateTokens(identity, 'student');

      return {
        user: this.mapToAuthUser(identity),
        tokens,
      };
    } catch (error) {
      this.logger.error(
        'Failed to refresh tokens',
        error instanceof Error ? error.stack : undefined,
      );
      throw new UnauthorizedException('Invalid refresh token.');
    }
  }

  /**
   * Stateless logout handler – we respond with a consistent message.
   */
  logout(): { message: string } {
    return { message: 'Logged out successfully.' };
  }

  /**
   * Generates a password reset token and emails the reset link.
   */
  async requestPasswordReset(
    dto: RequestPasswordResetDto,
  ): Promise<{ message: string }> {
    const identity = await this.prisma.identity.findUnique({
      where: { email: dto.email },
    });

    if (!identity) {
      // Do not reveal whether the email exists.
      return {
        message:
          'If an account exists for that email, a reset link has been sent.',
      };
    }

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(
      Date.now() + PASSWORD_RESET_EXPIRATION_MINUTES * 60 * 1000,
    );

    await this.prisma.passwordResetToken.create({
      data: {
        userId: identity.id,
        tokenHash,
        expiresAt,
      },
    });

    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
    const resetLink = `${frontendUrl.replace(/\/$/, '')}/reset-password?token=${rawToken}&email=${encodeURIComponent(dto.email)}`;

    await this.mailService.sendPasswordResetEmail(dto.email, resetLink);

    return {
      message:
        'If an account exists for that email, a reset link has been sent.',
    };
  }

  /**
   * Validates the reset token and replaces the user's password.
   */
  async confirmPasswordReset(
    dto: ConfirmPasswordResetDto,
  ): Promise<{ message: string }> {
    const identity = await this.prisma.identity.findUnique({
      where: { email: dto.email },
    });

    if (!identity) {
      throw new BadRequestException('Invalid password reset token.');
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
      throw new BadRequestException('Invalid or expired password reset token.');
    }

    // Prevent users from reusing their current password.
    const passwordMatches = await compare(dto.password, identity.passwordHash);

    if (passwordMatches) {
      throw new BadRequestException(
        'New password must be different from your current password.',
      );
    }

    const newPasswordHash = await hash(dto.password, 10);

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

  /**
   * Fetches the current user payload for downstream consumers.
   */
  async getCurrentUser(payload: JwtPayload): Promise<AuthUser> {
    if (payload.role === 'admin') {
      const adminIdentity = await this.prisma.adminIdentity.findUnique({
        where: { id: payload.sub },
      });

      if (!adminIdentity || adminIdentity.status !== AdminStatus.active) {
        throw new UnauthorizedException();
      }

      return this.mapAdminToAuthUser(adminIdentity);
    }

    const identity = await this.prisma.identity.findUnique({
      where: { id: payload.sub },
      include: { profile: true },
    });

    if (!identity || identity.status !== IdentityStatus.active) {
      throw new UnauthorizedException();
    }

    return this.mapToAuthUser(identity);
  }

  /**
   * Issues both access and refresh JWTs for an identity.
   */
  private generateTokens(
    identity: { id: string; email: string },
    role: 'student' | 'admin',
  ): AuthTokens {
    const payload: JwtPayload = {
      sub: identity.id,
      email: identity.email,
      role,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.getTokenExpiry('JWT_ACCESS_EXPIRES', 900),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.getTokenExpiry('JWT_REFRESH_EXPIRES', 2_592_000),
    });

    return { accessToken, refreshToken };
  }

  /**
   * Creates/updates an OTP entry and sends the email with the code.
   */
  private async createAndSendVerification(
    userId: string,
    email: string,
  ): Promise<void> {
    const code = this.generateOtpCode();
    const codeHash = await hash(code, 10);
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

  private generateOtpCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private getTokenExpiry(key: string, fallback: number): number {
    const value = this.configService.get<string>(key);
    const parsed = value !== undefined ? Number(value) : fallback;
    return Number.isNaN(parsed) ? fallback : parsed;
  }

  private mapToAuthUser(identity: {
    id: string;
    email: string;
    status: IdentityStatus;
    profile: {
      firstName: string;
      lastName: string;
      avatarUrl: string | null;
    } | null;
  }): AuthUser {
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

  private mapAdminToAuthUser(admin: AdminIdentity): AuthUser {
    return {
      id: admin.id,
      email: admin.email,
      firstName: admin.name,
      lastName: '',
      avatarId: null,
      role: 'admin',
      status:
        admin.status === AdminStatus.active
          ? IdentityStatus.active
          : IdentityStatus.disabled,
    };
  }
}
