import jwt from 'jsonwebtoken';

function getSecret() {
  const secret = process.env.APP_SECRET;
  if (!secret) throw new Error('APP_SECRET is required.');
  return secret;
}

export function signToken(payload: Record<string, unknown>) {
  return jwt.sign(payload, getSecret(), { expiresIn: '8h' });
}

export function verifyToken(token: string) {
  return jwt.verify(token, getSecret()) as { role?: string; telegramId?: string; studentId?: number; sub?: string };
}
