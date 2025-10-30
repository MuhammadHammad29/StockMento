import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, SendVerificationDto, VerifyEmailDto, RequestPasswordResetDto, ConfirmPasswordResetDto, RefreshTokenDto } from './dto';
import { ConfigService } from '@nestjs/config';
import type { JwtPayload } from './auth.types';
export declare class AuthController {
    private readonly authService;
    private readonly configService;
    constructor(authService: AuthService, configService: ConfigService);
    private setRefreshTokenCookie;
    private clearRefreshTokenCookie;
    register(dto: RegisterDto): Promise<{
        message: string;
    }>;
    sendVerification(dto: SendVerificationDto): Promise<{
        message: string;
    }>;
    verifyEmail(dto: VerifyEmailDto, res: Response): Promise<{
        user: import("./interfaces/auth-user.interface").AuthUser;
        tokens: {
            accessToken: string;
        };
    }>;
    login(dto: LoginDto, res: Response): Promise<{
        user: import("./interfaces/auth-user.interface").AuthUser;
        tokens: {
            accessToken: string;
        };
    }>;
    refresh(dto: RefreshTokenDto, req: Request, res: Response): Promise<{
        user: import("./interfaces/auth-user.interface").AuthUser;
        tokens: {
            accessToken: string;
        };
    }>;
    logout(res: Response): {
        message: string;
    };
    me(user: JwtPayload): Promise<import("./interfaces/auth-user.interface").AuthUser>;
    requestPasswordReset(dto: RequestPasswordResetDto): Promise<{
        message: string;
    }>;
    confirmPasswordReset(dto: ConfirmPasswordResetDto): Promise<{
        message: string;
    }>;
}
