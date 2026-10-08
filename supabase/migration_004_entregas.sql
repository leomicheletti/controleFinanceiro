-- Módulo de entregas: abastecimentos, jornadas, ganhos e gastos por jornada.
-- Pode rodar quantas vezes quiser: não apaga nada que já existe.

-- 1) Configurações do módulo
create table if not exists delivery_settings (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  driver text not null default 'a' check (driver in ('a', 'b')),          -- quem faz as entregas (pessoa do Acerto do casal)
  initial_km_per_liter numeric(6,2) not null default 10 check (initial_km_per_liter > 0),
  updated_at timestamptz not null default now()
);

-- 2) Abastecimentos (o km/l real é calculado de tanque cheio a tanque cheio)
create table if not exists fuel_ups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date date not null default current_date,
  liters numeric(8,3) not null check (liters > 0),
  total_cost numeric(12,2) not null check (total_cost > 0),
  odometer numeric(10,1) not null check (odometer >= 0),
  full_tank boolean not null default true,
  transaction_id uuid references transactions(id) on delete set null,      -- despesa lançada no financeiro
  created_at timestamptz not null default now()
);
create index if not exists fuel_ups_user_odometer on fuel_ups (user_id, odometer);

-- 3) Jornadas (um dia/turno de entregas). end_time nulo = jornada em andamento
create table if not exists delivery_shifts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  start_time timestamptz not null default now(),
  end_time timestamptz,
  start_odometer numeric(10,1) not null check (start_odometer >= 0),
  end_odometer numeric(10,1),
  notes text,
  income_transaction_id uuid references transactions(id) on delete set null,   -- receita lançada no financeiro
  expense_transaction_id uuid references transactions(id) on delete set null,  -- gastos lançados no financeiro
  created_at timestamptz not null default now(),
  check (end_odometer is null or end_odometer >= start_odometer),
  check (end_time is null or end_time >= start_time)
);
create index if not exists delivery_shifts_user_start on delivery_shifts (user_id, start_time desc);

-- 4) Ganhos da jornada, por plataforma
create table if not exists delivery_earnings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  shift_id uuid not null references delivery_shifts(id) on delete cascade,
  platform text not null,
  amount numeric(12,2) not null check (amount >= 0),
  tips numeric(12,2) not null default 0 check (tips >= 0),
  deliveries integer not null default 1 check (deliveries >= 0),
  created_at timestamptz not null default now()
);
create index if not exists delivery_earnings_shift on delivery_earnings (shift_id);

-- 5) Gastos da jornada (pedágio, estacionamento, alimentação...)
create table if not exists delivery_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  shift_id uuid not null references delivery_shifts(id) on delete cascade,
  kind text not null,
  amount numeric(12,2) not null check (amount > 0),
  description text,
  created_at timestamptz not null default now()
);
create index if not exists delivery_expenses_shift on delivery_expenses (shift_id);

-- Segurança: cada usuário só vê os próprios dados
do $$
declare t text;
begin
  foreach t in array array['delivery_settings', 'fuel_ups', 'delivery_shifts', 'delivery_earnings', 'delivery_expenses'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I on %I', t || '_own', t);
    execute format('create policy %I on %I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', t || '_own', t);
  end loop;
end $$;
