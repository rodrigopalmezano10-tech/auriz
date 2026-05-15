/* eslint-disable */
// Auriz — Economias: histórico + edição do mês atual

const EconomiasScreen = ({ familyId, month, year }) => {
  const [history, setHistory] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [editOpen, setEditOpen] = React.useState(false);
  const { show: showToast, el: toastEl } = useToast();

  const load = () => DB.getSavings(familyId).then(setHistory).finally(() => setLoading(false));
  React.useEffect(() => { if (familyId) load(); }, [familyId]);

  const curMonth = history.find(s => s.month === month + 1 && s.year === year);
  const curAmount = parseFloat(curMonth?.amount ?? 0);
  const total     = history.reduce((s, r) => Math.max(s, parseFloat(r.amount)), 0);

  if (loading) return <LoadingPane label="Carregando economias…" />;

  return (
    <div style={{ padding: "32px 36px 64px", maxWidth: 900, margin: "0 auto" }}>
      {toastEl}
      <SectionHeader title="Economias" caption="o que vocês têm guardado"
        action={<Button variant="primary" size="sm" onClick={() => setEditOpen(true)} leading={<Icon.Edit size={14}/>}>
          Atualizar mês atual
        </Button>} />

      <Card padded={false} style={{ padding: "32px 36px", marginBottom: 28, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -30, right: -30, width: 180, height: 180,
          background: "radial-gradient(circle, var(--teal-soft) 0%, transparent 70%)", opacity: 0.6 }} />
        <span className="a-overline" style={{ color: "var(--teal)" }}>Saldo guardado em {MONTHS_PT[month]}</span>
        <div style={{ marginTop: 10 }}>
          <Money value={curAmount} size="xl" tone="ink" />
        </div>
        {curMonth?.notes && (
          <p style={{ fontFamily: "var(--font-display)", fontSize: 15, color: "var(--ink-3)",
            margin: "14px 0 0" }}>{curMonth.notes}</p>
        )}
      </Card>

      {history.length === 0 ? (
        <EmptyState icon="PiggyBank" title="Nenhum registro de economia ainda."
          description="Registre o valor guardado a cada mês para acompanhar sua evolução."
          action={<Button variant="primary" size="sm" onClick={() => setEditOpen(true)}>Registrar agora</Button>} />
      ) : (
        <Card padded={false}>
          <div style={{ padding: "16px 22px 12px", borderBottom: "1px solid var(--hairline-soft)" }}>
            <h3 className="a-h3" style={{ margin: 0, fontSize: 16 }}>Histórico</h3>
          </div>
          {history.map((s, i) => {
            const pct = total > 0 ? (parseFloat(s.amount) / total) * 100 : 0;
            const isCur = s.month === month + 1 && s.year === year;
            return (
              <div key={s.id} style={{ display: "grid", gridTemplateColumns: "80px 1fr 140px",
                gap: 16, alignItems: "center", padding: "14px 22px",
                borderBottom: i < history.length - 1 ? "1px solid var(--hairline-soft)" : "none",
                background: isCur ? "var(--teal-soft)" : "transparent" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--ink-2)" }}>
                  {MONTHS_PT[s.month - 1]?.slice(0,3)} {s.year}
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <ProgressBar pct={pct} tone="goal" />
                  {s.notes && <span style={{ fontSize: 12, color: "var(--ink-3)", fontFamily: "var(--font-display)" }}>{s.notes}</span>}
                </div>
                <div style={{ textAlign: "right" }}>
                  <MoneyMono value={parseFloat(s.amount)} tone="ink" />
                </div>
              </div>
            );
          })}
        </Card>
      )}

      <EditSavingsModal open={editOpen} familyId={familyId} month={month + 1} year={year}
        current={curMonth} onClose={() => setEditOpen(false)}
        onSaved={() => { setEditOpen(false); showToast("Economias atualizadas."); load(); }} />
    </div>
  );
};

const EditSavingsModal = ({ open, familyId, month, year, current, onClose, onSaved }) => {
  const [amount, setAmount] = React.useState(current ? String(parseFloat(current.amount)) : "");
  const [notes, setNotes]   = React.useState(current?.notes ?? "");
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    setAmount(current ? String(parseFloat(current.amount)) : "");
    setNotes(current?.notes ?? "");
  }, [current, open]);

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try { await DB.upsertSavings({ familyId, month, year, amount, notes }); onSaved(); }
    finally { setLoading(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Economias — ${MONTHS_PT[month - 1]} ${year}`}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Input label="Total guardado (R$)" type="number" min="0" step="0.01" placeholder="0,00"
          value={amount} onChange={e => setAmount(e.target.value)} required />
        <Input label="Observação (opcional)" placeholder="ex: Rendimento da poupança + CDB"
          value={notes} onChange={e => setNotes(e.target.value)} />
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Button variant="ghost" type="button" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" type="submit" disabled={loading}
            trailing={loading ? <Spinner size={14}/> : null}>
            {loading ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

window.EconomiasScreen = EconomiasScreen;
