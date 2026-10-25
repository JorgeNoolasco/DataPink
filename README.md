# DataPink

Aplicação estática em HTML5, CSS3 e JavaScript Vanilla. Usa ES modules no navegador, `@supabase/supabase-js` v2 via CDN oficial e Supabase PostgreSQL/Auth. Não há etapa de build nem framework frontend.

## 1. Criar o projeto Supabase

1. Crie um projeto em [supabase.com](https://supabase.com/) e guarde a senha do banco em um gerenciador de senhas. Ela não é usada pelo frontend.
2. Em **Authentication → Providers**, mantenha Email habilitado. Em **Authentication → Settings**, desative novos cadastros públicos se somente a equipe deve criar contas.
3. Em **Project Settings → API**, copie **Project URL** e **Publishable key** (`sb_publishable_...`). A chave `anon` legada também funciona. Não copie `service_role` nem a senha PostgreSQL para os arquivos web.

## 2. Criar estrutura, políticas, views e demonstração

No **SQL Editor**, execute os arquivos na ordem abaixo, cada um uma vez, em um projeto novo:

1. `sql/schema.sql` — tabelas e relacionamentos (`professor`, `curso`, `turma`, `aluno`, `matricula`, `nota`).
2. `sql/policies.sql` — RLS, funções de autorização e grants. Professores só acessam suas turmas e alunos associados; administradores têm acesso global. Visitantes não recebem acesso às tabelas acadêmicas.
3. `sql/views.sql` — `vw_boletim_aluno` (somente docentes autorizados, com RLS das tabelas base) e `vw_portfolio_cursos` (somente nome e descrição para a vitrine pública).
4. `sql/seed.sql` — cursos, turmas e registros de demonstração fictícios. O professor de demonstração começa sem uma conta Auth associada.

## 3. Criar e vincular contas de docentes

1. Em **Authentication → Users**, crie/invite um usuário docente e defina uma senha inicial segura. O e-mail deve corresponder ao cadastro em `public.professor`.
2. Copie o `User UID` mostrado para essa conta.
3. No SQL Editor, cadastre ou vincule o docente. Exemplo para uma conta já criada:

```sql
INSERT INTO public.professor (id_auth, nome_professor, email_professor, tipo_acesso)
VALUES ('USER-UUID', 'Nome do docente', 'docente@escola.edu.br', 'professor')
ON CONFLICT (email_professor) DO UPDATE
SET id_auth = EXCLUDED.id_auth, nome_professor = EXCLUDED.nome_professor;
```

O vínculo de autorização é feito pelo UUID de `auth.users`, e não apenas pelo e-mail. Para promover um administrador, faça isso manualmente no SQL Editor:

```sql
UPDATE public.professor SET tipo_acesso = 'admin' WHERE id_auth = 'USER-UUID';
```

O app não permite que um professor altere seu próprio papel. Para associar o usuário `mariana.costa@example.edu.br` incluído no seed, crie uma conta Auth com esse e-mail e execute:

```sql
UPDATE public.professor p SET id_auth = u.id
FROM auth.users u WHERE lower(u.email) = lower(p.email_professor)
  AND p.email_professor = 'mariana.costa@example.edu.br';
```

## 4. Conectar o frontend

Edite `js/config.js`:

```js
export const SUPABASE_URL = 'https://SEU-PROJETO.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_SUA_CHAVE';
```

O nome `SUPABASE_ANON_KEY` é mantido por compatibilidade interna; pode receber a publishable key ou a chave pública `anon`. Ambas são visíveis no navegador por natureza. A segurança vem das políticas RLS. Nunca use `service_role` aqui.

Sirva o projeto por HTTP local, por exemplo com Live Server no VS Code (`http://127.0.0.1:5500`); módulos ES não funcionam corretamente em `file://`.

## 5. Configurar URLs do Auth

Em **Authentication → URL Configuration**:

- **Site URL**: defina a URL principal, por exemplo `https://seu-projeto.vercel.app`.
- **Redirect URLs**: adicione `http://127.0.0.1:5500/**`, `http://localhost:5500/**` e `https://seu-projeto.vercel.app/**` (troque pela URL de produção real).

O login por senha abre `admin.html` após autenticar. O redirecionamento cadastrado também cobre callbacks futuros e a navegação de sessão.

## 6. Publicar na Vercel

1. Importe este repositório na Vercel e mantenha o diretório raiz como **Root Directory**.
2. Não informe Build Command nem Output Directory; a Vercel publica o site estático diretamente.
3. `index.html`, `login.html` e `admin.html` ficam na raiz e abrem em `/`, `/login.html` e `/admin.html`.
4. `.vercelignore` exclui `sql/` e documentação do pacote publicado. Os scripts SQL continuam no repositório para configuração do banco.
5. Depois do primeiro deploy, copie o domínio final para a lista **Redirect URLs** do Supabase.

## 7. Verificar acesso e funcionalidades

1. Abra a página inicial sem sessão: cursos podem aparecer na vitrine; nenhuma tabela com nomes, notas ou contatos de alunos é pública.
2. Tente `/admin.html` sem login: a página envia para o login. Tente entrar com uma conta sem linha vinculada em `professor`: o Auth encerra a sessão e nega acesso.
3. Entre com um docente vinculado: confira as turmas atribuídas, cadastre um aluno, associe-o a uma turma, edite os dados e exclua um cadastro fictício. A exclusão avisa que matrículas e notas dependentes também serão apagadas.
4. Entre com dois docentes: cada um deve ver apenas suas turmas e os alunos acessíveis por elas, além dos próprios cadastros recém-criados.
5. Promova uma conta de teste a `admin`: ela deve consultar dados de todas as turmas.
6. Confira a view de boletim com uma sessão docente autenticada (aba **Network** do navegador ou REST API usando o token dessa sessão): ela deve retornar somente turmas acessíveis. Não use o SQL Editor para validar RLS: ele executa como banco privilegiado. Pela API anon, `/rest/v1/vw_boletim_aluno` deve ser negado e `/rest/v1/vw_portfolio_cursos` deve funcionar.
7. Teste em desktop e largura móvel. As telas usam CSS responsivo; as mensagens de login e operações aparecem junto aos formulários.

## Escopo da interface

O painel oferece CRUD completo de alunos e associação de matrícula a uma turma no cadastro. Também mostra turmas e contagens de matrícula. A tabela de notas é mantida no banco e disponibilizada pela view segura de boletim; lançamento de notas e manutenção de cursos/turmas não fazem parte das telas atuais.
