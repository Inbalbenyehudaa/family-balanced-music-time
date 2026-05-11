/* global React */
// screens-a.jsx — Onboarding, Home, Roll Call

const { useState: useStateA, useEffect: useEffectA, useRef: useRefA } = React;

// Glyph-icon button used through onboarding/home
function PlankButton({ children, onClick, variant = "wood", size = "lg", style, disabled }) {
  const sizes = {
    lg: { padding: '18px 24px', fontSize: 22, height: 64 },
    md: { padding: '14px 22px', fontSize: 19, height: 52 },
    sm: { padding: '10px 16px', fontSize: 16, height: 40 }
  };
  return (
    <button
      onClick={disabled ? undefined : onClick}
      className={`btn-plank ${variant === 'sand' ? 'sand' : variant === 'cream' ? 'cream' : ''}`}
      style={{
        ...sizes[size],
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        width: '100%',
        ...style
      }}>
      {children}
    </button>);

}

// ─────────────────────────────────────────────────────────────
// Onboarding step 1 — Welcome
// ─────────────────────────────────────────────────────────────
function ScreenWelcome({ onNext }) {
  return (
    <div data-screen-label="01 Welcome" style={{ position: 'absolute', inset: 0 }}>
      <HarborScene />
      {/* Ship docked at pier */}
      <div style={{
        position: 'absolute', left: '50%', bottom: 230, transform: 'translateX(-50%)',
        animation: 'bob 3s ease-in-out infinite'
      }}>
        <PirateShip width={300} cargo={[0, 0, 0]} sailing={false} bobbing={false} />
      </div>
      {/* dock pier */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 220, height: 20,
        background: 'linear-gradient(180deg, #A87B5A, #5D3F2A)',
        boxShadow: '0 4px 0 rgba(0,0,0,0.2)'
      }} />
      {/* greeting card */}
      <div style={{
        position: 'absolute', left: 24, right: 24, bottom: 60,
        padding: 24,
        textAlign: 'center'
      }}>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontWeight: 700,
          fontSize: 34, lineHeight: 1.15, color: 'var(--text-primary)',
          textShadow: '0 1px 0 rgba(255,255,255,0.5)',
          margin: '0 0 22px'
        }}></h1>
        <PlankButton onClick={onNext}>בואו נתחיל! ⚓</PlankButton>
      </div>
      {/* tiny dot indicator */}
      <OnboardingDots step={0} />
    </div>);

}

function OnboardingDots({ step }) {
  return (
    <div style={{ position: 'absolute', top: 70, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 8 }}>
      {[0, 1, 2].map((i) =>
      <div key={i} style={{
        width: i === step ? 22 : 8, height: 8, borderRadius: 4,
        background: i === step ? 'var(--text-primary)' : 'rgba(42,38,32,0.3)',
        transition: 'all 240ms'
      }} />
      )}
    </div>);

}

// ─────────────────────────────────────────────────────────────
// Onboarding step 2 — Name your three pirates
// ─────────────────────────────────────────────────────────────
function ScreenNames({ pirates, setPirates, onNext, onSkip }) {
  return (
    <div data-screen-label="02 Names" className="tex-paper tex-grain" style={{
      position: 'absolute', inset: 0,
      background: 'var(--sand-cream)',
      padding: '70px 20px 24px', overflowY: 'auto'
    }}>
      <OnboardingDots step={1} />
      <h2 style={{
        fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700,
        textAlign: 'center', margin: '12px 0 8px', color: 'var(--text-primary)'
      }}>תנו שם לצוות שלכם</h2>
      <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 16, margin: '0 0 22px' }}>
        כל פיראט מקבל דגל בצבע משלו
      </p>

      {pirates.map((p, i) =>
      <div key={p.kind} className="painted-shadow" style={{
        background: 'var(--surface-card)',
        borderRadius: 20,
        padding: '16px 18px',
        marginBottom: 14,
        display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', gap: 14,
        position: 'relative',
        border: '2px solid rgba(93,63,42,0.25)'
      }}>
          <PirateAvatar kind={p.kind} size={72} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
            fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600,
            color: 'var(--text-secondary)', marginBottom: 4
          }}>{p.role}</div>
            <input
            value={p.name}
            onChange={(e) => {
              const next = [...pirates];next[i] = { ...next[i], name: e.target.value };
              setPirates(next);
            }}
            style={{
              width: '100%',
              fontFamily: 'var(--font-body)', fontSize: 19, fontWeight: 500,
              background: 'transparent',
              border: 'none', borderBottom: '2px dashed rgba(93,63,42,0.4)',
              outline: 'none', padding: '4px 2px',
              color: 'var(--text-primary)', textAlign: 'right',
              direction: 'rtl'
            }} />
          </div>
          <div style={{ position: 'absolute', top: -6, left: -2 }}>
            <FlagBadge color={p.color} size={26} waving />
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
        <PlankButton variant="cream" size="md" onClick={onSkip}>דלג</PlankButton>
        <PlankButton onClick={onNext} size="md">צא לדרך! ⚓</PlankButton>
      </div>
    </div>);

}

// ─────────────────────────────────────────────────────────────
// Onboarding step 3 — Crew ready
// ─────────────────────────────────────────────────────────────
function ScreenCrewReady({ pirates, onNext }) {
  return (
    <div data-screen-label="03 Crew Ready" style={{ position: 'absolute', inset: 0 }}>
      <HarborScene />
      <h1 style={{
        position: 'absolute', top: 90, left: 0, right: 0, textAlign: 'center',
        fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700,
        color: 'var(--text-primary)',
        textShadow: '0 1px 0 rgba(255,255,255,0.4)',
        margin: 0, padding: '0 24px'
      }}>הצוות שלכם מוכן!</h1>

      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 240,
        display: 'flex', justifyContent: 'center', gap: 14, alignItems: 'flex-end'
      }}>
        {pirates.map((p, i) =>
        <div key={p.kind} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          transform: `translateY(${[0, -10, 0][i]}px) rotate(${[-3, 0, 3][i]}deg)`
        }}>
            <PirateAvatar kind={p.kind} size={92} />
            <div style={{
            fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700,
            color: 'var(--text-primary)', marginTop: 6,
            background: 'var(--sand-cream)', padding: '2px 10px', borderRadius: 12,
            border: '1.5px solid rgba(93,63,42,0.3)'
          }}>{p.name}</div>
          </div>
        )}
      </div>

      {/* deck under pirates */}
      <div style={{
        position: 'absolute', left: 30, right: 30, bottom: 220, height: 14,
        background: 'linear-gradient(180deg, #A87B5A, #5D3F2A)',
        borderRadius: '50% 50% 6px 6px / 100% 100% 6px 6px'
      }} />

      <div style={{ position: 'absolute', left: 24, right: 24, bottom: 60 }}>
        <PlankButton onClick={onNext}>🏴‍☠️ הפלגה חדשה</PlankButton>
      </div>
      <OnboardingDots step={2} />
    </div>);

}

// ─────────────────────────────────────────────────────────────
// Home screen
// ─────────────────────────────────────────────────────────────
function ScreenHome({ pirates, onNewVoyage, onMap, onSettings, islandsCount = 0 }) {
  return (
    <div data-screen-label="04 Home" style={{ position: 'absolute', inset: 0 }}>
      <HarborScene />

      {/* Ship anchored in middle */}
      <div style={{
        position: 'absolute', left: '50%', top: 220, transform: 'translateX(-50%)'
      }}>
        <PirateShip
          width={320}
          cargo={[0, 0, 0]}
          colors={pirates.map((p) => p.color)}
          sailing
          bobbing />
      </div>

      {/* compass top corner (RTL: top-leading = top-right) */}
      <button onClick={onSettings} aria-label="Settings" style={{
        position: 'absolute', top: 64, right: 18,
        background: 'rgba(251,241,220,0.85)', border: 'none',
        width: 44, height: 44, borderRadius: 22,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 2px 6px rgba(93,63,42,0.25), inset 0 0 0 1.5px rgba(93,63,42,0.4)',
        cursor: 'pointer'
      }}>
        <CompassIcon size={26} />
      </button>

      {/* islands counter chip — also opens the map */}
      <button onClick={onMap} aria-label="Open map" style={{
        position: 'absolute', top: 70, left: 18,
        background: 'rgba(251,241,220,0.85)', borderRadius: 20,
        padding: '6px 12px', border: 'none', cursor: 'pointer',
        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16,
        color: 'var(--text-primary)',
        boxShadow: '0 2px 6px rgba(93,63,42,0.25), inset 0 0 0 1.5px rgba(93,63,42,0.4)',
        display: 'flex', alignItems: 'center', gap: 6
      }}>
        <MapIcon size={20} /> {islandsCount}
      </button>

      {/* Buttons */}
      <div style={{
        position: 'absolute', left: 22, right: 22, bottom: 50,
        display: 'flex', flexDirection: 'column', gap: 14
      }}>
        <PlankButton onClick={onNewVoyage} size="lg" style={{ height: 72, fontSize: 24 }}>
          🏴‍☠️ הפלגה חדשה
        </PlankButton>
        <PlankButton onClick={onMap} variant="sand" size="md" style={{ height: 56 }}>
          🗺️ מפת האוצר
        </PlankButton>
      </div>
    </div>);

}

// ─────────────────────────────────────────────────────────────
// Roll Call modal
// ─────────────────────────────────────────────────────────────
function ScreenRollCall({ pirates, onCancel, onSetSail }) {
  const [active, setActive] = useStateA(pirates.map(() => true));
  const count = active.filter(Boolean).length;
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 10 }}>
      {/* dimmed backdrop */}
      <div onClick={onCancel} style={{
        position: 'absolute', inset: 0, background: 'rgba(30,40,50,0.55)',
        animation: 'fadeUp 250ms ease-out'
      }} />
      {/* modal */}
      <div data-screen-label="05 Roll Call" style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: 'rgba(240,212,155,0.97)',
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        padding: '20px 20px 38px',
        animation: 'slideUp 350ms ease-out',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.3)'
      }} className="tex-grain">
        {/* rope pattern at top */}
        <div style={{
          height: 8, marginBottom: 14,
          background: `repeating-linear-gradient(45deg,
            #A87B5A 0 6px, #5D3F2A 6px 12px)`,
          borderRadius: 4
        }} />
        {/* drag handle */}
        <div style={{
          width: 44, height: 5, background: 'rgba(93,63,42,0.4)',
          borderRadius: 4, margin: '0 auto 14px'
        }} />
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700,
          textAlign: 'center', color: 'var(--text-primary)',
          margin: '0 0 18px'
        }}>מי מפליג היום?</h2>
        {pirates.map((p, i) =>
        <div key={p.kind} className="painted-shadow" style={{
          background: 'var(--surface-card)',
          borderRadius: 18, padding: '12px 14px',
          marginBottom: 10,
          display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', gap: 12,
          border: '2px solid rgba(93,63,42,0.25)',
          position: 'relative',
          opacity: active[i] ? 1 : 0.75
        }}>
            <PirateAvatar kind={p.kind} size={64} sleeping={!active[i]} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
                {p.name}
              </div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-secondary)' }}>
                {active[i] ? 'מפליג!' : 'נח'}
              </div>
            </div>
            {/* big toggle */}
            <button onClick={() => {
            const next = [...active];next[i] = !next[i];setActive(next);
          }} style={{
            width: 76, height: 40, borderRadius: 22,
            background: active[i] ? p.color : '#C0B5A6',
            border: 'none', cursor: 'pointer',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.25)',
            position: 'relative',
            transition: 'background 200ms'
          }} aria-label="Toggle">
              <div style={{
              position: 'absolute', top: 4, left: active[i] ? 4 : 40,
              width: 32, height: 32, borderRadius: 16,
              background: 'var(--surface-card)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
              transition: 'left 220ms cubic-bezier(0.34, 1.56, 0.64, 1)'
            }} />
            </button>
            <div style={{ position: 'absolute', top: -4, right: 8 }}>
              <FlagBadge color={p.color} size={20} waving={active[i]} />
            </div>
          </div>
        )}

        <div style={{ marginTop: 14 }}>
          {count === 0 &&
          <div style={{
            textAlign: 'center', color: 'var(--treasure-red)',
            fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600,
            marginBottom: 10
          }}>
              אף אחד לא מפליג? בלתי אפשרי! 🤨
            </div>
          }
          <PlankButton onClick={() => onSetSail(active)} disabled={count === 0}>
            ⚓ מפליגים!
          </PlankButton>
        </div>
      </div>
    </div>);

}

Object.assign(window, {
  PlankButton, ScreenWelcome, ScreenNames, ScreenCrewReady, ScreenHome, ScreenRollCall
});