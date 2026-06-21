/* eslint-disable */
// Auriz — Sidebar (app shell left rail)

const NAV_ITEMS = [
  { id: "hoje",         label: "Hoje",          icon: "Home" },
  { id: "transacoes",   label: "Transações",    icon: "CreditCard" },
  { id: "dashboard",    label: "Dashboard",     icon: "LayoutDashboard" },
  { id: "economias",    label: "Economias",     icon: "PiggyBank" },
  { id: "metas",        label: "Metas",         icon: "Target" },
  { id: "categorias",   label: "Categorias",    icon: "Tag" },
  { id: "teto",         label: "Teto de gastos", icon: "TrendingUp" },
  { id: "membros",      label: "Membros",       icon: "Users" },
];

const NAV_ADMIN = [
  { id: "usuarios",     label: "Usuários",      icon: "ShieldCheck" },
];

const Sidebar = ({ active, onNav, viewMember, onViewMember, members, onLogout }) => {
  return (
    <aside style={{
      width: 248,
      background: "var(--paper)",
      borderRight: "1px solid var(--hairline)",
      display: "flex", flexDirection: "column",
      padding: "20px 14px",
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: "4px 8px 22px" }}>
        <Logo height={28} />
      </div>

      {/* View switcher (Auriz signature: who am I looking at) */}
      <div style={{ padding: "0 4px 14px" }}>
        <div className="a-overline" style={{ marginBottom: 8, padding: "0 4px" }}>Visualizar</div>
        <div style={{
          display: "flex", gap: 4,
          background: "var(--paper-deep)",
          padding: 3, borderRadius: 999,
          fontSize: 13,
        }}>
          <ViewPill active={viewMember === "all"} onClick={() => onViewMember && onViewMember("all")}>Família</ViewPill>
          {members.map(m => (
            <ViewPill key={m.id} active={viewMember === m.id} onClick={() => onViewMember && onViewMember(m.id)}>
              {m.name.split(" ")[0]}
            </ViewPill>
          ))}
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
        {NAV_ITEMS.map(item => {
          const isActive = active === item.id;
          const IconEl = Icon[item.icon];
          return (
            <button
              key={item.id}
              onClick={() => onNav(item.id)}
              style={{
                display: "flex", alignItems: "center", gap: 11,
                padding: "9px 12px",
                background: isActive ? "var(--surface)" : "transparent",
                border: "1px solid",
                borderColor: isActive ? "var(--hairline)" : "transparent",
                borderRadius: "var(--r-2)",
                fontFamily: "var(--font-sans)",
                fontWeight: isActive ? 500 : 400,
                fontSize: 14,
                color: isActive ? "var(--ink)" : "var(--ink-2)",
                cursor: "pointer", textAlign: "left",
                transition: "all var(--dur-base) var(--ease-out)",
                boxShadow: isActive ? "var(--shadow-1)" : "none",
              }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "var(--paper-deep)"; }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
            >
              <span style={{ color: isActive ? "var(--auriz-gold-deep)" : "var(--ink-3)", display: "flex" }}>
                <IconEl size={17} />
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Admin nav */}
      <div style={{ margin: "12px 0 4px", padding: "0 4px" }}>
        <div className="a-overline" style={{ marginBottom: 6, padding: "0 8px", fontSize: 10 }}>Admin</div>
        {NAV_ADMIN.map(item => {
          const isActive = active === item.id;
          const IconEl = Icon[item.icon];
          return (
            <button
              key={item.id}
              onClick={() => onNav(item.id)}
              style={{
                display: "flex", alignItems: "center", gap: 11,
                padding: "9px 12px", width: "100%",
                background: isActive ? "var(--auriz-gold-soft)" : "transparent",
                border: "1px solid",
                borderColor: isActive ? "var(--auriz-gold)" : "transparent",
                borderRadius: "var(--r-2)",
                fontFamily: "var(--font-sans)",
                fontWeight: isActive ? 500 : 400,
                fontSize: 14,
                color: isActive ? "var(--auriz-gold-deep)" : "var(--ink-2)",
                cursor: "pointer", textAlign: "left",
                transition: "all var(--dur-base) var(--ease-out)",
              }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "var(--auriz-gold-soft)"; }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
            >
              <span style={{ color: isActive ? "var(--auriz-gold-deep)" : "var(--ink-3)", display: "flex" }}>
                <IconEl size={17} />
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Footer: AI chat + user */}
      <div style={{ padding: "12px 4px 0", borderTop: "1px solid var(--hairline-soft)", marginTop: 12 }}>
        <button style={{
          display: "flex", alignItems: "center", gap: 10, width: "100%",
          padding: "9px 10px", background: "var(--auriz-gold-soft)",
          border: "1px solid var(--auriz-gold)",
          borderRadius: "var(--r-2)",
          fontSize: 13, fontWeight: 500, color: "var(--auriz-gold-deep)", cursor: "pointer",
          fontFamily: "var(--font-sans)",
        }}>
          <Icon.Sparkles size={16} />
          <span>Pergunte ao Auriz</span>
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 6px 0" }}>
          <Avatar name="Rodrigo" color="gold" size={32} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>Rodrigo</div>
            <div style={{ fontSize: 11, color: "var(--ink-3)", fontFamily: "var(--font-display)" }}>Família Souza</div>
          </div>
          <button onClick={onLogout} style={{
            background: "transparent", border: "none", cursor: "pointer",
            color: "var(--ink-3)", padding: 4, display: "flex",
          }} title="Sair">
            <Icon.LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
};

const ViewPill = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    style={{
      flex: 1, padding: "5px 10px",
      background: active ? "var(--surface)" : "transparent",
      border: "1px solid",
      borderColor: active ? "var(--hairline)" : "transparent",
      borderRadius: 999,
      fontSize: 12.5, fontWeight: active ? 500 : 400,
      color: active ? "var(--ink)" : "var(--ink-2)",
      cursor: "pointer",
      fontFamily: "var(--font-sans)",
      boxShadow: active ? "var(--shadow-1)" : "none",
      transition: "all var(--dur-base) var(--ease-out)",
    }}
  >
    {children}
  </button>
);

window.Sidebar = Sidebar;
