import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto, UpdatePasswordDto, DeleteAccountDto } from './dto';
type ProfileMeta = Record<string, unknown>;
export declare class ProfileService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getProfile(userId: string): Promise<{
        id: string;
        email: string;
        status: string;
        firstName: string;
        lastName: string;
        avatarId: string | null;
        bio: string | null;
        meta: ProfileMeta;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateProfile(userId: string, dto: UpdateProfileDto): Promise<{
        id: string;
        email: string;
        status: string;
        firstName: string;
        lastName: string;
        avatarId: string | null;
        bio: string | null;
        meta: ProfileMeta;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updatePassword(userId: string, dto: UpdatePasswordDto): Promise<{
        message: string;
    }>;
    deleteAccount(userId: string, dto: DeleteAccountDto): Promise<{
        message: string;
    }>;
    private toProfileResponse;
}
export {};
