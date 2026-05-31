-- Database Schema for DebtZero
-- Zeth Finance | Zeth Corporation

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Users Table (Linked to Supabase Auth)
create table public.users (
  id uuid references auth.users on delete cascade primary key,
  email text not null unique,
  full_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on users
alter table public.users enable row level security;

-- Policies for users
create policy "Users can read own record" on public.users
  for select using (auth.uid() = id);

create policy "Users can update own record" on public.users
  for update using (auth.uid() = id);

-- 2. User Settings Table
create table public.user_settings (
  user_id uuid references public.users(id) on delete cascade primary key,
  monthly_income numeric(15, 2) default 0.00 not null,
  monthly_expense numeric(15, 2) default 0.00 not null,
  telegram_bot_token text,
  telegram_chat_id text,
  gemini_api_key text,
  notif_enabled boolean default false not null
);

-- Enable RLS on user_settings
alter table public.user_settings enable row level security;

-- Policies for user_settings
create policy "Users can read own settings" on public.user_settings
  for select using (auth.uid() = user_id);

create policy "Users can update own settings" on public.user_settings
  for update using (auth.uid() = user_id);

create policy "Users can insert own settings" on public.user_settings
  for insert with check (auth.uid() = user_id);

-- 3. Debts Table
create table public.debts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  type text check (type in ('cicilan', 'gadai', 'personal')) not null,
  creditor_name text not null,
  principal_amount numeric(15, 2) not null,
  remaining_amount numeric(15, 2) not null,
  interest_rate numeric(5, 2) default 0.00 not null,
  interest_period text check (interest_period in ('monthly', '15days', 'none')) not null,
  start_date date not null,
  due_date date,
  tenor integer,
  tenor_unit text check (tenor_unit in ('days', 'months')),
  status text check (status in ('active', 'completed')) default 'active' not null,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on debts
alter table public.debts enable row level security;

-- Policies for debts
create policy "Users can view own debts" on public.debts
  for select using (auth.uid() = user_id);

create policy "Users can insert own debts" on public.debts
  for insert with check (auth.uid() = user_id);

create policy "Users can update own debts" on public.debts
  for update using (auth.uid() = user_id);

create policy "Users can delete own debts" on public.debts
  for delete using (auth.uid() = user_id);

-- 4. Payments Table
create table public.payments (
  id uuid default uuid_generate_v4() primary key,
  debt_id uuid references public.debts(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  amount numeric(15, 2) not null,
  paid_at timestamp with time zone default timezone('utc'::text, now()) not null,
  receipt_image text, -- Stores public URL of uploaded storage file
  notes text
);

-- Enable RLS on payments
alter table public.payments enable row level security;

-- Policies for payments
create policy "Users can view own payments" on public.payments
  for select using (auth.uid() = user_id);

create policy "Users can insert own payments" on public.payments
  for insert with check (auth.uid() = user_id);

create policy "Users can update own payments" on public.payments
  for update using (auth.uid() = user_id);

create policy "Users can delete own payments" on public.payments
  for delete using (auth.uid() = user_id);

-- 5. Notifications Log Table
create table public.notifications_log (
  id uuid default uuid_generate_v4() primary key,
  debt_id uuid references public.debts(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  type text check (type in ('7d', '3d', '1d', 'overdue')) not null,
  sent_at timestamp with time zone default timezone('utc'::text, now()) not null,
  status text not null
);

-- Enable RLS on notifications_log
alter table public.notifications_log enable row level security;

-- Policies for notifications_log
create policy "Users can view own notifications log" on public.notifications_log
  for select using (auth.uid() = user_id);

create policy "Users can insert own notifications log" on public.notifications_log
  for insert with check (auth.uid() = user_id);


-- 6. Trigger to automatically handle user creation in public.users and default user_settings
-- Create trigger function
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'User')
  );
  
  insert into public.user_settings (user_id, monthly_income, monthly_expense, notif_enabled)
  values (new.id, 0.00, 0.00, false);
  
  return new;
end;
$$ language plpgsql security definer;

-- Bind the trigger to auth.users
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 7. Supabase Storage Setup for Payment Proofs
insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', true)
on conflict (id) do nothing;

create policy "Users can upload their own payment proofs"
  on storage.objects for insert
  with check (bucket_id = 'payment-proofs' and (auth.uid())::text = (storage.foldername(name))[1]);

create policy "Users can view their own payment proofs"
  on storage.objects for select
  using (bucket_id = 'payment-proofs' and (auth.uid())::text = (storage.foldername(name))[1]);

create policy "Users can delete their own payment proofs"
  on storage.objects for delete
  using (bucket_id = 'payment-proofs' and (auth.uid())::text = (storage.foldername(name))[1]);


-- 8. Trigger to automatically sync remaining_amount & status on debts when payment occurs
create or replace function public.handle_payment_change()
returns trigger as $$
declare
  v_debt_id uuid;
  v_diff numeric(15, 2);
begin
  if (TG_OP = 'INSERT') then
    v_debt_id := new.debt_id;
    v_diff := -new.amount;
  elsif (TG_OP = 'DELETE') then
    v_debt_id := old.debt_id;
    v_diff := old.amount;
  elsif (TG_OP = 'UPDATE') then
    v_debt_id := new.debt_id;
    v_diff := old.amount - new.amount;
  end if;

  -- Update the remaining amount and status of the corresponding debt
  update public.debts
  set 
    remaining_amount = greatest(0.00, remaining_amount + v_diff),
    status = case 
      when greatest(0.00, remaining_amount + v_diff) <= 0.00 then 'completed'
      else 'active'
    end
  where id = v_debt_id;

  if (TG_OP = 'DELETE') then
    return old;
  else
    return new;
  end if;
end;
$$ language plpgsql security definer;

create or replace trigger on_payment_change
  after insert or update or delete on public.payments
  for each row execute procedure public.handle_payment_change();


