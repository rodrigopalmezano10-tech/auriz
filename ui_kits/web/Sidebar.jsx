/* eslint-disable */
// Auriz — Sidebar

const NAV_GROUPS = [
  {
    label: null,
    items: [
      { id: "hoje",       label: "Hoje",         icon: "Home" },
      { id: "transacoes", label: "Transações",   icon: "CreditCard" },
    ],
  },
  {
    label: "Análise",
    items: [
      { id: "dashboard",  label: "Dashboard",    icon: "LayoutDashboard" },
      { id: "economias",  label: "Economias",    icon: "PiggyBank" },
      { id: "metas",      label: "Metas",        icon: "Target" },
    ],
  },
  {
    label: "Configurar",
    items: [
      { id: "categorias", label: "Categorias",   icon: "Tag" },
      { id: "teto",       label: "Teto de gastos", icon: "TrendingUp" },
      { id: "membros",    label: "Membros",      icon: "Users" },
    ],
  },
];

const NAV_ADMIN = [{ id: "usuarios", label: "Usuários", icon: "ShieldCheck" }];

const Sidebar = ({ active, onNav, viewMember, onViewMember, members, onLogout }) => (
  <aside style={{
    width: 236, background: "var(--surface)",
    borderRight: "1px solid var(--hairline)",
    display: "flex", flexDirection: "column",
    paddingTop: 22, paddingBottom: 20,
    flexShrink: 0, overflow: "hidden",
  }}>
    {/* Logo */}
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 20px 22px" }}>
      <div style={{
        width: 30, height: 30, background: "var(--auriz-gold)",
        borderRadius: "var(--r-2)", display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 2px 8px rgba(200,155,92,.35)", flexShrink: 0,
      }}>
        <Logo height={14} />
      </div>
      <span style={{ fontFamily: "var(--font-sans)", fontSize: 17, fontWeight: 700, letterSpacing: "-0.4px", color: "var(--ink)" }}>
        Auriz
      </span>
    </div>

    {/* View switcher */}
    <div style={{ padding: "0 14px 14px" }}>
      <div className="a-overline" style={{ marginBottom: 7, padding: "0 6px" }}>Visualizar</div>
      <div style={{ display: "flex", gap: 4, background: "var(--paper-deep)", padding: 3, borderRadius: 999, fontSize: 13 }}>
        <ViewPill active={viewMember === "all"} onClick={() => onViewMember("all")}>Família</ViewPill>
        {members.map(m => (
          <ViewPill key={m.id} active={viewMember === m.id} onClick={() => onViewMember(m.id)}>
            {m.name.split(" ")[0]}
          </ViewPill>
        ))}
      </div>
    </div>

    {/* Nav */}
    <nav style={{ flex: 1, overflowY: "auto" }}>
      {NAV_GROUPS.map((group, gi) => (
        <div key={gi} style={{ marginBottom: 4 }}>
          {group.label && (
            <div className="a-overline" style={{ padding: "10px 20px 4px", fontSize: 10, color: "var(--ink-3)" }}>
              {group.label}
            </div>
          )}
          {group.items.map(item => {
            const isActive = active === item.id;
            const IconEl = Icon[item.icon];
            return (
              <NavBtn key={item.id} isActive={isActive} onClick={() => onNav(item.id)}>
                <span style={{ color: isActive ? "var(--auriz-gold)" : "var(--ink-3)", display: "flex", flexShrink: 0 }}>
                  <IconEl size={17} />
                </span>
                {item.label}
              </NavBtn>
            );
          })}
        </div>
      ))}
    </nav>

    {/* Admin */}
    <div style={{ margin: "6px 0 4px", padding: "0 0 0 0" }}>
      <div className="a-overline" style={{ padding: "8px 20px 4px", fontSize: 10, color: "var(--ink-3)" }}>Admin</div>
      {NAV_ADMIN.map(item => {
        const isActive = active === item.id;
        const IconEl = Icon[item.icon];
        return (
          <NavBtn key={item.id} isActive={isActive} onClick={() => onNav(item.id)}>
            <span style={{ color: isActive ? "var(--auriz-gold)" : "var(--ink-3)", display: "flex", flexShrink: 0 }}>
              <IconEl size={17} />
            </span>
            {item.label}
          </NavBtn>
        );
      })}
    </div>

    {/* Footer */}
    <div style={{ padding: "12px 14px 0", borderTop: "1px solid var(--hairline-soft)", marginTop: 8 }}>
      <button
        style={{
          display: "flex", alignItems: "center", gap: 8, width: "100%",
          padding: "10px 14px", background: "var(--ink)", border: "none",
          borderRadius: "var(--r-3)", fontSize: 13, fontWeight: 500,
          color: "var(--paper)", cursor: "pointer", fontFamily: "var(--font-sans)",
          transition: "opacity .12s",
        }}
        onMouseEnter={e => e.currentTarget.style.opacity = "0.82"}
        onMouseLeave={e => e.currentTarget.style.opacity = "1"}
      >
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--auriz-gold)", flexShrink: 0 }} />
        <Icon.Sparkles size={14} />
        Pergunte ao Auriz
      </button>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 6px 0" }}>
        <Avatar name="Rodrigo" color="gold" size={30} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>Rodrigo</div>
          <div style={{ fontSize: 11, color: "var(--ink-3)", fontFamily: "var(--font-display)" }}>Família Souza</div>
        </div>
        <button onClick={onLogout} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--ink-3)", padding: 4, display: "flex" }} title="Sair">
          <Icon.LogOut size={16} />
        </button>
      </div>
    </div>
  </aside>
);

const NavBtn = ({ isActive, onClick, children }) => (
  <button
    onClick={onClick}
    style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "9px 20px", width: "100%",
      background: isActive ? "var(--auriz-gold-soft)" : "transparent",
      border: "none",
      borderLeft: `3px solid ${isActive ? "var(--auriz-gold)" : "transparent"}`,
      fontFamily: "var(--font-sans)", fontWeight: isActive ? 600 : 400,
      fontSize: 14, color: isActive ? "var(--auriz-gold-deep)" : "var(--ink-2)",
      cursor: "pointer", textAlign: "left", transition: "all .12s ease",
    }}
    onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = "var(--paper-deep)"; e.currentTarget.style.color = "var(--ink)"; }}}
    onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--ink-2)"; }}}
  >
    {children}
  </button>
);

const ViewPill = ({ active, onClick, children }) => (
  <button onClick={onClick} style={{
    flex: 1, padding: "5px 10px",
    background: active ? "var(--surface)" : "transparent",
    border: `1px solid ${active ? "var(--hairline)" : "transparent"}`,
    borderRadius: 999, fontSize: 12.5, fontWeight: active ? 500 : 400,
    color: active ? "var(--ink)" : "var(--ink-2)",
    cursor: "pointer", fontFamily: "var(--font-sans)",
    boxShadow: active ? "var(--shadow-1)" : "none",
    transition: "all .12s ease",
  }}>
    {children}
  </button>
);

window.Sidebar = Sidebar;
