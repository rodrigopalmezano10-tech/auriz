/* eslint-disable */
const _MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

const TopBar = ({ month, year, onMonth, onAddTransaction, title, subtitle, familyId }) => {
  const [showNotif,  setShowNotif]  = React.useState(false);
  const [insight,    setInsight]    = React.useState(undefined); // undefined=não carregado, null=sem insight
  const [loadingN,   setLoadingN]   = React.useState(false);
  const ref = React.useRef(null);

  // Fecha o painel ao clicar fora
  React.useEffect(() => {
    if (!showNotif) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setShowNotif(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showNotif]);

  const toggleNotif = () => {
    const next = !showNotif;
    setShowNotif(next);
    // Carrega insight na primeira abertura
    if (next && familyId && insight === undefined) {
      setLoadingN(true);
      DB.getActiveInsight(familyId)
        .then(i => setInsight(i))
        .catch(() => setInsight(null))
        .finally(() => setLoadingN(false));
    }
  };

  const dismissInsight = async () => {
    if (!insight) return;
    await DB.dismissInsight(insight.id).catch(() => {});
    setInsight(null);
  };

  const hasDot = insight !== null && insight !== undefined;

  return (
    <header style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'22px 36px 18px', background:'var(--paper)',
      borderBottom:'1px solid var(--hairline-soft)',
      position:'sticky', top:0, zIndex:10, backdropFilter:'blur(8px)' }}>
      <div>
        <h1 className="a-h1" style={{ margin:0, fontSize:32 }}>{title}</h1>
        {subtitle && <div style={{ fontSize:13, color:'var(--ink-3)', fontFamily:'var(--font-display)', marginTop:4 }}>{subtitle}</div>}
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        {/* Navegador de mês */}
        <div style={{ display:'flex', alignItems:'center', gap:0,
          background:'#fff', border:'1px solid var(--hairline)', borderRadius:'var(--r-2)', padding:2 }}>
          <IconBtn onClick={()=>onMonth(-1)}><Icon.ChevronLeft size={16}/></IconBtn>
          <div style={{ padding:'0 12px', fontSize:13.5, fontWeight:500, display:'flex', alignItems:'center', gap:6, color:'var(--ink)' }}>
            <Icon.Calendar size={15}/>
            <span>{_MONTHS[month]} {year}</span>
          </div>
          <IconBtn onClick={()=>onMonth(1)}><Icon.ChevronRight size={16}/></IconBtn>
        </div>

        {/* Busca (placeholder) */}
        <button style={{ width:38, height:38, background:'#fff', border:'1px solid var(--hairline)',
          borderRadius:'var(--r-2)', display:'flex', alignItems:'center', justifyContent:'center',
          cursor:'pointer', color:'var(--ink-2)' }}>
          <Icon.Search size={16}/>
        </button>

        {/* Notificações */}
        <div ref={ref} style={{ position:'relative' }}>
          <button
            onClick={toggleNotif}
            style={{ width:38, height:38, background: showNotif ? 'var(--paper-deep)' : '#fff',
              border:'1px solid var(--hairline)', borderRadius:'var(--r-2)',
              display:'flex', alignItems:'center', justifyContent:'center',
              cursor:'pointer', color: showNotif ? 'var(--ink)' : 'var(--ink-2)', position:'relative' }}>
            <Icon.Bell size={16}/>
            {hasDot && (
              <span style={{ position:'absolute', top:8, right:9, width:6, height:6,
                background:'var(--terracotta)', borderRadius:999 }}/>
            )}
          </button>

          {showNotif && (
            <div style={{
              position:'absolute', top:'calc(100% + 8px)', right:0,
              width:320, background:'var(--paper)',
              border:'1px solid var(--hairline)', borderRadius:'var(--r-3)',
              boxShadow:'var(--shadow-3)', zIndex:100,
              animation:'auriz-in-up 180ms var(--ease-out)',
            }}>
              <div style={{ padding:'14px 18px 12px', borderBottom:'1px solid var(--hairline-soft)',
                display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ fontSize:13, fontWeight:600, color:'var(--ink)' }}>Notificações</span>
                <button onClick={()=>setShowNotif(false)} style={{ background:'transparent', border:'none',
                  cursor:'pointer', color:'var(--ink-3)', padding:2, display:'flex' }}>
                  <Icon.X size={14}/>
                </button>
              </div>

              <div style={{ padding:'12px 18px 16px' }}>
                {loadingN ? (
                  <div style={{ display:'flex', justifyContent:'center', padding:'12px 0' }}>
                    <Spinner size={20}/>
                  </div>
                ) : insight ? (
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8,
                      color:'var(--auriz-gold-deep)' }}>
                      <Icon.Sparkles size={13}/>
                      <span style={{ fontSize:11, fontWeight:600, letterSpacing:'0.05em',
                        textTransform:'uppercase' }}>Nota do Auriz</span>
                    </div>
                    <p style={{ fontFamily:'var(--font-display)', fontSize:14.5, lineHeight:1.45,
                      color:'var(--ink)', margin:'0 0 12px', letterSpacing:'-0.005em' }}>
                      {insight.content}
                    </p>
                    <button onClick={dismissInsight} style={{ background:'transparent', border:'none',
                      cursor:'pointer', color:'var(--ink-3)', fontSize:12, padding:0,
                      fontFamily:'var(--font-sans)' }}>
                      Dispensar
                    </button>
                  </div>
                ) : (
                  <div style={{ textAlign:'center', padding:'16px 0' }}>
                    <div style={{ width:40, height:40, borderRadius:999,
                      background:'var(--paper-deep)', display:'flex', alignItems:'center',
                      justifyContent:'center', margin:'0 auto 10px', color:'var(--ink-3)' }}>
                      <Icon.Bell size={18}/>
                    </div>
                    <div style={{ fontSize:13.5, fontWeight:500, color:'var(--ink-2)', marginBottom:4 }}>
                      Sem notificações
                    </div>
                    <div style={{ fontSize:12, color:'var(--ink-3)', fontFamily:'var(--font-display)' }}>
                      Tudo em ordem por aqui.
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <Button variant="primary" onClick={onAddTransaction} leading={<Icon.Plus size={16}/>}>
          Adicionar
        </Button>
      </div>
    </header>
  );
};

const IconBtn = ({ children, onClick }) => (
  <button onClick={onClick} style={{ width:28, height:28, background:'transparent', border:'none',
    borderRadius:'var(--r-1)', cursor:'pointer', color:'var(--ink-2)',
    display:'flex', alignItems:'center', justifyContent:'center' }}>
    {children}
  </button>
);

window.TopBar = TopBar;
