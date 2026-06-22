/* eslint-disable */
// Auriz — Dashboard Analytics: gráficos de gastos e saldos por membro

const DashboardAnalyticsScreen = ({ familyId, month, year }) => {
  const [spending, setSpending]   = React.useState([]);
  const [balances, setBalances]   = React.useState([]);
  const [history, setHistory]     = React.useState([]);
  const [loading, setLoading]     = React.useState(true);

  React.useEffect(() => {
    if (!familyId) return;
    setLoading(true);
    Promise.all([
      DB.getMonthlySpending(familyId, month + 1, year),
      DB.getMemberBalances(familyId, month + 1, year),
      DB.getSpendingHistory(familyId, 6),
    ]).then(([s, b, h]) => { setSpending(s); setBalances(b); setHistory(h); })
      .finally(() => setLoading(false));
  }, [familyId, month, year]);

  if (loading) return <LoadingPane label="Carregando analytics…" />;

  const totalSpent         = spending.reduce((s, c) => s + parseFloat(c.total_spent ?? 0), 0);
  const totalMonthlyIncome = balances.reduce((s, b) => s + parseFloat(b.monthly_income ?? 0), 0);
  const totalExtraIncome   = spending.reduce((s, c) => s + parseFloat(c.total_income ?? 0), 0);
  const totalIncome        = totalMonthlyIncome + totalExtraIncome;

  const monthHistory = {};
  history.forEach(r => {
    const key = `${r.year}-${String(r.month).padStart(2, "0")}`;
    if (!monthHistory[key]) monthHistory[key] = { spent: 0, income: 0, month: r.month, year: r.year };
    monthHistory[key].spent  += parseFloat(r.total_spent  ?? 0);
    monthHistory[key].income += parseFloat(r.total_income ?? 0);
  });
  const monthSeries = Object.values(monthHistory)
    .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)
    .slice(-6);
  const maxMonth = Math.max(...monthSeries.map(m => Math.max(m.spent, m.income)), 1);

  return (
    <div style={{ padding: "32px 36px 64px", maxWidth: 1280, margin: "0 auto" }}>
      <SectionHeader title="Dashboard" caption="indicadores e padrões do mês" />

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
        {[
          { label: "Receita total",   value: totalIncome,             tone: "sage"  },
          { label: "Despesas totais", value: -totalSpent,             tone: "terra" },
          { label: "Saldo líquido",   value: totalIncome - totalSpent, tone: totalIncome >= totalSpent ? "sage" : "terra" },
          { label: "Categorias",      value: spending.length,         unit: "cat.", tone: "ink" },
        ].map(kpi => (
          <Card key={kpi.label} padded={false} style={{ padding: "20px 22px" }}>
            <div className="a-overline" style={{ marginBottom: 8 }}>{kpi.label}</div>
            {kpi.unit
              ? <div style={{ fontFamily: "var(--font-display)", fontSize: 36, letterSpacing: "-0.03em", color: "var(--ink)" }}>
                  {kpi.value}<span style={{ fontSize: 16, marginLeft: 6, color: "var(--ink-3)" }}>{kpi.unit}</span>
                </div>
              : <Money value={kpi.value} size="lg" tone={kpi.tone} />
            }
          </Card>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 22, marginBottom: 22 }}>

        {/* Gastos por categoria */}
        <Card padded={false}>
          <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid var(--hairline-soft)" }}>
            <h3 className="a-h3" style={{ margin: 0, fontSize: 17 }}>Gastos por categoria</h3>
            <div style={{ fontSize: 12, color: "var(--ink-3)", fontFamily: "var(--font-display)", marginTop: 2 }}>
              {MONTHS_PT[month]} {year}
            </div>
          </div>
          {spending.filter(c => parseFloat(c.total_spent ?? 0) > 0).length === 0 ? (
            <EmptyState icon="BarChart2" title="Sem dados de gasto." description="Adicione transações para ver o breakdown." />
          ) : (
            <div style={{ padding: "16px 22px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
              {spending
                .filter(c => parseFloat(c.total_spent ?? 0) > 0)
                .map(cat => {
                  const pct = totalSpent > 0 ? (parseFloat(cat.total_spent) / totalSpent) * 100 : 0;
                  return (
                    <div key={cat.category_id}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                        <CategoryChip name={cat.category_name} icon={cat.category_icon} color={cat.category_color} size={28} />
                        <span style={{ fontSize: 13.5, fontWeight: 500, flex: 1 }}>{cat.category_name}</span>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--ink-2)" }}>
                          {pct.toFixed(1)}%
                        </span>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--ink)" }}>
                          R$ {parseFloat(cat.total_spent).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div style={{ height: 6, background: "var(--hairline-soft)", borderRadius: 999, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`,
                          background: `var(--${cat.category_color === "neutral" ? "ink-3" : cat.category_color})`,
                          borderRadius: 999, transition: "width 0.5s var(--ease-out)" }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </Card>

        {/* Saldo por membro */}
        <Card padded={false}>
          <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid var(--hairline-soft)" }}>
            <h3 className="a-h3" style={{ margin: 0, fontSize: 17 }}>Saldo por membro</h3>
            <div style={{ fontSize: 12, color: "var(--ink-3)", fontFamily: "var(--font-display)", marginTop: 2 }}>{MONTHS_PT[month]} {year}</div>
          </div>
          {balances.length === 0 ? (
            <EmptyState icon="Users" title="Sem dados de saldo." description="Adicione transações com membros." />
          ) : (
            <div style={{ padding: "16px 22px 20px", display: "flex", flexDirection: "column", gap: 18 }}>
              {balances.map(b => {
                const net = parseFloat(b.balance ?? 0);
                return (
                  <div key={b.member_id}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <Avatar name={b.member_name} color={b.member_color} size={32} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>{b.member_name}</div>
                        <div style={{ fontSize: 12, color: "var(--ink-3)" }}>
                          Renda: R$ {parseFloat(b.monthly_income ?? 0).toLocaleString("pt-BR")}
                        </div>
                      </div>
                      <MoneyMono value={net} tone={net >= 0 ? "sage" : "terra"} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <div style={{ padding: "8px 12px", background: "var(--sage-soft)", borderRadius: "var(--r-2)" }}>
                        <div style={{ fontSize: 11, color: "var(--sage)", fontWeight: 500, marginBottom: 2 }}>Renda mensal</div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--sage)" }}>
                          +R$ {parseFloat(b.monthly_income ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div style={{ padding: "8px 12px", background: "var(--terracotta-soft)", borderRadius: "var(--r-2)" }}>
                        <div style={{ fontSize: 11, color: "var(--terracotta)", fontWeight: 500, marginBottom: 2 }}>Despesas</div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--terracotta)" }}>
                          −R$ {parseFloat(b.total_spent ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Histórico mensal */}
      <Card padded={false}>
        <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid var(--hairline-soft)" }}>
          <h3 className="a-h3" style={{ margin: 0, fontSize: 17 }}>Evolução dos últimos meses</h3>
        </div>
        {monthSeries.length < 2 ? (
          <EmptyState icon="BarChart3" title="Dados insuficientes." description="Precisamos de ao menos 2 meses de dados para mostrar a evolução." />
        ) : (
          <div style={{ padding: "24px 28px 20px" }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 20, height: 140 }}>
              {monthSeries.map(m => (
                <div key={`${m.year}-${m.month}`} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, height: "100%" }}>
                  <div style={{ flex: 1, width: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 3 }}>
                    <div title={`Receita: R$ ${m.income.toLocaleString("pt-BR")}`}
                      style={{ width: "100%", height: `${(m.income / maxMonth) * 100}%`,
                        background: "var(--sage-soft)", borderRadius: "var(--r-1) var(--r-1) 0 0",
                        border: "1px solid var(--sage)", transition: "height 0.4s var(--ease-out)" }} />
                    <div title={`Gasto: R$ ${m.spent.toLocaleString("pt-BR")}`}
                      style={{ width: "100%", height: `${(m.spent / maxMonth) * 100}%`,
                        background: "var(--terracotta-soft)", borderRadius: "var(--r-1) var(--r-1) 0 0",
                        border: "1px solid var(--terracotta)", transition: "height 0.4s var(--ease-out)" }} />
                  </div>
                  <span style={{ fontSize: 11, color: "var(--ink-3)", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>
                    {MONTHS_PT[m.month - 1]?.slice(0, 3)} {m.year}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 20, marginTop: 12, fontSize: 12, color: "var(--ink-3)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 12, height: 12, background: "var(--sage-soft)", border: "1px solid var(--sage)", borderRadius: 2 }} />
                <span>Receita</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 12, height: 12, background: "var(--terracotta-soft)", border: "1px solid var(--terracotta)", borderRadius: 2 }} />
                <span>Gasto</span>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

window.DashboardAnalyticsScreen = DashboardAnalyticsScreen;
