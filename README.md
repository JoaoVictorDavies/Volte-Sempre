# Volte!Sempre

Aplicação SaaS de ponto de venda construída com React, Vite e Supabase.

## Desenvolvimento local

1. Instale as dependências com `npm ci`.
2. Crie um arquivo `.env.local` com as variáveis:

   ```text
   VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
   VITE_SUPABASE_ANON_KEY=SUA_CHAVE_PUBLICA
   VITE_ONESIGNAL_APP_ID=SEU_APP_ID
   ```

3. No Supabase, configure **Authentication > URL Configuration**:
   - Use como **Site URL** a origem exata onde o Vite está aberto. Por padrão, `npm run dev` usa `http://localhost:5173`; se o terminal informar `http://localhost:3000`, use essa origem.
   - Adicione `http://localhost:5173/auth/callback` às **Redirect URLs**. Se estiver usando a porta 3000, adicione também `http://localhost:3000/auth/callback`.
4. Em **Authentication > Providers > Google**, o URI de redirecionamento autorizado no Google Cloud deve ser o callback do projeto Supabase (`https://<project-ref>.supabase.co/auth/v1/callback`), não o endereço local do frontend.
5. Inicie o Vite com `npm run dev` e abra a mesma origem durante todo o fluxo OAuth. Não misture `localhost` com `127.0.0.1`, nem alterne entre portas.

O login da aplicação usa exclusivamente o provedor Google do Supabase. O `AuthProvider` carrega o perfil em `public.usuarios`; as rotas do PDV exigem uma sessão autenticada e um perfil de loja ativo. As políticas RLS continuam sendo a proteção de dados e não devem ser substituídas pela proteção de rotas do frontend.

## Banco de dados

- Execute `supabase/schema.sql` no SQL Editor do Supabase. O script pode ser reaplicado: tabelas e índices existentes não são recriados, e as políticas gerenciadas pelo script são substituídas sem apagar dados.
- `CREATE TABLE IF NOT EXISTS` não corrige tabelas preexistentes com colunas ou restrições diferentes. Se o esquema existente divergir, aplique uma migração compatível antes de reaplicar o script.
- Para o banco que já recebeu a versão inicial do esquema, execute `supabase/migrations/20261101010000_add_financial_action_audit.sql` antes de publicar esta versão do frontend. Ela acrescenta os campos de operador às sessões de caixa, itens de venda e operações de fiado sem apagar o histórico existente.

As gravações financeiras do frontend usam o UUID da sessão Auth como `usuario_id`. O fechamento de caixa também grava `fechado_por`, preservando a identidade de quem encerrou a sessão.

## Verificação

```text
npm run lint
npm run build
```
