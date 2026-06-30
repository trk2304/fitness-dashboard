-- Email allowlist — controls WHO is allowed to create an account.
-- Run this once in the Supabase SQL editor.
--
-- Design: the list of permitted emails is DATA (a table), not CODE (a
-- hardcoded constant). To let a new person in later, INSERT a row here —
-- no app change, no redeploy. The check is enforced by a trigger on
-- signup, so it holds at the database layer regardless of frontend code.

-- 1. The allowlist itself.
create table if not exists public.allowed_emails (
  email    text primary key,
  note     text,
  added_at timestamptz not null default now()
);

-- 2. Seed it with the owner. Add family/friends later the same way:
--    insert into public.allowed_emails (email, note)
--    values ('someone@gmail.com', 'family') on conflict do nothing;
insert into public.allowed_emails (email, note)
values ('tkilpatrick2304@gmail.com', 'owner')
on conflict (email) do nothing;

-- 3. Lock the table down from the API. Enabling RLS with NO policies makes
--    it invisible to the anon/authenticated roles (so no one can read or
--    edit the allowlist through the app). The trigger below still reads it,
--    because SECURITY DEFINER runs the function as the table owner, which
--    bypasses RLS. You manage the list via the SQL editor / dashboard.
alter table public.allowed_emails enable row level security;

-- 4. The gate: reject any signup whose email isn't on the list.
create or replace function public.enforce_email_allowlist()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.allowed_emails
    where lower(email) = lower(new.email)
  ) then
    raise exception 'Email % is not authorized to sign up', new.email
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

-- 5. Fire it the moment a new auth user would be created.
drop trigger if exists enforce_email_allowlist on auth.users;
create trigger enforce_email_allowlist
  before insert on auth.users
  for each row execute function public.enforce_email_allowlist();
