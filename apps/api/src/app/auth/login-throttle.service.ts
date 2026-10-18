import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';

interface AttemptWindow {
  count: number;
  expiresAt: number;
}

@Injectable()
export class LoginThrottleService {
  private readonly attempts = new Map<string, AttemptWindow>();
  private readonly maxAttempts = 5;
  private readonly windowMs = 60_000;
  private readonly maxKeys = 10_000;

  createKey(ip: string, normalizedUsername: string): string {
    return createHash('sha256').update(`${ip}\0${normalizedUsername}`).digest('hex');
  }

  assertAllowed(key: string): void {
    const now = Date.now();
    const current = this.attempts.get(key);
    if (current && current.expiresAt > now && current.count >= this.maxAttempts) {
      throw new HttpException('Too many login attempts. Try again shortly.', HttpStatus.TOO_MANY_REQUESTS);
    }
    if (!current || current.expiresAt <= now) {
      this.prune(now);
      this.attempts.set(key, { count: 1, expiresAt: now + this.windowMs });
      return;
    }
    current.count += 1;
  }

  clear(key: string): void {
    this.attempts.delete(key);
  }

  private prune(now: number): void {
    for (const [key, attempt] of this.attempts) {
      if (attempt.expiresAt <= now) this.attempts.delete(key);
    }
    while (this.attempts.size >= this.maxKeys) {
      const oldestKey = this.attempts.keys().next().value;
      if (!oldestKey) return;
      this.attempts.delete(oldestKey);
    }
  }
}
