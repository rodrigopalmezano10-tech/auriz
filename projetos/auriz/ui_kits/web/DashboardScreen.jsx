/* eslint-disable */
// Auriz — Dashboard / "Hoje" — dados reais do Supabase

const DashboardScreen = ({ familyId, month, year, members, onAddTransaction, onNav }) => {
  const [txs, setTxs]           = React.useState([]);
  const [budgets, setBudgets]   = React.useState([]);
  const [insight, setInsight]   = React.useState(null);
  const [transfer, setTransfer] = React.useState(null);
  const [savings, setSavings]   = React.useState(0);
  const [loading, setLoading]   = React.useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([
      DB.getTransactions(familyId, month + 1, year),
      DB.getBudgetStatus(familyId, month + 1, year),
      DB.getActiveInsight(familyId),
      DB.getTransfer(familyId, month + 1, year),
      DB.getSavings(familyId),
    ]).then(([t, b, i, tr, sv]) => {
      setTxs(t); setBudgets(b); setInsight(i); setTransfer(tr);
      const cur = sv.find(s => s.month === month + 1 && s.year === year);
      setSavings(cur?.amount ?? 0);
    }).finally(() => setLoading(false));
  };

  React.useEffect(() => { if (familyId) load(); }, [familyId, month, year]);

  if (loading) return <LoadingPane label="Carregando dashboard…" />;

  const totalSpent          = txs.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalMonthlyIncome  = members.reduce((s, m) => s + parseFloat(m.monthly_income || 0), 0);
  const totalExtraIncome    = txs.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalIncome         = totalMonthlyIncome + totalExtraIncome;
  const balance             = totalIncome - totalSpent;
  const topBudgets  = budgets.slice(0, 3);
  const recentTxs   = txs.slice(0, 6);

  return (
    <div style={{ padding: "32px 36px 64px", maxWidth: 1280, margin: "0 auto" }}>

      {/* ── HERO ── */}
      <section style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 22, marginBottom: 32 }}>
        {/* Saldo */}
        <Card padded={false} style={{ padding: "28px 32px 30px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -40, right: -40, width: 220, height: 220,
            background: "radial-gradient(circle, var(--auriz-gold-soft) 0%, transparent 70%)",
            opacity: 0.5, pointerEvents: "none" }} />
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 18 }}>
            <span className="a-overline">Saldo do mês</span>
            <Badge tone={balance >= 0 ? "sage" : "terra"} dot>{balance >= 0 ? "no positivo" : "no negativo"}</Badge>
          </div>
          <Money value={balance} size="xl" tone={balance >= 0 ? "ink" : "terra"} />
          <div style={{ display: "flex", gap: 32, marginTop: 22 }}>
            <div><div className="a-overline" style={{ marginBottom: 4 }}>Renda</div><Money value={totalIncome} size="sm" tone="sage" showSign /></div>
            <div><div className="a-overline" style={{ marginBottom: 4 }}>Gasto</div><Money value={-totalSpent} size="sm" tone="terra" /></div>
            <div><div className="a-overline" style={{ marginBottom: 4 }}>Economias</div><Money value={savings} size="sm" tone="ink" /></div>
          </div>
        </Card>

        {/* Transferência / placeholder */}
        {transfer && !transfer.is_settled ? (
          <Card tone="gold" padded={false} style={{ padding: "28px 30px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div className="a-overline" style={{ marginBottom: 10, color: "var(--auriz-gold-deep)" }}>Transferência sugerida</div>
              <Money value={transfer.amount} size="lg" tone="gold" />
              <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10, fontSize: 13.5 }}>
                <Avatar name={transfer.from_member?.name} color={transfer.from_member?.color ?? "gold"} size={26} />
                <Icon.ArrowRight size={14} />
                <Avatar name={transfer.to_member?.name} color={transfer.to_member?.color ?? "sage"} size={26} />
                <span style={{ color: "var(--ink-2)" }}>de {transfer.from_member?.name?.split(" ")[0]} para {transfer.to_member?.name?.split(" ")[0]}</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <Button variant="ink" size="sm" onClick={async () => { await DB.settleTransfer(transfer.id); load(); }}>Registrar pagamento</Button>
              <Button variant="ghost" size="sm">Como calcula?</Button>
            </div>
          </Card>
        ) : (
          <Card padded={false} style={{ padding: "28px 30px", display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 10, border: "1.5px dashed var(--hairline)" }}>
            <Icon.CheckCircle size={28} style={{ color: "var(--sage)" }} />
            <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ink-2)" }}>
              {transfer?.is_settled ? "Transferência quitada." : "Sem transferência este mês."}
            </div>
          </Card>
        )}
      </section>

      {/* ── BODY ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 22 }}>
        {/* Transações recentes */}
        <Card padded={false}>
          <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid var(--hairline-soft)",
            display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div>
              <h3 className="a-h3" style={{ margin: 0, fontSize: 18 }}>Transações recentes</h3>
              <div style={{ fontSize: 12, color: "var(--ink-3)", fontFamily: "var(--font-display)", marginTop: 2 }}>últimas {recentTxs.length} lançadas</div>
            </div>
            <button onClick={() => onNav("transacoes")} style={{
              background: "transparent", border: "none", cursor: "pointer",
              color: "var(--ink-2)", fontSize: 13, padding: 6, display: "flex", alignItems: "center", gap: 4, fontFamily: "var(--font-sans)" }}>
              Ver todas <Icon.ArrowRight size={12} />
            </button>
          </div>
          {recentTxs.length === 0
            ? <EmptyState icon="CreditCard" title="Nenhuma transação ainda."
                description="Quando você adicionar a primeira, ela aparece aqui."
                action={<Button variant="primary" size="sm" onClick={onAddTransaction} leading={<Icon.Plus size={14}/>}>Adicionar</Button>} />
            : recentTxs.map((tx, i) => <DashTxRow key={tx.id} tx={tx} isLast={i === recentTxs.length - 1} />)
          }
        </Card>

        {/* Coluna direita */}
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {/* Tetos */}
          <Card padded={false}>
            <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid var(--hairline-soft)" }}>
              <h3 className="a-h3" style={{ margin: 0, fontSize: 18 }}>Tetos do mês</h3>
              <div style={{ fontSize: 12, color: "var(--ink-3)", fontFamily: "var(--font-display)", marginTop: 2 }}>categorias mais próximas do limite</div>
            </div>
            {topBudgets.length === 0
              ? <EmptyState icon="TrendingUp" title="Nenhum teto configurado."
                  action={<Button variant="ghost" size="sm" onClick={() => onNav("teto")}>Configurar</Button>} />
              : <div style={{ padding: "16px 22px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
                  {topBudgets.map(b => <BudgetPulse key={b.category_id} budget={b} />)}
                </div>
            }
          </Card>

          {/* Insight de IA */}
          {insight && (
            <Card tone="ink" style={{ borderColor: "var(--ink)", position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, color: "var(--auriz-gold)" }}>
                <Icon.Sparkles size={14} />
                <span className="a-overline" style={{ color: "var(--auriz-gold)", fontWeight: 500 }}>Nota do Auriz</span>
              </div>
              <p style={{ fontFamily: "var(--font-display)", fontSize: 17, lineHeight: 1.35,
                margin: 0, color: "var(--paper)", letterSpacing: "-0.005em" }}>{insight.content}</p>
              <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
                <button onClick={async () => { await DB.dismissInsight(insight.id); setInsight(null); }}
                  style={{ background: "transparent", border: "none", color: "var(--ink-3)",
                    padding: "6px 8px", borderRadius: "var(--r-2)", fontSize: 12.5, cursor: "pointer",
                    fontFamily: "var(--font-sans)" }}>Dispensar</button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

const DashTxRow = ({ tx, isLast }) => (
  <div style={{ display: "grid", gridTemplateColumns: "36px 1fr auto auto", gap: 14, alignItems: "center",
    padding: "13px 22px", borderBottom: isLast ? "none" : "1px solid var(--hairline-soft)" }}>
    <CategoryChip name={tx.category_name} icon={tx.category_icon} color={tx.category_color} />
    <div>
      <div style={{ fontSize: 14, fontWeight: 500 }}>{tx.description}</div>
      <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2, display: "flex", gap: 8, alignItems: "center" }}>
        <Avatar name={tx.member_name ?? "?"} color={tx.member_color ?? "gold"} size={18} />
        <span>{tx.member_name?.split(" ")[0]}</span>
        <span>·</span><span>{tx.method}</span>
        {tx.installment_label && <Badge tone="neutral">{tx.installment_label}</Badge>}
        {tx.is_shared && <Badge tone="teal">dividida</Badge>}
      </div>
    </div>
    <div style={{ fontSize: 12, color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}>
      {new Date(tx.transaction_date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
    </div>
    <MoneyMono value={tx.amount} tone={tx.amount > 0 ? "sage" : "terra"} />
  </div>
);

const BudgetPulse = ({ budget }) => {
  const pct  = parseFloat(budget.pct_used ?? 0);
  const tone = budget.status === "over" ? "over" : budget.status === "warn" ? "warn" : "ok";
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 7 }}>
        <CategoryChip name={budget.category_name} icon={budget.category_icon} color={budget.category_color} size={26} />
        <span style={{ fontSize: 14, fontWeight: 500, flex: 1 }}>{budget.category_name}</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--ink-2)", fontVariantNumeric: "tabular-nums" }}>
          R$ {parseFloat(budget.spent ?? 0).toLocaleString("pt-BR")}
          <span style={{ color: "var(--ink-3)" }}> / {parseFloat(budget.limit_amount).toLocaleString("pt-BR")}</span>
        </span>
      </div>
      <ProgressBar pct={pct} tone={tone} />
    </div>
  );
};

window.DashboardScreen = DashboardScreen;
