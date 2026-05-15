/* eslint-disable */
// Auriz — Membros: lista + adicionar + editar renda

const COLOR_OPTIONS_MEMBER = [
  { value: "gold",  label: "Dourado"   },
  { value: "sage",  label: "Verde"     },
  { value: "teal",  label: "Teal"      },
  { value: "plum",  label: "Ameixa"    },
  { value: "terra", label: "Terracota" },
  { value: "ink",   label: "Tinta"     },
];

const MembrosScreen = ({ familyId, month, year, onMembersChange }) => {
  const [members, setMembers]   = React.useState([]);
  const [balances, setBalances] = React.useState([]);
  const [loading, setLoading]   = React.useState(true);
  const [addOpen, setAddOpen]   = React.useState(false);
  const [editMember, setEditMember] = React.useState(null);
  const { show: showToast, el: toastEl } = useToast();

  const load = () => {
    Promise.all([
      DB.getMembers(familyId),
      DB.getMemberBalances(familyId, month + 1, year),
    ]).then(([m, b]) => { setMembers(m); setBalances(b); }).finally(() => setLoading(false));
  };
  React.useEffect(() => { if (familyId) load(); }, [familyId, month, year]);

  const handleDelete = async (m) => {
    if (members.length <= 1) { showToast("A família precisa ter ao menos um membro.", "warn"); return; }
    if (!confirm(`Remover ${m.name}?`)) return;
    await DB.softDeleteMember(m.id);
    showToast("Membro removido."); load(); onMembersChange?.();
  };

  const totalIncome = members.reduce((s, m) => s + parseFloat(m.monthly_income), 0);

  if (loading) return <LoadingPane label="Carregando membros…" />;

  return (
    <div style={{ padding: "32px 36px 64px", maxWidth: 900, margin: "0 auto" }}>
      {toastEl}
      <SectionHeader title="Membros" caption="quem participa do orçamento"
        action={<Button variant="primary" size="sm" onClick={() => setAddOpen(true)} leading={<Icon.Plus size={14}/>}>
          Adicionar membro
        </Button>} />

      <Card padded={false} style={{ padding: "20px 26px", marginBottom: 24,
        display: "flex", gap: 32, alignItems: "center" }}>
        <div>
          <div className="a-overline" style={{ marginBottom: 4 }}>Renda total da família</div>
          <Money value={totalIncome} size="md" tone="sage" />
        </div>
        {members.map(m => (
          <div key={m.id}>
            <div className="a-overline" style={{ marginBottom: 4 }}>{m.name.split(" ")[0]}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Avatar name={m.name} color={m.color} size={22} />
              <Money value={parseFloat(m.monthly_income)} size="sm" tone="ink" />
              <span style={{ fontSize: 12, color: "var(--ink-3)" }}>
                ({totalIncome > 0 ? ((parseFloat(m.monthly_income) / totalIncome) * 100).toFixed(0) : 0}%)
              </span>
            </div>
          </div>
        ))}
      </Card>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {members.map(m => {
          const bal = balances.find(b => b.member_id === m.id);
          return (
            <Card key={m.id} padded={false} style={{ padding: "22px 26px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                <Avatar name={m.name} color={m.color} size={52} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                    <h3 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 400 }}>{m.name}</h3>
                    <div style={{ display: "flex", gap: 8 }}>
                      <Button variant="ghost" size="sm" onClick={() => setEditMember(m)}
                        leading={<Icon.Edit size={13}/>}>Editar</Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(m)}
                        leading={<Icon.UserX size={13}/>}>Remover</Button>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 28, marginTop: 14 }}>
                    <StatBox label="Renda mensal" value={<Money value={parseFloat(m.monthly_income)} size="sm" tone="sage" />} />
                    {bal && <>
                      <StatBox label="Receita no mês" value={<MoneyMono value={parseFloat(bal.income ?? 0)} tone="sage" />} />
                      <StatBox label="Despesas pessoais" value={<MoneyMono value={-parseFloat(bal.personal_expenses ?? 0)} tone="terra" />} />
                      <StatBox label="Saldo líquido" value={<MoneyMono value={parseFloat(bal.net_balance ?? 0)} tone={parseFloat(bal.net_balance ?? 0) >= 0 ? "sage" : "terra"} />} />
                    </>}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <AddMemberModal open={addOpen} familyId={familyId}
        onClose={() => setAddOpen(false)}
        onSaved={() => { setAddOpen(false); showToast("Membro adicionado."); load(); onMembersChange?.(); }} />

      <EditMemberModal open={!!editMember} member={editMember}
        onClose={() => setEditMember(null)}
        onSaved={() => { setEditMember(null); showToast("Membro atualizado."); load(); onMembersChange?.(); }} />
    </div>
  );
};

const StatBox = ({ label, value }) => (
  <div>
    <div className="a-overline" style={{ marginBottom: 4 }}>{label}</div>
    {value}
  </div>
);

const MemberForm = ({ initial, onSubmit, loading, onCancel }) => {
  const [name, setName]     = React.useState(initial?.name ?? "");
  const [color, setColor]   = React.useState(initial?.color ?? "gold");
  const [income, setIncome] = React.useState(initial ? String(parseFloat(initial.monthly_income)) : "");

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit({ name, color, monthlyIncome: income }); }}
      style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Input label="Nome" placeholder="ex: Rodrigo Souza" value={name} onChange={e => setName(e.target.value)} required />
      <Input label="Renda mensal (R$)" type="number" min="0" step="0.01" placeholder="0,00"
        value={income} onChange={e => setIncome(e.target.value)} />
      <div>
        <div className="a-overline" style={{ marginBottom: 8 }}>Cor</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {COLOR_OPTIONS_MEMBER.map(c => (
            <button key={c.value} type="button" onClick={() => setColor(c.value)} style={{
              width: 34, height: 34, borderRadius: 999, border: "none", cursor: "pointer",
              outline: color === c.value ? "3px solid var(--auriz-gold)" : "none", outlineOffset: 2 }}>
              <Avatar name={name || "?"} color={c.value} size={34} />
            </button>
          ))}
          <Avatar name={name || "?"} color={color} size={42} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <Button variant="ghost" type="button" onClick={onCancel}>Cancelar</Button>
        <Button variant="primary" type="submit" disabled={loading}
          trailing={loading ? <Spinner size={14}/> : null}>
          {loading ? "Salvando…" : "Salvar"}
        </Button>
      </div>
    </form>
  );
};

const AddMemberModal = ({ open, familyId, onClose, onSaved }) => {
  const [loading, setLoading] = React.useState(false);
  const handleSubmit = async (data) => {
    setLoading(true);
    try { await DB.addMember({ familyId, ...data }); onSaved(); }
    finally { setLoading(false); }
  };
  return (
    <Modal open={open} onClose={onClose} title="Adicionar membro">
      <MemberForm onSubmit={handleSubmit} loading={loading} onCancel={onClose} />
    </Modal>
  );
};

const EditMemberModal = ({ open, member, onClose, onSaved }) => {
  const [loading, setLoading] = React.useState(false);
  const handleSubmit = async (data) => {
    setLoading(true);
    try { await DB.updateMember(member.id, data); onSaved(); }
    finally { setLoading(false); }
  };
  if (!member) return null;
  return (
    <Modal open={open} onClose={onClose} title={`Editar — ${member.name}`}>
      <MemberForm initial={member} onSubmit={handleSubmit} loading={loading} onCancel={onClose} />
    </Modal>
  );
};

window.MembrosScreen = MembrosScreen;
