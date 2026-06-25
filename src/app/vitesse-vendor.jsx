import { useState, useEffect, useRef } from "react";

// ─── PALETTE ───────────────────────────────────────────────────────────────
const C = {
  bg:      "#1A1108",
  surface: "#241A0E",
  card:    "#2D2010",
  border:  "#3D2E18",
  orange:  "#F5900A",
  orangeD: "#C97308",
  orangeL: "#FDB340",
  text:    "#F0E6D3",
  muted:   "#9A8060",
  green:   "#2ECC71",
  red:     "#E74C3C",
  yellow:  "#F39C12",
};

// ─── SCORE COLOR ──────────────────────────────────────────────────────────
function scoreColor(score) {
  if (score >= 80) return C.green;
  if (score >= 60) return "#A8D800";
  if (score >= 40) return C.yellow;
  if (score >= 20) return "#E67E22";
  return C.red;
}
function scoreLabel(score) {
  if (score >= 80) return "STABLE";
  if (score >= 60) return "MOYEN";
  if (score >= 40) return "RISQUÉ";
  return "URGENT";
}

// ─── INITIAL DATA ─────────────────────────────────────────────────────────
const INIT_PRODUCTS = [
  { id: 1, name: "Baguette",       price: 200,   stock: 42, icon: "🥖" },
  { id: 2, name: "Lait Bonnet",    price: 550,   stock: 15, icon: "🥛" },
  { id: 3, name: "Sucre Roux",     price: 850,   stock: 8,  icon: "🍬" },
  { id: 4, name: "Café Touba",     price: 100,   stock: 124,icon: "☕" },
  { id: 5, name: "Huile Dinor 5L", price: 6500,  stock: 4,  icon: "🛢️" },
];

const INIT_CLIENTS = [
  { id: 1, name: "Moussa Traoré",  phone: "+237 690 111 222", score: 32,  lastPayment: "12 Oct", totalDebt: 85000, dueDate: "2024-10-05" },
  { id: 2, name: "Fatou Diop",     phone: "+237 691 333 444", score: 94,  lastPayment: "Hier",   totalDebt: 12500, dueDate: "2024-10-26" },
  { id: 3, name: "Bakary Koné",    phone: "+237 692 555 666", score: 58,  lastPayment: "05 Oct", totalDebt: 45000, dueDate: "2024-10-20" },
  { id: 4, name: "Idrissa Sow",    phone: "+237 693 777 888", score: 71,  lastPayment: "18 Oct", totalDebt: 21700, dueDate: "2024-10-30" },
];

const INIT_VENTES = [
  { id: 1, product: "Baguette",    qty: 3, total: 600,   type: "cash",   date: "24 Oct 08:12" },
  { id: 2, product: "Café Touba",  qty: 5, total: 500,   type: "crédit", date: "24 Oct 09:30", client: "Fatou Diop" },
  { id: 3, product: "Lait Bonnet", qty: 2, total: 1100,  type: "cash",   date: "24 Oct 10:05" },
];

const INIT_MEMBRES = [
  { id: 1, name: "Amadou Diallo",   role: "Vendeur", ventes: 12450, bail: "18:00", active: true,  avatar: "👨🏿" },
  { id: 2, name: "Fatou Kone",      role: "Vendeur", ventes: 2750,  bail: "Expiré", active: false, avatar: "👩🏾" },
  { id: 3, name: "Ibrahim Sissoko", role: "Vendeur", ventes: 0,     bail: "20:30", active: true,  avatar: "👨🏽" },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────
function fmt(n) { return n.toLocaleString("fr-FR"); }

function ScoreBadge({ score, size = 44 }) {
  const col = scoreColor(score);
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      border: `3px solid ${col}`, display: "flex", alignItems: "center",
      justifyContent: "center", color: col, fontWeight: 700,
      fontSize: size * 0.32, flexShrink: 0
    }}>{score}</div>
  );
}

function StatusChip({ label, color }) {
  return (
    <span style={{
      background: color + "22", color, border: `1px solid ${color}44`,
      borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 700,
      letterSpacing: 0.5
    }}>{label}</span>
  );
}

function NavBar({ tab, setTab }) {
  const tabs = [
    { id: "ventes",  icon: "🧾", label: "Ventes" },
    { id: "dettes",  icon: "📋", label: "Dettes" },
    { id: "stock",   icon: "📦", label: "Stock" },
    { id: "groupes", icon: "👥", label: "Groupes" },
    { id: "profil",  icon: "👤", label: "Profil" },
  ];
  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0,
      maxWidth: 430, margin: "0 auto",
      background: C.surface, borderTop: `1px solid ${C.border}`,
      display: "flex", zIndex: 100
    }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => setTab(t.id)} style={{
          flex: 1, padding: "10px 4px 8px", background: "none", border: "none",
          cursor: "pointer", display: "flex", flexDirection: "column",
          alignItems: "center", gap: 2
        }}>
          <div style={{
            width: 40, height: 36, borderRadius: 18,
            background: tab === t.id ? C.orange : "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, transition: "background 0.2s"
          }}>{t.icon}</div>
          <span style={{
            fontSize: 10, color: tab === t.id ? C.orange : C.muted,
            fontWeight: tab === t.id ? 700 : 400
          }}>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

function TopBar({ children }) {
  return (
    <div style={{
      padding: "14px 16px 10px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      borderBottom: `1px solid ${C.border}`
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 22, color: C.orange }}>☰</span>
        <span style={{ color: C.orange, fontWeight: 700, fontSize: 16 }}>
          24 Oct | <span style={{ color: C.green }}>+15,200 FCFA</span>
        </span>
      </div>
      {children}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// AUTH SCREENS
// ══════════════════════════════════════════════════════════════════════════
function LoginScreen({ onLogin, onGoRegister }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);

  return (
    <div style={{
      minHeight: "100vh", background: `radial-gradient(ellipse at top, #2D1A05 0%, ${C.bg} 60%)`,
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "24px 20px", fontFamily: "'Segoe UI', sans-serif"
    }}>
      <div style={{ marginBottom: 16, background: C.orange, borderRadius: 18, padding: 14 }}>
        <span style={{ fontSize: 32 }}>⚡</span>
      </div>
      <h1 style={{ color: C.text, fontSize: 28, fontWeight: 800, margin: "0 0 6px" }}>Vitesse Vendor</h1>
      <p style={{ color: C.muted, margin: "0 0 32px", textAlign: "center" }}>
        Gérez vos ventes et stocks en toute simplicité.
      </p>

      <div style={{
        width: "100%", maxWidth: 360, background: C.surface,
        borderRadius: 20, padding: 24, border: `1px solid ${C.border}`
      }}>
        <label style={{ color: C.muted, fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>
          UTILISATEUR / TÉLÉPHONE
        </label>
        <div style={{ background: C.card, borderRadius: 10, padding: "12px 14px", margin: "8px 0 16px", display: "flex", gap: 10, border: `1px solid ${C.border}` }}>
          <span style={{ color: C.muted }}>👤</span>
          <input value={user} onChange={e => setUser(e.target.value)}
            placeholder="Nom ou 07..." style={{ background: "none", border: "none", color: C.text, flex: 1, outline: "none", fontSize: 15 }} />
        </div>

        <label style={{ color: C.muted, fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>
          MOT DE PASSE
        </label>
        <div style={{ background: C.card, borderRadius: 10, padding: "12px 14px", margin: "8px 0 20px", display: "flex", gap: 10, border: `1px solid ${C.border}` }}>
          <span style={{ color: C.muted }}>🔒</span>
          <input type={showPass ? "text" : "password"} value={pass} onChange={e => setPass(e.target.value)}
            placeholder="••••••••" style={{ background: "none", border: "none", color: C.text, flex: 1, outline: "none", fontSize: 15 }} />
          <span style={{ color: C.muted, cursor: "pointer" }} onClick={() => setShowPass(!showPass)}>
            {showPass ? "🙈" : "👁️"}
          </span>
        </div>

        <button onClick={onLogin} style={{
          width: "100%", padding: "15px", background: C.orange, border: "none",
          borderRadius: 12, color: "#1A0A00", fontWeight: 800, fontSize: 16,
          cursor: "pointer", letterSpacing: 0.5
        }}>Connexion →</button>

        <p style={{ textAlign: "center", color: C.orange, margin: "16px 0 0", fontSize: 13, cursor: "pointer" }}>
          Mot de passe oublié ?
        </p>
      </div>

      <p style={{ color: C.muted, margin: "20px 0 12px", fontSize: 14 }}>
        Pas encore de compte ?{" "}
        <span style={{ color: C.green, fontWeight: 700, cursor: "pointer" }} onClick={onGoRegister}>
          S'inscrire
        </span>
      </p>

      <div style={{ display: "flex", gap: 10, width: "100%", maxWidth: 360 }}>
        {["🔵 Google", "📱 WhatsApp"].map(t => (
          <button key={t} style={{
            flex: 1, padding: "12px", background: C.card, border: `1px solid ${C.border}`,
            borderRadius: 10, color: C.text, cursor: "pointer", fontSize: 13
          }}>{t}</button>
        ))}
      </div>

      <p style={{ color: C.muted, fontSize: 11, margin: "20px 0 0", letterSpacing: 1 }}>
        🛡 SÉCURISÉ PAR VITESSE LEDGER PRO
      </p>
    </div>
  );
}

function RegisterScreen({ onRegister, onGoLogin }) {
  const [role, setRole] = useState("vendeur");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);

  return (
    <div style={{
      minHeight: "100vh", background: `radial-gradient(ellipse at top, #2D1A05 0%, ${C.bg} 60%)`,
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "flex-start", padding: "40px 20px", fontFamily: "'Segoe UI', sans-serif"
    }}>
      <div style={{ marginBottom: 14, background: C.orange, borderRadius: 50, width: 64, height: 64, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 28 }}>🏪</span>
      </div>
      <h1 style={{ color: C.text, fontSize: 26, fontWeight: 800, margin: "0 0 6px" }}>Vitesse Vendor</h1>
      <p style={{ color: C.muted, margin: "0 0 24px", textAlign: "center" }}>
        Créez votre compte pour commencer à vendre.
      </p>

      <div style={{
        width: "100%", maxWidth: 360, background: C.surface,
        borderRadius: 20, padding: 24, border: `1px solid ${C.border}`
      }}>
        <div style={{ display: "flex", background: C.card, borderRadius: 10, padding: 4, marginBottom: 20, border: `1px solid ${C.border}` }}>
          {["vendeur", "patron"].map(r => (
            <button key={r} onClick={() => setRole(r)} style={{
              flex: 1, padding: "10px", borderRadius: 8, border: "none",
              background: role === r ? C.orange : "transparent",
              color: role === r ? "#1A0A00" : C.muted,
              fontWeight: role === r ? 700 : 400, cursor: "pointer", fontSize: 14
            }}>Je suis un {r}</button>
          ))}
        </div>

        {[
          { label: "Nom complet", icon: "👤", val: name, set: setName, ph: "Ex: Jean Dupont", type: "text" },
          { label: "Numéro de téléphone", icon: "📞", val: phone, set: setPhone, ph: "+237 ...", type: "tel" },
        ].map(f => (
          <div key={f.label} style={{ marginBottom: 16 }}>
            <label style={{ color: C.text, fontSize: 13, fontWeight: 500 }}>{f.label}</label>
            <div style={{ background: C.card, borderRadius: 10, padding: "12px 14px", marginTop: 6, display: "flex", gap: 10, border: `1px solid ${C.border}` }}>
              <span style={{ color: C.muted }}>{f.icon}</span>
              <input value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph} type={f.type}
                style={{ background: "none", border: "none", color: C.text, flex: 1, outline: "none", fontSize: 15 }} />
            </div>
          </div>
        ))}

        <div style={{ marginBottom: 20 }}>
          <label style={{ color: C.text, fontSize: 13, fontWeight: 500 }}>Mot de passe</label>
          <div style={{ background: C.card, borderRadius: 10, padding: "12px 14px", marginTop: 6, display: "flex", gap: 10, border: `1px solid ${C.border}` }}>
            <span style={{ color: C.muted }}>🔒</span>
            <input type={showPass ? "text" : "password"} value={pass} onChange={e => setPass(e.target.value)}
              placeholder="••••••••" style={{ background: "none", border: "none", color: C.text, flex: 1, outline: "none", fontSize: 15 }} />
            <span style={{ color: C.muted, cursor: "pointer" }} onClick={() => setShowPass(!showPass)}>
              {showPass ? "🙈" : "👁️"}
            </span>
          </div>
        </div>

        <button onClick={onRegister} style={{
          width: "100%", padding: "15px", background: C.orange, border: "none",
          borderRadius: 12, color: "#1A0A00", fontWeight: 800, fontSize: 16, cursor: "pointer"
        }}>Créer mon compte →</button>

        <p style={{ textAlign: "center", color: C.muted, margin: "16px 0 0", fontSize: 14 }}>
          Déjà un compte ?{" "}
          <span style={{ color: C.orange, fontWeight: 700, cursor: "pointer" }} onClick={onGoLogin}>
            Se connecter
          </span>
        </p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// VENTES SCREEN
// ══════════════════════════════════════════════════════════════════════════
function VentesScreen({ products, setProducts, ventes, setVentes, clients, setClients }) {
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState(null); // { product, qty }
  const [showCredit, setShowCredit] = useState(false);
  const [creditClient, setCreditClient] = useState("");
  const [creditPhone, setCreditPhone] = useState("");
  const [creditDue, setCreditDue] = useState("");
  const [selectedClient, setSelectedClient] = useState(null);
  const [toast, setToast] = useState(null);

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  function showToast(msg, color = C.green) {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 2500);
  }

  function handleSelect(p) {
    setCart({ product: p, qty: 1 });
    setShowCredit(false);
    setSelectedClient(null);
  }

  function handleCash() {
    if (!cart) return;
    const v = {
      id: Date.now(), product: cart.product.name,
      qty: cart.qty, total: cart.product.price * cart.qty,
      type: "cash", date: new Date().toLocaleString("fr-FR").slice(0, 16)
    };
    setVentes(prev => [v, ...prev]);
    setProducts(prev => prev.map(p =>
      p.id === cart.product.id ? { ...p, stock: p.stock - cart.qty } : p
    ));
    setCart(null);
    showToast(`✅ Vente enregistrée : ${fmt(v.total)} FCFA`);
  }

  function handleCredit() {
    setShowCredit(true);
  }

  function confirmCredit() {
    if (!cart) return;
    const total = cart.product.price * cart.qty;
    let clientObj;

    if (selectedClient) {
      clientObj = selectedClient;
      setClients(prev => prev.map(c =>
        c.id === selectedClient.id ? { ...c, totalDebt: c.totalDebt + total } : c
      ));
    } else {
      clientObj = {
        id: Date.now(), name: creditClient, phone: creditPhone,
        score: 100, lastPayment: "—", totalDebt: total, dueDate: creditDue
      };
      setClients(prev => [...prev, clientObj]);
    }

    const v = {
      id: Date.now(), product: cart.product.name,
      qty: cart.qty, total, type: "crédit",
      date: new Date().toLocaleString("fr-FR").slice(0, 16),
      client: clientObj.name
    };
    setVentes(prev => [v, ...prev]);
    setProducts(prev => prev.map(p =>
      p.id === cart.product.id ? { ...p, stock: p.stock - cart.qty } : p
    ));
    setCart(null); setShowCredit(false);
    setCreditClient(""); setCreditPhone(""); setCreditDue("");
    setSelectedClient(null);
    showToast(`📋 Crédit enregistré : ${fmt(total)} FCFA`, C.yellow);
  }

  return (
    <div style={{ paddingBottom: 80 }}>
      <TopBar>
        <span style={{ color: C.muted, fontSize: 20 }}>📊</span>
      </TopBar>

      <div style={{ padding: "14px 14px 8px" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1, background: C.surface, borderRadius: 10, padding: "10px 12px", display: "flex", gap: 8, border: `1px solid ${C.border}` }}>
            <span style={{ color: C.muted }}>🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un produit..." style={{ background: "none", border: "none", color: C.text, flex: 1, outline: "none", fontSize: 14 }} />
          </div>
          <div style={{ background: C.surface, borderRadius: 10, padding: "10px 12px", border: `1px solid ${C.border}` }}>
            <span style={{ color: C.muted }}>⚙️</span>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: "0 14px" }}>
        {filtered.map(p => {
          const low = p.stock <= 5;
          return (
            <div key={p.id} onClick={() => handleSelect(p)} style={{
              background: cart?.product.id === p.id ? C.orangeD + "33" : C.surface,
              borderRadius: 14, padding: "14px 12px", cursor: "pointer",
              border: `1px solid ${cart?.product.id === p.id ? C.orange : C.border}`,
              transition: "all 0.15s", gridColumn: p.id === 5 ? "1 / -1" : undefined,
              display: p.id === 5 ? "flex" : "block", alignItems: "center", gap: 12
            }}>
              {p.id === 5 ? (
                <>
                  <div style={{ background: C.orange, borderRadius: 10, width: 42, height: 42, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                    {p.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: C.text, fontWeight: 700, fontSize: 14 }}>{p.name}</div>
                    <div style={{ color: C.orange, fontWeight: 700, fontSize: 13 }}>{fmt(p.price)} FCFA</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ color: C.muted, fontSize: 11 }}>Stock</div>
                    <div style={{ color: low ? C.red : C.green, fontWeight: 700, fontSize: 16 }}>{p.stock}</div>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <span style={{ fontSize: 20 }}>{p.icon}</span>
                    <span style={{ color: low ? C.red : C.green, fontWeight: 700, fontSize: 14 }}>{p.stock}</span>
                  </div>
                  <div style={{ marginTop: 24, color: C.text, fontWeight: 700, fontSize: 14 }}>{p.name}</div>
                  <div style={{ color: C.orange, fontWeight: 700, fontSize: 13 }}>{fmt(p.price)} FCFA</div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Cart bar */}
      {cart && !showCredit && (
        <div style={{
          position: "fixed", bottom: 70, left: 0, right: 0, maxWidth: 430, margin: "0 auto",
          background: C.card, borderTop: `1px solid ${C.border}`, padding: "12px 16px"
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ background: C.orange, borderRadius: 20, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", color: "#1A0A00", fontWeight: 700 }}>
                {cart.qty}
              </div>
              <div>
                <div style={{ color: C.text, fontWeight: 700, fontSize: 14 }}>{cart.product.name}</div>
                <div style={{ color: C.muted, fontSize: 12 }}>{fmt(cart.product.price * cart.qty)} FCFA</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button onClick={() => setCart(c => ({ ...c, qty: Math.max(1, c.qty - 1) }))} style={{ width: 28, height: 28, borderRadius: "50%", border: `1px solid ${C.border}`, background: C.surface, color: C.text, cursor: "pointer", fontSize: 16 }}>−</button>
              <button onClick={() => setCart(c => ({ ...c, qty: c.qty + 1 }))} style={{ width: 28, height: 28, borderRadius: "50%", border: `1px solid ${C.orange}`, background: C.orange, color: "#1A0A00", cursor: "pointer", fontSize: 16 }}>+</button>
              <span style={{ color: C.muted, cursor: "pointer", marginLeft: 4 }} onClick={() => setCart(null)}>✕</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={handleCash} style={{
              flex: 1, padding: "13px", background: C.orangeD, border: "none",
              borderRadius: 10, color: C.text, fontWeight: 700, cursor: "pointer", fontSize: 14
            }}>💵 Espèces</button>
            <button onClick={handleCredit} style={{
              flex: 1, padding: "13px", background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 10, color: C.orange, fontWeight: 700, cursor: "pointer", fontSize: 14
            }}>📋 Crédit</button>
          </div>
        </div>
      )}

      {/* Credit modal */}
      {showCredit && cart && (
        <div style={{
          position: "fixed", inset: 0, background: "#000000BB", zIndex: 200,
          display: "flex", alignItems: "flex-end", maxWidth: 430, margin: "0 auto"
        }}>
          <div style={{ background: C.surface, borderRadius: "20px 20px 0 0", padding: "20px 18px 32px", width: "100%", border: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ color: C.text, margin: 0, fontSize: 17 }}>Vente à crédit — {fmt(cart.product.price * cart.qty)} FCFA</h3>
              <span style={{ color: C.muted, cursor: "pointer", fontSize: 20 }} onClick={() => setShowCredit(false)}>✕</span>
            </div>

            <p style={{ color: C.muted, fontSize: 13, margin: "0 0 14px" }}>Client existant :</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {clients.map(c => (
                <button key={c.id} onClick={() => setSelectedClient(selectedClient?.id === c.id ? null : c)} style={{
                  padding: "7px 12px", borderRadius: 8,
                  background: selectedClient?.id === c.id ? C.orange : C.card,
                  border: `1px solid ${selectedClient?.id === c.id ? C.orange : C.border}`,
                  color: selectedClient?.id === c.id ? "#1A0A00" : C.text,
                  cursor: "pointer", fontSize: 13, fontWeight: 600
                }}>{c.name}</button>
              ))}
            </div>

            {!selectedClient && (
              <>
                <p style={{ color: C.muted, fontSize: 13, margin: "0 0 10px" }}>— ou nouveau client —</p>
                {[
                  { ph: "Nom du client", val: creditClient, set: setCreditClient, icon: "👤" },
                  { ph: "+237 ...", val: creditPhone, set: setCreditPhone, icon: "📞" },
                ].map(f => (
                  <div key={f.ph} style={{ display: "flex", gap: 8, background: C.card, borderRadius: 10, padding: "10px 12px", marginBottom: 10, border: `1px solid ${C.border}` }}>
                    <span style={{ color: C.muted }}>{f.icon}</span>
                    <input value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph}
                      style={{ background: "none", border: "none", color: C.text, flex: 1, outline: "none", fontSize: 14 }} />
                  </div>
                ))}
                <div style={{ display: "flex", gap: 8, background: C.card, borderRadius: 10, padding: "10px 12px", marginBottom: 10, border: `1px solid ${C.border}` }}>
                  <span style={{ color: C.muted }}>📅</span>
                  <input type="date" value={creditDue} onChange={e => setCreditDue(e.target.value)}
                    style={{ background: "none", border: "none", color: C.text, flex: 1, outline: "none", fontSize: 14 }} />
                </div>
              </>
            )}

            <button onClick={confirmCredit} style={{
              width: "100%", padding: "14px", background: C.orange, border: "none",
              borderRadius: 12, color: "#1A0A00", fontWeight: 800, fontSize: 15, cursor: "pointer", marginTop: 6
            }}>✅ Confirmer le crédit</button>
          </div>
        </div>
      )}

      {toast && (
        <div style={{
          position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
          background: toast.color, color: "#fff", padding: "12px 20px", borderRadius: 12,
          fontWeight: 700, zIndex: 999, fontSize: 14, maxWidth: 320, textAlign: "center"
        }}>{toast.msg}</div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// DETTES SCREEN
// ══════════════════════════════════════════════════════════════════════════
function DettesScreen({ clients, setClients }) {
  const total = clients.reduce((s, c) => s + c.totalDebt, 0);
  const retards = clients.filter(c => c.score < 50).length;
  const avgScore = Math.round(clients.reduce((s, c) => s + c.score, 0) / (clients.length || 1));
  const [selected, setSelected] = useState(null);
  const [rembourser, setRembourser] = useState("");

  function handleRemb() {
    const amount = parseInt(rembourser);
    if (!amount || !selected) return;
    setClients(prev => prev.map(c => {
      if (c.id !== selected.id) return c;
      const newDebt = Math.max(0, c.totalDebt - amount);
      const newScore = Math.min(100, c.score + 5);
      return { ...c, totalDebt: newDebt, score: newScore, lastPayment: "Aujourd'hui" };
    }));
    setSelected(null); setRembourser("");
  }

  return (
    <div style={{ paddingBottom: 80 }}>
      <TopBar>
        <span style={{ color: C.muted, fontSize: 20 }}>📊</span>
      </TopBar>

      <div style={{ padding: "14px 14px 10px" }}>
        {/* Summary card */}
        <div style={{ background: C.surface, borderRadius: 16, padding: "16px 18px", border: `1px solid ${C.border}`, marginBottom: 12, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", right: 14, top: 14, color: C.border, fontSize: 40, opacity: 0.4 }}>📋</div>
          <p style={{ color: C.muted, fontSize: 12, margin: "0 0 4px", letterSpacing: 1, textTransform: "uppercase" }}>Total Dettes Actives</p>
          <h2 style={{ color: C.orange, fontSize: 30, fontWeight: 800, margin: "0 0 8px" }}>{fmt(total)} FCFA</h2>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <StatusChip label={`${retards} RETARDS`} color={C.red} />
            <span style={{ color: C.muted, fontSize: 13 }}>sur {clients.length} clients</span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          <div style={{ background: C.surface, borderRadius: 14, padding: "14px 16px", border: `1px solid ${C.border}` }}>
            <p style={{ color: C.muted, fontSize: 11, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: 0.8 }}>Sérieux Moyen</p>
            <div style={{ color: C.green, fontWeight: 800, fontSize: 22 }}>{avgScore}% ↗</div>
          </div>
          <div style={{ background: C.surface, borderRadius: 14, padding: "14px 16px", border: `1px solid ${C.border}` }}>
            <p style={{ color: C.muted, fontSize: 11, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: 0.8 }}>Remboursements/Jour</p>
            <div style={{ color: C.yellow, fontWeight: 800, fontSize: 22 }}>3,4 moy.</div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ color: C.text, margin: 0, fontSize: 18, fontWeight: 800 }}>Clients Débiteurs</h3>
          <span style={{ color: C.orange, fontSize: 13 }}>⚙ Trier</span>
        </div>

        {clients.map(c => {
          const col = scoreColor(c.score);
          const lbl = scoreLabel(c.score);
          return (
            <div key={c.id} onClick={() => setSelected(selected?.id === c.id ? null : c)} style={{
              background: C.surface, borderRadius: 14, padding: "14px 16px", marginBottom: 10,
              border: `1px solid ${C.border}`, borderLeft: `4px solid ${col}`, cursor: "pointer"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ color: C.text, fontWeight: 700, fontSize: 15 }}>{c.name}</span>
                    <StatusChip label={lbl} color={col} />
                  </div>
                  <div style={{ color: C.muted, fontSize: 12, marginBottom: 4 }}>📅 Dernier: {c.lastPayment}</div>
                  <div style={{ color: col, fontWeight: 700, fontSize: 16 }}>{fmt(c.totalDebt)} FCFA</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ color: C.muted, fontSize: 10, marginBottom: 4, textTransform: "uppercase" }}>Sérieux</div>
                  <ScoreBadge score={c.score} />
                </div>
              </div>

              {selected?.id === c.id && (
                <div style={{ marginTop: 14, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
                  <p style={{ color: C.muted, fontSize: 12, margin: "0 0 6px" }}>📞 {c.phone} | 📅 Échéance: {c.dueDate}</p>
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <input value={rembourser} onChange={e => setRembourser(e.target.value)}
                      placeholder="Montant remboursé..." type="number"
                      style={{ flex: 1, background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px", color: C.text, outline: "none", fontSize: 14 }} />
                    <button onClick={handleRemb} style={{
                      padding: "9px 16px", background: C.green, border: "none",
                      borderRadius: 8, color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13
                    }}>✓ Payer</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// STOCK SCREEN
// ══════════════════════════════════════════════════════════════════════════
function StockScreen({ products, setProducts }) {
  const [showAdd, setShowAdd] = useState(false);
  const [nom, setNom] = useState(""); const [prix, setPrix] = useState("");
  const [stock, setStock] = useState(""); const [icon, setIcon] = useState("📦");

  const icons = ["📦","🥖","🥛","🍬","☕","🛢️","🧴","🌾","🍞","🧅","🥚","🥩"];

  function addProduct() {
    if (!nom || !prix) return;
    setProducts(prev => [...prev, { id: Date.now(), name: nom, price: parseInt(prix), stock: parseInt(stock) || 0, icon }]);
    setShowAdd(false); setNom(""); setPrix(""); setStock(""); setIcon("📦");
  }

  return (
    <div style={{ paddingBottom: 80 }}>
      <TopBar>
        <span style={{ color: C.muted, fontSize: 20 }}>📊</span>
      </TopBar>
      <div style={{ padding: "14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ color: C.text, margin: 0, fontSize: 18, fontWeight: 800 }}>Inventaire</h3>
          <span style={{ color: C.muted, fontSize: 13 }}>{products.length} produits</span>
        </div>

        {products.map(p => {
          const low = p.stock <= 5;
          return (
            <div key={p.id} style={{ background: C.surface, borderRadius: 14, padding: "14px 16px", marginBottom: 10, border: `1px solid ${low ? C.red + "44" : C.border}`, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ background: low ? C.red + "22" : C.card, borderRadius: 10, width: 46, height: 46, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
                {p.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: C.text, fontWeight: 700, fontSize: 15 }}>{p.name}</div>
                <div style={{ color: C.orange, fontSize: 13, fontWeight: 600 }}>{fmt(p.price)} FCFA / unité</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ color: low ? C.red : C.green, fontWeight: 800, fontSize: 20 }}>{p.stock}</div>
                <div style={{ color: C.muted, fontSize: 11 }}>{low ? "⚠ Bas" : "en stock"}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <button onClick={() => setProducts(prev => prev.map(x => x.id === p.id ? { ...x, stock: x.stock + 1 } : x))}
                  style={{ width: 28, height: 28, borderRadius: 6, border: "none", background: C.orange, color: "#1A0A00", cursor: "pointer", fontWeight: 700 }}>+</button>
                <button onClick={() => setProducts(prev => prev.map(x => x.id === p.id ? { ...x, stock: Math.max(0, x.stock - 1) } : x))}
                  style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${C.border}`, background: C.card, color: C.text, cursor: "pointer" }}>−</button>
              </div>
            </div>
          );
        })}

        <button onClick={() => setShowAdd(!showAdd)} style={{
          width: "100%", padding: "14px", background: C.orange + "22",
          border: `2px dashed ${C.orange}`, borderRadius: 14, color: C.orange,
          fontWeight: 700, cursor: "pointer", fontSize: 15, marginTop: 6
        }}>+ Ajouter un produit</button>

        {showAdd && (
          <div style={{ background: C.surface, borderRadius: 16, padding: "16px", marginTop: 10, border: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
              {icons.map(ic => (
                <button key={ic} onClick={() => setIcon(ic)} style={{
                  width: 36, height: 36, borderRadius: 8, border: `2px solid ${icon === ic ? C.orange : C.border}`,
                  background: icon === ic ? C.orange + "22" : C.card, cursor: "pointer", fontSize: 18
                }}>{ic}</button>
              ))}
            </div>
            {[
              { ph: "Nom du produit", val: nom, set: setNom },
              { ph: "Prix unitaire (FCFA)", val: prix, set: setPrix, type: "number" },
              { ph: "Stock initial", val: stock, set: setStock, type: "number" },
            ].map(f => (
              <input key={f.ph} value={f.val} onChange={e => f.set(e.target.value)}
                placeholder={f.ph} type={f.type || "text"}
                style={{ width: "100%", background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "11px 14px", color: C.text, outline: "none", fontSize: 14, marginBottom: 10, boxSizing: "border-box" }} />
            ))}
            <button onClick={addProduct} style={{
              width: "100%", padding: "12px", background: C.orange, border: "none",
              borderRadius: 10, color: "#1A0A00", fontWeight: 800, cursor: "pointer"
            }}>Ajouter</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// GROUPES SCREEN
// ══════════════════════════════════════════════════════════════════════════
function GroupesScreen() {
  const [membres, setMembres] = useState(INIT_MEMBRES);
  const [demandes, setDemandes] = useState([
    { id: 99, name: "Moussa Traoré", role: "Vendeur itinérant", avatar: "🧑🏿" }
  ]);
  const [showInvite, setShowInvite] = useState(false);
  const [bailHour, setBailHour] = useState("18:00");
  const [newMemberName, setNewMemberName] = useState("");

  function accept(d) {
    setMembres(prev => [...prev, { id: d.id, name: d.name, role: d.role, ventes: 0, bail: bailHour, active: true, avatar: d.avatar }]);
    setDemandes(prev => prev.filter(x => x.id !== d.id));
  }
  function reject(d) {
    setDemandes(prev => prev.filter(x => x.id !== d.id));
  }

  // Simple QR visual
  const QRPattern = () => {
    const grid = [
      [1,1,1,0,1,1,1],[1,0,1,0,1,0,1],[1,0,1,0,1,0,1],[0,0,0,0,1,1,0],
      [1,1,0,0,0,1,1],[0,1,0,1,0,0,1],[1,0,1,1,1,1,1]
    ];
    return (
      <div style={{ display: "inline-grid", gridTemplateColumns: "repeat(7,10px)", gap: 2 }}>
        {grid.flat().map((v, i) => (
          <div key={i} style={{ width: 10, height: 10, background: v ? "#fff" : "transparent", borderRadius: 1 }} />
        ))}
      </div>
    );
  };

  return (
    <div style={{ paddingBottom: 80 }}>
      <div style={{ padding: "14px 16px 10px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${C.border}` }}>
        <div>
          <div style={{ color: C.orange, fontWeight: 800, fontSize: 18 }}>Mon Groupe</div>
          <div style={{ color: C.muted, fontSize: 12 }}>24 Oct | +15,200 FCFA</div>
        </div>
        <span style={{ color: C.muted, fontSize: 20 }}>📊</span>
      </div>

      <div style={{ padding: "14px" }}>
        {/* Demandes */}
        {demandes.length > 0 && (
          <>
            <h4 style={{ color: C.orange, margin: "0 0 10px", fontSize: 15 }}>
              Demandes d'accès ({demandes.length})
            </h4>
            {demandes.map(d => (
              <div key={d.id} style={{ background: C.surface, borderRadius: 14, padding: "12px 14px", marginBottom: 10, border: `1px solid ${C.orange}44`, display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: C.card, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{d.avatar}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: C.text, fontWeight: 700 }}>{d.name}</div>
                  <div style={{ color: C.muted, fontSize: 12 }}>{d.role}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => reject(d)} style={{ width: 36, height: 36, borderRadius: "50%", border: "none", background: C.red + "33", color: C.red, cursor: "pointer", fontSize: 16 }}>✕</button>
                  <button onClick={() => accept(d)} style={{ width: 36, height: 36, borderRadius: "50%", border: "none", background: C.green + "33", color: C.green, cursor: "pointer", fontSize: 16 }}>✓</button>
                </div>
              </div>
            ))}
          </>
        )}

        {/* QR Code */}
        <div style={{ background: C.surface, borderRadius: 16, padding: "20px", marginBottom: 14, border: `1px solid ${C.border}`, textAlign: "center" }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: "16px", display: "inline-block", position: "relative" }}>
            <QRPattern />
            <div style={{ position: "absolute", top: -8, right: -8, background: C.orange, borderRadius: "50%", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>QR</div>
          </div>
          <p style={{ color: C.text, fontWeight: 700, margin: "12px 0 4px" }}>Scanner pour rejoindre</p>
          <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>Partagez ce code avec vos vendeurs pour une connexion instantanée.</p>
        </div>

        {/* WhatsApp invite */}
        <div style={{ background: C.orange, borderRadius: 16, padding: "16px 18px", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div style={{ background: "#ffffff33", borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center" }}>🔗</div>
            <div>
              <div style={{ color: "#1A0A00", fontWeight: 800, fontSize: 14 }}>Lien d'invitation</div>
              <div style={{ color: "#1A0A00", fontSize: 12, opacity: 0.7 }}>Génère un lien WhatsApp sécurisé qui expire dans 24h.</div>
            </div>
          </div>
          <button onClick={() => setShowInvite(true)} style={{
            width: "100%", padding: "12px", background: "#1A0A00", border: "none",
            borderRadius: 10, color: C.orange, fontWeight: 700, cursor: "pointer", fontSize: 14
          }}>▶ Générer lien WhatsApp</button>
        </div>

        {showInvite && (
          <div style={{ background: C.surface, borderRadius: 14, padding: "14px", marginBottom: 14, border: `1px solid ${C.green}` }}>
            <p style={{ color: C.green, fontWeight: 700, margin: "0 0 8px" }}>✅ Lien généré !</p>
            <div style={{ background: C.card, borderRadius: 8, padding: "10px", fontFamily: "monospace", fontSize: 12, color: C.text, wordBreak: "break-all" }}>
              https://vitesse.app/join/abc123xyz?exp=24h
            </div>
            <button style={{ marginTop: 10, width: "100%", padding: "10px", background: "#25D366", border: "none", borderRadius: 8, color: "#fff", fontWeight: 700, cursor: "pointer" }}>
              📱 Partager sur WhatsApp
            </button>
          </div>
        )}

        {/* Bail setting */}
        <div style={{ background: C.surface, borderRadius: 14, padding: "14px 16px", marginBottom: 14, border: `1px solid ${C.border}` }}>
          <p style={{ color: C.text, fontWeight: 700, margin: "0 0 10px" }}>⏰ Bail par défaut</p>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="time" value={bailHour} onChange={e => setBailHour(e.target.value)}
              style={{ flex: 1, background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px", color: C.text, outline: "none", fontSize: 15 }} />
            <span style={{ color: C.muted, fontSize: 12 }}>Les vendeurs se déconnectent à cette heure</span>
          </div>
        </div>

        {/* Membres actifs */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h4 style={{ color: C.text, margin: 0, fontSize: 16, fontWeight: 800 }}>
            Vendeurs Actifs ({membres.length})
          </h4>
          <StatusChip label="En direct" color={C.green} />
        </div>

        {membres.map(m => (
          <div key={m.id} style={{ background: C.surface, borderRadius: 14, padding: "12px 14px", marginBottom: 10, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ position: "relative" }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: C.card, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>{m.avatar}</div>
              <div style={{ position: "absolute", bottom: 0, right: 0, width: 12, height: 12, borderRadius: "50%", background: m.active && m.bail !== "Expiré" ? C.green : C.muted, border: `2px solid ${C.surface}` }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: C.text, fontWeight: 700 }}>{m.name}</div>
              <div style={{ color: m.bail === "Expiré" ? C.red : C.muted, fontSize: 12 }}>
                {m.bail === "Expiré" ? "🔕 Bail expiré" : `⏰ Bail: ${m.bail}`}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: m.ventes > 0 ? C.green : C.muted, fontWeight: 700, fontSize: 15 }}>
                {m.ventes > 0 ? `+${fmt(m.ventes)}` : "+0"}
              </div>
              <div style={{ color: C.muted, fontSize: 11 }}>FCFA</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// PROFIL SCREEN
// ══════════════════════════════════════════════════════════════════════════
function ProfilScreen({ ventes }) {
  const totalCA = ventes.reduce((s, v) => s + v.total, 0);
  const totalDettes = ventes.filter(v => v.type === "crédit").reduce((s, v) => s + v.total, 0);
  const beneficeNet = Math.round(totalCA * 0.37);

  const weekData = [
    { j: "LUN", v: 0 }, { j: "MAR", v: 95000 }, { j: "MER", v: 120000 },
    { j: "JEU", v: 80000 }, { j: "VEN", v: 150000 }, { j: "SAM", v: 0 }, { j: "DIM", v: 0 }
  ];
  const maxV = Math.max(...weekData.map(d => d.v), 1);

  const topProduits = [
    { name: "Café Arabica (S)", icon: "☕", profit: 450, stock: 124, sain: true },
    { name: "Tissu Wax Royal",  icon: "🧣", profit: 2500, stock: 8, sain: false },
    { name: "Huile Végétale 1L",icon: "🫙", profit: 150, stock: 42, sain: true },
  ];

  return (
    <div style={{ paddingBottom: 80 }}>
      <TopBar>
        <span style={{ color: C.muted, fontSize: 20 }}>📊</span>
      </TopBar>
      <div style={{ padding: "14px" }}>
        {/* CA Card */}
        <div style={{ background: C.surface, borderRadius: 16, padding: "18px", marginBottom: 12, border: `1px solid ${C.border}` }}>
          <p style={{ color: C.muted, fontSize: 11, margin: "0 0 4px", letterSpacing: 1, textTransform: "uppercase" }}>Chiffre d'affaires total</p>
          <h2 style={{ color: C.orange, fontSize: 28, fontWeight: 800, margin: "0 0 6px" }}>845,000 FCFA</h2>
          <div style={{ color: C.green, fontSize: 13 }}>↗ +12.5% vs hier</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          <div style={{ background: C.surface, borderRadius: 14, padding: "14px", border: `2px solid ${C.green}` }}>
            <p style={{ color: C.muted, fontSize: 10, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: 0.8 }}>Bénéfice Net</p>
            <div style={{ color: C.green, fontWeight: 800, fontSize: 22 }}>{fmt(312400)}</div>
            <div style={{ height: 3, background: C.green, borderRadius: 2, marginTop: 8, width: "70%" }} />
          </div>
          <div style={{ background: C.surface, borderRadius: 14, padding: "14px", border: `2px solid ${C.red}` }}>
            <p style={{ color: C.muted, fontSize: 10, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: 0.8 }}>Dettes Totales</p>
            <div style={{ color: C.red, fontWeight: 800, fontSize: 22 }}>{fmt(45800)}</div>
            <div style={{ height: 3, background: C.red, borderRadius: 2, marginTop: 8, width: "20%" }} />
          </div>
        </div>

        {/* Weekly chart */}
        <div style={{ background: C.surface, borderRadius: 16, padding: "16px", marginBottom: 16, border: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <span style={{ color: C.text, fontWeight: 700, fontSize: 15 }}>Performance Hebdomadaire</span>
            <span style={{ color: C.orange, fontSize: 13 }}>Détails ›</span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 80 }}>
            {weekData.map(d => (
              <div key={d.j} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{
                  width: "100%", background: d.j === "VEN" ? C.orange : C.border,
                  borderRadius: "4px 4px 0 0",
                  height: `${(d.v / maxV) * 60 + (d.v > 0 ? 4 : 0)}px`,
                  minHeight: d.v > 0 ? 8 : 2, transition: "height 0.3s"
                }} />
                <span style={{ color: d.j === "VEN" ? C.orange : C.muted, fontSize: 10, fontWeight: d.j === "VEN" ? 700 : 400 }}>{d.j}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top produits */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h4 style={{ color: C.text, margin: 0, fontSize: 16, fontWeight: 800 }}>Top Produits</h4>
          <span style={{ color: C.orange, fontSize: 12 }}>Profit / Stock</span>
        </div>
        {topProduits.map(p => (
          <div key={p.name} style={{ background: C.surface, borderRadius: 14, padding: "14px 16px", marginBottom: 10, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 46, height: 46, borderRadius: 10, background: C.card, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>{p.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ color: C.text, fontWeight: 700 }}>{p.name}</div>
              <div style={{ color: C.green, fontSize: 12 }}>+{fmt(p.profit)} FCFA / unité</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: C.text, fontWeight: 700 }}>{p.stock} pcs</div>
              <div style={{ color: p.sain ? C.green : C.orange, fontSize: 11, fontWeight: 600 }}>
                {p.sain ? "Stock Sain" : "Réapprovisionner"}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// APP ROOT
// ══════════════════════════════════════════════════════════════════════════
export default function App() {
  const [screen, setScreen] = useState("login"); // login | register | app
  const [tab, setTab] = useState("ventes");
  const [products, setProducts] = useState(INIT_PRODUCTS);
  const [clients, setClients] = useState(INIT_CLIENTS);
  const [ventes, setVentes] = useState(INIT_VENTES);

  const appStyle = {
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    background: C.bg, color: C.text, minHeight: "100vh",
    maxWidth: 430, margin: "0 auto", position: "relative",
    overflowX: "hidden"
  };

  if (screen === "login") return (
    <div style={appStyle}>
      <LoginScreen onLogin={() => setScreen("app")} onGoRegister={() => setScreen("register")} />
    </div>
  );
  if (screen === "register") return (
    <div style={appStyle}>
      <RegisterScreen onRegister={() => setScreen("app")} onGoLogin={() => setScreen("login")} />
    </div>
  );

  return (
    <div style={appStyle}>
      {tab === "ventes"  && <VentesScreen products={products} setProducts={setProducts} ventes={ventes} setVentes={setVentes} clients={clients} setClients={setClients} />}
      {tab === "dettes"  && <DettesScreen clients={clients} setClients={setClients} />}
      {tab === "stock"   && <StockScreen products={products} setProducts={setProducts} />}
      {tab === "groupes" && <GroupesScreen />}
      {tab === "profil"  && <ProfilScreen ventes={ventes} />}
      <NavBar tab={tab} setTab={setTab} />
    </div>
  );
}
