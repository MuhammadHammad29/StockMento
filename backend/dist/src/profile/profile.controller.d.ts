import { ProfileService } from './profile.service';
import { UpdatePasswordDto, UpdateProfileDto, DeleteAccountDto } from './dto';
import type { JwtPayload } from '../auth/auth.types';
export declare class ProfileController {
    private readonly profileService;
    constructor(profileService: ProfileService);
    getProfile(user: JwtPayload): Promise<{
        id: string;
        email: string;
        status: string;
        firstName: string;
        lastName: string;
        avatarId: string | null;
        bio: string | null;
        meta: {
            [x: string]: unknown;
        };
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateProfile(user: JwtPayload, dto: UpdateProfileDto): Promise<{
        id: string;
        email: string;
        status: string;
        firstName: string;
        lastName: string;
        avatarId: string | null;
        bio: string | null;
        meta: {
            [x: string]: unknown;
        };
        createdAt: Date;
        updatedAt: Date;
    }>;
    updatePassword(user: JwtPayload, dto: UpdatePasswordDto): Promise<{
        message: string;
    }>;
    deleteAccount(user: JwtPayload, dto: DeleteAccountDto): Promise<{
        message: string;
    }>;
}
