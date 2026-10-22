-- Office hours and map link, editable from CMS → الرئيسية وإعدادات الموقع (previously hardcoded in the site).
alter table public.site_settings
  add column if not exists office_hours text not null default 'السبت – الخميس · 9:00 – 19:00',
  add column if not exists office_map_url text not null default 'https://maps.google.com/?q=Gulan+Street+Erbil';
