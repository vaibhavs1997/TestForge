import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import { getMongoDb, getUsersCollectionName } from './mongoClient.js';
import type { PublicUser, UserAuthenticationDocument, UserRole } from '../../domain/auth/types.js';
import { normalizeEmail } from '../../domain/auth/normalizeEmail.js';
import { formatMongoDocumentValidationError } from './mongoErrors.js';

const BCRYPT_ROUNDS = 12;

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'org';
}

function toPublicUser(doc: UserAuthenticationDocument, role: UserRole = 'owner'): PublicUser {
  return {
    id: doc.id,
    email: doc.id,
    displayName: `${doc.firstName} ${doc.lastName}`.trim(),
    tenantId: doc.tenantId ?? slugify(doc.id),
    role,
  };
}

export class AuthRepository {
  private collection() {
    return getMongoDb().collection<UserAuthenticationDocument>(getUsersCollectionName());
  }

  async findUserByEmail(email: string): Promise<UserAuthenticationDocument | null> {
    const normalized = normalizeEmail(email);
    const doc = await this.collection().findOne({ id: normalized });
    return doc ?? null;
  }

  async findUserById(userId: string): Promise<UserAuthenticationDocument | null> {
    const doc = await this.collection().findOne({ id: normalizeEmail(userId) });
    return doc ?? null;
  }

  async registerUser(input: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    organizationName: string;
  }): Promise<PublicUser> {
    const email = normalizeEmail(input.email);
    if (!email.includes('@')) {
      throw new Error('A valid email address is required');
    }
    if (input.password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    const existing = await this.findUserByEmail(email);
    if (existing) {
      throw new Error('An account with this email already exists');
    }

    const firstName = input.firstName.trim();
    const lastName = input.lastName.trim();
    if (!firstName) {
      throw new Error('First name is required');
    }
    if (!lastName) {
      throw new Error('Last name is required');
    }
    if (!input.organizationName.trim()) {
      throw new Error('Organization name is required');
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    const tenantId = randomUUID();

    const user: UserAuthenticationDocument = {
      firstName,
      lastName,
      id: email,
      password: passwordHash,
      createdDate: new Date(),
      isActive: true,
      tenantId,
    };

    try {
      await this.collection().insertOne(user);
    } catch (err) {
      throw formatMongoDocumentValidationError(err);
    }
    return toPublicUser(user);
  }

  async verifyLogin(email: string, password: string): Promise<PublicUser | null> {
    const user = await this.findUserByEmail(email);
    if (!user || user.isActive === false) return null;
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return null;
    return toPublicUser(user);
  }
}

export default AuthRepository;
