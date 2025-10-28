import { IdentityStatus } from '@prisma/client';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarId: string | null;
  role: 'student' | 'admin';
  status: IdentityStatus;
}
