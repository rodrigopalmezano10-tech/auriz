/* eslint-disable */
// Auriz — Metas — dados reais + CRUD

const GOAL_TONES = ["plum","teal","sage","gold","terra","amber"];
const GOAL_CATEGORIES = ["Viagem","Veículo","Reserva","Imóvel","Educação","Outros"];

const GoalsScreen = ({ familyId, members }) => {
  const [goals, setGoals]       = React.useState([]);
  const [loading, setLoading]   = React.useState(true);
  const [addOpen, setAddOpen]   = React.useState(false);
  const [contribGoal, setContribGoal] = React.useState(null);
  const { show: showToast, el: toastEl } = useToast();

  const load = () => DB.getGoals(familyId).then(setGoals).finally(() => setLoading(false));
  React.useEffect(() => { if (familyId) load(); }, [familyId]);

  if (loading) return <LoadingPane label="Carregando metas…" />;

  return (
    <div style={{ padding: "32px 36px 64px", maxWidth: 1280, margin: "0 auto" }}>
      {toastEl}
      <p style={{ fontFamily: "var(--font-display)", fontSize: 20, lineHeight: 1.35, color: "var(--ink-2)",
        maxWidth: 540, margin: "0 0 32px" }}>
        Cada meta é uma promessa quieta. <em>Aqui ficam as suas</em>, e o ritmo que vocês têm mantido para chegar lá.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 22 }}>
        {goals.map(g => (
          <GoalCard key={g.id} goal={g}
            onContribute={() => setContribGoal(g)}
            onDelete={async () => {
              if (!confirm("Remover esta meta?")) return;
              await DB.softDeleteGoal(g.id);
              showToast("Meta removida."); load();
            }} />
        ))}

        <button
          onClick={() => setAddOpen(true)}
          style={{ border: "1.5px dashed var(--hairline)", background: "transparent",
            borderRadius: "var(--r-3)", padding: 28, cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", gap: 10, color: "var(--ink-3)", minHeight: 200,
            fontFamily: "var(--font-sans)", transition: "all var(--dur-base) var(--ease-out)" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--auriz-gold)"; e.currentTarget.style.color = "var(--auriz-gold-deep)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--hairline)"; e.currentTarget.style.color = "var(--ink-3)"; }}>
          <Icon.Plus size={22} />
          <span style={{ fontSize: 14, fontWeight: 500 }}>Adicionar uma meta</span>
          <span style={{ fontSize: 12, fontFamily: "var(--font-display)" }}>uma viagem, um carro, um colchão</span>
        </button>
      </div>

      <AddGoalModal open={addOpen} familyId={familyId}
        onClose={() => setAddOpen(false)}
        onSaved={() => { setAddOpen(false); showToast("Meta criada."); load(); }} />

      <ContribModal open={!!contribGoal} goal={contribGoal} members={members}
        onClose={() => setContribGoal(null)}
        onSaved={() => { setContribGoal(null); showToast("Aporte registrado."); load(); }} />
    </div>
  );
};

const GoalCard = ({ goal, onContribute, onDelete }) => {
  const pct       = parseFloat(goal.pct_done ?? 0);
  const remaining = Math.max(0, parseFloat(goal.target_amount ?? 0) - parseFloat(goal.saved_amount ?? 0));
  const daysLeft  = goal.days_remaining;

  return (
    <Card padded={false} style={{ padding: 28, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, right: 0, width: 4, height: "100%",
        background: `var(--${goal.tone})` }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
        <div>
          <span className="a-overline">{goal.category}</span>
          <h3 className="a-h2" style={{ margin: "6px 0 0", fontSize: 24 }}>{goal.title}</h3>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {goal.deadline && (
            <Badge tone={goal.tone}>
              {new Date(goal.deadline + "T12:00:00").toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}
            </Badge>
          )}
          <button onClick={onDelete} style={{ background: "transparent", border: "none",
            cursor: "pointer", color: "var(--ink-3)", padding: 4, display: "flex" }}>
            <Icon.Trash2 size={14} />
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <Money value={parseFloat(goal.saved_amount)} size="lg" tone="ink" />
        <span style={{ fontFamily: "var(--font-display)", color: "var(--ink-3)", marginLeft: 12, fontSize: 15 }}>
          de R$ {parseFloat(goal.target_amount).toLocaleString("pt-BR")}
        </span>
      </div>
      <ProgressBar pct={pct} tone="goal" />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontSize: 13, color: "var(--ink-3)" }}>
        <span style={{ fontFamily: "var(--font-display)" }}>
          {pct >= 100 ? "Meta atingida." : `${pct.toFixed(0)}% concluído`}
          {daysLeft != null && daysLeft > 0 && <span> · {Math.ceil(daysLeft)} dias restantes</span>}
        </span>
        <span style={{ fontFamily: "var(--font-mono)" }}>faltam R$ {remaining.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
      </div>
      <div style={{ marginTop: 14 }}>
        <Button variant="ghost" size="sm" onClick={onContribute} leading={<Icon.PlusCircle size={14}/>}>
          Registrar aporte
        </Button>
      </div>
    </Card>
  );
};

const AddGoalModal = ({ open, familyId, onClose, onSaved }) => {
  const [title, setTitle]   = React.useState("");
  const [cat, setCat]       = React.useState("Viagem");
  const [target, setTarget] = React.useState("");
  const [saved, setSaved]   = React.useState("");
  const [deadline, setDeadline] = React.useState("");
  const [tone, setTone]     = React.useState("plum");
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await DB.addGoal({ familyId, title, category: cat, targetAmount: target,
        savedAmount: saved, deadline, tone });
      onSaved();
    } finally { setLoading(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Nova meta">
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Input label="Nome da meta" placeholder="ex: Lisboa em maio" value={title} onChange={e => setTitle(e.target.value)} required />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Select label="Categoria" value={cat} onChange={e => setCat(e.target.value)}
            options={GOAL_CATEGORIES.map(c => ({ value: c, label: c }))} />
          <Input label="Prazo" type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Input label="Valor alvo (R$)" type="number" min="0" step="0.01" placeholder="0,00" value={target} onChange={e => setTarget(e.target.value)} required />
          <Input label="Já guardado (R$)" type="number" min="0" step="0.01" placeholder="0,00" value={saved} onChange={e => setSaved(e.target.value)} />
        </div>
        <div>
          <div className="a-overline" style={{ marginBottom: 8 }}>Cor</div>
          <div style={{ display: "flex", gap: 8 }}>
            {GOAL_TONES.map(t => (
              <button key={t} type="button" onClick={() => setTone(t)}
                style={{ width: 28, height: 28, borderRadius: 999, border: "none", cursor: "pointer",
                  background: `var(--${t})`,
                  outline: tone === t ? "3px solid var(--auriz-gold)" : "2px solid transparent",
                  outlineOffset: 2 }} />
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
          <Button variant="ghost" type="button" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" type="submit" disabled={loading}
            trailing={loading ? <Spinner size={14}/> : null}>
            {loading ? "Criando…" : "Criar meta"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const ContribModal = ({ open, goal, members, onClose, onSaved }) => {
  const [memberId, setMemberId] = React.useState(members[0]?.id ?? "");
  const [amount, setAmount]     = React.useState("");
  const [notes, setNotes]       = React.useState("");
  const [loading, setLoading]   = React.useState(false);

  if (!goal) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await DB.addGoalContribution({ goalId: goal.id, memberId, amount, notes });
      onSaved(); setAmount(""); setNotes("");
    } finally { setLoading(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Aporte — ${goal.title}`}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Select label="Membro" value={memberId} onChange={e => setMemberId(e.target.value)}
          options={members.map(m => ({ value: m.id, label: m.name }))} />
        <Input label="Valor (R$)" type="number" min="0.01" step="0.01" placeholder="0,00"
          value={amount} onChange={e => setAmount(e.target.value)} required />
        <Input label="Observação (opcional)" placeholder="ex: Transferência de dezembro"
          value={notes} onChange={e => setNotes(e.target.value)} />
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
          <Button variant="ghost" type="button" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" type="submit" disabled={loading}
            trailing={loading ? <Spinner size={14}/> : null}>
            {loading ? "Salvando…" : "Registrar aporte"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

window.GoalsScreen = GoalsScreen;
