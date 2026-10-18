export type UserRoleContract = 'ADMIN' | 'AGENT';

export interface SafeUserContract {
  id: string;
  username: string;
  normalizedUsername: string;
  role: UserRoleContract;
}

export interface AuthSessionContract {
  user: SafeUserContract;
  csrfToken: string;
}

export interface LoginRequestContract {
  username: string;
  password: string;
}

export interface CreateUserRequestContract extends LoginRequestContract {
  role: UserRoleContract;
}

export interface UpdateUserRequestContract {
  role?: UserRoleContract;
  isActive?: boolean;
}
