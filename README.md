# DataPink

Site estático em HTML, CSS e JavaScript Vanilla, hospedável na Vercel. O acesso ao painel usa uma credencial fictícia local; o painel carrega somente registros de demonstração definidos em `js/admin.js`.

## Login de demonstração

1. Abra `js/demo-config.js` e defina `DEMO_PASSWORD` com uma senha fictícia para a demonstração.
2. Publique o arquivo junto com o site. Em hospedagem estática, qualquer arquivo JavaScript entregue ao navegador pode ser inspecionado; essa senha não é um segredo nem uma proteção real.
3. Entre usando o e-mail `wiverson@pinkmgdocente.com.br` e a senha configurada no arquivo.
4. A sessão fica em `sessionStorage` e dura somente na aba atual. Atualizar a página mantém a sessão. O botão **Sair** remove a sessão.

A senha incluída no projeto (`DataPinkDemo-2026!`) é apenas uma credencial inventada para testar o fluxo. Troque-a por outra credencial igualmente fictícia antes de divulgar a demonstração. Nunca use a senha real de uma pessoa.

## Teste manual

1. Abra `login.html` servindo o projeto em HTTP local ou pelo deploy da Vercel.
2. Teste os campos vazios e uma combinação incorreta; o navegador valida os campos obrigatórios e o formulário mostra a mensagem de erro.
3. Teste o e-mail de demonstração com `DEMO_PASSWORD` em `js/demo-config.js`; o navegador grava a sessão e abre `admin.html`.
4. Atualize `admin.html`; o nome Wiverson e os dados fictícios permanecem visíveis.
5. Abra `admin.html` em uma nova aba sem sessão; a página redireciona para `login.html`.
6. Use **Sair** e tente reabrir o painel; a página retorna ao login.
7. Redimensione a janela para computador e celular; o CSS responsivo existente adapta login e painel.
8. Clique no ícone ao lado da senha para alternar entre mostrar e ocultar o campo.

## Dados e integrações

- `js/auth.js` implementa apenas a verificação local de demonstração, sem Supabase Auth nem serviço externo de autenticação.
- `js/admin.js` não importa nem chama Supabase: as tabelas do painel usam apenas dados fictícios locais e são somente para visualização. A sessão demonstrativa nunca é enviada como token nem usada para consultar ou gravar informações acadêmicas reais.
- A vitrine pública ainda pode consultar `vw_portfolio_cursos` pelo cliente Supabase configurado em `js/config.js`. Essa leitura é independente do login local.
- Os scripts de banco em `sql/` continuam no repositório para o projeto acadêmico. Eles não são necessários para o login nem para visualizar o painel demonstrativo e são excluídos do deploy estático por `.vercelignore`.
- Para publicar, conecte o repositório à Vercel sem comando de build e mantenha a raiz como diretório de saída.

## Aviso

Este login é apenas demonstrativo. O navegador pode alterar `sessionStorage` e os arquivos entregues ao cliente; portanto, a sessão não autentica nem protege dados reais. Não conecte este fluxo a tabelas acadêmicas privadas. Um sistema real precisa de autenticação confiável no servidor e autorização no banco.
