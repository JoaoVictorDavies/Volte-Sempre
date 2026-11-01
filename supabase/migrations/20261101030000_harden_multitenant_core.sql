begin;

alter table public.vendas
  add column if not exists pagamentos jsonb not null default '[]'::jsonb;

alter table public.fichas_contas
  add column if not exists usuario_id uuid;
alter table public.fichas_pagamentos
  add column if not exists usuario_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'fichas_contas_usuario_loja_fkey'
      and conrelid = 'public.fichas_contas'::regclass
  ) then
    alter table public.fichas_contas
      add constraint fichas_contas_usuario_loja_fkey
      foreign key (usuario_id, loja_id)
      references public.usuarios(id, loja_id) on delete restrict;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'fichas_pagamentos_usuario_loja_fkey'
      and conrelid = 'public.fichas_pagamentos'::regclass
  ) then
    alter table public.fichas_pagamentos
      add constraint fichas_pagamentos_usuario_loja_fkey
      foreign key (usuario_id, loja_id)
      references public.usuarios(id, loja_id) on delete restrict;
  end if;
end
$$;

create table if not exists public.pdv_operacoes (
  loja_id uuid not null references public.lojas(id) on delete cascade,
  chave uuid not null,
  usuario_id uuid not null,
  tipo text not null,
  payload jsonb not null,
  resultado jsonb,
  criado_em timestamptz not null default now(),
  primary key (loja_id, chave),
  foreign key (usuario_id, loja_id)
    references public.usuarios(id, loja_id) on delete restrict
);

alter table public.pdv_operacoes enable row level security;
revoke all on public.pdv_operacoes from public, anon, authenticated;

create or replace function public.claim_pdv_operation(
  p_chave uuid,
  p_tipo text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_loja_id uuid := public.minha_loja_id();
  v_existing public.pdv_operacoes%rowtype;
  v_inserted integer;
begin
  if v_user_id is null or v_loja_id is null then
    raise exception 'Perfil ativo da loja não encontrado';
  end if;
  if p_chave is null or p_tipo is null or p_payload is null then
    raise exception 'Chave e dados da operação são obrigatórios';
  end if;

  insert into public.pdv_operacoes (loja_id, chave, usuario_id, tipo, payload)
  values (v_loja_id, p_chave, v_user_id, p_tipo, p_payload)
  on conflict (loja_id, chave) do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted = 1 then
    return null;
  end if;

  select *
  into v_existing
  from public.pdv_operacoes
  where loja_id = v_loja_id and chave = p_chave
  for update;

  if v_existing.usuario_id <> v_user_id
    or v_existing.tipo <> p_tipo
    or v_existing.payload <> p_payload
  then
    raise exception 'A chave de idempotência já foi usada em outra operação';
  end if;
  if v_existing.resultado is null then
    raise exception 'Operação anterior sem resultado; tente novamente com uma nova chave';
  end if;

  return v_existing.resultado;
end
$$;

create or replace function public.complete_pdv_operation(
  p_chave uuid,
  p_resultado jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.pdv_operacoes
  set resultado = p_resultado
  where loja_id = public.minha_loja_id()
    and chave = p_chave
    and usuario_id = auth.uid()
    and resultado is null;

  if not found then
    raise exception 'Não foi possível concluir o registro idempotente';
  end if;
end
$$;

create or replace function public.abrir_caixa(p_chave uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_loja_id uuid := public.minha_loja_id();
  v_profile public.usuarios%rowtype;
  v_sessao_id uuid;
  v_result jsonb;
  v_payload jsonb := jsonb_build_object('acao', 'abrir_caixa');
begin
  v_result := public.claim_pdv_operation(p_chave, 'abrir_caixa', v_payload);
  if v_result is not null then
    return v_result;
  end if;

  select * into v_profile
  from public.usuarios
  where id = v_user_id and loja_id = v_loja_id and ativo
  for share;
  if not found then
    raise exception 'Perfil ativo não encontrado';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(v_loja_id::text || ':' || v_user_id::text, 0)
  );

  select id into v_sessao_id
  from public.caixa_sessoes
  where loja_id = v_loja_id
    and usuario_id = v_user_id
    and status = 'aberto'
  order by aberto_em desc
  limit 1
  for update;

  if v_sessao_id is null then
    insert into public.caixa_sessoes (
      loja_id, usuario_id, perfil_id, operador
    )
    values (
      v_loja_id, v_user_id, v_user_id, v_profile.nome
    )
    returning id into v_sessao_id;
  end if;

  v_result := jsonb_build_object('sessao_id', v_sessao_id);
  perform public.complete_pdv_operation(p_chave, v_result);
  return v_result;
end
$$;

create or replace function public.fechar_caixa(
  p_chave uuid,
  p_sessao_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_loja_id uuid := public.minha_loja_id();
  v_sessao public.caixa_sessoes%rowtype;
  v_result jsonb;
  v_payload jsonb := jsonb_build_object('sessao_id', p_sessao_id);
  v_dinheiro numeric(12,2);
  v_pix numeric(12,2);
  v_cartao numeric(12,2);
  v_misto numeric(12,2);
  v_total numeric(12,2);
  v_troco numeric(12,2);
  v_count bigint;
begin
  v_result := public.claim_pdv_operation(p_chave, 'fechar_caixa', v_payload);
  if v_result is not null then
    return v_result;
  end if;

  select * into v_sessao
  from public.caixa_sessoes
  where id = p_sessao_id and loja_id = v_loja_id
  for update;
  if not found then
    raise exception 'Sessão de caixa não encontrada nesta loja';
  end if;
  if v_sessao.status <> 'aberto' then
    raise exception 'Esta sessão já foi encerrada';
  end if;
  if v_sessao.usuario_id <> v_user_id and not public.sou_dono_da_loja() then
    raise exception 'Você não pode encerrar o caixa de outro operador';
  end if;

  select
    coalesce(sum(total) filter (where metodo_pagamento = 'dinheiro'), 0),
    coalesce(sum(total) filter (where metodo_pagamento = 'pix'), 0),
    coalesce(sum(total) filter (where metodo_pagamento in ('credito', 'debito')), 0),
    coalesce(sum(total) filter (where strpos(metodo_pagamento, ',') > 0), 0),
    coalesce(sum(total), 0),
    coalesce(sum(troco), 0),
    count(*)
  into v_dinheiro, v_pix, v_cartao, v_misto, v_total, v_troco, v_count
  from public.vendas
  where loja_id = v_loja_id
    and sessao_id = p_sessao_id
    and status = 'concluida';

  update public.caixa_sessoes
  set status = 'fechado',
      fechado_em = now(),
      fechado_por = v_user_id
  where id = p_sessao_id
    and loja_id = v_loja_id
    and status = 'aberto';

  if not found then
    raise exception 'A sessão já foi encerrada';
  end if;

  v_result := jsonb_build_object(
    'sessao_id', p_sessao_id,
    'fechado_em', now(),
    'dinheiro', v_dinheiro,
    'pix', v_pix,
    'cartao', v_cartao,
    'misto', v_misto,
    'geral', v_total,
    'qtd_vendas', v_count,
    'ticket_medio', case when v_count > 0 then v_total / v_count else 0 end,
    'troco_total', v_troco
  );
  perform public.complete_pdv_operation(p_chave, v_result);
  return v_result;
end
$$;

create or replace function public.registrar_venda(
  p_chave uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_loja_id uuid := public.minha_loja_id();
  v_sessao_id uuid;
  v_sessao public.caixa_sessoes%rowtype;
  v_result jsonb;
  v_item jsonb;
  v_resolved jsonb := '[]'::jsonb;
  v_resolved_item jsonb;
  v_product_id uuid;
  v_product_name text;
  v_unit_price numeric(12,2);
  v_unit_cost numeric(12,2);
  v_product_active boolean;
  v_requested_price numeric(12,2);
  v_quantity integer;
  v_calculated_total numeric(12,2) := 0;
  v_total numeric(12,2);
  v_received numeric(12,2) := 0;
  v_non_cash numeric(12,2) := 0;
  v_change numeric(12,2);
  v_payment jsonb;
  v_method text;
  v_methods text[] := array[]::text[];
  v_method_text text;
  v_sale_id uuid;
  v_lot record;
  v_remaining integer;
  v_take integer;
  v_request_payload jsonb;
begin
  v_result := public.claim_pdv_operation(p_chave, 'registrar_venda', p_payload);
  if v_result is not null then
    return v_result;
  end if;

  if jsonb_typeof(p_payload) <> 'object'
    or jsonb_typeof(p_payload->'items') <> 'array'
    or jsonb_typeof(p_payload->'payments') <> 'array'
  then
    raise exception 'Itens e pagamentos válidos são obrigatórios';
  end if;
  if jsonb_array_length(p_payload->'items') = 0
    or jsonb_array_length(p_payload->'items') > 100
    or jsonb_array_length(p_payload->'payments') = 0
  then
    raise exception 'Itens e pagamentos válidos são obrigatórios';
  end if;

  v_sessao_id := (p_payload->>'sessao_id')::uuid;
  select * into v_sessao
  from public.caixa_sessoes
  where id = v_sessao_id
    and loja_id = v_loja_id
    and usuario_id = v_user_id
    and status = 'aberto'
  for update;
  if not found then
    raise exception 'Não existe caixa aberto para este operador nesta loja';
  end if;

  for v_item in select value from jsonb_array_elements(p_payload->'items')
  loop
    v_quantity := (v_item->>'quantity')::integer;
    if v_quantity is null or v_quantity < 1 then
      raise exception 'Quantidade de item inválida';
    end if;

    if coalesce((v_item->>'is_new')::boolean, false) then
      v_product_name := nullif(btrim(v_item->>'name'), '');
      v_unit_price := (v_item->>'unit_price')::numeric(12,2);
      v_unit_cost := coalesce(
        nullif(v_item->>'unit_cost', '')::numeric(12,2),
        round(v_unit_price * 0.5, 2)
      );
      if v_product_name is null or v_unit_price is null
        or v_unit_price < 0 or v_unit_cost < 0
      then
        raise exception 'Dados do produto novo são inválidos';
      end if;

      insert into public.produtos (
        loja_id, nome, tipo, codigo_barras, preco_venda, preco_custo, estoque
      )
      values (
        v_loja_id,
        v_product_name,
        coalesce(nullif(v_item->>'tipo', ''), 'solo'),
        nullif(btrim(v_item->>'codigo_barras'), ''),
        v_unit_price,
        v_unit_cost,
        0
      )
      returning id into v_product_id;
      v_resolved_item := jsonb_build_object(
        'id', v_product_id,
        'name', v_product_name,
        'quantity', v_quantity,
        'unit_price', v_unit_price,
        'unit_cost', v_unit_cost,
        'is_new', true
      );
    else
      v_product_id := (v_item->>'id')::uuid;
      select nome, preco_venda, preco_custo, ativo
      into v_product_name, v_unit_price, v_unit_cost, v_product_active
      from public.produtos
      where id = v_product_id and loja_id = v_loja_id
      for share;
      if not found or not v_product_active then
        raise exception 'Produto não encontrado ou inativo nesta loja';
      end if;
      v_requested_price := (v_item->>'unit_price')::numeric(12,2);
      if v_requested_price is null or v_requested_price <> v_unit_price then
        raise exception 'O preço do produto mudou; atualize o carrinho antes de vender';
      end if;
      v_resolved_item := jsonb_build_object(
        'id', v_product_id,
        'name', v_product_name,
        'quantity', v_quantity,
        'unit_price', v_unit_price,
        'unit_cost', v_unit_cost,
        'is_new', false
      );
    end if;

    v_calculated_total := v_calculated_total + (v_unit_price * v_quantity);
    v_resolved := v_resolved || jsonb_build_array(v_resolved_item);
  end loop;

  v_total := (p_payload->>'total')::numeric(12,2);
  if v_total is null or v_total <= 0 or v_total <> v_calculated_total then
    raise exception 'O total do carrinho mudou; confira os valores antes de confirmar';
  end if;

  for v_payment in select value from jsonb_array_elements(p_payload->'payments')
  loop
    v_method := lower(btrim(v_payment->>'method'));
    v_unit_price := (v_payment->>'amount')::numeric(12,2);
    if v_method is null
      or v_method not in ('dinheiro', 'pix', 'credito', 'debito', 'ficha')
      or v_unit_price is null
      or v_unit_price <= 0
    then
      raise exception 'Forma ou valor de pagamento inválido';
    end if;
    v_received := v_received + v_unit_price;
    if v_method <> 'dinheiro' then
      v_non_cash := v_non_cash + v_unit_price;
    end if;
    if not (v_method = any(v_methods)) then
      v_methods := array_append(v_methods, v_method);
    end if;
  end loop;

  if v_received < v_total or v_non_cash > v_total then
    raise exception 'Os valores de pagamento não cobrem corretamente o total';
  end if;
  v_change := greatest(v_received - v_total, 0);
  v_method_text := array_to_string(v_methods, ', ');

  insert into public.vendas (
    loja_id, sessao_id, usuario_id, total, metodo_pagamento,
    valor_recebido, troco, pagamentos
  )
  values (
    v_loja_id, v_sessao_id, v_user_id, v_total, v_method_text,
    v_received, v_change, p_payload->'payments'
  )
  returning id into v_sale_id;

  for v_resolved_item in
    select value from jsonb_array_elements(v_resolved)
  loop
    v_product_id := (v_resolved_item->>'id')::uuid;
    v_quantity := (v_resolved_item->>'quantity')::integer;
    v_remaining := v_quantity;

    if coalesce((v_resolved_item->>'is_new')::boolean, false) then
      insert into public.vendas_itens (
        loja_id, usuario_id, venda_id, produto_id, nome,
        quantidade, preco_custo, preco_venda
      )
      values (
        v_loja_id, v_user_id, v_sale_id, v_product_id,
        v_resolved_item->>'name', v_quantity,
        (v_resolved_item->>'unit_cost')::numeric,
        (v_resolved_item->>'unit_price')::numeric
      );
      continue;
    end if;

    for v_lot in
      select id, quantidade_atual, preco_custo
      from public.estoque_lotes
      where loja_id = v_loja_id
        and produto_id = v_product_id
        and status = 'ativo'
        and quantidade_atual > 0
      order by criado_em, id
      for update
    loop
      exit when v_remaining = 0;
      v_take := least(v_remaining, v_lot.quantidade_atual);

      update public.estoque_lotes
      set quantidade_atual = quantidade_atual - v_take,
          status = case when quantidade_atual - v_take = 0 then 'esgotado' else 'ativo' end
      where id = v_lot.id and loja_id = v_loja_id;

      insert into public.vendas_itens (
        loja_id, usuario_id, venda_id, produto_id, nome,
        quantidade, preco_custo, preco_venda
      )
      values (
        v_loja_id, v_user_id, v_sale_id, v_product_id,
        v_resolved_item->>'name', v_take, v_lot.preco_custo,
        (v_resolved_item->>'unit_price')::numeric
      );
      v_remaining := v_remaining - v_take;
    end loop;

    if v_remaining > 0 then
      raise exception 'Estoque insuficiente para o produto %', v_resolved_item->>'name';
    end if;
  end loop;

  v_result := jsonb_build_object('venda_id', v_sale_id);
  perform public.complete_pdv_operation(p_chave, v_result);
  return v_result;
end
$$;

create or replace function public.registrar_entrada_estoque(
  p_chave uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_loja_id uuid := public.minha_loja_id();
  v_product_id uuid;
  v_product public.produtos%rowtype;
  v_quantity integer := (p_payload->>'quantity')::integer;
  v_cost numeric(12,2) := (p_payload->>'unit_cost')::numeric(12,2);
  v_sell_price numeric(12,2) := (p_payload->>'unit_price')::numeric(12,2);
  v_result jsonb;
begin
  v_result := public.claim_pdv_operation(
    p_chave, 'registrar_entrada_estoque', p_payload
  );
  if v_result is not null then return v_result; end if;
  if not public.sou_dono_da_loja() then
    raise exception 'Somente o dono pode gerenciar produtos e estoque';
  end if;
  if v_quantity is null or v_quantity < 0
    or v_cost is null or v_cost < 0
    or v_sell_price is null or v_sell_price < 0
  then
    raise exception 'Quantidade e preços inválidos';
  end if;

  if nullif(p_payload->>'product_id', '') is null then
    if nullif(btrim(p_payload->>'name'), '') is null then
      raise exception 'O nome do produto é obrigatório';
    end if;
    insert into public.produtos (
      loja_id, nome, tipo, codigo_barras, marca_id,
      preco_custo, preco_venda, estoque, imagem_url
    )
    values (
      v_loja_id,
      btrim(p_payload->>'name'),
      coalesce(nullif(p_payload->>'tipo', ''), 'solo'),
      nullif(btrim(p_payload->>'codigo_barras'), ''),
      nullif(p_payload->>'marca_id', '')::uuid,
      v_cost,
      v_sell_price,
      0,
      nullif(btrim(p_payload->>'imagem_url'), '')
    )
    returning id into v_product_id;
  else
    v_product_id := (p_payload->>'product_id')::uuid;
    select * into v_product
    from public.produtos
    where id = v_product_id and loja_id = v_loja_id and ativo
    for update;
    if not found then raise exception 'Produto não encontrado ou inativo nesta loja'; end if;
    update public.produtos
    set preco_venda = v_sell_price,
        preco_custo = v_cost
    where id = v_product_id and loja_id = v_loja_id;
  end if;

  insert into public.estoque_lotes (
    loja_id, produto_id, quantidade_inicial, quantidade_atual,
    preco_custo, status
  )
  values (
    v_loja_id, v_product_id, v_quantity, v_quantity,
    v_cost, case when v_quantity > 0 then 'ativo' else 'esgotado' end
  );

  v_result := jsonb_build_object('produto_id', v_product_id);
  perform public.complete_pdv_operation(p_chave, v_result);
  return v_result;
end
$$;

create or replace function public.criar_debito_fiado(
  p_chave uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_loja_id uuid := public.minha_loja_id();
  v_cliente_id uuid := (p_payload->>'cliente_id')::uuid;
  v_total numeric(12,2) := (p_payload->>'total')::numeric(12,2);
  v_entrada numeric(12,2) := coalesce((p_payload->>'entrada')::numeric, 0);
  v_conta_id uuid;
  v_result jsonb;
  v_cliente public.clientes%rowtype;
begin
  v_result := public.claim_pdv_operation(p_chave, 'criar_debito_fiado', p_payload);
  if v_result is not null then return v_result; end if;

  if v_total <= 0 or v_entrada < 0 or v_entrada > v_total then
    raise exception 'Valores de débito ou entrada inválidos';
  end if;
  select * into v_cliente
  from public.clientes
  where id = v_cliente_id and loja_id = v_loja_id
  for share;
  if not found then raise exception 'Cliente não encontrado nesta loja'; end if;

  insert into public.fiado_contas (
    loja_id, usuario_id, cliente_id, valor_total, valor_pago, status, descricao
  )
  values (
    v_loja_id, v_user_id, v_cliente_id, v_total, v_entrada,
    case when v_entrada = v_total then 'paga' else 'aberta' end,
    nullif(btrim(p_payload->>'descricao'), '')
  )
  returning id into v_conta_id;

  if v_entrada > 0 then
    insert into public.fiado_pagamentos (
      loja_id, usuario_id, cliente_id, fiado_conta_id,
      valor, metodo_pagamento, observacao
    )
    values (
      v_loja_id, v_user_id, v_cliente_id, v_conta_id,
      v_entrada, coalesce(nullif(p_payload->>'metodo_entrada', ''), 'dinheiro'),
      'Entrada na hora da compra'
    );
  end if;

  v_result := jsonb_build_object('conta_id', v_conta_id);
  perform public.complete_pdv_operation(p_chave, v_result);
  return v_result;
end
$$;

create or replace function public.registrar_pagamento_fiado(
  p_chave uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_loja_id uuid := public.minha_loja_id();
  v_cliente_id uuid := (p_payload->>'cliente_id')::uuid;
  v_remaining numeric(12,2) := (p_payload->>'valor')::numeric(12,2);
  v_total numeric(12,2) := v_remaining;
  v_account record;
  v_balance numeric(12,2);
  v_applied numeric(12,2);
  v_payment_ids uuid[] := array[]::uuid[];
  v_payment_id uuid;
  v_result jsonb;
  v_method text := lower(btrim(p_payload->>'metodo_pagamento'));
begin
  v_result := public.claim_pdv_operation(p_chave, 'registrar_pagamento_fiado', p_payload);
  if v_result is not null then return v_result; end if;

  if v_remaining <= 0 or v_method is null
    or v_method not in ('dinheiro', 'pix', 'credito', 'debito')
  then
    raise exception 'Valor ou forma de pagamento inválidos';
  end if;

  perform 1 from public.clientes
  where id = v_cliente_id and loja_id = v_loja_id
  for share;
  if not found then raise exception 'Cliente não encontrado nesta loja'; end if;

  for v_account in
    select id, valor_total, valor_pago
    from public.fiado_contas
    where loja_id = v_loja_id
      and cliente_id = v_cliente_id
      and status = 'aberta'
      and valor_pago < valor_total
    order by criado_em, id
    for update
  loop
    exit when v_remaining = 0;
    v_balance := v_account.valor_total - v_account.valor_pago;
    v_applied := least(v_remaining, v_balance);

    insert into public.fiado_pagamentos (
      loja_id, usuario_id, cliente_id, fiado_conta_id,
      valor, metodo_pagamento, observacao
    )
    values (
      v_loja_id, v_user_id, v_cliente_id, v_account.id,
      v_applied, v_method, nullif(btrim(p_payload->>'observacao'), '')
    )
    returning id into v_payment_id;
    v_payment_ids := array_append(v_payment_ids, v_payment_id);

    update public.fiado_contas
    set valor_pago = valor_pago + v_applied,
        status = case
          when valor_pago + v_applied = valor_total then 'paga'
          else 'aberta'
        end,
        atualizado_em = now()
    where id = v_account.id and loja_id = v_loja_id;

    v_remaining := v_remaining - v_applied;
  end loop;

  if v_remaining > 0 then
    raise exception 'O valor informado excede o saldo devedor atual';
  end if;

  v_result := jsonb_build_object(
    'valor', v_total,
    'pagamentos', to_jsonb(v_payment_ids)
  );
  perform public.complete_pdv_operation(p_chave, v_result);
  return v_result;
end
$$;

create or replace function public.vincular_venda_fiado(
  p_chave uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_loja_id uuid := public.minha_loja_id();
  v_venda_id uuid := (p_payload->>'venda_id')::uuid;
  v_cliente_id uuid := (p_payload->>'cliente_id')::uuid;
  v_venda public.vendas%rowtype;
  v_conta_id uuid;
  v_valor_fiado numeric(12,2);
  v_result jsonb;
begin
  v_result := public.claim_pdv_operation(p_chave, 'vincular_venda_fiado', p_payload);
  if v_result is not null then return v_result; end if;

  perform pg_advisory_xact_lock(
    hashtextextended(v_loja_id::text || ':' || v_venda_id::text, 0)
  );

  select * into v_venda
  from public.vendas
  where id = v_venda_id
    and loja_id = v_loja_id
    and status = 'concluida'
    and strpos(lower(metodo_pagamento), 'ficha') > 0
  for share;
  if not found then raise exception 'Venda de ficha não encontrada nesta loja'; end if;
  if exists (
    select 1 from public.fiado_contas
    where loja_id = v_loja_id and venda_id = v_venda_id
  ) then
    raise exception 'Esta venda já foi vinculada a uma ficha';
  end if;

  select coalesce(
    sum((payment.value->>'amount')::numeric(12,2)),
    case when lower(v_venda.metodo_pagamento) = 'ficha' then v_venda.total else 0 end
  )
  into v_valor_fiado
  from jsonb_array_elements(coalesce(v_venda.pagamentos, '[]'::jsonb)) as payment(value)
  where lower(payment.value->>'method') = 'ficha';
  if v_valor_fiado <= 0 then
    raise exception 'A venda não possui um valor pago em ficha que possa ser vinculado';
  end if;

  perform 1 from public.clientes
  where id = v_cliente_id and loja_id = v_loja_id
  for share;
  if not found then raise exception 'Cliente não encontrado nesta loja'; end if;

  insert into public.fiado_contas (
    loja_id, usuario_id, cliente_id, venda_id,
    valor_total, valor_pago, status, descricao
  )
  values (
    v_loja_id, v_user_id, v_cliente_id, v_venda_id,
    v_valor_fiado, 0, 'aberta',
    nullif(btrim(p_payload->>'descricao'), '')
  )
  returning id into v_conta_id;

  v_result := jsonb_build_object('conta_id', v_conta_id);
  perform public.complete_pdv_operation(p_chave, v_result);
  return v_result;
end
$$;

drop index if exists public.fiado_contas_venda_unica;

revoke all on function public.claim_pdv_operation(uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.complete_pdv_operation(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.abrir_caixa(uuid) from public, anon;
revoke all on function public.fechar_caixa(uuid, uuid) from public, anon;
revoke all on function public.registrar_venda(uuid, jsonb) from public, anon;
revoke all on function public.registrar_entrada_estoque(uuid, jsonb) from public, anon;
revoke all on function public.criar_debito_fiado(uuid, jsonb) from public, anon;
revoke all on function public.registrar_pagamento_fiado(uuid, jsonb) from public, anon;
revoke all on function public.vincular_venda_fiado(uuid, jsonb) from public, anon;
grant execute on function public.abrir_caixa(uuid) to authenticated;
grant execute on function public.fechar_caixa(uuid, uuid) to authenticated;
grant execute on function public.registrar_venda(uuid, jsonb) to authenticated;
grant execute on function public.registrar_entrada_estoque(uuid, jsonb) to authenticated;
grant execute on function public.criar_debito_fiado(uuid, jsonb) to authenticated;
grant execute on function public.registrar_pagamento_fiado(uuid, jsonb) to authenticated;
grant execute on function public.vincular_venda_fiado(uuid, jsonb) to authenticated;

drop policy if exists setores_tenant_all on public.setores;
drop policy if exists setores_read_tenant on public.setores;
create policy setores_read_tenant on public.setores
  for select to authenticated
  using (loja_id = (select public.minha_loja_id()));
create policy setores_owner_write on public.setores
  for all to authenticated
  using (
    loja_id = (select public.minha_loja_id())
    and (select public.sou_dono_da_loja())
  )
  with check (
    loja_id = (select public.minha_loja_id())
    and (select public.sou_dono_da_loja())
  );

drop policy if exists marcas_tenant_all on public.marcas;
drop policy if exists marcas_read_tenant on public.marcas;
create policy marcas_read_tenant on public.marcas
  for select to authenticated
  using (loja_id = (select public.minha_loja_id()));
create policy marcas_owner_write on public.marcas
  for all to authenticated
  using (
    loja_id = (select public.minha_loja_id())
    and (select public.sou_dono_da_loja())
  )
  with check (
    loja_id = (select public.minha_loja_id())
    and (select public.sou_dono_da_loja())
  );

drop policy if exists produtos_tenant_all on public.produtos;
drop policy if exists produtos_read_tenant on public.produtos;
create policy produtos_read_tenant on public.produtos
  for select to authenticated
  using (loja_id = (select public.minha_loja_id()));
create policy produtos_owner_write on public.produtos
  for all to authenticated
  using (
    loja_id = (select public.minha_loja_id())
    and (select public.sou_dono_da_loja())
  )
  with check (
    loja_id = (select public.minha_loja_id())
    and (select public.sou_dono_da_loja())
  );

drop policy if exists estoque_lotes_tenant_all on public.estoque_lotes;
drop policy if exists estoque_lotes_read_tenant on public.estoque_lotes;
create policy estoque_lotes_read_tenant on public.estoque_lotes
  for select to authenticated
  using (loja_id = (select public.minha_loja_id()));
create policy estoque_lotes_owner_write on public.estoque_lotes
  for all to authenticated
  using (
    loja_id = (select public.minha_loja_id())
    and (select public.sou_dono_da_loja())
  )
  with check (
    loja_id = (select public.minha_loja_id())
    and (select public.sou_dono_da_loja())
  );

drop policy if exists setores_owner_insert_guard on public.setores;
create policy setores_owner_insert_guard on public.setores
  as restrictive for insert to authenticated
  with check ((select public.sou_dono_da_loja()));
drop policy if exists setores_owner_update_guard on public.setores;
create policy setores_owner_update_guard on public.setores
  as restrictive for update to authenticated
  using ((select public.sou_dono_da_loja()))
  with check ((select public.sou_dono_da_loja()));
drop policy if exists setores_owner_delete_guard on public.setores;
create policy setores_owner_delete_guard on public.setores
  as restrictive for delete to authenticated
  using ((select public.sou_dono_da_loja()));

drop policy if exists marcas_owner_insert_guard on public.marcas;
create policy marcas_owner_insert_guard on public.marcas
  as restrictive for insert to authenticated
  with check ((select public.sou_dono_da_loja()));
drop policy if exists marcas_owner_update_guard on public.marcas;
create policy marcas_owner_update_guard on public.marcas
  as restrictive for update to authenticated
  using ((select public.sou_dono_da_loja()))
  with check ((select public.sou_dono_da_loja()));
drop policy if exists marcas_owner_delete_guard on public.marcas;
create policy marcas_owner_delete_guard on public.marcas
  as restrictive for delete to authenticated
  using ((select public.sou_dono_da_loja()));

drop policy if exists produtos_owner_insert_guard on public.produtos;
create policy produtos_owner_insert_guard on public.produtos
  as restrictive for insert to authenticated
  with check ((select public.sou_dono_da_loja()));
drop policy if exists produtos_owner_update_guard on public.produtos;
create policy produtos_owner_update_guard on public.produtos
  as restrictive for update to authenticated
  using ((select public.sou_dono_da_loja()))
  with check ((select public.sou_dono_da_loja()));
drop policy if exists produtos_owner_delete_guard on public.produtos;
create policy produtos_owner_delete_guard on public.produtos
  as restrictive for delete to authenticated
  using ((select public.sou_dono_da_loja()));

drop policy if exists estoque_lotes_owner_insert_guard on public.estoque_lotes;
create policy estoque_lotes_owner_insert_guard on public.estoque_lotes
  as restrictive for insert to authenticated
  with check ((select public.sou_dono_da_loja()));
drop policy if exists estoque_lotes_owner_update_guard on public.estoque_lotes;
create policy estoque_lotes_owner_update_guard on public.estoque_lotes
  as restrictive for update to authenticated
  using ((select public.sou_dono_da_loja()))
  with check ((select public.sou_dono_da_loja()));
drop policy if exists estoque_lotes_owner_delete_guard on public.estoque_lotes;
create policy estoque_lotes_owner_delete_guard on public.estoque_lotes
  as restrictive for delete to authenticated
  using ((select public.sou_dono_da_loja()));

drop policy if exists caixa_sessoes_tenant_all on public.caixa_sessoes;
create policy caixa_sessoes_read_owner_or_self on public.caixa_sessoes
  for select to authenticated
  using (
    loja_id = (select public.minha_loja_id())
    and (
      usuario_id = (select auth.uid())
      or (select public.sou_dono_da_loja())
    )
  );

drop policy if exists vendas_tenant_all on public.vendas;
create policy vendas_read_owner_or_self on public.vendas
  for select to authenticated
  using (
    loja_id = (select public.minha_loja_id())
    and (
      usuario_id = (select auth.uid())
      or (select public.sou_dono_da_loja())
    )
  );
drop policy if exists vendas_itens_tenant_all on public.vendas_itens;
create policy vendas_itens_read_owner_or_self on public.vendas_itens
  for select to authenticated
  using (
    loja_id = (select public.minha_loja_id())
    and (
      usuario_id = (select auth.uid())
      or (select public.sou_dono_da_loja())
    )
  );

drop policy if exists fiado_contas_tenant_all on public.fiado_contas;
create policy fiado_contas_read_tenant on public.fiado_contas
  for select to authenticated
  using (loja_id = (select public.minha_loja_id()));
drop policy if exists fiado_pagamentos_tenant_all on public.fiado_pagamentos;
create policy fiado_pagamentos_read_tenant on public.fiado_pagamentos
  for select to authenticated
  using (loja_id = (select public.minha_loja_id()));

drop policy if exists caixa_sessoes_no_direct_insert on public.caixa_sessoes;
create policy caixa_sessoes_no_direct_insert on public.caixa_sessoes
  as restrictive for insert to authenticated with check (false);
drop policy if exists caixa_sessoes_no_direct_update on public.caixa_sessoes;
create policy caixa_sessoes_no_direct_update on public.caixa_sessoes
  as restrictive for update to authenticated
  using (false) with check (false);
drop policy if exists caixa_sessoes_no_direct_delete on public.caixa_sessoes;
create policy caixa_sessoes_no_direct_delete on public.caixa_sessoes
  as restrictive for delete to authenticated using (false);

drop policy if exists vendas_no_direct_insert on public.vendas;
create policy vendas_no_direct_insert on public.vendas
  as restrictive for insert to authenticated with check (false);
drop policy if exists vendas_no_direct_update on public.vendas;
create policy vendas_no_direct_update on public.vendas
  as restrictive for update to authenticated
  using (false) with check (false);
drop policy if exists vendas_no_direct_delete on public.vendas;
create policy vendas_no_direct_delete on public.vendas
  as restrictive for delete to authenticated using (false);

drop policy if exists vendas_itens_no_direct_insert on public.vendas_itens;
create policy vendas_itens_no_direct_insert on public.vendas_itens
  as restrictive for insert to authenticated with check (false);
drop policy if exists vendas_itens_no_direct_update on public.vendas_itens;
create policy vendas_itens_no_direct_update on public.vendas_itens
  as restrictive for update to authenticated
  using (false) with check (false);
drop policy if exists vendas_itens_no_direct_delete on public.vendas_itens;
create policy vendas_itens_no_direct_delete on public.vendas_itens
  as restrictive for delete to authenticated using (false);

drop policy if exists fiado_contas_no_direct_insert on public.fiado_contas;
create policy fiado_contas_no_direct_insert on public.fiado_contas
  as restrictive for insert to authenticated with check (false);
drop policy if exists fiado_contas_no_direct_update on public.fiado_contas;
create policy fiado_contas_no_direct_update on public.fiado_contas
  as restrictive for update to authenticated
  using (false) with check (false);
drop policy if exists fiado_contas_no_direct_delete on public.fiado_contas;
create policy fiado_contas_no_direct_delete on public.fiado_contas
  as restrictive for delete to authenticated using (false);

drop policy if exists fiado_pagamentos_no_direct_insert on public.fiado_pagamentos;
create policy fiado_pagamentos_no_direct_insert on public.fiado_pagamentos
  as restrictive for insert to authenticated with check (false);
drop policy if exists fiado_pagamentos_no_direct_update on public.fiado_pagamentos;
create policy fiado_pagamentos_no_direct_update on public.fiado_pagamentos
  as restrictive for update to authenticated
  using (false) with check (false);
drop policy if exists fiado_pagamentos_no_direct_delete on public.fiado_pagamentos;
create policy fiado_pagamentos_no_direct_delete on public.fiado_pagamentos
  as restrictive for delete to authenticated using (false);

revoke insert, update, delete on
  public.caixa_sessoes, public.vendas, public.vendas_itens,
  public.fiado_contas, public.fiado_pagamentos
from authenticated;
grant select on
  public.caixa_sessoes, public.vendas, public.vendas_itens,
  public.fiado_contas, public.fiado_pagamentos
to authenticated;
grant insert, update, delete on
  public.setores, public.marcas, public.produtos, public.estoque_lotes
to authenticated;

drop policy if exists onesignal_dispositivos_select_owner_or_self
  on public.onesignal_dispositivos;
drop policy if exists onesignal_dispositivos_select_tenant
  on public.onesignal_dispositivos;
create policy onesignal_dispositivos_select_tenant
  on public.onesignal_dispositivos
  for select to authenticated
  using (loja_id = (select public.minha_loja_id()));

commit;
