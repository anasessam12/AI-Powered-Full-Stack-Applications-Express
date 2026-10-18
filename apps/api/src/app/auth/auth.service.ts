import { createHmac, createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { SafeUserContract } from '@customer-support/api-contract';
import { Session } from '../../database/entities/session.entity';
import { User } from '../../database/entities/user.entity';
import { hashPassword, verifyPassword } from '../../security/password-hasher';
import { normalizeUsername } from '../../security/username';
import { LoginThrottleService } from './login-throttle.service';

export interface LoginResult {
  sessionToken: string;
  csrfToken: string;
  expiresAt: Date;
  user: User;
}

const CSRF_CONTEXT = 'customer-support-csrf-v1';
const GENERIC_LOGIN_ERROR = 'Invalid username or password.';

@Injectable()
export class AuthService {
  private readonly cookieName: string;
  private readonly sessionTtlSeconds: number;

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Session) private readonly sessions: Repository<Session>,
    private readonly config: ConfigService,
    private readonly loginThrottle: LoginThrottleService,
  ) {
    this.cookieName = config.get<string>('SESSION_COOKIE_NAME') || 'support_session';
    this.sessionTtlSeconds = this.readSessionTtl(config.get<string>('SESSION_TTL_SECONDS'));
  }

  get sessionCookieName(): string {
    return this.cookieName;
  }

  get sessionTtlMs(): number {
    return this.sessionTtlSeconds * 1000;
  }

  csrfTokenFor(rawSessionToken: string): string {
    return this.deriveCsrfToken(rawSessionToken);
  }

  async login(username: string, password: string, ip: string): Promise<LoginResult> {
    const normalizedUsername = normalizeUsername(username);
    const throttleKey = this.loginThrottle.createKey(ip, normalizedUsername);
    this.loginThrottle.assertAllowed(throttleKey);

    const user = await this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.normalizedUsername = :normalizedUsername', { normalizedUsername })
      .getOne();

    if (!user || !user.isActive) {
      // Preserve roughly equal password-hash work for unknown and disabled accounts.
      await hashPassword(password);
      throw new UnauthorizedException(GENERIC_LOGIN_ERROR);
    }
    if (!(await verifyPassword(user.passwordHash, password))) {
      throw new UnauthorizedException(GENERIC_LOGIN_ERROR);
    }

    this.loginThrottle.clear(throttleKey);
    const sessionToken = randomBytes(32).toString('base64url');
    const csrfToken = this.deriveCsrfToken(sessionToken);
    const expiresAt = new Date(Date.now() + this.sessionTtlMs);
    await this.sessions.save(
      this.sessions.create({
        userId: user.id,
        tokenHash: this.hashSecret(sessionToken),
        csrfTokenHash: this.hashSecret(csrfToken),
        expiresAt,
        revokedAt: null,
        lastSeenAt: new Date(),
      }),
    );

    return { sessionToken, csrfToken, expiresAt, user };
  }

  async resolveSession(rawToken: string): Promise<{ session: Session; user: User } | null> {
    const session = await this.sessions.findOneBy({ tokenHash: this.hashSecret(rawToken) });
    if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) return null;

    const user = await this.users.findOneBy({ id: session.userId });
    if (!user?.isActive) {
      if (!session.revokedAt) await this.sessions.update(session.id, { revokedAt: new Date() });
      return null;
    }
    await this.sessions.update(session.id, { lastSeenAt: new Date() });
    return { session, user };
  }

  async revokeSession(session: Session): Promise<void> {
    if (!session.revokedAt) await this.sessions.update(session.id, { revokedAt: new Date() });
  }

  verifyCsrfToken(rawSessionToken: string, storedHash: string, providedToken: string): boolean {
    if (!providedToken || !this.safeEqual(this.deriveCsrfToken(rawSessionToken), providedToken)) return false;
    return this.safeEqual(this.hashSecret(providedToken), storedHash.trim());
  }

  toSafeUser(user: User): SafeUserContract {
    return {
      id: user.id,
      username: user.username,
      normalizedUsername: user.normalizedUsername,
      role: user.role,
    };
  }

  private deriveCsrfToken(sessionToken: string): string {
    return createHmac('sha256', sessionToken).update(CSRF_CONTEXT).digest('base64url');
  }

  private hashSecret(secret: string): string {
    return createHash('sha256').update(secret).digest('hex');
  }

  private safeEqual(left: string, right: string): boolean {
    const leftBytes = Buffer.from(left);
    const rightBytes = Buffer.from(right);
    return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
  }

  private readSessionTtl(rawValue?: string): number {
    const value = rawValue === undefined ? 28_800 : Number(rawValue);
    if (!Number.isInteger(value) || value < 60 || value > 30 * 24 * 60 * 60) {
      throw new Error('SESSION_TTL_SECONDS must be an integer between 60 seconds and 30 days.');
    }
    return value;
  }
}
