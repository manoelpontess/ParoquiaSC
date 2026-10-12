-- ============================================================
--  PASSEIO PAROQUIAL — Paróquia Santa Cruz
--  Schema completo do banco (Supabase / PostgreSQL)
--
--  Como usar:
--  1. Crie um projeto novo no Supabase
--  2. Abra "SQL Editor" → "New query"
--  3. Cole TODO este arquivo e clique em "Run"
--
--  O script é idempotente: pode ser executado mais de uma vez.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
--  CONFIGURAÇÕES (linha única)
-- ------------------------------------------------------------
create table if not exists configuracoes (
  id          int primary key default 1 check (id = 1),
  preco_mesa  numeric(10,2) not null default 15.00,
  pix_chave   text not null default '44539002287',          -- CPF 445.390.022-87
  pix_nome    text not null default 'Paroquia Santa Cruz',
  pix_cidade  text not null default 'Manaus',
  updated_at  timestamptz not null default now()
);

insert into configuracoes (id) values (1) on conflict (id) do nothing;

-- ------------------------------------------------------------
--  RESPONSÁVEIS (pessoas que vendem / acompanham as mesas)
-- ------------------------------------------------------------
create table if not exists responsaveis (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null unique,
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
--  COMPRADORES
-- ------------------------------------------------------------
create table if not exists compradores (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  telefone    text,
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
--  VENDAS
-- ------------------------------------------------------------
create table if not exists vendas (
  id               uuid primary key default gen_random_uuid(),
  comprador_id     uuid references compradores(id) on delete set null,
  status           text not null default 'reservada' check (status in ('reservada', 'pago')),
  forma_pagamento  text check (forma_pagamento in ('pix', 'dinheiro', 'debito', 'credito')),
  total            numeric(10,2) not null default 0,
  responsavel      text,
  created_at       timestamptz not null default now(),
  pago_em          timestamptz
);

-- ------------------------------------------------------------
--  MESAS (1 a 50)
-- ------------------------------------------------------------
create table if not exists mesas (
  numero        int primary key check (numero between 1 and 50),
  status        text not null default 'livre' check (status in ('livre', 'reservada', 'vendida')),
  venda_id      uuid references vendas(id) on delete set null,
  preco         numeric(10,2),        -- valor cobrado por esta mesa no momento da venda
  reservado_em  timestamptz
);

insert into mesas (numero)
select generate_series(1, 50)
on conflict (numero) do nothing;

create index if not exists mesas_venda_id_idx on mesas(venda_id);

-- ============================================================
--  FUNÇÕES (operações atômicas)
-- ============================================================

-- Registra uma venda (ou reserva) de uma ou mais mesas.
create or replace function registrar_venda(
  p_mesas            int[],
  p_nome             text,
  p_telefone         text,
  p_responsavel      text,
  p_forma_pagamento  text,
  p_pago             boolean
) returns uuid
language plpgsql
as $$
declare
  v_preco      numeric(10,2);
  v_qtd        int;
  v_comprador  uuid;
  v_venda      uuid;
begin
  if p_mesas is null or coalesce(array_length(p_mesas, 1), 0) = 0 then
    raise exception 'Selecione ao menos uma mesa.';
  end if;

  if coalesce(trim(p_nome), '') = '' then
    raise exception 'Informe o nome do comprador.';
  end if;

  if p_pago and p_forma_pagamento is null then
    raise exception 'Informe a forma de pagamento.';
  end if;

  -- Trava as mesas para evitar venda duplicada simultânea
  perform 1 from mesas where numero = any(p_mesas) for update;

  select count(*) into v_qtd from mesas where numero = any(p_mesas);
  if v_qtd <> array_length(p_mesas, 1) then
    raise exception 'Uma ou mais mesas são inválidas.';
  end if;

  if exists (select 1 from mesas where numero = any(p_mesas) and status <> 'livre') then
    raise exception 'Uma ou mais mesas já foram vendidas. Atualize a tela e tente novamente.';
  end if;

  select preco_mesa into v_preco from configuracoes where id = 1;

  insert into compradores (nome, telefone)
  values (trim(p_nome), nullif(trim(coalesce(p_telefone, '')), ''))
  returning id into v_comprador;

  insert into vendas (comprador_id, status, forma_pagamento, total, responsavel, pago_em)
  values (
    v_comprador,
    case when p_pago then 'pago' else 'reservada' end,
    p_forma_pagamento,
    v_preco * v_qtd,
    nullif(trim(coalesce(p_responsavel, '')), ''),
    case when p_pago then now() end
  )
  returning id into v_venda;

  update mesas
     set status       = case when p_pago then 'vendida' else 'reservada' end,
         venda_id     = v_venda,
         preco        = v_preco,
         reservado_em = now()
   where numero = any(p_mesas);

  return v_venda;
end;
$$;

-- Confirma o pagamento de uma reserva (todas as mesas da venda).
create or replace function confirmar_pagamento(
  p_venda_id         uuid,
  p_forma_pagamento  text
) returns void
language plpgsql
as $$
begin
  update vendas
     set status = 'pago', forma_pagamento = p_forma_pagamento, pago_em = now()
   where id = p_venda_id;

  update mesas set status = 'vendida' where venda_id = p_venda_id;
end;
$$;

-- Libera UMA mesa. Ajusta o total da venda e remove a venda se ficar vazia.
create or replace function liberar_mesa(p_numero int) returns void
language plpgsql
as $$
declare
  v_venda  uuid;
  v_preco  numeric(10,2);
  v_comp   uuid;
begin
  select venda_id, coalesce(preco, 0) into v_venda, v_preco
    from mesas where numero = p_numero for update;

  update mesas
     set status = 'livre', venda_id = null, preco = null, reservado_em = null
   where numero = p_numero;

  if v_venda is not null then
    if exists (select 1 from mesas where venda_id = v_venda) then
      update vendas set total = greatest(total - v_preco, 0) where id = v_venda;
    else
      select comprador_id into v_comp from vendas where id = v_venda;
      delete from vendas where id = v_venda;
      delete from compradores where id = v_comp;
    end if;
  end if;
end;
$$;

-- Cancela uma venda inteira, liberando todas as suas mesas.
create or replace function cancelar_venda(p_venda_id uuid) returns void
language plpgsql
as $$
declare
  v_comp uuid;
begin
  update mesas
     set status = 'livre', venda_id = null, preco = null, reservado_em = null
   where venda_id = p_venda_id;

  select comprador_id into v_comp from vendas where id = p_venda_id;
  delete from vendas where id = p_venda_id;
  delete from compradores where id = v_comp;
end;
$$;

-- ============================================================
--  SEGURANÇA (RLS)
--  O app acessa o banco pelo servidor com a SERVICE ROLE KEY,
--  que ignora o RLS. O público (anon) só pode LER o status das
--  mesas — usado para atualização em tempo real.
-- ============================================================
alter table configuracoes enable row level security;
alter table responsaveis  enable row level security;
alter table compradores   enable row level security;
alter table vendas        enable row level security;
alter table mesas         enable row level security;

drop policy if exists "leitura publica das mesas" on mesas;
create policy "leitura publica das mesas" on mesas for select using (true);

revoke execute on function registrar_venda(int[], text, text, text, text, boolean) from public, anon, authenticated;
revoke execute on function confirmar_pagamento(uuid, text) from public, anon, authenticated;
revoke execute on function liberar_mesa(int) from public, anon, authenticated;
revoke execute on function cancelar_venda(uuid) from public, anon, authenticated;

-- Realtime para a tabela de mesas
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'mesas'
  ) then
    alter publication supabase_realtime add table mesas;
  end if;
end $$;
