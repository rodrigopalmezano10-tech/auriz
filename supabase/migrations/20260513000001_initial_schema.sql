-- ============================================================
-- Auriz — Schema inicial v1
-- Ordem de criação respeita as dependências (FK safe)
-- Soft-deletes em todas as tabelas mutáveis (is_deleted)
-- updated_at é atualizado automaticamente via trigger
-- ============================================================

-- ── Extensão para UUIDs ──────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Função utilitária: atualiza updated_at automaticamente ───
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================================
-- 1. FAMILIES
-- Unidade familiar. Tudo pertence a uma família.
-- ============================================================
CREATE TABLE families (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE,                   -- url-friendly, eg "familia-souza"
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_families_updated_at
  BEFORE UPDATE ON families
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 2. MEMBERS
-- Cada membro é um usuário da família (pode ter conta Supabase Auth).
-- ============================================================
CREATE TABLE members (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id      UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id        UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- vínculo com Auth
  name           TEXT NOT NULL,
  color          TEXT NOT NULL DEFAULT 'gold'   -- gold | sage | terra | plum | teal | ink
                   CHECK (color IN ('gold','sage','terra','plum','teal','ink')),
  monthly_income NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (monthly_income >= 0),
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  is_deleted     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_members_family ON members(family_id);
CREATE INDEX idx_members_user   ON members(user_id);

CREATE TRIGGER trg_members_updated_at
  BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 3. CATEGORIES
-- Categorias de despesa personalizáveis por família.
-- Categorias default são pré-populadas via seed.
-- ============================================================
CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id   UUID REFERENCES families(id) ON DELETE CASCADE, -- NULL = categoria global
  name        TEXT NOT NULL,
  icon        TEXT NOT NULL DEFAULT 'Wallet',   -- nome do ícone Lucide
  color       TEXT NOT NULL DEFAULT 'neutral'   -- sage | terra | teal | plum | amber | neutral
                CHECK (color IN ('sage','terra','teal','plum','amber','neutral')),
  is_income   BOOLEAN NOT NULL DEFAULT FALSE,   -- TRUE para categorias de renda (Salário)
  is_default  BOOLEAN NOT NULL DEFAULT FALSE,   -- TRUE = não pode ser excluída
  is_deleted  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (family_id, name)
);

CREATE INDEX idx_categories_family ON categories(family_id);

CREATE TRIGGER trg_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 4. TRANSACTIONS
-- Coração do sistema. Inclui parcelamento, divisão e recorrência.
-- ============================================================
CREATE TABLE transactions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id             UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  member_id             UUID REFERENCES members(id) ON DELETE SET NULL,
  category_id           UUID REFERENCES categories(id) ON DELETE SET NULL,

  description           TEXT NOT NULL,
  amount                NUMERIC(12,2) NOT NULL,       -- negativo = despesa, positivo = renda
  transaction_date      DATE NOT NULL,
  method                TEXT NOT NULL DEFAULT 'PIX'
                          CHECK (method IN ('PIX','Cartão','Dinheiro')),

  -- Parcelamento
  installment_current   SMALLINT CHECK (installment_current >= 1),  -- ex: 3
  installment_total     SMALLINT CHECK (installment_total >= 1),    -- ex: 12
  installment_group_id  UUID,  -- agrupa todas as parcelas do mesmo compra

  -- Flags
  is_shared             BOOLEAN NOT NULL DEFAULT FALSE, -- dividida entre membros
  is_recurring          BOOLEAN NOT NULL DEFAULT FALSE, -- recorrente (mensal, etc.)
  is_deleted            BOOLEAN NOT NULL DEFAULT FALSE, -- soft delete

  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Garante coerência de parcelamento: os dois campos devem existir juntos
  CONSTRAINT chk_installment CHECK (
    (installment_current IS NULL AND installment_total IS NULL)
    OR
    (installment_current IS NOT NULL AND installment_total IS NOT NULL
     AND installment_current <= installment_total)
  )
);

CREATE INDEX idx_tx_family        ON transactions(family_id);
CREATE INDEX idx_tx_member        ON transactions(member_id);
CREATE INDEX idx_tx_category      ON transactions(category_id);
CREATE INDEX idx_tx_date          ON transactions(transaction_date DESC);
CREATE INDEX idx_tx_group         ON transactions(installment_group_id) WHERE installment_group_id IS NOT NULL;
CREATE INDEX idx_tx_active        ON transactions(family_id, transaction_date DESC) WHERE is_deleted = FALSE;

CREATE TRIGGER trg_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 5. BUDGET_LIMITS — Teto de Gastos
-- Limite por categoria por mês/ano por família.
-- ============================================================
CREATE TABLE budget_limits (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id     UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  category_id   UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  month         SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year          SMALLINT NOT NULL CHECK (year >= 2020),
  limit_amount  NUMERIC(12,2) NOT NULL CHECK (limit_amount > 0),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (family_id, category_id, month, year)
);

CREATE INDEX idx_budgets_family_period ON budget_limits(family_id, year, month);

CREATE TRIGGER trg_budget_limits_updated_at
  BEFORE UPDATE ON budget_limits
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 6. GOALS — Metas
-- Objetivos financeiros da família (viagem, veículo, reserva…).
-- ============================================================
CREATE TABLE goals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id     UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  category      TEXT NOT NULL DEFAULT 'Outros',  -- Viagem | Veículo | Reserva | Outros
  target_amount NUMERIC(12,2) NOT NULL CHECK (target_amount > 0),
  saved_amount  NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (saved_amount >= 0),
  deadline      DATE,
  tone          TEXT NOT NULL DEFAULT 'plum'
                  CHECK (tone IN ('sage','terra','teal','plum','amber','gold')),
  is_completed  BOOLEAN NOT NULL DEFAULT FALSE,
  is_deleted    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_goals_family ON goals(family_id);

CREATE TRIGGER trg_goals_updated_at
  BEFORE UPDATE ON goals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 7. GOAL_CONTRIBUTIONS
-- Histórico de aportes em cada meta.
-- ============================================================
CREATE TABLE goal_contributions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id         UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  member_id       UUID REFERENCES members(id) ON DELETE SET NULL,
  amount          NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  contributed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes           TEXT
);

CREATE INDEX idx_contributions_goal   ON goal_contributions(goal_id);
CREATE INDEX idx_contributions_member ON goal_contributions(member_id);

-- ============================================================
-- 8. TRANSFERS — Transferência Sugerida entre Membros
-- Calculada mensalmente. Registra quando foi quitada.
-- ============================================================
CREATE TABLE transfers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id       UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  from_member_id  UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  to_member_id    UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  amount          NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  month           SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year            SMALLINT NOT NULL CHECK (year >= 2020),
  is_settled      BOOLEAN NOT NULL DEFAULT FALSE,
  settled_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CHECK (from_member_id <> to_member_id),
  UNIQUE (family_id, from_member_id, to_member_id, month, year)
);

CREATE INDEX idx_transfers_family_period ON transfers(family_id, year, month);

CREATE TRIGGER trg_transfers_updated_at
  BEFORE UPDATE ON transfers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 9. MONTHLY_SUMMARIES — Resumo Mensal
-- Snapshot imutável do mês encerrado. Nunca deletar.
-- ============================================================
CREATE TABLE monthly_summaries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id       UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  month           SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year            SMALLINT NOT NULL CHECK (year >= 2020),
  total_income    NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_expenses  NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_savings   NUMERIC(12,2) NOT NULL DEFAULT 0,
  snapshot        JSONB,    -- serialização completa do mês para auditoria histórica
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (family_id, month, year)
);

CREATE INDEX idx_summaries_family ON monthly_summaries(family_id, year DESC, month DESC);

-- ============================================================
-- 10. INSIGHTS — Notas geradas por IA
-- ============================================================
CREATE TABLE insights (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id    UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  content      TEXT NOT NULL,
  month        SMALLINT CHECK (month BETWEEN 1 AND 12),
  year         SMALLINT,
  is_dismissed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_insights_family ON insights(family_id, created_at DESC);

-- ============================================================
-- 11. SAVINGS — Economias (saldo de poupança do mês)
-- Registra o quanto a família tem guardado por período.
-- ============================================================
CREATE TABLE savings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id   UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  month       SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year        SMALLINT NOT NULL CHECK (year >= 2020),
  amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (family_id, month, year)
);

CREATE TRIGGER trg_savings_updated_at
  BEFORE UPDATE ON savings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
