import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../mail/mail.service';
import { RegisterDto, LoginDto, SendVerificationDto, VerifyEmailDto, RequestPasswordResetDto, ConfirmPasswordResetDto, RefreshTokenDto } from './dto';
import { AuthTokens } from './auth.types';
import { AuthUser } from './interfaces/auth-user.interface';
export declare class AuthService {
    private readonly prisma;
    private readonly jwtService;
    private readonly configService;
    private readonly mailService;
    private readonly logger;
    constructor(prisma: PrismaService, jwtService: JwtService, configService: ConfigService, mailService: MailService);
    register(dto: RegisterDto): Promise<{
        message: string;
    }>;
    sendVerificationCode(dto: SendVerificationDto): Promise<{
        message: string;
    }>;
    verifyEmail(dto: VerifyEmailDto): Promise<{
        user: AuthUser;
        tokens: AuthTokens;
    }>;
    login(dto: LoginDto): Promise<{
        user: AuthUser;
        tokens: AuthTokens;
    }>;
    refreshTokens(dto: RefreshTokenDto): Promise<{
        user: AuthUser;
        tokens: AuthTokens;
    }>;
    logout(): Promise<{
        message: string;
    }>;
    requestPasswordReset(dto: RequestPasswordResetDto): Promise<{
        message: string;
    }>;
    confirmPasswordReset(dto: ConfirmPasswordResetDto): Promise<{
        message: string;
    }>;
    getCurrentUser(userId: string): Promise<AuthUser>;
    private generateTokens;
    private createAndSendVerification;
    private generateOtpCode;
    private hashToken;
    private getTokenExpiry;
    private mapToAuthUser;
}
