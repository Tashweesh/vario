// HS256 JWT helpers for the local test stack (same secret as `supabase start`).
import crypto from 'node:crypto';

export const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-token-with-at-least-32-characters-long';
const b64 = (o) => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');

export function sign(payload) {
  const head = b64({ alg: 'HS256', typ: 'JWT' }) + '.' + b64(payload);
  return head + '.' + crypto.createHmac('sha256', JWT_SECRET).update(head).digest('base64url');
}

export function verify(token) {
  const [h, p, s] = String(token).split('.');
  if (!s) return null;
  const ok = crypto.createHmac('sha256', JWT_SECRET).update(h + '.' + p).digest('base64url');
  if (ok.length !== s.length || !crypto.timingSafeEqual(Buffer.from(ok), Buffer.from(s))) return null;
  const claims = JSON.parse(Buffer.from(p, 'base64url').toString());
  if (claims.exp && claims.exp < Date.now() / 1000) return null;
  return claims;
}

export const ANON_KEY = sign({ iss: 'supabase-demo', role: 'anon', exp: 1983812996 });
