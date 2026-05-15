# Deploy do Auriz

## Stack

| Camada | Serviço |
|--------|---------|
| Hospedagem | Netlify (estático) |
| Banco de dados | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Frontend | React 18 via CDN + Babel Standalone |

---

## 1. Supabase — configurar o banco

1. Crie um projeto em [supabase.com](https://supabase.com)
2. No **SQL Editor**, execute as migrations **em ordem**:
   ```
   supabase/migrations/20260513000001_initial_schema.sql
   supabase/migrations/20260513000002_rls_policies.sql
   supabase/migrations/20260513000003_views.sql
   ```
3. (Opcional) Para dados de demonstração:
   ```
   supabase/seeds/seed.sql
   ```
4. Em **Settings → API**, copie:
   - `Project URL`
   - `anon / public key`

---

## 2. Netlify — conectar ao GitHub

1. Acesse [app.netlify.com](https://app.netlify.com)
2. **Add new site → Import an existing project → GitHub**
3. Selecione o repositório `rodrigopalmezano10-tech/auriz`
4. Configure:
   | Campo | Valor |
   |-------|-------|
   | Branch | `main` |
   | Build command | *(deixar em branco)* |
   | Publish directory | `ui_kits/web` |
5. Clique em **Deploy site**

---

## 3. Variáveis de ambiente no Netlify

Em **Site settings → Environment variables**, adicione:

```
SUPABASE_URL       = https://SEU_PROJETO.supabase.co
SUPABASE_ANON_KEY  = eyJ...
```

> O frontend lê essas variáveis via `ui_kits/web/config.js`.  
> Edite esse arquivo com os valores reais antes do deploy, ou injete via Netlify Functions se preferir não expô-los no código.

---

## 4. Redirect SPA (já configurado)

O arquivo `ui_kits/web/netlify.toml` já contém:

```toml
[[redirects]]
  from = "/*"
  to   = "/index.html"
  status = 200
```

---

## 5. Deploy automático

Após conectar o repositório, **todo push para `main`** dispara um novo deploy no Netlify automaticamente.

---

## Estrutura do repositório

```
auriz/
├── ui_kits/web/          ← publicado pelo Netlify
│   ├── index.html        ← entry point
│   ├── config.js         ← credenciais Supabase
│   ├── netlify.toml      ← redirect + headers
│   ├── atoms.jsx         ← design system
│   ├── db.jsx            ← camada de dados
│   ├── supabase.js       ← cliente Supabase
│   ├── DashboardScreen.jsx
│   ├── TransactionsScreen.jsx
│   ├── GoalsScreen.jsx
│   ├── EconomiasScreen.jsx
│   ├── CategoriasScreen.jsx
│   ├── TetoScreen.jsx
│   ├── MembrosScreen.jsx
│   ├── DashboardAnalyticsScreen.jsx
│   ├── AddTransactionSheet.jsx
│   ├── LoginScreen.jsx
│   └── SetupScreen.jsx
├── supabase/
│   ├── migrations/       ← SQL para aplicar no Supabase
│   └── seeds/            ← dados de desenvolvimento
└── assets/               ← ícones e padrões SVG
```
