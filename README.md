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

3. Configure `http://localhost:5173/auth/callback` como URL de redirecionamento permitida no Supabase Auth.
4. Inicie o Vite com `npm run dev`.

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
