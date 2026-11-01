# Volte!Sempre

Aplicação SaaS de ponto de venda construída com React, Vite e Supabase.

## Desenvolvimento local

1. Instale as dependências com `npm ci`.
2. Crie um arquivo `.env.local` com as variáveis:

   ```text
   VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
   VITE_SUPABASE_ANON_KEY=SUA_CHAVE_PUBLICA
   VITE_ONESIGNAL_APP_ID=SEU_APP_ID
   VITE_WHATSAPP_SUPPORT_NUMBER=5511999999999
   ONESIGNAL_REST_API_KEY=CHAVE_REST_PRIVADA_DO_ONESIGNAL
   ```

   Configure `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_ONESIGNAL_APP_ID`, `VITE_WHATSAPP_SUPPORT_NUMBER` e `ONESIGNAL_REST_API_KEY` também no ambiente de execução da Vercel. Informe o número oficial de suporte com código do país e DDD, somente dígitos. A chave REST do OneSignal deve permanecer privada e nunca usar o prefixo `VITE_`.

3. No Supabase, configure **Authentication > URL Configuration**:
   - Use `http://localhost:3000` como **Site URL** para desenvolvimento local.
   - Adicione `http://localhost:3000/auth/callback` às **Redirect URLs**.
4. Em **Authentication > Providers > Google**, o URI de redirecionamento autorizado no Google Cloud deve ser o callback do projeto Supabase (`https://<project-ref>.supabase.co/auth/v1/callback`), não o endereço local do frontend.
5. Inicie o Vite com `npm run dev` e abra `http://localhost:3000`. O servidor usa essa porta fixa para que corresponda ao callback local; se ela estiver ocupada, o Vite falhará em vez de iniciar silenciosamente em outra porta.
6. O login deve voltar a `/auth/callback`, não à raiz `/`. Use a mesma origem durante todo o fluxo OAuth; não misture `localhost` com `127.0.0.1`.

O login da aplicação usa exclusivamente o provedor Google do Supabase. O `AuthProvider` carrega o perfil em `public.usuarios`; as rotas do PDV exigem uma sessão autenticada e um perfil de loja ativo. As políticas RLS continuam sendo a proteção de dados e não devem ser substituídas pela proteção de rotas do frontend.

## Banco de dados

- Execute `supabase/schema.sql` no SQL Editor do Supabase. O script pode ser reaplicado: tabelas e índices existentes não são recriados, e as políticas gerenciadas pelo script são substituídas sem apagar dados.
- `CREATE TABLE IF NOT EXISTS` não corrige tabelas preexistentes com colunas ou restrições diferentes. Se o esquema existente divergir, aplique uma migração compatível antes de reaplicar o script.
- Para o banco que já recebeu a versão inicial do esquema, execute `supabase/migrations/20261101010000_add_financial_action_audit.sql` antes de publicar esta versão do frontend. Ela acrescenta os campos de operador às sessões de caixa, itens de venda e operações de fiado sem apagar o histórico existente.
- Depois, execute `supabase/migrations/20261101030000_harden_multitenant_core.sql`. Ela instala as RPCs transacionais/idempotentes do PDV, caixa, fiado e entrada de estoque, e restringe gravações financeiras diretas. Faça backup e valide a migração em um ambiente de teste antes da produção.
- Execute também `supabase/migrations/20261101040000_add_legal_acceptances.sql` para armazenar o aceite individual dos Termos de Uso e da Política de Privacidade. A rota de boas-vindas exige esse aceite antes de liberar as rotas privadas.

As RPCs financeiras usam o UUID da sessão Auth como `usuario_id`. O fechamento de caixa grava `fechado_por` sem sobrescrever quem abriu a sessão. Tentativas com resposta de rede ambígua mantêm a mesma chave idempotente no navegador para que uma repetição não duplique a operação. Notificações exigem sessão válida e são direcionadas às inscrições ativas da mesma loja. O cadastro com IA aceita imagens e PDFs de até 15 MB; revise as sugestões antes de salvar.

## Verificação

```text
npm run lint
npm run build
```
