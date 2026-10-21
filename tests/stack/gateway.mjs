// Local stand-in for the Supabase API gateway: /rest/v1 (proxied to PostgREST), /auth/v1
// (email + password sessions, signup) and /storage/v1 (public "media" bucket on disk, RLS
// enforced through storage.objects). Speaks the same HTTP contract supabase-js uses, so the
// app and the API tests run unchanged against this or a real Supabase project.
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import Busboy from 'busboy';
import { JWT_SECRET, ANON_KEY, sign, verify } from './jwt.mjs';

const PORT = +(process.env.GATEWAY_PORT || 54321);
const REST = process.env.PGRST_URL || 'http://127.0.0.1:3001';
const STORE = process.env.STORAGE_DIR || '/tmp/claude-0/vairo-storage';
const pool = new pg.Pool({ connectionString: process.env.DB_URL || 'postgres://vairo_gateway:gateway@127.0.0.1:5432/vairo' });
pool.on('error', (e) => console.error('pg pool:', e.message)); // survive database resets
const refresh = new Map(); // refresh_token -> user id

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, apikey, content-type, x-client-info, prefer, range, accept-profile, content-profile, x-upsert, cache-control, x-supabase-api-version',
  'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD',
  'access-control-expose-headers': 'content-range, content-location',
};
const send = (res, status, body, headers = {}) => {
  res.writeHead(status, { ...cors, 'content-type': 'application/json', ...headers });
  res.end(body === undefined ? '' : typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
};
const readBody = (req) => new Promise((ok, ko) => { const c = []; req.on('data', (d) => c.push(d)); req.on('end', () => ok(Buffer.concat(c))); req.on('error', ko); });
const bearer = (req) => (req.headers.authorization || '').replace(/^Bearer\s+/i, '') || req.headers.apikey || ANON_KEY;

const userJson = (u) => ({ id: u.id, aud: 'authenticated', role: 'authenticated', email: u.email, email_confirmed_at: u.email_confirmed_at, phone: '', app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: u.raw_user_meta_data || {}, identities: [], created_at: u.created_at, updated_at: u.updated_at });
const session = (u) => {
  const now = Math.floor(Date.now() / 1000), exp = now + 3600;
  const rt = crypto.randomBytes(24).toString('hex');
  refresh.set(rt, u.id);
  return { access_token: sign({ aud: 'authenticated', exp, iat: now, sub: u.id, email: u.email, role: 'authenticated', session_id: crypto.randomUUID() }), token_type: 'bearer', expires_in: 3600, expires_at: exp, refresh_token: rt, user: userJson(u) };
};
const authErr = (res, status, msg, code) => send(res, status, { code: status, error_code: code, msg, error: code, error_description: msg });

// Run SQL as the caller (anon / authenticated) so RLS applies exactly as in PostgREST.
async function asCaller(token, fn) {
  const claims = verify(token);
  if (!claims) throw Object.assign(new Error('invalid JWT'), { status: 401 });
  const c = await pool.connect();
  try {
    await c.query('begin');
    await c.query(`select set_config('role', $1, true), set_config('request.jwt.claims', $2, true)`, [claims.role === 'authenticated' ? 'authenticated' : 'anon', JSON.stringify(claims)]);
    const out = await fn(c);
    await c.query('commit');
    return out;
  } catch (e) { await c.query('rollback').catch(() => {}); throw e; } finally { c.release(); }
}

async function auth(req, res, url) {
  const p = url.pathname.replace('/auth/v1', '');
  const body = req.method === 'GET' ? {} : JSON.parse((await readBody(req)).toString() || '{}');
  if (p === '/token' && url.searchParams.get('grant_type') === 'password') {
    const { rows } = await pool.query(`select * from auth.users where lower(email) = lower($1) and encrypted_password = crypt($2, encrypted_password)`, [body.email || '', body.password || '']);
    if (!rows[0]) return authErr(res, 400, 'Invalid login credentials', 'invalid_credentials');
    return send(res, 200, session(rows[0]));
  }
  if (p === '/token' && url.searchParams.get('grant_type') === 'refresh_token') {
    const id = refresh.get(body.refresh_token);
    if (!id) return authErr(res, 400, 'Invalid Refresh Token', 'refresh_token_not_found');
    refresh.delete(body.refresh_token);
    const { rows } = await pool.query('select * from auth.users where id = $1', [id]);
    return send(res, 200, session(rows[0]));
  }
  if (p === '/signup') {
    if (!body.email || !body.password || body.password.length < 6) return authErr(res, 422, 'Password should be at least 6 characters.', 'weak_password');
    const ex = await pool.query('select 1 from auth.users where lower(email) = lower($1)', [body.email]);
    if (ex.rows[0]) return authErr(res, 422, 'User already registered', 'user_already_exists');
    const { rows } = await pool.query(`insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
      values (gen_random_uuid(), 'authenticated', 'authenticated', $1, crypt($2, gen_salt('bf')), now(), '{"provider":"email"}', $3) returning *`, [body.email, body.password, body.data || {}]);
    return send(res, 200, session(rows[0]));
  }
  const claims = verify(bearer(req));
  if (p === '/user' && claims?.sub) {
    if (req.method === 'PUT' && body.password) await pool.query(`update auth.users set encrypted_password = crypt($2, gen_salt('bf')), updated_at = now() where id = $1`, [claims.sub, body.password]);
    const { rows } = await pool.query('select * from auth.users where id = $1', [claims.sub]);
    return rows[0] ? send(res, 200, userJson(rows[0])) : authErr(res, 404, 'User not found', 'user_not_found');
  }
  if (p === '/logout') return send(res, 204);
  if (p === '/recover') return send(res, 200, {});
  return authErr(res, 401, 'Unauthorized', 'no_authorization');
}

const parseUpload = (req) => new Promise((ok, ko) => {
  if (!(req.headers['content-type'] || '').startsWith('multipart/')) return readBody(req).then((b) => ok({ data: b, type: req.headers['content-type'] }), ko);
  const bb = Busboy({ headers: req.headers });
  let file = null;
  bb.on('file', (_n, stream, info) => { const c = []; stream.on('data', (d) => c.push(d)); stream.on('end', () => { file = file || { data: Buffer.concat(c), type: info.mimeType }; }); });
  bb.on('close', () => (file ? ok(file) : ko(new Error('no file'))));
  bb.on('error', ko);
  req.pipe(bb);
});

async function storage(req, res, url) {
  const p = decodeURIComponent(url.pathname.replace('/storage/v1', ''));
  let m;
  if (req.method === 'GET' && (m = p.match(/^\/object\/public\/([^/]+)\/(.+)$/))) {
    const { rows } = await pool.query('select metadata from storage.objects where bucket_id = $1 and name = $2', [m[1], m[2]]);
    const file = path.join(STORE, m[1], m[2]);
    if (!rows[0] || !fs.existsSync(file)) return send(res, 404, { statusCode: '404', error: 'not_found', message: 'Object not found' });
    return send(res, 200, fs.readFileSync(file), { 'content-type': rows[0].metadata?.mimetype || 'application/octet-stream' });
  }
  if ((req.method === 'POST' || req.method === 'PUT') && (m = p.match(/^\/object\/([^/]+)\/(.+)$/))) {
    const [, bucket, name] = m;
    const { data, type } = await parseUpload(req);
    const upsert = req.method === 'PUT' || req.headers['x-upsert'] === 'true';
    const bk = (await pool.query('select * from storage.buckets where id = $1', [bucket])).rows[0];
    if (!bk) return send(res, 404, { statusCode: '404', error: 'Bucket not found', message: 'Bucket not found' });
    if (bk.allowed_mime_types && !bk.allowed_mime_types.includes(type)) return send(res, 415, { statusCode: '415', error: 'invalid_mime_type', message: `mime type ${type} is not supported` });
    if (bk.file_size_limit && data.length > bk.file_size_limit) return send(res, 413, { statusCode: '413', error: 'Payload too large', message: 'The object exceeded the maximum allowed size' });
    try {
      const row = await asCaller(bearer(req), (c) => c.query(
        `insert into storage.objects (bucket_id, name, metadata) values ($1, $2, $3)
         on conflict (bucket_id, name) do ${upsert ? 'update set metadata = excluded.metadata, updated_at = now()' : 'nothing'} returning id`,
        [bucket, name, { mimetype: type, size: data.length }]));
      if (!row.rows[0]) return send(res, 409, { statusCode: '409', error: 'Duplicate', message: 'The resource already exists' });
      fs.mkdirSync(path.dirname(path.join(STORE, bucket, name)), { recursive: true });
      fs.writeFileSync(path.join(STORE, bucket, name), data);
      return send(res, 200, { Key: `${bucket}/${name}`, Id: row.rows[0].id });
    } catch (e) {
      if (e.status === 401 || e.code === '42501') return send(res, 403, { statusCode: '403', error: 'Unauthorized', message: 'new row violates row-level security policy' });
      throw e;
    }
  }
  if (req.method === 'DELETE' && (m = p.match(/^\/object\/([^/]+)$/))) {
    const { prefixes = [] } = JSON.parse((await readBody(req)).toString() || '{}');
    const { rows } = await asCaller(bearer(req), (c) => c.query('delete from storage.objects where bucket_id = $1 and name = any($2) returning name', [m[1], prefixes]));
    rows.forEach((r) => fs.rmSync(path.join(STORE, m[1], r.name), { force: true }));
    return send(res, 200, rows.map((r) => ({ name: r.name, bucket_id: m[1] })));
  }
  return send(res, 404, { statusCode: '404', error: 'not_found', message: 'route not found' });
}

async function rest(req, res, url) {
  const body = ['GET', 'HEAD'].includes(req.method) ? undefined : await readBody(req);
  const headers = { ...req.headers, authorization: `Bearer ${bearer(req)}` };
  delete headers.host; delete headers['content-length']; delete headers.connection;
  const r = await fetch(REST + url.pathname.replace('/rest/v1', '') + url.search, { method: req.method, headers, body });
  const out = Buffer.from(await r.arrayBuffer());
  const h = {}; r.headers.forEach((v, k) => { if (!['content-encoding', 'transfer-encoding', 'connection', 'content-length'].includes(k)) h[k] = v; });
  send(res, r.status, out, h);
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (req.method === 'OPTIONS') return send(res, 204);
    if (url.pathname.startsWith('/rest/v1')) return await rest(req, res, url);
    if (url.pathname.startsWith('/auth/v1')) return await auth(req, res, url);
    if (url.pathname.startsWith('/storage/v1')) return await storage(req, res, url);
    send(res, 404, { message: 'not found' });
  } catch (e) {
    console.error(e);
    send(res, e.status || 500, { message: e.message });
  }
}).listen(PORT, () => console.log(`gateway on :${PORT} (jwt secret ${JWT_SECRET.slice(0, 6)}…)`));
