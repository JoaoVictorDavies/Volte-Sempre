begin;

create table if not exists public.aceites_legais (
  usuario_id uuid not null references auth.users(id) on delete cascade,
  termos_versao text not null,
  privacidade_versao text not null,
  aceito_em timestamptz not null default now(),
  primary key (usuario_id, termos_versao, privacidade_versao)
);

create index if not exists aceites_legais_usuario_data_idx
  on public.aceites_legais (usuario_id, aceito_em desc);

alter table public.aceites_legais enable row level security;
drop policy if exists aceites_legais_select_self on public.aceites_legais;
create policy aceites_legais_select_self on public.aceites_legais
  for select to authenticated
  using (usuario_id = (select auth.uid()));

revoke all on public.aceites_legais from public, anon, authenticated;
grant select on public.aceites_legais to authenticated;

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

commit;
