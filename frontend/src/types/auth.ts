export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export type UserRole = 'ROOT_ADMIN' | 'RESELLER' | 'DOMAIN_OWNER' | 'DEVELOPER';

export interface AuthResponse {
  accessToken: string;
  expiresIn: number;
  user: User;
}

export interface TokenResponse {
  accessToken: string;
  expiresIn: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface ResetPasswordPayload {
  token: string;
  newPassword: string;
}
