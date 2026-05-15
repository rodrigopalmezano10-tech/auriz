-- ============================================================
-- Auriz — Views para facilitar queries do frontend
-- ============================================================

-- ── v_transactions: transação enriquecida com nomes ──────────
CREATE OR REPLACE VIEW v_transactions AS
SELECT
  t.id,
  t.family_id,
  t.description,
  t.amount,
  t.transaction_date,
  t.method,
  t.is_shared,
  t.is_recurring,
  t.installment_current,
  t.installment_total,
  t.installment_group_id,
  t.notes,
  t.created_at,

  -- membro
  m.id            AS member_id,
  m.name          AS member_name,
  m.color         AS member_color,

  -- categoria
  c.id            AS category_id,
  c.name          AS category_name,
  c.icon          AS category_icon,
  c.color         AS category_color,

  -- label de parcela formatado (ex: "3/12")
  CASE
    WHEN t.installment_current IS NOT NULL
    THEN t.installment_current::TEXT || '/' || t.installment_total::TEXT
    ELSE NULL
  END AS installment_label

FROM transactions t
LEFT JOIN members    m ON m.id = t.member_id
LEFT JOIN categories c ON c.id = t.category_id
WHERE t.is_deleted = FALSE;

-- ── v_monthly_spending: gasto por categoria no mês ───────────
CREATE OR REPLACE VIEW v_monthly_spending AS
SELECT
  t.family_id,
  EXTRACT(YEAR  FROM t.transaction_date)::SMALLINT AS year,
  EXTRACT(MONTH FROM t.transaction_date)::SMALLINT AS month,
  c.id   AS category_id,
  c.name AS category_name,
  c.icon AS category_icon,
  c.color AS category_color,
  SUM(ABS(t.amount)) FILTER (WHERE t.amount < 0) AS total_spent,
  SUM(t.amount)      FILTER (WHERE t.amount > 0) AS total_income,
  COUNT(*)                                         AS tx_count
FROM transactions t
LEFT JOIN categories c ON c.id = t.category_id
WHERE t.is_deleted = FALSE
GROUP BY t.family_id, year, month, c.id, c.name, c.icon, c.color;

-- ── v_budget_status: teto vs gasto atual do mês ──────────────
CREATE OR REPLACE VIEW v_budget_status AS
SELECT
  bl.family_id,
  bl.month,
  bl.year,
  bl.limit_amount,
  c.id         AS category_id,
  c.name       AS category_name,
  c.icon       AS category_icon,
  c.color      AS category_color,
  COALESCE(ms.total_spent, 0) AS spent,
  ROUND(
    COALESCE(ms.total_spent, 0) / bl.limit_amount * 100, 1
  ) AS pct_used,
  CASE
    WHEN COALESCE(ms.total_spent, 0) >= bl.limit_amount THEN 'over'
    WHEN COALESCE(ms.total_spent, 0) >= bl.limit_amount * 0.75 THEN 'warn'
    ELSE 'ok'
  END AS status
FROM budget_limits bl
JOIN categories c ON c.id = bl.category_id
LEFT JOIN v_monthly_spending ms
  ON  ms.family_id    = bl.family_id
  AND ms.year         = bl.year
  AND ms.month        = bl.month
  AND ms.category_id  = bl.category_id;

-- ── v_goals_progress: meta com % e dias restantes ────────────
CREATE OR REPLACE VIEW v_goals_progress AS
SELECT
  g.id,
  g.family_id,
  g.title,
  g.category,
  g.target_amount,
  g.saved_amount,
  g.deadline,
  g.tone,
  g.is_completed,
  g.created_at,
  ROUND(g.saved_amount / NULLIF(g.target_amount, 0) * 100, 1) AS pct_complete,
  g.target_amount - g.saved_amount                             AS remaining,
  CASE
    WHEN g.deadline IS NOT NULL
    THEN (g.deadline - CURRENT_DATE)
    ELSE NULL
  END AS days_remaining
FROM goals g
WHERE g.is_deleted = FALSE;

-- ── v_member_balances: saldo líquido de cada membro no mês ───
CREATE OR REPLACE VIEW v_member_balances AS
SELECT
  t.family_id,
  EXTRACT(YEAR  FROM t.transaction_date)::SMALLINT AS year,
  EXTRACT(MONTH FROM t.transaction_date)::SMALLINT AS month,
  m.id         AS member_id,
  m.name       AS member_name,
  m.color      AS member_color,
  m.monthly_income,
  SUM(t.amount) FILTER (WHERE t.amount > 0) AS income,
  SUM(ABS(t.amount)) FILTER (WHERE t.amount < 0
    AND t.is_shared = FALSE)               AS personal_expenses,
  SUM(ABS(t.amount) / 2) FILTER (WHERE t.amount < 0
    AND t.is_shared = TRUE)               AS shared_expenses_split,
  SUM(t.amount) AS net_balance
FROM transactions t
JOIN members m ON m.id = t.member_id
WHERE t.is_deleted = FALSE
GROUP BY t.family_id, year, month, m.id, m.name, m.color, m.monthly_income;
