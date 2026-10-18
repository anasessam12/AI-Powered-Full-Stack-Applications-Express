export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function validateUsername(username: string): string {
  const normalizedUsername = normalizeUsername(username);
  if (!/^[a-z0-9][a-z0-9._-]{2,63}$/.test(normalizedUsername)) {
    throw new Error('Username must be 3–64 characters: letters, numbers, dot, underscore, or hyphen.');
  }
  return normalizedUsername;
}

export function validatePassword(password: string): void {
  const passwordBytes = Buffer.byteLength(password, 'utf8');
  if (passwordBytes < 12 || passwordBytes > 1024) {
    throw new Error('Password must contain between 12 and 1024 UTF-8 bytes.');
  }
}
