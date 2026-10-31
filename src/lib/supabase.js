import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) console.error('VAIRO: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see .env.example)');

export const supabase = createClient(url || 'http://127.0.0.1:54321', key || 'missing-key');

// Throws on error so callers can use try/catch + toasts; returns `data`.
export async function q(promise) {
  const { data, error } = await promise;
  if (error) throw new Error(friendlyError(error));
  return data;
}

export function friendlyError(error) {
  const m = error?.message || String(error);
  if (/row-level security|permission denied|42501/i.test(m) || error?.code === '42501') return m.match(/[؀-ۿ]/) ? m : 'ليس لديك صلاحية لهذا الإجراء';
  if (/duplicate key/i.test(m)) return 'هذا السجل موجود مسبقاً';
  if (/violates foreign key/i.test(m)) return 'السجل مرتبط ببيانات أخرى';
  if (/Invalid login credentials/i.test(m)) return 'البريد أو كلمة المرور غير صحيحة';
  if (/different from the old password|same_password/i.test(m)) return 'كلمة المرور الجديدة لازم تكون مختلفة عن القديمة';
  if (/at least|weak|too short|should be/i.test(m) && /password/i.test(m)) return 'كلمة المرور قصيرة أو ضعيفة — استخدم 6 أحرف أو أكثر';
  if (/token|expired|invalid|session|JWT/i.test(m) && !m.match(/[؀-ۿ]/)) return 'انتهت صلاحية الجلسة — افتح رابط إعادة التعيين من جديد';
  if (/Database error saving new user/i.test(m)) return 'هذا البريد غير مدعو لفريق ڤايرو — اطلب من مدير النظام دعوتك أولاً';
  if (/Failed to fetch|NetworkError/i.test(m)) return 'تعذّر الاتصال بالخادم';
  return m;
}

// Set the signed-in user's password without supabase-js updateUser(): that call can hang on the client's
// internal auth lock even though the server already applied the change. A direct request resolves normally.
export async function updatePassword(accessToken, password) {
  let res;
  try {
    res = await fetch(`${url}/auth/v1/user`, {
      method: 'PUT',
      headers: { apikey: key, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
  } catch (e) { throw new Error(friendlyError(e)); }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(friendlyError({ message: body.msg || body.error_description || body.error || body.message || 'تعذّر تغيير كلمة المرور', code: body.error_code }));
  return body;
}

export const BUCKET = 'media';

export async function uploadMedia(file, folder) {
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(friendlyError(error));
  return { path, url: supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl };
}

export async function removeMedia(paths) {
  const list = paths.filter(Boolean);
  if (!list.length) return;
  const { error } = await supabase.storage.from(BUCKET).remove(list);
  if (error) throw new Error(friendlyError(error));
}
