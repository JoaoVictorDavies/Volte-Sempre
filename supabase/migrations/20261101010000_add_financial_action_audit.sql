-- Add actor attribution for cash sessions and credit-account activity.
-- Existing rows remain nullable when their historical actor cannot be recovered.

begin;

alter table public.caixa_sessoes
  add column if not exists usuario_id uuid,
  add column if not exists fechado_por uuid;

update public.caixa_sessoes
set usuario_id = perfil_id
where usuario_id is null
  and perfil_id is not null;

alter table public.vendas_itens
  add column if not exists usuario_id uuid;

update public.vendas_itens as item
set usuario_id = venda.usuario_id
from public.vendas as venda
where item.venda_id = venda.id
  and item.loja_id = venda.loja_id
  and item.usuario_id is null
  and venda.usuario_id is not null;

alter table public.fiado_contas
  add column if not exists usuario_id uuid;

alter table public.fiado_pagamentos
  add column if not exists usuario_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'caixa_sessoes_usuario_loja_fkey'
      and conrelid = 'public.caixa_sessoes'::regclass
  ) then
    alter table public.caixa_sessoes
      add constraint caixa_sessoes_usuario_loja_fkey
      foreign key (usuario_id, loja_id)
      references public.usuarios(id, loja_id) on delete restrict;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'caixa_sessoes_fechado_por_loja_fkey'
      and conrelid = 'public.caixa_sessoes'::regclass
  ) then
    alter table public.caixa_sessoes
      add constraint caixa_sessoes_fechado_por_loja_fkey
      foreign key (fechado_por, loja_id)
      references public.usuarios(id, loja_id) on delete restrict;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'vendas_itens_usuario_loja_fkey'
      and conrelid = 'public.vendas_itens'::regclass
  ) then
    alter table public.vendas_itens
      add constraint vendas_itens_usuario_loja_fkey
      foreign key (usuario_id, loja_id)
      references public.usuarios(id, loja_id) on delete restrict;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'fiado_contas_usuario_loja_fkey'
      and conrelid = 'public.fiado_contas'::regclass
  ) then
    alter table public.fiado_contas
      add constraint fiado_contas_usuario_loja_fkey
      foreign key (usuario_id, loja_id)
      references public.usuarios(id, loja_id) on delete restrict;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'fiado_pagamentos_usuario_loja_fkey'
      and conrelid = 'public.fiado_pagamentos'::regclass
  ) then
    alter table public.fiado_pagamentos
      add constraint fiado_pagamentos_usuario_loja_fkey
      foreign key (usuario_id, loja_id)
      references public.usuarios(id, loja_id) on delete restrict;
  end if;
end
$$;

create index if not exists caixa_sessoes_usuario_aberto_idx
  on public.caixa_sessoes (loja_id, usuario_id, status);
create index if not exists vendas_itens_usuario_idx
  on public.vendas_itens (loja_id, usuario_id);
create index if not exists fiado_contas_usuario_idx
  on public.fiado_contas (loja_id, usuario_id);
create index if not exists fiado_pagamentos_usuario_idx
  on public.fiado_pagamentos (loja_id, usuario_id);

commit;
