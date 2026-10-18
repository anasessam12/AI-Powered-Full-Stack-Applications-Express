import { UserRoleContract } from './auth.contract';

export interface UserContract {
  id: string;
  username: string;
  normalizedUsername: string;
  role: UserRoleContract;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
