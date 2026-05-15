-- ============================================================
-- Auriz — Row Level Security (RLS)
-- Garante que cada família só acessa os próprios dados.
-- Estratégia: member.user_id = auth.uid() dá acesso à família.
-- ============================================================

-- Habilita RLS em todas as tabelas
ALTER TABLE families          ENABLE ROW LEVEL SECURITY;
ALTER TABLE members           ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories        ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_limits     ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals             ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights          ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings           ENABLE ROW LEVEL SECURITY;

-- ── Função auxiliar: retorna family_id do usuário autenticado ──
CREATE OR REPLACE FUNCTION my_family_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT family_id FROM members
  WHERE user_id = auth.uid() AND is_deleted = FALSE
  LIMIT 1;
$$;

-- ── FAMILIES ──────────────────────────────────────────────────
CREATE POLICY "family_select" ON families
  FOR SELECT USING (id = my_family_id());

CREATE POLICY "family_update" ON families
  FOR UPDATE USING (id = my_family_id());

-- ── MEMBERS ───────────────────────────────────────────────────
CREATE POLICY "members_select" ON members
  FOR SELECT USING (family_id = my_family_id());

CREATE POLICY "members_insert" ON members
  FOR INSERT WITH CHECK (family_id = my_family_id());

CREATE POLICY "members_update" ON members
  FOR UPDATE USING (family_id = my_family_id());

-- Soft-delete apenas — nunca DELETE direto
CREATE POLICY "members_softdelete" ON members
  FOR UPDATE USING (family_id = my_family_id());

-- ── CATEGORIES ────────────────────────────────────────────────
-- Categorias globais (family_id IS NULL) são visíveis para todos
CREATE POLICY "categories_select" ON categories
  FOR SELECT USING (family_id IS NULL OR family_id = my_family_id());

CREATE POLICY "categories_insert" ON categories
  FOR INSERT WITH CHECK (family_id = my_family_id());

CREATE POLICY "categories_update" ON categories
  FOR UPDATE USING (family_id = my_family_id() AND is_default = FALSE);

-- ── TRANSACTIONS ──────────────────────────────────────────────
CREATE POLICY "tx_select" ON transactions
  FOR SELECT USING (family_id = my_family_id() AND is_deleted = FALSE);

CREATE POLICY "tx_insert" ON transactions
  FOR INSERT WITH CHECK (family_id = my_family_id());

CREATE POLICY "tx_update" ON transactions
  FOR UPDATE USING (family_id = my_family_id());

-- ── BUDGET_LIMITS ─────────────────────────────────────────────
CREATE POLICY "budgets_select" ON budget_limits
  FOR SELECT USING (family_id = my_family_id());

CREATE POLICY "budgets_insert" ON budget_limits
  FOR INSERT WITH CHECK (family_id = my_family_id());

CREATE POLICY "budgets_update" ON budget_limits
  FOR UPDATE USING (family_id = my_family_id());

CREATE POLICY "budgets_delete" ON budget_limits
  FOR DELETE USING (family_id = my_family_id());

-- ── GOALS ─────────────────────────────────────────────────────
CREATE POLICY "goals_select" ON goals
  FOR SELECT USING (family_id = my_family_id() AND is_deleted = FALSE);

CREATE POLICY "goals_insert" ON goals
  FOR INSERT WITH CHECK (family_id = my_family_id());

CREATE POLICY "goals_update" ON goals
  FOR UPDATE USING (family_id = my_family_id());

-- ── GOAL_CONTRIBUTIONS ────────────────────────────────────────
CREATE POLICY "contributions_select" ON goal_contributions
  FOR SELECT USING (
    goal_id IN (SELECT id FROM goals WHERE family_id = my_family_id())
  );

CREATE POLICY "contributions_insert" ON goal_contributions
  FOR INSERT WITH CHECK (
    goal_id IN (SELECT id FROM goals WHERE family_id = my_family_id())
  );

-- ── TRANSFERS ─────────────────────────────────────────────────
CREATE POLICY "transfers_select" ON transfers
  FOR SELECT USING (family_id = my_family_id());

CREATE POLICY "transfers_insert" ON transfers
  FOR INSERT WITH CHECK (family_id = my_family_id());

CREATE POLICY "transfers_update" ON transfers
  FOR UPDATE USING (family_id = my_family_id());

-- ── MONTHLY_SUMMARIES ─────────────────────────────────────────
CREATE POLICY "summaries_select" ON monthly_summaries
  FOR SELECT USING (family_id = my_family_id());

CREATE POLICY "summaries_insert" ON monthly_summaries
  FOR INSERT WITH CHECK (family_id = my_family_id());

-- ── INSIGHTS ──────────────────────────────────────────────────
CREATE POLICY "insights_select" ON insights
  FOR SELECT USING (family_id = my_family_id());

CREATE POLICY "insights_update" ON insights
  FOR UPDATE USING (family_id = my_family_id());

-- ── SAVINGS ───────────────────────────────────────────────────
CREATE POLICY "savings_select" ON savings
  FOR SELECT USING (family_id = my_family_id());

CREATE POLICY "savings_insert" ON savings
  FOR INSERT WITH CHECK (family_id = my_family_id());

CREATE POLICY "savings_update" ON savings
  FOR UPDATE USING (family_id = my_family_id());
