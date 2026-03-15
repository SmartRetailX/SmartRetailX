export interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
}

export interface UserMeta extends User {
  createdAt: Date;
  updatedAt: Date;
  role: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  ipAddress: string;
  userAgent: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSession {
  user: UserMeta;
  session: Session;
}
