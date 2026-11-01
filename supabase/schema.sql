-- Volte!Sempre - esquema inicial para um projeto Supabase vazio.
-- Pode ser executado novamente sem apagar dados. Configure Google como provedor
-- exclusivo em Authentication > Providers; o SQL tambem valida o provedor
-- nas funcoes de criacao de loja e aceite de convite.

begin;

create table if not exists public.lojas (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(btrim(nome)) > 0),
  ativa boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  loja_id uuid not null references public.lojas(id) on delete cascade,
  nome text not null,
  email text,
  role text not null default 'funcionario'
    check (role in ('dono', 'funcionario')),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (id, loja_id)
);

create table if not exists public.aceites_legais (
  usuario_id uuid not null references auth.users(id) on delete cascade,
  termos_versao text not null,
  privacidade_versao text not null,
  aceito_em timestamptz not null default now(),
  primary key (usuario_id, termos_versao, privacidade_versao)
);
create index if not exists aceites_legais_usuario_data_idx
  on public.aceites_legais (usuario_id, aceito_em desc);

create table if not exists public.convites_loja (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references public.lojas(id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  email text,
  role text not null default 'funcionario'
    check (role = 'funcionario'),
  criado_por uuid not null,
  criado_em timestamptz not null default now(),
  expira_em timestamptz not null default (now() + interval '7 days'),
  aceito_em timestamptz,
  revogado_em timestamptz,
  foreign key (criado_por, loja_id)
    references public.usuarios(id, loja_id) on delete restrict,
  unique (id, loja_id)
);

create table if not exists public.setores (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references public.lojas(id) on delete cascade,
  nome text not null check (length(btrim(nome)) > 0),
  criado_em timestamptz not null default now(),
  unique (id, loja_id),
  unique (loja_id, nome)
);

create table if not exists public.marcas (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references public.lojas(id) on delete cascade,
  setor_id uuid,
  nome text not null check (length(btrim(nome)) > 0),
  criado_em timestamptz not null default now(),
  unique (id, loja_id),
  unique (loja_id, nome),
  foreign key (setor_id, loja_id)
    references public.setores(id, loja_id) on delete restrict
);

create table if not exists public.produtos (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references public.lojas(id) on delete cascade,
  marca_id uuid,
  nome text not null check (length(btrim(nome)) > 0),
  tipo text not null default 'produto',
  codigo_barras text,
  preco_custo numeric(12,2) not null default 0 check (preco_custo >= 0),
  preco_venda numeric(12,2) not null default 0 check (preco_venda >= 0),
  estoque integer not null default 0 check (estoque >= 0),
  imagem_url text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (id, loja_id),
  foreign key (marca_id, loja_id)
    references public.marcas(id, loja_id) on delete restrict
);

create unique index if not exists produtos_codigo_barras_por_loja
  on public.produtos (loja_id, codigo_barras)
  where codigo_barras is not null;

create table if not exists public.estoque_lotes (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references public.lojas(id) on delete cascade,
  produto_id uuid not null,
  quantidade_inicial integer not null check (quantidade_inicial >= 0),
  quantidade_atual integer not null check (
    quantidade_atual >= 0 and quantidade_atual <= quantidade_inicial
  ),
  preco_custo numeric(12,2) not null check (preco_custo >= 0),
  status text not null default 'ativo'
    check (status in ('ativo', 'esgotado', 'inativo')),
  criado_em timestamptz not null default now(),
  unique (id, loja_id),
  foreign key (produto_id, loja_id)
    references public.produtos(id, loja_id) on delete restrict
);

create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references public.lojas(id) on delete cascade,
  nome text not null check (length(btrim(nome)) > 0),
  telefone text,
  cpf text,
  limite_credito numeric(12,2) not null default 0
    check (limite_credito >= 0),
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (id, loja_id)
);

create unique index if not exists clientes_cpf_por_loja
  on public.clientes (loja_id, cpf)
  where cpf is not null and btrim(cpf) <> '';

create table if not exists public.caixa_sessoes (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references public.lojas(id) on delete cascade,
  usuario_id uuid not null,
  fechado_por uuid,
  perfil_id uuid,
  operador text not null,
  status text not null default 'aberto'
    check (status in ('aberto', 'fechado')),
  aberto_em timestamptz not null default now(),
  fechado_em timestamptz,
  unique (id, loja_id),
  foreign key (usuario_id, loja_id)
    references public.usuarios(id, loja_id) on delete restrict,
  foreign key (fechado_por, loja_id)
    references public.usuarios(id, loja_id) on delete restrict,
  foreign key (perfil_id, loja_id)
    references public.usuarios(id, loja_id) on delete restrict,
  check (
    (status = 'aberto' and fechado_em is null)
    or (status = 'fechado' and fechado_em is not null)
  )
);

create table if not exists public.vendas (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references public.lojas(id) on delete cascade,
  cliente_id uuid,
  sessao_id uuid,
  usuario_id uuid not null,
  total numeric(12,2) not null check (total >= 0),
  metodo_pagamento text not null,
  valor_recebido numeric(12,2) check (valor_recebido is null or valor_recebido >= 0),
  troco numeric(12,2) not null default 0 check (troco >= 0),
  pagamentos jsonb not null default '[]'::jsonb,
  status text not null default 'concluida'
    check (status in ('concluida', 'cancelada')),
  criado_em timestamptz not null default now(),
  unique (id, loja_id),
  foreign key (cliente_id, loja_id)
    references public.clientes(id, loja_id) on delete restrict,
  foreign key (sessao_id, loja_id)
    references public.caixa_sessoes(id, loja_id) on delete restrict,
  foreign key (usuario_id, loja_id)
    references public.usuarios(id, loja_id) on delete restrict
);

create table if not exists public.vendas_itens (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references public.lojas(id) on delete cascade,
  usuario_id uuid not null,
  venda_id uuid not null,
  produto_id uuid,
  nome text not null,
  quantidade integer not null check (quantidade > 0),
  preco_custo numeric(12,2) not null check (preco_custo >= 0),
  preco_venda numeric(12,2) not null check (preco_venda >= 0),
  criado_em timestamptz not null default now(),
  foreign key (usuario_id, loja_id)
    references public.usuarios(id, loja_id) on delete restrict,
  foreign key (venda_id, loja_id)
    references public.vendas(id, loja_id) on delete cascade,
  foreign key (produto_id, loja_id)
    references public.produtos(id, loja_id) on delete restrict
);

create table if not exists public.fiado_contas (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references public.lojas(id) on delete cascade,
  usuario_id uuid not null,
  cliente_id uuid not null,
  venda_id uuid,
  valor_total numeric(12,2) not null check (valor_total > 0),
  valor_pago numeric(12,2) not null default 0
    check (valor_pago >= 0 and valor_pago <= valor_total),
  status text not null default 'aberta'
    check (status in ('aberta', 'paga', 'cancelada')),
  descricao text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (id, loja_id),
  unique (id, loja_id, cliente_id),
  foreign key (usuario_id, loja_id)
    references public.usuarios(id, loja_id) on delete restrict,
  foreign key (cliente_id, loja_id)
    references public.clientes(id, loja_id) on delete restrict,
  foreign key (venda_id, loja_id)
    references public.vendas(id, loja_id) on delete restrict
);

create table if not exists public.fiado_pagamentos (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references public.lojas(id) on delete cascade,
  usuario_id uuid not null,
  cliente_id uuid not null,
  fiado_conta_id uuid,
  valor numeric(12,2) not null check (valor > 0),
  metodo_pagamento text not null,
  observacao text,
  criado_em timestamptz not null default now(),
  foreign key (usuario_id, loja_id)
    references public.usuarios(id, loja_id) on delete restrict,
  foreign key (cliente_id, loja_id)
    references public.clientes(id, loja_id) on delete restrict,
  foreign key (fiado_conta_id, loja_id, cliente_id)
    references public.fiado_contas(id, loja_id, cliente_id) on delete restrict
);

create table if not exists public.fichas_contas (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references public.lojas(id) on delete cascade,
  cliente_id uuid not null,
  venda_id uuid,
  valor_total numeric(12,2) not null check (valor_total > 0),
  valor_pago numeric(12,2) not null default 0
    check (valor_pago >= 0 and valor_pago <= valor_total),
  status text not null default 'aberta'
    check (status in ('aberta', 'paga', 'cancelada')),
  descricao text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (id, loja_id),
  unique (id, loja_id, cliente_id),
  foreign key (cliente_id, loja_id)
    references public.clientes(id, loja_id) on delete restrict,
  foreign key (venda_id, loja_id)
    references public.vendas(id, loja_id) on delete restrict
);

create table if not exists public.fichas_pagamentos (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references public.lojas(id) on delete cascade,
  cliente_id uuid not null,
  fichas_conta_id uuid,
  valor numeric(12,2) not null check (valor > 0),
  metodo_pagamento text not null,
  observacao text,
  criado_em timestamptz not null default now(),
  foreign key (cliente_id, loja_id)
    references public.clientes(id, loja_id) on delete restrict,
  foreign key (fichas_conta_id, loja_id, cliente_id)
    references public.fichas_contas(id, loja_id, cliente_id) on delete restrict
);

create table if not exists public.onesignal_dispositivos (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references public.lojas(id) on delete cascade,
  usuario_id uuid not null,
  external_id text not null,
  subscription_id text not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (subscription_id),
  unique (id, loja_id),
  foreign key (usuario_id, loja_id)
    references public.usuarios(id, loja_id) on delete cascade,
  check (external_id = usuario_id::text),
  check (length(btrim(subscription_id)) > 0)
);

create index if not exists usuarios_loja_role_idx on public.usuarios (loja_id, role, ativo);
create index if not exists convites_loja_pendentes_idx
  on public.convites_loja (loja_id, expira_em)
  where aceito_em is null and revogado_em is null;
create index if not exists marcas_setor_idx on public.marcas (loja_id, setor_id);
create index if not exists produtos_marca_idx on public.produtos (loja_id, marca_id);
create index if not exists estoque_lotes_produto_idx
  on public.estoque_lotes (loja_id, produto_id, status);
create index if not exists clientes_nome_idx on public.clientes (loja_id, nome);
create index if not exists caixa_sessoes_status_idx
  on public.caixa_sessoes (loja_id, status, aberto_em desc);
create index if not exists vendas_criado_em_idx on public.vendas (loja_id, criado_em desc);
create index if not exists vendas_cliente_idx on public.vendas (loja_id, cliente_id);
create index if not exists vendas_itens_venda_idx on public.vendas_itens (loja_id, venda_id);
create index if not exists fiado_contas_cliente_status_idx
  on public.fiado_contas (loja_id, cliente_id, status);
create index if not exists fiado_pagamentos_conta_idx
  on public.fiado_pagamentos (loja_id, fiado_conta_id);
create index if not exists fichas_contas_cliente_status_idx
  on public.fichas_contas (loja_id, cliente_id, status);
create index if not exists fichas_pagamentos_conta_idx
  on public.fichas_pagamentos (loja_id, fichas_conta_id);
create index if not exists onesignal_dispositivos_loja_ativo_idx
  on public.onesignal_dispositivos (loja_id, ativo);

create or replace function public.minha_loja_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select u.loja_id
  from public.usuarios as u
  join public.lojas as l on l.id = u.loja_id
  where u.id = (select auth.uid())
    and u.ativo
    and l.ativa
  limit 1
$$;

create or replace function public.sou_dono_da_loja()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.usuarios as u
    where u.id = (select auth.uid())
      and u.ativo
      and u.role = 'dono'
  )
$$;

create or replace function public.auth_user_is_google(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users as au
    where au.id = p_user_id
      and (
        au.raw_app_meta_data ->> 'provider' = 'google'
        or coalesce(au.raw_app_meta_data -> 'providers', '[]'::jsonb) ? 'google'
      )
  )
$$;

revoke all on function public.minha_loja_id() from public, anon;
revoke all on function public.sou_dono_da_loja() from public, anon;
revoke all on function public.auth_user_is_google(uuid) from public, anon, authenticated;
grant execute on function public.minha_loja_id() to authenticated;
grant execute on function public.sou_dono_da_loja() to authenticated;

create or replace function public.registrar_aceite_legal(
  p_termos_versao text,
  p_privacidade_versao text
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_aceito_em timestamptz;
begin
  if v_user_id is null then
    raise exception 'Autenticacao obrigatoria';
  end if;
  if p_termos_versao <> '1.0.0' or p_privacidade_versao <> '1.0.0' then
    raise exception 'Versao dos documentos legais invalida';
  end if;

  insert into public.aceites_legais (
    usuario_id, termos_versao, privacidade_versao, aceito_em
  )
  values (v_user_id, p_termos_versao, p_privacidade_versao, now())
  on conflict (usuario_id, termos_versao, privacidade_versao) do nothing
  returning aceito_em into v_aceito_em;

  if v_aceito_em is null then
    select aceito_em into v_aceito_em
    from public.aceites_legais
    where usuario_id = v_user_id
      and termos_versao = p_termos_versao
      and privacidade_versao = p_privacidade_versao;
  end if;

  return v_aceito_em;
end
$$;

revoke all on function public.registrar_aceite_legal(text, text) from public, anon;
grant execute on function public.registrar_aceite_legal(text, text) to authenticated;

create or replace function public.criar_loja(p_nome text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_loja_id uuid;
  v_nome_usuario text;
  v_email text;
begin
  if v_user_id is null then
    raise exception 'Autenticacao obrigatoria';
  end if;
  if not public.auth_user_is_google(v_user_id) then
    raise exception 'Entre com uma conta Google para criar uma loja';
  end if;
  if p_nome is null or length(btrim(p_nome)) = 0 then
    raise exception 'O nome da loja e obrigatorio';
  end if;
  if exists (select 1 from public.usuarios where id = v_user_id) then
    raise exception 'Este usuario ja pertence a uma loja';
  end if;

  select
    coalesce(
      nullif(btrim(au.raw_user_meta_data ->> 'full_name'), ''),
      nullif(btrim(au.raw_user_meta_data ->> 'name'), ''),
      au.email
    ),
    au.email
  into v_nome_usuario, v_email
  from auth.users as au
  where au.id = v_user_id;

  insert into public.lojas (nome)
  values (btrim(p_nome))
  returning id into v_loja_id;

  insert into public.usuarios (id, loja_id, nome, email, role)
  values (v_user_id, v_loja_id, coalesce(v_nome_usuario, 'Dono'), v_email, 'dono');

  return v_loja_id;
end
$$;

create or replace function public.criar_convite(p_email text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_loja_id uuid;
  v_token uuid;
begin
  if v_user_id is null or not public.sou_dono_da_loja() then
    raise exception 'Somente o dono da loja pode criar convites';
  end if;

  v_loja_id := public.minha_loja_id();
  insert into public.convites_loja (loja_id, email, criado_por)
  values (
    v_loja_id,
    nullif(lower(btrim(p_email)), ''),
    v_user_id
  )
  returning token into v_token;

  return v_token;
end
$$;

create or replace function public.aceitar_convite(p_token uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_convite public.convites_loja%rowtype;
  v_email text;
  v_nome text;
begin
  if v_user_id is null then
    raise exception 'Autenticacao obrigatoria';
  end if;
  if not public.auth_user_is_google(v_user_id) then
    raise exception 'Entre com uma conta Google para aceitar o convite';
  end if;
  if exists (select 1 from public.usuarios where id = v_user_id) then
    raise exception 'Este usuario ja pertence a uma loja';
  end if;

  select *
  into v_convite
  from public.convites_loja
  where token = p_token
  for update;

  if not found
    or v_convite.aceito_em is not null
    or v_convite.revogado_em is not null
    or v_convite.expira_em <= now()
  then
    raise exception 'Convite invalido, expirado ou ja utilizado';
  end if;

  select au.email,
    coalesce(
      nullif(btrim(au.raw_user_meta_data ->> 'full_name'), ''),
      nullif(btrim(au.raw_user_meta_data ->> 'name'), ''),
      au.email
    )
  into v_email, v_nome
  from auth.users as au
  where au.id = v_user_id;

  if v_convite.email is not null
    and lower(v_convite.email) <> lower(coalesce(v_email, ''))
  then
    raise exception 'Este convite foi enviado para outro endereco de email';
  end if;

  insert into public.usuarios (id, loja_id, nome, email, role)
  values (
    v_user_id,
    v_convite.loja_id,
    coalesce(v_nome, 'Funcionario'),
    v_email,
    v_convite.role
  );

  update public.convites_loja
  set aceito_em = now()
  where id = v_convite.id;

  return v_convite.loja_id;
end
$$;

revoke all on function public.criar_loja(text) from public, anon;
revoke all on function public.criar_convite(text) from public, anon;
revoke all on function public.aceitar_convite(uuid) from public, anon;
grant execute on function public.criar_loja(text) to authenticated;
grant execute on function public.criar_convite(text) to authenticated;
grant execute on function public.aceitar_convite(uuid) to authenticated;

alter table public.lojas enable row level security;
alter table public.usuarios enable row level security;
alter table public.aceites_legais enable row level security;
alter table public.convites_loja enable row level security;
alter table public.setores enable row level security;
alter table public.marcas enable row level security;
alter table public.produtos enable row level security;
alter table public.estoque_lotes enable row level security;
alter table public.clientes enable row level security;
alter table public.caixa_sessoes enable row level security;
alter table public.vendas enable row level security;
alter table public.vendas_itens enable row level security;
alter table public.fiado_contas enable row level security;
alter table public.fiado_pagamentos enable row level security;
alter table public.fichas_contas enable row level security;
alter table public.fichas_pagamentos enable row level security;
alter table public.onesignal_dispositivos enable row level security;

drop policy if exists aceites_legais_select_self on public.aceites_legais;
create policy aceites_legais_select_self on public.aceites_legais
  for select to authenticated
  using (usuario_id = (select auth.uid()));
revoke all on public.aceites_legais from public, anon, authenticated;
grant select on public.aceites_legais to authenticated;

drop policy if exists lojas_select_tenant on public.lojas;
create policy lojas_select_tenant on public.lojas
  for select to authenticated using (id = (select public.minha_loja_id()));
drop policy if exists lojas_insert_blocked on public.lojas;
create policy lojas_insert_blocked on public.lojas
  for insert to authenticated with check (false);
drop policy if exists lojas_update_tenant on public.lojas;
create policy lojas_update_tenant on public.lojas
  for update to authenticated
  using (id = (select public.minha_loja_id()) and (select public.sou_dono_da_loja()))
  with check (id = (select public.minha_loja_id()) and (select public.sou_dono_da_loja()));
drop policy if exists lojas_delete_blocked on public.lojas;
create policy lojas_delete_blocked on public.lojas
  for delete to authenticated using (false);

drop policy if exists usuarios_select_tenant on public.usuarios;
create policy usuarios_select_tenant on public.usuarios
  for select to authenticated
  using (loja_id = (select public.minha_loja_id()));
drop policy if exists usuarios_insert_blocked on public.usuarios;
create policy usuarios_insert_blocked on public.usuarios
  for insert to authenticated with check (false);
drop policy if exists usuarios_update_owner on public.usuarios;
create policy usuarios_update_owner on public.usuarios
  for update to authenticated
  using (
    loja_id = (select public.minha_loja_id())
    and (select public.sou_dono_da_loja())
  )
  with check (
    loja_id = (select public.minha_loja_id())
    and (id <> (select auth.uid()) or ativo)
    and (select public.sou_dono_da_loja())
  );
drop policy if exists usuarios_delete_employee_owner on public.usuarios;
create policy usuarios_delete_employee_owner on public.usuarios
  for delete to authenticated
  using (
    loja_id = (select public.minha_loja_id())
    and role = 'funcionario'
    and (select public.sou_dono_da_loja())
  );

drop policy if exists convites_loja_select_owner on public.convites_loja;
create policy convites_loja_select_owner on public.convites_loja
  for select to authenticated
  using (
    loja_id = (select public.minha_loja_id())
    and (select public.sou_dono_da_loja())
  );
drop policy if exists convites_loja_insert_owner on public.convites_loja;
create policy convites_loja_insert_owner on public.convites_loja
  for insert to authenticated
  with check (
    loja_id = (select public.minha_loja_id())
    and criado_por = (select auth.uid())
    and role = 'funcionario'
    and (select public.sou_dono_da_loja())
  );
drop policy if exists convites_loja_update_owner on public.convites_loja;
create policy convites_loja_update_owner on public.convites_loja
  for update to authenticated
  using (
    loja_id = (select public.minha_loja_id())
    and (select public.sou_dono_da_loja())
  )
  with check (
    loja_id = (select public.minha_loja_id())
    and (select public.sou_dono_da_loja())
  );
drop policy if exists convites_loja_delete_owner on public.convites_loja;
create policy convites_loja_delete_owner on public.convites_loja
  for delete to authenticated
  using (
    loja_id = (select public.minha_loja_id())
    and (select public.sou_dono_da_loja())
  );

drop policy if exists setores_tenant_all on public.setores;
create policy setores_tenant_all on public.setores
  for all to authenticated
  using (loja_id = (select public.minha_loja_id()))
  with check (loja_id = (select public.minha_loja_id()));
drop policy if exists marcas_tenant_all on public.marcas;
create policy marcas_tenant_all on public.marcas
  for all to authenticated
  using (loja_id = (select public.minha_loja_id()))
  with check (loja_id = (select public.minha_loja_id()));
drop policy if exists produtos_tenant_all on public.produtos;
create policy produtos_tenant_all on public.produtos
  for all to authenticated
  using (loja_id = (select public.minha_loja_id()))
  with check (loja_id = (select public.minha_loja_id()));
drop policy if exists estoque_lotes_tenant_all on public.estoque_lotes;
create policy estoque_lotes_tenant_all on public.estoque_lotes
  for all to authenticated
  using (loja_id = (select public.minha_loja_id()))
  with check (loja_id = (select public.minha_loja_id()));
drop policy if exists clientes_tenant_all on public.clientes;
create policy clientes_tenant_all on public.clientes
  for all to authenticated
  using (loja_id = (select public.minha_loja_id()))
  with check (loja_id = (select public.minha_loja_id()));
drop policy if exists caixa_sessoes_tenant_all on public.caixa_sessoes;
create policy caixa_sessoes_tenant_all on public.caixa_sessoes
  for all to authenticated
  using (loja_id = (select public.minha_loja_id()))
  with check (loja_id = (select public.minha_loja_id()));
drop policy if exists vendas_tenant_all on public.vendas;
create policy vendas_tenant_all on public.vendas
  for all to authenticated
  using (loja_id = (select public.minha_loja_id()))
  with check (loja_id = (select public.minha_loja_id()));
drop policy if exists vendas_itens_tenant_all on public.vendas_itens;
create policy vendas_itens_tenant_all on public.vendas_itens
  for all to authenticated
  using (loja_id = (select public.minha_loja_id()))
  with check (loja_id = (select public.minha_loja_id()));
drop policy if exists fiado_contas_tenant_all on public.fiado_contas;
create policy fiado_contas_tenant_all on public.fiado_contas
  for all to authenticated
  using (loja_id = (select public.minha_loja_id()))
  with check (loja_id = (select public.minha_loja_id()));
drop policy if exists fiado_pagamentos_tenant_all on public.fiado_pagamentos;
create policy fiado_pagamentos_tenant_all on public.fiado_pagamentos
  for all to authenticated
  using (loja_id = (select public.minha_loja_id()))
  with check (loja_id = (select public.minha_loja_id()));
drop policy if exists fichas_contas_tenant_all on public.fichas_contas;
create policy fichas_contas_tenant_all on public.fichas_contas
  for all to authenticated
  using (loja_id = (select public.minha_loja_id()))
  with check (loja_id = (select public.minha_loja_id()));
drop policy if exists fichas_pagamentos_tenant_all on public.fichas_pagamentos;
create policy fichas_pagamentos_tenant_all on public.fichas_pagamentos
  for all to authenticated
  using (loja_id = (select public.minha_loja_id()))
  with check (loja_id = (select public.minha_loja_id()));

drop policy if exists onesignal_dispositivos_select_owner_or_self
  on public.onesignal_dispositivos;
create policy onesignal_dispositivos_select_owner_or_self
  on public.onesignal_dispositivos
  for select to authenticated
  using (
    loja_id = (select public.minha_loja_id())
    and (
      usuario_id = (select auth.uid())
      or (select public.sou_dono_da_loja())
    )
  );
drop policy if exists onesignal_dispositivos_insert_self
  on public.onesignal_dispositivos;
create policy onesignal_dispositivos_insert_self
  on public.onesignal_dispositivos
  for insert to authenticated
  with check (
    loja_id = (select public.minha_loja_id())
    and usuario_id = (select auth.uid())
    and external_id = (select auth.uid())::text
  );
drop policy if exists onesignal_dispositivos_update_owner_or_self
  on public.onesignal_dispositivos;
create policy onesignal_dispositivos_update_owner_or_self
  on public.onesignal_dispositivos
  for update to authenticated
  using (
    loja_id = (select public.minha_loja_id())
    and (
      usuario_id = (select auth.uid())
      or (select public.sou_dono_da_loja())
    )
  )
  with check (
    loja_id = (select public.minha_loja_id())
    and external_id = usuario_id::text
    and (
      usuario_id = (select auth.uid())
      or (select public.sou_dono_da_loja())
    )
  );
drop policy if exists onesignal_dispositivos_delete_owner_or_self
  on public.onesignal_dispositivos;
create policy onesignal_dispositivos_delete_owner_or_self
  on public.onesignal_dispositivos
  for delete to authenticated
  using (
    loja_id = (select public.minha_loja_id())
    and (
      usuario_id = (select auth.uid())
      or (select public.sou_dono_da_loja())
    )
  );

grant usage on schema public to authenticated;
revoke all on all tables in schema public from anon;
grant select, insert, update, delete on
  public.lojas,
  public.convites_loja,
  public.setores,
  public.marcas,
  public.produtos,
  public.estoque_lotes,
  public.clientes,
  public.caixa_sessoes,
  public.vendas,
  public.vendas_itens,
  public.fiado_contas,
  public.fiado_pagamentos,
  public.fichas_contas,
  public.fichas_pagamentos,
  public.onesignal_dispositivos
to authenticated;
grant select, insert, delete on public.usuarios to authenticated;
revoke update on public.usuarios from authenticated;
grant update (nome, email, ativo) on public.usuarios to authenticated;

commit;
