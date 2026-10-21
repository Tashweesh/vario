// End-to-end API tests: every table/RPC/storage path the app uses, exercised through supabase-js
// as each role (anonymous visitor, agent, editor, admin, un-invited user).
// Run against a freshly seeded LOCAL database (they write data):
//   supabase db reset && npm run test:api          (Supabase CLI)
//   tests/stack/reset-db.sh && npm run test:api    (tests/stack fallback)
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const URL_ = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const KEY = process.env.SUPABASE_ANON_KEY || (await import('./stack/jwt.mjs')).ANON_KEY;
if (!/127\.0\.0\.1|localhost/.test(URL_) && !process.env.ALLOW_REMOTE) throw new Error('Refusing to run write tests against a non-local Supabase. Set ALLOW_REMOTE=1 to override.');
const PASS = 'vairo-dev-2026';
const client = () => createClient(URL_, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
async function signIn(email, password = PASS) {
  const c = client();
  const { error } = await c.auth.signInWithPassword({ email, password });
  assert.ifError(error);
  return c;
}
const ok = async (p) => { const { data, error } = await p; assert.ifError(error); return data; };
const fails = async (p, re) => { const { error } = await p; assert.ok(error, 'expected an error'); if (re) assert.match(error.message, re); return error; };

let anon, agent, editor, admin;
before(async () => {
  anon = client();
  agent = await signIn('sara@vairo.iq');
  editor = await signIn('hevi@vairo.iq');
  admin = await signIn('admin@vairo.iq');
});

describe('auth', () => {
  test('wrong password is rejected', async () => {
    const { error } = await client().auth.signInWithPassword({ email: 'sara@vairo.iq', password: 'nope-nope' });
    assert.ok(error);
  });
  test('me() returns the staff profile and role', async () => {
    assert.equal((await ok(agent.rpc('me')))[0].role, 'agent');
    assert.equal((await ok(editor.rpc('me')))[0].role, 'editor');
    const me = (await ok(admin.rpc('me')))[0];
    assert.equal(me.role, 'admin');
    assert.equal(me.agent_id, 'alan');
  });
  test('anonymous me() is empty', async () => {
    const { data } = await anon.rpc('me');
    assert.ok(!data || data.length === 0);
  });
});

describe('public site (anon)', () => {
  test('reads catalog content', async () => {
    assert.equal((await ok(anon.from('areas').select('id'))).length, 8);
    assert.equal((await ok(anon.from('developers').select('id'))).length, 4);
    assert.equal((await ok(anon.from('projects').select('id').eq('published', true))).length, 8);
    const s = await ok(anon.from('site_settings').select('*').eq('id', 1).single());
    assert.equal(s.show_agent, true);
    assert.equal((await ok(anon.from('project_units').select('id', { count: 'exact', head: false }).eq('project_id', 'unique-tower'))).length, 32 * 6);
  });
  test('listings exclude drafts, with media', async () => {
    const ls = await ok(anon.from('listings').select('id, status, listing_media(url)').neq('status', 'draft'));
    assert.equal(ls.length, 11);
    assert.ok(!ls.find((l) => l.id === 'VS-1006'));
    assert.ok(ls.find((l) => l.id === 'VS-1001').listing_media.length >= 4);
    assert.equal((await ok(anon.from('listings').select('id').eq('id', 'VS-1006'))).length, 0, 'draft hidden even when asked directly');
    assert.equal((await ok(anon.from('listing_media').select('id').eq('listing_id', 'VS-1006'))).length, 0, 'draft media hidden');
  });
  test('public agent profiles visible while show_agent is on', async () => {
    assert.equal((await ok(anon.from('agents').select('id, name, phone'))).length, 5);
  });
  test('private tables are invisible', async () => {
    for (const t of ['contacts', 'activities', 'viewings', 'staff', 'listing_private', 'listing_events', 'contact_listings']) {
      const { data, error } = await anon.from(t).select('*').limit(5);
      assert.ok(error || data.length === 0, `${t} must not be readable by anon`);
    }
  });
  test('cannot write content or CRM directly', async () => {
    await fails(anon.from('listings').insert({ deal: 'sale', type: 'land', area_id: 'kirkuk', size: 100, price: 1, status: 'draft' }));
    await fails(anon.from('contacts').insert({ name: 'x', phone: '0750' }));
    // denied either by missing grant (error) or by RLS (0 rows), depending on the project's default privileges
    for (const r of [await anon.from('listings').update({ price: 1 }).eq('id', 'VS-1001').select(), await anon.from('site_settings').update({ show_agent: false }).eq('id', 1).select()]) {
      assert.ok(r.error || r.data.length === 0);
    }
  });
  test('track_listing_view counts public listings only', async () => {
    const before_ = (await ok(admin.from('listings').select('views').eq('id', 'VS-1003').single())).views;
    await ok(anon.rpc('track_listing_view', { p_id: 'VS-1003' }));
    assert.equal((await ok(admin.from('listings').select('views').eq('id', 'VS-1003').single())).views, before_ + 1);
    const d0 = (await ok(admin.from('listings').select('views').eq('id', 'VS-1006').single())).views;
    await ok(anon.rpc('track_listing_view', { p_id: 'VS-1006' }));
    assert.equal((await ok(admin.from('listings').select('views').eq('id', 'VS-1006').single())).views, d0);
  });
  test('storage upload is denied', async () => {
    const { error } = await anon.storage.from('media').upload('listings/x/anon.png', new Blob([Buffer.from('89504e47', 'hex')], { type: 'image/png' }), { contentType: 'image/png' });
    assert.ok(error);
  });
});

describe('lead capture (submit_lead)', () => {
  let cid;
  test('creates a CRM contact, links listing, bumps leads', async () => {
    const leads0 = (await ok(admin.from('listings').select('leads').eq('id', 'VS-1002').single())).leads;
    cid = await ok(anon.rpc('submit_lead', { p_name: 'زائر تجريبي', p_phone: '0750 555 0001', p_kind: 'viewing', p_message: 'اليوم: السبت', p_listing_ids: ['VS-1002', 'VS-1006', 'NOPE'], p_deal: 'sale' }));
    assert.match(cid, /^[0-9a-f-]{36}$/);
    const c = await ok(agent.from('contacts').select('*, contact_listings(listing_id), activities(kind, body)').eq('id', cid).single());
    assert.equal(c.stage, 'new');
    assert.equal(c.source, 'الموقع');
    assert.equal(c.agent_id, 'rebwar', 'auto-assigned to the listing agent');
    assert.deepEqual(c.contact_listings.map((x) => x.listing_id), ['VS-1002'], 'drafts and unknown ids are ignored');
    assert.equal(c.activities[0].kind, 'web');
    assert.match(c.activities[0].body, /طلب معاينة/);
    assert.equal((await ok(admin.from('listings').select('leads').eq('id', 'VS-1002').single())).leads, leads0 + 1);
  });
  test('same phone reuses the contact', async () => {
    const again = await ok(anon.rpc('submit_lead', { p_name: 'زائر تجريبي', p_phone: '+0750-555-0001', p_kind: 'contact', p_message: 'سؤال ثاني' }));
    assert.equal(again, cid);
    const acts = await ok(agent.from('activities').select('id').eq('contact_id', cid));
    assert.equal(acts.length, 2);
  });
  test('validation', async () => {
    await fails(anon.rpc('submit_lead', { p_name: 'x', p_phone: '0750 555 0002' }), /الاسم/);
    await fails(anon.rpc('submit_lead', { p_name: 'اسم', p_phone: '12' }), /الهاتف/);
    await fails(anon.rpc('submit_lead', { p_name: 'اسم', p_phone: '0750 555 0003', p_kind: 'hack' }), /نوع/);
    await fails(anon.rpc('submit_lead', { p_name: 'اسم', p_phone: '0750 555 0003', p_source: 'مكالمة' }), /مصدر/);
  });
});

describe('agent role', () => {
  let newId;
  test('reads CRM and drafts', async () => {
    assert.ok((await ok(agent.from('contacts').select('id'))).length >= 9);
    assert.equal((await ok(agent.from('listings').select('id').eq('id', 'VS-1006'))).length, 1);
  });
  test('creates drafts only, id auto-assigned, agent defaulted', async () => {
    await fails(agent.from('listings').insert({ deal: 'sale', type: 'land', area_id: 'kirkuk', size: 200, price: 40000, status: 'live' }), /مسودة/);
    const l = await ok(agent.from('listings').insert({ deal: 'sale', type: 'land', area_id: 'kirkuk', size: 200, price: 40000, status: 'draft' }).select().single());
    assert.match(l.id, /^VS-10\d\d$/);
    assert.equal(l.agent_id, 'sara');
    newId = l.id;
    const r = await ok(agent.from('listings').insert({ deal: 'rent', type: 'office', area_id: 'center', size: 90, rent: 900, status: 'draft' }).select('id').single());
    assert.match(r.id, /^VR-50\d\d$/);
    await ok(agent.from('listings').delete().eq('id', r.id).select()); // agents cannot delete: RLS filters it
    assert.equal((await ok(admin.from('listings').select('id').eq('id', r.id))).length, 1);
  });
  test('edits own listing but cannot publish or feature it', async () => {
    const u = await ok(agent.from('listings').update({ price: 41000 }).eq('id', 'VS-1001').select('price'));
    assert.equal(u[0].price, 41000);
    await fails(agent.from('listings').update({ status: 'live' }).eq('id', newId), /مسودة/);
    await fails(agent.from('listings').update({ featured: false }).eq('id', 'VS-1001'), /محرر/);
    await fails(agent.from('listings').update({ agent_id: 'rebwar' }).eq('id', 'VS-1001'));
    await ok(agent.from('listings').update({ price: 214000 }).eq('id', 'VS-1001'));
  });
  test("cannot touch other agents' listings", async () => {
    const u = await ok(agent.from('listings').update({ price: 1 }).eq('id', 'VS-1002').select());
    assert.equal(u.length, 0);
    await fails(agent.from('listing_media').insert({ listing_id: 'VS-1002', url: 'https://x/y.jpg' }));
    const priv = await ok(agent.from('listing_private').select('*').eq('listing_id', 'VS-1001'));
    assert.equal(priv[0].owner_name, 'محمد قادر', 'own listing owner info is visible');
  });
  test('cannot edit content or settings', async () => {
    assert.equal((await ok(agent.from('areas').update({ ppm: 1 }).eq('id', 'gulan').select())).length, 0);
    assert.equal((await ok(agent.from('projects').update({ progress: 1 }).eq('id', 'unique-tower').select())).length, 0);
    assert.equal((await ok(agent.from('site_settings').update({ show_agent: false }).eq('id', 1).select())).length, 0);
    await fails(agent.from('developers').insert({ name: 'x' }));
    await fails(agent.from('staff').insert({ agent_id: 'sara', email: 'z@z.z' }));
  });
  test('media rows + storage upload/remove on own listing', async () => {
    const png = Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010806000000', 'hex');
    const path = `listings/${newId}/test.png`;
    const up = await agent.storage.from('media').upload(path, new Blob([png], { type: 'image/png' }), { contentType: 'image/png' });
    assert.ifError(up.error);
    const url = agent.storage.from('media').getPublicUrl(path).data.publicUrl;
    const res = await fetch(url);
    assert.equal(res.status, 200);
    const m = await ok(agent.from('listing_media').insert({ listing_id: newId, url, storage_path: path, kind: 'photo', sort: 0 }).select().single());
    await ok(agent.from('listing_media').update({ sort: 3 }).eq('id', m.id));
    await ok(agent.from('listing_media').delete().eq('id', m.id));
    const rm = await agent.storage.from('media').remove([path]);
    assert.ifError(rm.error);
    assert.equal(rm.data.length, 1);
    assert.equal((await fetch(url)).status, 404);
    const bad = await agent.storage.from('media').upload(`x/evil.html`, new Blob(['<script>'], { type: 'text/html' }), { contentType: 'text/html' });
    assert.ok(bad.error, 'only images/PDF allowed');
  });
  test('CRM workflow: contact → activity → stage → viewing', async () => {
    const c = await ok(agent.from('contacts').insert({ name: 'عميل اختبار', phone: '0770 000 1111', source: 'مكالمة', agent_id: 'sara', budget: 90000, deal: 'sale' }).select().single());
    assert.equal(c.first_response_at, null);
    await ok(agent.from('contact_listings').insert({ contact_id: c.id, listing_id: 'VS-1001' }));
    await ok(agent.from('activities').insert({ contact_id: c.id, kind: 'call', body: 'مكالمة', agent_id: 'sara' }));
    const c2 = await ok(agent.from('contacts').select('first_response_at, last_activity_at').eq('id', c.id).single());
    assert.ok(c2.first_response_at, 'first response stamped by trigger');
    const t = await ok(agent.from('activities').insert({ contact_id: c.id, kind: 'task', body: 'متابعة', due_at: new Date(Date.now() + 864e5).toISOString() }).select().single());
    await ok(agent.from('activities').update({ done: true }).eq('id', t.id));
    const c3 = await ok(agent.from('contacts').update({ stage: 'closed' }).eq('id', c.id).select('closed_at').single());
    assert.ok(c3.closed_at);
    const v = await ok(agent.from('viewings').insert({ contact_id: c.id, listing_id: 'VS-1001', agent_id: 'sara', scheduled_at: new Date(Date.now() + 2 * 864e5).toISOString(), status: 'confirmed' }).select().single());
    await ok(agent.from('viewings').update({ status: 'done' }).eq('id', v.id));
    await ok(agent.from('viewings').delete().eq('id', v.id));
    await ok(agent.from('contacts').delete().eq('id', c.id));
    assert.equal((await ok(agent.from('activities').select('id').eq('contact_id', c.id))).length, 0, 'activities cascade');
  });
});

describe('editor role', () => {
  test('publishes a draft and it becomes public, with a change log', async () => {
    await ok(editor.from('listing_media').insert({ listing_id: 'VS-1006', url: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800', sort: 9 }));
    const l = await ok(editor.from('listings').update({ status: 'live' }).eq('id', 'VS-1006').select('status, status_changed_at').single());
    assert.equal(l.status, 'live');
    assert.equal((await ok(anon.from('listings').select('id').eq('id', 'VS-1006'))).length, 1);
    const ev = await ok(editor.from('listing_events').select('label, actor_name').eq('listing_id', 'VS-1006').order('created_at', { ascending: false }).limit(1));
    assert.equal(ev[0].label, 'نُشر');
    assert.equal(ev[0].actor_name, 'هيفي رشيد');
    await ok(editor.from('listings').update({ status: 'draft' }).eq('id', 'VS-1006'));
  });
  test('deal switch clears the other side\'s price fields', async () => {
    const l = await ok(editor.from('listings').insert({ deal: 'sale', type: 'apartment', area_id: 'gulan', size: 100, price: 100000, payment: 'cash' }).select().single());
    const r = await ok(editor.from('listings').update({ deal: 'rent', rent: 800 }).eq('id', l.id).select().single());
    assert.equal(r.price, null);
    assert.equal(r.payment, null);
    await ok(editor.from('listings').delete().eq('id', l.id));
  });
  test('manages areas, developers, projects and units', async () => {
    await ok(editor.from('areas').update({ ppm: 1960 }).eq('id', 'gulan'));
    const d = await ok(editor.from('developers').insert({ name: 'مطوّر تجريبي', mono: 'TT' }).select().single());
    await ok(editor.from('projects').insert({ id: 'test-tower', name: 'برج تجريبي', type: 'tower', area_id: 'gulan', developer_id: d.id, floors: 3, published: false }));
    assert.equal((await ok(anon.from('projects').select('id').eq('id', 'test-tower'))).length, 0, 'unpublished project hidden');
    await ok(editor.from('project_units').insert([{ project_id: 'test-tower', floor: 1, unit: 'A', price: 1000 }]));
    const p0 = await ok(editor.from('projects').select('progress_updated_at').eq('id', 'tulip-tower').single());
    const p1 = await ok(editor.from('projects').update({ progress: 41 }).eq('id', 'tulip-tower').select('progress_updated_at').single());
    assert.ok(new Date(p1.progress_updated_at) > new Date(p0.progress_updated_at));
    await fails(editor.from('developers').delete().eq('id', d.id)); // still referenced
    await ok(editor.from('projects').delete().eq('id', 'test-tower'));
    await ok(editor.from('developers').delete().eq('id', d.id));
    await fails(editor.from('projects').update({ plan_down: 80, plan_handover: 30 }).eq('id', 'tulip-tower'));
  });
  test('cannot change site settings, staff, or featured order', async () => {
    assert.equal((await ok(editor.from('site_settings').update({ hero_kicker: 'x' }).eq('id', 1).select())).length, 0);
    assert.equal((await ok(editor.from('staff').update({ role: 'admin' }).eq('agent_id', 'hevi').select())).length, 0);
    await fails(editor.rpc('set_featured_order', { p_ids: ['VS-1001'] }), /مصرّح/);
  });
});

describe('admin role', () => {
  test('hiding agents removes public agent profiles', async () => {
    await ok(admin.from('site_settings').update({ show_agent: false }).eq('id', 1));
    assert.equal((await ok(anon.from('agents').select('id'))).length, 0);
    assert.ok((await ok(agent.from('agents').select('id'))).length >= 5, 'staff still see the team');
    await ok(admin.from('site_settings').update({ show_agent: true }).eq('id', 1));
  });
  test('featured order', async () => {
    await ok(admin.rpc('set_featured_order', { p_ids: ['VR-5001', 'VS-1001'] }));
    const f = await ok(anon.from('listings').select('id, featured_rank').eq('featured', true).order('featured_rank'));
    assert.deepEqual(f.map((x) => x.id), ['VR-5001', 'VS-1001']);
    await fails(admin.rpc('set_featured_order', { p_ids: Array.from({ length: 9 }, (_, i) => `VS-${1001 + i}`) }), /8/);
    await ok(admin.rpc('set_featured_order', { p_ids: ['VS-1001', 'VS-1002', 'VS-1005', 'VR-5001'] }));
  });
  test('invite → signup links the account → deactivate revokes access', async () => {
    const g = await ok(admin.from('agents').insert({ name: 'موظف جديد', title: 'وسيط' }).select().single());
    await ok(admin.from('staff').insert({ agent_id: g.id, email: 'new.agent@vairo.iq', role: 'agent' }));
    const u = client();
    const su = await u.auth.signUp({ email: 'new.agent@vairo.iq', password: 'secret-123' });
    assert.ifError(su.error);
    const me = (await ok(u.rpc('me')))[0];
    assert.equal(me.agent_id, g.id);
    assert.ok((await ok(u.from('contacts').select('id'))).length > 0);
    await ok(admin.from('agents').update({ active: false }).eq('id', g.id));
    assert.equal((await ok(u.rpc('me'))).length, 0);
    assert.equal((await ok(u.from('contacts').select('id'))).length, 0, 'deactivated user loses CRM access');
    await ok(admin.from('agents').delete().eq('id', g.id));
  });
  test('an un-invited signup gets no access', async () => {
    const u = client();
    assert.ifError((await u.auth.signUp({ email: `stranger${Date.now()}@example.com`, password: 'secret-123' })).error);
    assert.equal((await ok(u.rpc('me'))).length, 0);
    assert.equal((await ok(u.from('contacts').select('id'))).length, 0);
    await fails(u.from('listings').insert({ deal: 'sale', type: 'land', area_id: 'kirkuk', size: 1, price: 1 }));
  });
  test('the last admin cannot be demoted', async () => {
    await fails(admin.from('staff').update({ role: 'editor' }).eq('agent_id', 'alan'), /مدير/);
    await ok(admin.from('staff').update({ role: 'admin' }).eq('agent_id', 'hevi'));
    await ok(admin.from('staff').update({ role: 'editor' }).eq('agent_id', 'hevi'));
  });
  test('deleting a listing cascades media, links and log', async () => {
    const l = await ok(admin.from('listings').insert({ deal: 'sale', type: 'land', area_id: 'kirkuk', size: 50, price: 5000 }).select().single());
    await ok(admin.from('listing_media').insert({ listing_id: l.id, url: 'https://x/y.jpg' }));
    const c = await ok(anon.rpc('submit_lead', { p_name: 'حذف', p_phone: '0750 999 8888' }));
    await ok(admin.from('contact_listings').insert({ contact_id: c, listing_id: l.id }));
    await ok(admin.from('listings').delete().eq('id', l.id));
    assert.equal((await ok(admin.from('listing_media').select('id').eq('listing_id', l.id))).length, 0);
    assert.equal((await ok(admin.from('contact_listings').select('contact_id').eq('listing_id', l.id))).length, 0);
    assert.equal((await ok(admin.from('listing_events').select('id').eq('listing_id', l.id))).length, 0);
  });
});

after(async () => { for (const c of [agent, editor, admin]) await c?.auth.signOut(); });
