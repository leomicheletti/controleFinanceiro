# Controle Financeiro — App de Finanças Pessoais

Stack 100% gratuita:
- **Banco de dados + autenticação**: Supabase (Postgres)
- **Frontend**: React + Vite
- **Hospedagem do site**: Vercel
- **Gráficos**: Recharts

Funcionalidades: login/cadastro, múltiplas contas (corrente, poupança,
cartão, carteira...), transações com categorias (fixas ou variáveis),
despesas fixas recorrentes com lembrete de vencimento, orçamento mensal
por categoria, metas financeiras, painel com gráficos, modo claro/escuro
e um painel de insights que analisa seus dados automaticamente. Totalmente
responsivo: funciona bem em celular, tablet e computador, com o menu
lateral virando uma gaveta deslizante em telas estreitas.

---

## Passo 1 — Criar o backend no Supabase (grátis)

1. Acesse https://supabase.com e crie uma conta grátis.
2. Clique em **New Project**. Escolha um nome, uma senha para o banco
   (guarde-a) e a região mais próxima (ex: South America).
3. Aguarde o projeto ser criado (leva ~2 minutos).
4. No menu lateral, vá em **SQL Editor** → **New query**.
5. Abra o arquivo `supabase/schema.sql` deste projeto, copie todo o
   conteúdo, cole no editor e clique em **Run**. Isso cria as tabelas
   `accounts`, `categories`, `transactions`, `goals` e já configura a
   segurança (cada usuário só vê os próprios dados).
6. Repita o passo acima com o arquivo `supabase/migration_002_fixed_expenses.sql`
   (New query → colar → Run). Ele adiciona as despesas fixas, o campo
   de orçamento mensal por categoria e as visões usadas pelo painel de
   insights. Se você já tinha o app rodando antes dessa atualização,
   é só rodar esse segundo arquivo — ele não apaga nada que já existe.
7. Vá em **Authentication → Providers** e confirme que **Email** está
   habilitado (vem habilitado por padrão).
   - Opcional, para testar mais rápido: em **Authentication → Settings**,
     desative "Confirm email" para não precisar confirmar por e-mail
     durante os testes (reative depois, em produção).
8. Vá em **Project Settings → API**. Copie:
   - **Project URL**
   - **anon public key**

## Passo 2 — Configurar o frontend

1. Extraia este projeto e entre na pasta `frontend`.
2. Copie o arquivo de exemplo de variáveis de ambiente:
   ```
   cp .env.example .env
   ```
3. Abra `.env` e cole os valores do Passo 1:
   ```
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
   ```
4. Instale as dependências (precisa de Node.js 18+ instalado):
   ```
   npm install
   ```
5. Rode localmente:
   ```
   npm run dev
   ```
6. Abra http://localhost:5173, crie sua conta e comece a usar.

## Passo 3 — Publicar de graça na Vercel

1. Crie um repositório no GitHub e suba a pasta `frontend` (pode subir
   o projeto inteiro, mas a Vercel vai construir a partir de `frontend`).
2. Acesse https://vercel.com, crie conta grátis (dá pra usar login do GitHub).
3. Clique em **Add New → Project**, selecione o repositório.
4. Em **Root Directory**, aponte para `frontend`.
5. Em **Environment Variables**, adicione as mesmas duas variáveis do
   `.env` (`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`).
6. Clique em **Deploy**. Em ~1 minuto você recebe uma URL pública
   grátis (ex: `caderneta.vercel.app`).

Pronto: backend, frontend e hospedagem, tudo sem custo.

## Despesas fixas, orçamento e insights

- **Despesas fixas**: cadastre na aba "Despesas fixas" (aluguel, assinaturas,
  internet...) com valor, conta e dia de vencimento. O app mostra se já
  foi lançada no mês e tem um botão "Lançar agora" para registrar a
  transação com um clique.
- **Custos variáveis**: ao lançar uma transação de despesa manualmente,
  marque a caixinha "Custo fixo" quando fizer sentido; deixando
  desmarcada, ela conta como variável. A aba "Transações" tem um filtro
  para ver só fixas, só variáveis ou tudo.
- **Orçamento por categoria**: ao criar uma categoria de despesa, é
  possível definir um orçamento mensal opcional. O painel de insights
  avisa quando uma categoria está perto ou já passou do limite.
- **Insights automáticos**: o painel principal analisa seus lançamentos,
  orçamentos, despesas fixas e metas, e gera avisos em português sobre
  gasto subindo, orçamento estourado, contas negativas, despesas fixas
  perto do vencimento e metas com prazo apertado. Tudo roda no próprio
  navegador, sem custo e sem enviar seus dados para nenhum serviço externo.

### Evoluindo para um assistente de IA de verdade (opcional)

O painel de insights de hoje segue regras fixas (comparações, limites,
prazos). Se no futuro você quiser conversar com o app em linguagem livre
— por exemplo perguntar "posso gastar R$300 num jantar essa semana?" —
o próximo passo é integrar um modelo de linguagem, como o Google Gemini
(tem camada gratuita). Isso envolveria criar uma função de backend
(Supabase Edge Function, também gratuita) que recebe seus dados
financeiros e a pergunta, chama a API do Gemini com uma chave protegida
no servidor, e devolve a resposta para o app. É uma etapa maior, separada
desta entrega — quando quiser seguir por esse caminho, é só pedir.

## Próximos passos (mobile)

Quando quiser a versão para celular, o caminho mais direto é criar um
app com **Expo (React Native)** e reaproveitar o mesmo projeto
Supabase — mesmas tabelas, mesmo login, mesmos dados. A lógica de
telas muda de sintaxe (React Native em vez de HTML/CSS), mas os
conceitos e o backend são os mesmos que você já vai conhecer bem
depois de usar a versão web. Quando chegar nessa etapa, é só pedir
que eu monte o app Expo do zero também.

## Estrutura do projeto

```
finance-app/
├── supabase/
│   ├── schema.sql                        # rode primeiro
│   └── migration_002_fixed_expenses.sql  # rode depois (despesas fixas/orçamento)
└── frontend/
    ├── src/
    │   ├── pages/           # Login, Dashboard, Transações, Contas, Despesas fixas, Metas
    │   ├── components/      # Layout (menu lateral), BrandMark, InsightsPanel
    │   ├── context/         # Autenticação, Tema (claro/escuro)
    │   ├── hooks/           # Carregamento de dados
    │   ├── utils/           # Formatação, cor por categoria, motor de insights
    │   └── styles/          # Visual (tema "HUD financeiro" com glassmorphism)
    ├── .env.example
    └── package.json
```
