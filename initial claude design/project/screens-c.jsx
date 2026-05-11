/* global React */
// screens-c.jsx — Treasure Map, Settings (gate + form), End-voyage confirm

const { useState: useStateC, useEffect: useEffectC } = React;

// ─────────────────────────────────────────────────────────────
// Treasure Map
// ─────────────────────────────────────────────────────────────
function ScreenMap({ unlockedIds, onBack, onIslandTap, drives = [] }) {
  const [drawerOpen, setDrawerOpen] = useStateC(false);

  // Pre-place 30 islands across map bounds
  const positions = window.ISLANDS.map((isl, i) => {
    const seed = isl.id.charCodeAt(0) + isl.id.charCodeAt(isl.id.length-1) * 7 + i * 13;
    return {
      ...isl,
      x: 12 + ((seed * 17) % 75),
      y: 18 + (((seed * 23) % 70)),
    };
  });

  return (
    <div data-screen-label="09 Treasure Map" className="tex-paper tex-grain" style={{
      position: 'absolute', inset: 0,
      background: 'linear-gradient(135deg, #F0D49B, #E5C8A8)',
      overflow: 'hidden',
    }}>
      {/* aged edges vignette */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        boxShadow: 'inset 0 0 60px rgba(93,63,42,0.4), inset 0 0 200px rgba(93,63,42,0.18)',
      }}/>
      {/* watercolor sea */}
      <div style={{
        position: 'absolute', inset: 30, borderRadius: 12,
        background: 'radial-gradient(ellipse at 60% 40%, rgba(95,168,199,0.35), transparent 80%)',
      }}/>
      {/* compass rose */}
      <div style={{ position: 'absolute', top: 70, left: 18, opacity: 0.85 }}>
        <CompassIcon size={60}/>
      </div>
      {/* sea creatures peeking */}
      <div style={{ position: 'absolute', bottom: 200, left: 40, fontFamily: 'var(--font-map)', fontSize: 12, color: '#5D3F2A', opacity: 0.6, transform: 'rotate(-8deg)' }}>~ Hic sunt dracones ~</div>

      {/* islands */}
      {positions.map((isl) => {
        const unlocked = unlockedIds.includes(isl.id);
        return (
          <button key={isl.id}
            onClick={() => unlocked ? onIslandTap(isl) : null}
            style={{
              position: 'absolute', left: `${isl.x}%`, top: `${isl.y}%`,
              transform: 'translate(-50%, -50%)',
              border: 'none', background: 'transparent', cursor: unlocked ? 'pointer' : 'default',
              padding: 0,
            }}>
            {unlocked ? (
              <div style={{
                width: 64, height: 64, position: 'relative',
                animation: 'softPulse 4s ease-in-out infinite',
              }}>
                <svg viewBox="0 0 64 64" width="64" height="64">
                  <path d="M8 40 Q14 28 32 26 Q50 28 56 40 Q50 48 32 50 Q14 48 8 40 Z"
                    fill="#A87B5A" stroke="#5D3F2A" strokeWidth="1.6"/>
                  <line x1="30" y1="40" x2="28" y2="22" stroke="#5D3F2A" strokeWidth="2"/>
                  <path d="M28 22 q-8 -2 -10 -10 q6 2 10 4" fill="#2A9D8F"/>
                  <path d="M28 22 q10 -2 14 -10 q-6 2 -14 4" fill="#2A9D8F"/>
                  <text x="44" y="42" fontSize="10" fill="#C84B3B" fontWeight="bold" fontFamily="serif">×</text>
                </svg>
                <div style={{
                  position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
                  fontFamily: 'var(--font-map)', fontSize: 11, fontWeight: 700, color: '#5D3F2A',
                  whiteSpace: 'nowrap', marginTop: 2,
                }}>{isl.name}</div>
              </div>
            ) : (
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'rgba(197,224,232,0.85)',
                border: '1.5px dashed rgba(93,63,42,0.4)',
                filter: 'blur(1px)',
              }}/>
            )}
          </button>
        );
      })}

      {/* home harbor in corner */}
      <div style={{ position: 'absolute', bottom: 130, right: 20 }}>
        <PirateShip width={68} cargo={[0,0,0]} bobbing/>
        <div style={{ textAlign: 'center', fontFamily: 'var(--font-map)', fontSize: 11, color: '#5D3F2A', fontWeight: 700 }}>
          הנמל שלנו
        </div>
      </div>

      {/* Side drawer (collapsed) */}
      <button onClick={() => setDrawerOpen(!drawerOpen)} style={{
        position: 'absolute', top: 70, right: 12,
        background: 'var(--sand-cream)', border: '2px solid rgba(93,63,42,0.4)',
        borderRadius: 16, padding: '8px 14px',
        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14,
        color: 'var(--text-primary)', cursor: 'pointer',
        boxShadow: '0 3px 0 rgba(93,63,42,0.18)',
      }}>
        📜 הסטטיסטיקה
      </button>

      {drawerOpen && (
        <div className="tex-grain" style={{
          position: 'absolute', top: 116, right: 12, width: 200,
          background: 'var(--sand-cream)', borderRadius: 16, padding: 14,
          border: '2px solid rgba(93,63,42,0.4)',
          boxShadow: '0 6px 14px rgba(93,63,42,0.3)',
          fontFamily: 'var(--font-body)',
          animation: 'fadeUp 250ms',
        }}>
          <Stat label="איים שהתגלו" value={unlockedIds.length}/>
          <Stat label="מציאות חוף" value={drives.filter(d=>d.tier==='coastal').length}/>
          <Stat label="הפלגות בסך הכל" value={drives.length}/>
        </div>
      )}

      {/* Back button */}
      <div style={{ position: 'absolute', left: 24, right: 24, bottom: 50 }}>
        <PlankButton onClick={onBack} variant="sand">חזרה לנמל ←</PlankButton>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed rgba(93,63,42,0.25)' }}>
      <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18 }}>{value}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Island Detail Modal
// ─────────────────────────────────────────────────────────────
function ScreenIslandDetail({ island, onClose }) {
  if (!island) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 20 }}>
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0, background: 'rgba(30,40,50,0.55)',
      }}/>
      <div className="tex-grain" data-screen-label="10 Island Detail" style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, height: '70%',
        background: 'rgba(240,212,155,0.97)',
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        padding: '20px 22px',
        animation: 'slideUp 350ms ease-out',
      }}>
        <div style={{ width: 44, height: 5, background: 'rgba(93,63,42,0.4)', borderRadius: 4, margin: '0 auto 8px' }}/>
        <button onClick={onClose} style={{
          position: 'absolute', top: 18, left: 16,
          background: 'transparent', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-primary)',
        }}>✕</button>
        <h2 style={{
          fontFamily: 'var(--font-map)', fontSize: 26, fontWeight: 700,
          textAlign: 'center', color: 'var(--text-primary)', margin: '8px 0 4px',
        }}>{island.name}</h2>
        <div style={{ textAlign: 'center', display: 'flex', justifyContent: 'center', margin: '10px 0' }}>
          <IslandIllustration island={island} size={180}/>
        </div>
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: 17, lineHeight: 1.5,
          color: 'var(--text-primary)', textAlign: 'center', padding: '0 12px',
        }}>{island.description}</p>
        <div style={{ marginTop: 16, padding: 14, background: 'rgba(251,241,220,0.6)', borderRadius: 14, border: '1.5px dashed rgba(93,63,42,0.3)' }}>
          <Stat label="התגלה ב" value="06.05.2026"/>
          <Stat label="זמן הפלגה" value="42 דק׳"/>
          <Stat label="חלק הגדול ביותר" value="38%"/>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// End-voyage confirmation
// ─────────────────────────────────────────────────────────────
function ConfirmEnd({ onYes, onNo }) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 30 }}>
      <div onClick={onNo} style={{ position: 'absolute', inset: 0, background: 'rgba(30,40,50,0.6)' }}/>
      <div className="tex-grain" style={{
        position: 'absolute', left: 30, right: 30, top: '40%', transform: 'translateY(-50%)',
        background: 'var(--sand-cream)', borderRadius: 20, padding: 24,
        animation: 'splash 500ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        border: '3px solid var(--wood-deep)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>⚓</div>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, margin: '0 0 18px' }}>
          לסיים את ההפלגה?
        </h3>
        <div style={{ display: 'flex', gap: 10, flexDirection: 'row-reverse' }}>
          <PlankButton onClick={onYes} size="md">כן</PlankButton>
          <PlankButton onClick={onNo} variant="cream" size="md">לא</PlankButton>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Settings — math gate + parent panel
// ─────────────────────────────────────────────────────────────
function ScreenMathGate({ onPass, onCancel }) {
  const [a] = useStateC(() => 2 + Math.floor(Math.random() * 6));
  const [b] = useStateC(() => 2 + Math.floor(Math.random() * 6));
  const [val, setVal] = useStateC('');
  const correct = a + b;
  const wrong = val !== '' && parseInt(val) !== correct;
  return (
    <div data-screen-label="11 Math Gate" className="tex-paper tex-grain" style={{
      position: 'absolute', inset: 0,
      background: 'var(--sand-cream)', padding: '90px 28px 30px',
    }}>
      <button onClick={onCancel} style={{
        position: 'absolute', top: 60, right: 18, background: 'transparent', border: 'none',
        fontFamily: 'var(--font-body)', fontSize: 18, color: 'var(--text-primary)', cursor: 'pointer',
      }}>← חזרה</button>
      <h2 style={{
        fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700,
        textAlign: 'center', color: 'var(--text-primary)', margin: '20px 0 6px',
      }}>הגדרות הורים</h2>
      <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: 30 }}>
        רק לקפטנים בוגרים — נא לפתור:
      </p>
      <div style={{
        textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 56, fontWeight: 700,
        color: 'var(--text-primary)', margin: '20px 0',
      }}>
        {a} + {b} = ?
      </div>
      <input
        type="number" inputMode="numeric"
        value={val} onChange={(e) => setVal(e.target.value)}
        placeholder="?"
        style={{
          width: '100%', height: 64, fontSize: 32, textAlign: 'center',
          fontFamily: 'var(--font-display)', fontWeight: 700,
          background: 'var(--surface-card)',
          border: `3px solid ${wrong ? 'var(--treasure-red)' : 'rgba(93,63,42,0.4)'}`,
          borderRadius: 18, outline: 'none', color: 'var(--text-primary)',
        }}/>
      <div style={{ marginTop: 18 }}>
        <PlankButton
          onClick={() => parseInt(val) === correct ? onPass() : null}
          disabled={parseInt(val) !== correct}>
          המשך
        </PlankButton>
      </div>
    </div>
  );
}

function ScreenSettings({ onBack, settings, setSettings, drives, onReset }) {
  return (
    <div data-screen-label="12 Settings" className="tex-paper tex-grain" style={{
      position: 'absolute', inset: 0, background: 'var(--sand-cream)',
      padding: '64px 18px 30px', overflowY: 'auto',
    }}>
      <button onClick={onBack} style={{
        position: 'absolute', top: 64, right: 18, background: 'transparent', border: 'none',
        fontFamily: 'var(--font-body)', fontSize: 17, color: 'var(--text-primary)', cursor: 'pointer',
      }}>← חזרה</button>
      <h2 style={{
        fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700,
        textAlign: 'center', margin: '12px 0 22px',
      }}>הגדרות הורים</h2>

      <SettingsSection title="ספים לאיזון">
        <SettingSlider label="סף רוח גבית"
          min={0.5} max={0.7} step={0.01}
          value={settings.fairThreshold}
          onChange={(v) => setSettings({ ...settings, fairThreshold: v })}
          format={(v) => `≤ ${Math.round(v*100)}% חלק הגדול`}/>
        <SettingSlider label="סף נמל"
          min={0.7} max={0.9} step={0.01}
          value={settings.harborThreshold}
          onChange={(v) => setSettings({ ...settings, harborThreshold: v })}
          format={(v) => `> ${Math.round(v*100)}%`}/>
        <div style={{
          marginTop: 8, padding: 10, background: 'rgba(229,178,58,0.15)',
          borderRadius: 12, border: '1.5px dashed rgba(93,63,42,0.3)',
          fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-secondary)',
          textAlign: 'center',
        }}>
          ההפלגה האחרונה הייתה: <b style={{ color: 'var(--text-primary)' }}>
            {drives.length === 0 ? 'אין הפלגות עדיין' :
             drives[drives.length-1].tier === 'fair' ? '🌞 רוח גבית' :
             drives[drives.length-1].tier === 'coastal' ? '🌊 חוף' : '⚓ נמל'}
          </b>
        </div>
      </SettingsSection>

      <SettingsSection title="כללי">
        <SettingToggle label="🔊 צלילים" value={settings.audio} onChange={(v) => setSettings({ ...settings, audio: v })}/>
        <SettingToggle label="🌫️ ערפל על איים בלתי מגולים" value={settings.fog} onChange={(v) => setSettings({ ...settings, fog: v })}/>
      </SettingsSection>

      <SettingsSection title="היסטוריה">
        {drives.length === 0 ? (
          <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '14px 0' }}>אין הפלגות עדיין</div>
        ) : (
          drives.slice().reverse().map((d, i) => (
            <div key={i} style={{
              padding: '10px 12px', borderBottom: '1px dashed rgba(93,63,42,0.25)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              fontFamily: 'var(--font-body)', fontSize: 14,
            }}>
              <span>{d.date}</span>
              <span>
                {d.tier === 'fair' ? '🌞' : d.tier === 'coastal' ? '🌊' : '⚓'} {d.totalMin} דק׳
              </span>
            </div>
          ))
        )}
      </SettingsSection>

      <SettingsSection title="עריכת הצוות">
        {settings.pirates.map((p, i) => (
          <div key={p.kind} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', flexDirection: 'row-reverse' }}>
            <PirateAvatar kind={p.kind} size={40}/>
            <input value={p.name} onChange={(e) => {
              const next = [...settings.pirates]; next[i] = { ...p, name: e.target.value };
              setSettings({ ...settings, pirates: next });
            }} style={{
              flex: 1, padding: '6px 8px', fontSize: 16, fontFamily: 'var(--font-body)',
              border: '1.5px solid rgba(93,63,42,0.3)', borderRadius: 10,
              background: 'var(--surface-card)', textAlign: 'right', direction: 'rtl',
            }}/>
            <FlagBadge color={p.color} size={20}/>
          </div>
        ))}
      </SettingsSection>

      <div style={{ marginTop: 18 }}>
        <button onClick={onReset} style={{
          width: '100%', padding: '12px 16px', borderRadius: 14,
          background: 'transparent', border: '2px solid var(--treasure-red)',
          color: 'var(--treasure-red)', fontWeight: 600, fontSize: 16,
          fontFamily: 'var(--font-body)', cursor: 'pointer',
        }}>איפוס נתונים</button>
      </div>
    </div>
  );
}

function SettingsSection({ title, children }) {
  return (
    <div style={{
      background: 'var(--surface-card)', borderRadius: 16, padding: 14,
      marginBottom: 14,
      border: '1.5px solid rgba(93,63,42,0.25)',
    }}>
      <h3 style={{
        fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700,
        margin: '0 0 10px', color: 'var(--text-primary)',
      }}>{title}</h3>
      {children}
    </div>
  );
}

function SettingSlider({ label, min, max, step, value, onChange, format }) {
  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 6 }}>
        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{label}</span>
        <span style={{ color: 'var(--text-secondary)' }}>{format(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--treasure-gold)' }}/>
    </div>
  );
}

function SettingToggle({ label, value, onChange }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '10px 0', borderBottom: '1px dashed rgba(93,63,42,0.2)',
    }}>
      <span style={{ fontSize: 16, color: 'var(--text-primary)' }}>{label}</span>
      <button onClick={() => onChange(!value)} style={{
        width: 56, height: 32, borderRadius: 18,
        background: value ? 'var(--flag-mom)' : '#C0B5A6',
        border: 'none', position: 'relative', cursor: 'pointer',
        transition: 'background 200ms',
      }}>
        <div style={{
          position: 'absolute', top: 3, left: value ? 3 : 27,
          width: 26, height: 26, borderRadius: 13,
          background: '#FBF1DC', boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          transition: 'left 200ms',
        }}/>
      </button>
    </div>
  );
}

Object.assign(window, { ScreenMap, ScreenIslandDetail, ConfirmEnd, ScreenMathGate, ScreenSettings });
