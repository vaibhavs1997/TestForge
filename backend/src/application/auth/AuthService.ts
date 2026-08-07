import jwt from 'jsonwebtoken';
import { getAuthConfig } from '../../config';
import type { PublicUser } from '../../domain/auth/types';
import { normalizeEmail } from '../../domain/auth/normalizeEmail';
import { AuthRepository } from '../../infrastructure/auth/AuthRepository';
import { sendWelcomeEmail } from './sendWelcomeEmail';

export interface AuthTokenPair {
  accessToken: string;
  expiresIn: string;
  user: PublicUser;
  welcomeEmailSent?: boolean;
}

export class AuthService {
  constructor(private readonly repository = new AuthRepository()) {}

  async register(input: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    organizationName: string;
    displayName?: string;
  }): Promise<AuthTokenPair> {
    let firstName = input.firstName?.trim() ?? '';
    let lastName = input.lastName?.trim() ?? '';
    if (!firstName && !lastName && input.displayName?.trim()) {
      const parts = input.displayName.trim().split(/\s+/);
      firstName = parts[0] ?? '';
      lastName = (parts.slice(1).join(' ') || parts[0]) ?? '';
    }
    const user = await this.repository.registerUser({
      email: normalizeEmail(input.email),
      password: input.password,
      firstName,
      lastName,
      organizationName: input.organizationName ?? '',
    });

    let welcomeEmailSent = false;
    try {
      welcomeEmailSent = await sendWelcomeEmail({
        to: user.email,
        firstName,
        organizationName: input.organizationName ?? '',
      });
    } catch (err) {
      console.error('[welcome-email] Failed to send:', err);
    }

    return { ...this.issueToken(user), welcomeEmailSent };
  }

  async login(email: string, password: string): Promise<AuthTokenPair> {
    const normalized = normalizeEmail(email);
    if (!normalized || !password) {
      throw new Error('Email and password are required');
    }
    const user = await this.repository.verifyLogin(normalized, password);
    if (!user) {
      throw new Error('Invalid email or password');
    }
    return this.issueToken(user);
  }

  async getPublicProfile(userId: string): Promise<PublicUser | null> {
    const doc = await this.repository.findUserById(userId);
    if (!doc) return null;
    return {
      id: doc.id,
      email: doc.id,
      displayName: `${doc.firstName} ${doc.lastName}`.trim(),
      tenantId: doc.tenantId ?? doc.id,
      role: 'owner',
    };
  }

  issueToken(user: PublicUser): AuthTokenPair {
    const { jwtSecret } = getAuthConfig();
    if (!jwtSecret) {
      throw new Error('JWT signing is not configured');
    }
    const expiresIn = '12h';
    const accessToken = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        tenantId: user.tenantId,
        role: user.role,
      },
      jwtSecret,
      { expiresIn },
    );
    return { accessToken, expiresIn, user };
  }
}

export default AuthService;
