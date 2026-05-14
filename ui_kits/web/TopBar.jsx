/* eslint-disable */
const _MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

const TopBar = ({ month, year, onMonth, onAddTransaction, title, subtitle }) => (
  <header style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
    padding:'22px 36px 18px', background:'var(--paper)',
    borderBottom:'1px solid var(--hairline-soft)',
    position:'sticky', top:0, zIndex:10, backdropFilter:'blur(8px)' }}>
    <div>
      <h1 className="a-h1" style={{ margin:0, fontSize:32 }}>{title}</h1>
      {subtitle && <div style={{ fontSize:13, color:'var(--ink-3)', fontFamily:'var(--font-display)', marginTop:4 }}>{subtitle}</div>}
    </div>
    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
      <div style={{ display:'flex', alignItems:'center', gap:0,
        background:'#fff', border:'1px solid var(--hairline)', borderRadius:'var(--r-2)', padding:2 }}>
        <IconBtn onClick={()=>onMonth(-1)}><Icon.ChevronLeft size={16}/></IconBtn>
        <div style={{ padding:'0 12px', fontSize:13.5, fontWeight:500, display:'flex', alignItems:'center', gap:6, color:'var(--ink)' }}>
          <Icon.Calendar size={15}/>
          <span>{_MONTHS[month]} {year}</span>
        </div>
        <IconBtn onClick={()=>onMonth(1)}><Icon.ChevronRight size={16}/></IconBtn>
      </div>
      <button style={{ width:38, height:38, background:'#fff', border:'1px solid var(--hairline)',
        borderRadius:'var(--r-2)', display:'flex', alignItems:'center', justifyContent:'center',
        cursor:'pointer', color:'var(--ink-2)' }}>
        <Icon.Search size={16}/>
      </button>
      <button style={{ width:38, height:38, background:'#fff', border:'1px solid var(--hairline)',
        borderRadius:'var(--r-2)', display:'flex', alignItems:'center', justifyContent:'center',
        cursor:'pointer', color:'var(--ink-2)', position:'relative' }}>
        <Icon.Bell size={16}/>
        <span style={{ position:'absolute', top:8, right:9, width:6, height:6,
          background:'var(--terracotta)', borderRadius:999 }}/>
      </button>
      <Button variant="primary" onClick={onAddTransaction} leading={<Icon.Plus size={16}/>}>
        Adicionar
      </Button>
    </div>
  </header>
);

const IconBtn = ({ children, onClick }) => (
  <button onClick={onClick} style={{ width:28, height:28, background:'transparent', border:'none',
    borderRadius:'var(--r-1)', cursor:'pointer', color:'var(--ink-2)',
    display:'flex', alignItems:'center', justifyContent:'center' }}>
    {children}
  </button>
);

window.TopBar = TopBar;
