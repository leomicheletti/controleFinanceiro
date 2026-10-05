-- Acerto do casal: titular das contas, divisão das despesas e transferências de acerto.
-- Pode rodar quantas vezes quiser: não apaga nada que já existe.

-- 1) Quem é o titular de cada conta: 'a', 'b' ou 'conjunta'
alter table accounts
  add column if not exists owner text not null default 'conjunta'
  check (owner in ('a', 'b', 'conjunta'));

-- 2) De quem é cada despesa: 'casal' (dividida) ou só de 'a' / 'b'
alter table transactions
  add column if not exists split text not null default 'casal'
  check (split in ('casal', 'a', 'b'));

-- 3) Configuração da divisão (nomes e percentual)
create table if not exists couple_settings (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  person_a_name text not null default 'Pessoa A',
  person_b_name text not null default 'Pessoa B',
  split_mode text not null default 'igual' check (split_mode in ('igual', 'proporcional', 'personalizado')),
  share_a numeric(5,2) not null default 50 check (share_a between 0 and 100),
  updated_at timestamptz not null default now()
);

alter table couple_settings enable row level security;
drop policy if exists "couple_settings_own" on couple_settings;
create policy "couple_settings_own" on couple_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 4) Transferências já feitas para acertar um mês
create table if not exists couple_transfers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  from_person text not null check (from_person in ('a', 'b')),
  to_person text not null check (to_person in ('a', 'b', 'conjunta')),
  amount numeric(12,2) not null check (amount > 0),
  created_at timestamptz not null default now(),
  check (from_person <> to_person)
);

create index if not exists couple_transfers_user_month on couple_transfers (user_id, month);

alter table couple_transfers enable row level security;
drop policy if exists "couple_transfers_own" on couple_transfers;
create policy "couple_transfers_own" on couple_transfers
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
