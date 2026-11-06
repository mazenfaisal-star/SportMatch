-- Run manually in Supabase SQL Editor only after admin_console.sql.
-- Replace the email with the exact email of your own confirmed SportMatch account.
insert into public.platform_admins (user_id)
select id
from auth.users
where lower(email) = lower('YOUR_ACCOUNT_EMAIL')
on conflict (user_id) do nothing;

-- Check the assigned account by email (this query is for SQL Editor only).
select a.user_id, u.email, a.created_at
from public.platform_admins a
join auth.users u on u.id = a.user_id
where lower(u.email) = lower('YOUR_ACCOUNT_EMAIL');
