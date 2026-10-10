import jwt from 'jsonwebtoken';

const secret = process.env.JWT_SECRET || 'dev-secret-change-me';

export function signToken(payload: Record<string, unknown>) {
  return jwt.sign(payload, secret, { expiresIn: '8h' });
}

export function verifyToken(token: string) {
  return jwt.verify(token, secret) as { role?: string; telegramId?: string; studentId?: number; sub?: string };
}
