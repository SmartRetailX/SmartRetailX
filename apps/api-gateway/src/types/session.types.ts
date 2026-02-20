export interface UserSession {
  user: {
    id: string;
    email: string;
    name: string;
    role?: string;
  };
  session: {
    token: string;
    expiresAt: Date;
  };
}
