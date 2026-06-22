/* eslint-disable */
// Auriz — Lucide-style icon set, inlined as React components.
// All icons use stroke 1.5, currentColor, 24x24 viewBox. Match Lucide names.

const _I = (path) => (props) => (
  <svg
    viewBox="0 0 24 24"
    width={props.size || 18}
    height={props.size || 18}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    {path}
  </svg>
);

const Icon = {
  // Navigation
  Home:        _I(<><path d="M3 12 12 3l9 9"/><path d="M5 10v10h14V10"/></>),
  LayoutDashboard: _I(<><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></>),
  Users:       _I(<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>),
  CreditCard:  _I(<><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></>),
  Wallet:      _I(<><path d="M20 12V8H6a2 2 0 0 1 0-4h12v4"/><path d="M20 12v8H6a2 2 0 0 1-2-2V6"/><circle cx="17" cy="14" r="1.2" fill="currentColor"/></>),
  PiggyBank:   _I(<><path d="M19 5a4 4 0 0 0-3-1c-1.5 0-3 .5-4 1.5C10 4.5 8.5 4 7 4a5 5 0 0 0-5 5c0 2 1 4 3 5v3h3v-2h6v2h3v-3a6 6 0 0 0 3-5c0-1-.4-2-1-3Z"/><circle cx="6" cy="9" r=".8" fill="currentColor"/></>),
  Target:      _I(<><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></>),
  Tag:         _I(<><path d="M20.59 13.41 12 22l-9-9V3h10l8.59 8.59a2 2 0 0 1 0 2.82Z"/><circle cx="7.5" cy="7.5" r="1.5" fill="currentColor"/></>),
  TrendingUp:  _I(<><path d="m3 17 6-6 4 4 8-8"/><path d="M21 9V3h-6"/></>),
  TrendingDown:_I(<><path d="m3 7 6 6 4-4 8 8"/><path d="M21 15v6h-6"/></>),
  Sparkles:    _I(<><path d="m12 3 1.7 4.6L18 9l-4.3 1.4L12 15l-1.7-4.6L6 9l4.3-1.4L12 3Z"/><path d="M5 17l.8 2L8 20l-2.2 1L5 23l-.8-2L2 20l2.2-1L5 17Z"/></>),
  Lightbulb:   _I(<><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-1 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1.3.5 2.5 1.5 3.5.8.8 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></>),
  // UI
  Plus:        _I(<><path d="M12 5v14M5 12h14"/></>),
  Search:      _I(<><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></>),
  ChevronDown: _I(<><path d="m6 9 6 6 6-6"/></>),
  ChevronRight:_I(<><path d="m9 18 6-6-6-6"/></>),
  ChevronLeft: _I(<><path d="m15 18-6-6 6-6"/></>),
  ArrowRight:  _I(<><path d="M5 12h14M13 5l7 7-7 7"/></>),
  ArrowUpRight:_I(<><path d="M7 17 17 7M7 7h10v10"/></>),
  X:           _I(<><path d="M18 6 6 18M6 6l12 12"/></>),
  Check:       _I(<><path d="M20 6 9 17l-5-5"/></>),
  Calendar:    _I(<><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></>),
  Filter:      _I(<><path d="M22 3H2l8 9.5V19l4 2v-8.5L22 3Z"/></>),
  Menu:        _I(<><path d="M4 6h16M4 12h16M4 18h16"/></>),
  Settings:    _I(<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.4.6 1 1 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></>),
  MoreH:       _I(<><circle cx="6" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="18" cy="12" r="1" fill="currentColor"/></>),
  Bell:        _I(<><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></>),
  // Category-flavored
  ShoppingCart:_I(<><circle cx="9" cy="20" r="1"/><circle cx="17" cy="20" r="1"/><path d="M2 2h2l3 14h13l3-9H6"/></>),
  Dumbbell:    _I(<><path d="m14.4 14.4-4.8-4.8m4.8 4.8L9.6 9.6M3 12l3 3 3-3-3-3-3 3Zm12 0 3 3 3-3-3-3-3 3Z"/></>),
  Shirt:       _I(<><path d="m20.4 14.5-4.4-4.5L4 20"/><path d="M10 4v4l4 4-4 4-4-4 4-4V4"/></>),
  HeartPulse:  _I(<><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></>),
  Car:         _I(<><path d="M14 16H9m10 0h2v-3.34a4 4 0 0 0-1.16-2.82l-2.4-2.4A4 4 0 0 0 14.62 6.34H10c-.99 0-1.95.31-2.74.88L4 9.96M3 16h2"/><circle cx="6.5" cy="16.5" r="2.5"/><circle cx="16.5" cy="16.5" r="2.5"/></>),
  Monitor:     _I(<><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8m-4-4v4"/></>),
  // Misc
  LogOut:          _I(<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></>),
  ShieldCheck:     _I(<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></>),
  Edit:            _I(<><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z"/></>),
  Trash:           _I(<><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></>),
  Trash2:          _I(<><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></>),
  Send:            _I(<><path d="m22 2-7 20-4-9-9-4 20-7Z"/></>),
  Upload:          _I(<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></>),
  AlertCircle:     _I(<><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>),
  CheckCircle:     _I(<><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>),
  FileSpreadsheet: _I(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></>),
  UserCheck:       _I(<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></>),
  PlusCircle:      _I(<><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></>),
  UserPlus:        _I(<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></>),
  UserX:           _I(<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="17" y1="8" x2="23" y2="14"/><line x1="23" y1="8" x2="17" y2="14"/></>),
};

window.Icon = Icon;
