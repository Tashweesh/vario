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
  if (/Failed to fetch|NetworkError/i.test(m)) return 'تعذّر الاتصال بالخادم';
  return m;
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
