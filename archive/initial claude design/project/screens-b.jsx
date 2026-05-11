/* global React */
// screens-b.jsx — During Drive, Spyglass Peek, End-of-Voyage Reveal

const { useState: useStateB, useEffect: useEffectB, useRef: useRefB } = React;

// ─────────────────────────────────────────────────────────────
// During-Drive Screen
// ─────────────────────────────────────────────────────────────
function ScreenDrive({ pirates, active, currentIdx, setCurrentIdx, elapsed, onSpyglass, onEndVoyage }) {
  const showSpyglassHint = elapsed > 5 * 60;
  const [holdProgress, setHoldProgress] = useStateB(0);
  const holdRef = useRefB(null);

  const startHold = () => {
    const start = Date.now();
    holdRef.current = setInterval(() => {
      const p = Math.min(1, (Date.now() - start) / 1000);
      setHoldProgress(p);
      if (p >= 1) {clearInterval(holdRef.current);onEndVoyage();}
    }, 20);
  };
  const cancelHold = () => {
    clearInterval(holdRef.current);setHoldProgress(0);
  };

  return (
    <div data-screen-label="06 During Drive" style={{ position: 'absolute', inset: 0 }}>
      <SubtleWaves />
      {/* Spyglass top corner (RTL: top-leading = top-right) */}
      <div style={{ position: 'absolute', top: 60, right: 18 }}>
        <SpyglassIcon size={56} glow={showSpyglassHint}
        onClick={onSpyglass} />
        <div onClick={onSpyglass} style={{
          position: 'absolute', inset: 0, cursor: 'pointer'
        }} />
      </div>

      {/* Three pirate buttons */}
      <div style={{
        position: 'absolute', left: 16, right: 16, top: 130, bottom: 100,
        display: 'flex', flexDirection: 'column', gap: 15, justifyContent: 'center', alignItems: "center"
      }}>
        {pirates.map((p, i) => {
          const isActive = active[i] && currentIdx === i;
          const satOut = !active[i];
          return (
            <button key={p.kind}
            disabled={satOut}
            onClick={() => active[i] && setCurrentIdx(i)}
            style={{
              position: 'relative',
              border: 'none',
              borderRadius: 22,
              padding: '12px 18px',
              cursor: satOut ? 'not-allowed' : 'pointer',
              opacity: satOut ? 0.5 : 1,
              background: `
                  linear-gradient(180deg, rgba(255,255,255,0.18), rgba(0,0,0,0.06)),
                  repeating-linear-gradient(180deg, rgba(93,63,42,0.10) 0 1px, transparent 1px 8px),
                  ${blendColor(p.color, isActive ? 0.45 : 0.15)}`,
              boxShadow: isActive ?
              `inset 0 0 0 3px ${p.color},
                     inset 0 -4px 0 rgba(93,63,42,0.18),
                     0 0 0 5px rgba(${hexToRgb(p.color)},0.25),
                     0 0 38px ${p.color}88,
                     0 0 80px ${p.color}55` :
              `inset 0 0 0 2px rgba(93,63,42,0.45),
                     inset 0 -3px 0 rgba(93,63,42,0.15),
                     0 4px 0 rgba(93,63,42,0.18),
                     0 6px 14px rgba(93,63,42,0.14)`,
              transition: 'box-shadow 220ms, background 220ms, transform 120ms',
              transform: isActive ? 'translateY(-1px)' : 'translateY(0)',
              animation: isActive ? 'glowPulse 1.5s ease-in-out infinite' : 'none',
              display: 'flex', flexDirection: 'row-reverse', alignItems: 'center',
              backgroundSize: "auto",
              width: '100%', flexShrink: 0, height: "150px", gap: "14px"
            }}>
              <PirateAvatar kind={p.kind} size={72} sleeping={satOut} />
              <div style={{ flex: 1, textAlign: 'right' }}>
                <div style={{
                  fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700,
                  color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8,
                  flexDirection: 'row-reverse', justifyContent: 'flex-start'
                }}>
                  {p.name}
                  {isActive && <span style={{ fontSize: 22, animation: 'softPulse 1.4s infinite' }}>🎵</span>}
                </div>
                {isActive &&
                <div style={{ ...{
                    fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500,
                    color: p.color, marginTop: 2, letterSpacing: 0.3,
                    fontStyle: 'italic'
                  }, color: "rgb(0, 0, 0)" }}>
                    מאזין/ה עכשיו
                  </div>
                }
                {satOut &&
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--text-secondary)' }}>
                    נח היום
                  </div>
                }
              </div>
              {/* Music wave bars while active */}
              {isActive &&
              <div aria-hidden="true" style={{
                position: 'absolute', insetInlineEnd: 18, bottom: 12,
                display: 'flex', alignItems: 'flex-end', gap: 3, height: 18, color: "rgb(0, 0, 0)"
              }}>
                  {[0, 1, 2, 3].map((b) =>
                <span key={b} style={{
                  width: 3, background: '#1a1a1a', borderRadius: 2,
                  animation: `musicBar 900ms ${b * 110}ms ease-in-out infinite`
                }} />
                )}
                </div>
              }
              <div style={{ position: 'absolute', top: 12, left: 12 }}>
                <FlagBadge color={p.color} size={24} waving={isActive} />
              </div>
            </button>);

        })}
      </div>

      {/* End voyage — bottom trailing (RTL: bottom-left) */}
      <div style={{
        position: 'absolute', bottom: 36, left: 16,
        width: 130, height: 44,
        borderRadius: 14,
        background: `
          linear-gradient(180deg, rgba(255,255,255,0.2), rgba(0,0,0,0.05)),
          var(--wood-light)`,
        boxShadow: 'inset 0 0 0 2px rgba(93,63,42,0.5), 0 3px 0 rgba(93,63,42,0.18)',
        position: 'absolute', overflow: 'hidden', cursor: 'pointer',
        userSelect: 'none', touchAction: 'none'
      }}
      onMouseDown={startHold} onMouseUp={cancelHold} onMouseLeave={cancelHold}
      onTouchStart={startHold} onTouchEnd={cancelHold} onTouchCancel={cancelHold}>
        
        {/* fill progress */}
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: `${holdProgress * 100}%`,
          background: 'var(--wood-deep)',
          transition: 'width 50ms linear'
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 16,
          color: holdProgress > 0.4 ? '#FBF1DC' : 'var(--text-primary)',
          transition: 'color 100ms'
        }}>🪵 סיימו הפלגה

        </div>
        {/* rope ties at the ends */}
        <div style={{ position: 'absolute', top: 6, left: -2, width: 6, height: 32, background: 'repeating-linear-gradient(0deg, #5D3F2A 0 3px, #A87B5A 3px 6px)', borderRadius: 3, opacity: 0.7 }} />
        <div style={{ position: 'absolute', top: 6, right: -2, width: 6, height: 32, background: 'repeating-linear-gradient(0deg, #5D3F2A 0 3px, #A87B5A 3px 6px)', borderRadius: 3, opacity: 0.7 }} />
      </div>

      {/* tiny atmosphere chip at bottom-trailing-opposite — none, calm */}
    </div>);

}

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16),g = parseInt(h.slice(2, 4), 16),b = parseInt(h.slice(4, 6), 16);
  return `${r},${g},${b}`;
}
function blendColor(hex, opacity) {
  return `linear-gradient(0deg, ${hex}${Math.round(opacity * 255).toString(16).padStart(2, '0')}, ${hex}${Math.round(opacity * 255).toString(16).padStart(2, '0')}), var(--wood-light)`;
}

// ─────────────────────────────────────────────────────────────
// Spyglass Peek
// ─────────────────────────────────────────────────────────────
function ScreenSpyglass({ pirates, active, minutes, onClose }) {
  const activeMins = minutes.filter((_, i) => active[i]);
  const max = Math.max(...activeMins, 1);
  const tier = computeTier(minutes, active);
  const stacks = minutes.map((m, i) => {
    if (!active[i]) return 0;
    if (m === 0) return 1;
    return Math.max(1, Math.round(m / max * 7));
  });
  const harborIcon =
  <svg width="22" height="18" viewBox="0 0 28 22" style={{ verticalAlign: 'middle', marginLeft: 4 }} aria-hidden="true">
      {/* water line */}
      <path d="M1 18 Q5 16 9 18 T17 18 T27 18" stroke="#3a6b7a" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      {/* dock/pier */}
      <rect x="2" y="11" width="14" height="3" fill="#5D3F2A" />
      <rect x="3.5" y="14" width="1.6" height="4" fill="#5D3F2A" />
      <rect x="13" y="14" width="1.6" height="4" fill="#5D3F2A" />
      {/* moored ship */}
      <path d="M16 14 L26 14 L24 17 L18 17 Z" fill="#A87B5A" stroke="#5D3F2A" strokeWidth="0.8" />
      <rect x="20.4" y="7" width="0.9" height="7" fill="#5D3F2A" />
      <path d="M21.3 7 L24.5 11 L21.3 11 Z" fill="#FBF1DC" />
      {/* mooring rope */}
      <path d="M14 13 Q15.5 12.5 17 13.5" stroke="#5D3F2A" strokeWidth="0.7" fill="none" />
    </svg>;

  const banner = {
    fair: { tier: 'fair', text: '⛵ רוח גבית, ימאים!' },
    coastal: { tier: 'coastal', text: '🌊 הספינה קצת נטויה...' },
    harbor: { tier: 'harbor', text: <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{harborIcon}<span>לא הוגן, אתם לא זזים</span></span> }
  }[tier];

  const SHIP_W = 340;

  return (
    <div data-screen-label="07 Spyglass" style={{
      position: 'absolute', inset: 0,
      background: 'linear-gradient(180deg, #C5E0E8 0%, #5FA8C7 55%, #1E5F7A 100%)',
      animation: 'fadeUp 280ms ease-out',
      overflow: 'hidden',
      zIndex: 5
    }}>
      {/* X close button — top-left */}
      <button onClick={onClose} aria-label="Close" style={{
        position: 'absolute', top: 56, left: 16, zIndex: 10,
        width: 44, height: 44, borderRadius: '50%',
        border: 'none', cursor: 'pointer',
        background: 'rgba(251,241,220,0.9)',
        boxShadow: '0 2px 0 rgba(93,63,42,0.35), 0 4px 12px rgba(0,0,0,0.18)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22, fontWeight: 700, color: 'var(--wood-deep)',
        fontFamily: 'var(--font-body)'
      }}>✕</button>

      {/* Tier banner — centered, 20px below the X close button, with 25px gutters */}
      <div style={{
        position: 'absolute', top: 120, left: 25, right: 25, zIndex: 6,
        pointerEvents: 'none'
      }}>
        <PennantBanner tier={banner.tier}>{banner.text}</PennantBanner>
      </div>

      {/* Ship + avatars overlay — centered on screen.
           Outer wrapper handles centering; inner wrapper handles fade-in (opacity only,
           so the centering transform isn't clobbered by the animation's transform). */}
      <div style={{
        position: 'absolute', left: '50%', top: '52%', transform: 'translate(-50%, -50%)',
        width: SHIP_W
      }}>
      <div style={{ animation: 'fadeOnly 360ms ease-out 120ms backwards' }}>
        {(() => {
            // Filter to active pirates only — skip sat-out ones entirely.
            // Reverse the filtered order so RTL reads kid, mom, dad.
            const activeIdx = [0, 1, 2].filter((i) => active[i]);
            const ltrIdx = [...activeIdx].reverse();
            const filteredCargo = ltrIdx.map((i) => stacks[i]);
            const filteredColors = ltrIdx.map((i) => pirates[i].color);
            return (
              <>
              {/* Avatars over each cargo zone — order matches the ship's LTR mast order */}
              <div style={{
                  position: 'absolute', left: 0, right: 0, top: -61,
                  display: 'flex', justifyContent: 'space-around',
                  pointerEvents: 'none', direction: 'ltr', zIndex: 4
                }}>
                {ltrIdx.map((i) => {
                    const p = pirates[i];
                    return (
                      <div key={p.kind} style={{
                        width: 70, display: 'flex', flexDirection: 'column',
                        alignItems: 'center'
                      }}>
                      <PirateAvatar kind={p.kind} size={56} />
                    </div>);

                  })}
              </div>

              <PirateShip width={SHIP_W}
                cargo={filteredCargo}
                colors={filteredColors}
                sailing={false} bobbing={true} />
            </>);

          })()}
      </div>
      </div>

      {/* Water foreground */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, height: 120,
        background: 'linear-gradient(0deg, #1E5F7A 0%, #2E7794 70%, transparent 100%)'
      }} />
      {/* subtle wave shimmer */}
      <svg viewBox="0 0 400 60" preserveAspectRatio="none" style={{
        position: 'absolute', left: 0, right: 0, bottom: 80, width: '100%', height: 40,
        opacity: 0.5
      }}>
        <path d="M0 30 Q 50 18 100 30 T 200 30 T 300 30 T 400 30 V60 H0 Z" fill="#C5E0E8" />
      </svg>
    </div>);

}

function computeTier(minutes, active, fairThreshold = 0.6, harborThreshold = 0.75) {
  const considered = minutes.filter((_, i) => active[i]);
  const total = considered.reduce((a, b) => a + b, 0);
  if (total === 0) return 'harbor';
  const max = Math.max(...considered);
  const share = max / total;
  if (considered.length === 1) return 'fair';
  if (share <= fairThreshold) return 'fair';
  if (share <= harborThreshold) return 'coastal';
  return 'harbor';
}

// ─────────────────────────────────────────────────────────────
// End-of-Voyage Reveal — multi-stage cinematic
// ─────────────────────────────────────────────────────────────
function ScreenReveal({ pirates, active, minutes, onDone, unlockIsland, coastalFind }) {
  const tier = computeTier(minutes, active);
  const [stage, setStage] = useStateB(0);

  useEffectB(() => {
    const timers = [
    setTimeout(() => setStage(1), 1500), // title
    setTimeout(() => setStage(2), 3200), // cargo loading
    setTimeout(() => setStage(3), 7500), // ship in full view
    setTimeout(() => setStage(4), 9500), // verdict animation
    setTimeout(() => setStage(5), 14500) // save button visible
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const max = Math.max(...minutes, 1);
  const stacks = minutes.map((m) => Math.max(0, Math.round(m / max * 8)));

  return (
    <div data-screen-label="08 Reveal" style={{ position: 'absolute', inset: 0, background: '#1E1612', overflow: 'hidden' }}>
      {/* base scene */}
      <div style={{ position: 'absolute', inset: 0, animation: stage >= 1 ? 'irisIn 1500ms ease-in-out' : 'none' }}>
        <HarborScene />
      </div>

      {/* stage 0: black with iris-out */}
      {stage === 0 &&
      <div style={{ position: 'absolute', inset: 0, background: '#1E1612' }} />
      }

      {/* stage 1: title card */}
      {stage >= 1 && stage < 3 &&
      <div style={{
        position: 'absolute', top: 120, left: 0, right: 0, textAlign: 'center',
        animation: 'splash 800ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        zIndex: 5
      }}>
          <div style={{
          display: 'inline-block', padding: '18px 32px',
          background: 'var(--treasure-gold)',
          borderRadius: 24, transform: 'rotate(-2deg)',
          boxShadow: '0 8px 0 rgba(93,63,42,0.5), 0 12px 30px rgba(0,0,0,0.4)',
          border: '3px solid var(--wood-deep)'
        }}>
            <div style={{
            fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 700,
            color: 'var(--text-primary)', textShadow: '0 1px 0 rgba(255,255,255,0.4)'
          }}>סוף ההפלגה!</div>
          </div>
          {/* paint splat */}
          <svg viewBox="0 0 200 60" width="240" height="60" style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', zIndex: -1, opacity: 0.6 }}>
            <ellipse cx="100" cy="30" rx="90" ry="22" fill="#C84B3B" />
            <ellipse cx="40" cy="20" rx="14" ry="6" fill="#C84B3B" />
            <ellipse cx="170" cy="40" rx="10" ry="5" fill="#C84B3B" />
          </svg>
        </div>
      }

      {/* stage 2-3: dock with pirates loading cargo */}
      {stage >= 2 && (() => {
        const activeIdx = [0, 1, 2].filter((i) => active[i]);
        const ltrIdx = [...activeIdx].reverse();
        const filteredCargo = ltrIdx.map((i) => stage >= 2 ? stacks[i] : 0);
        const filteredColors = ltrIdx.map((i) => pirates[i].color);
        const maxStack = Math.max(...filteredCargo, 0);
        return (
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 100, animation: 'fadeUp 600ms' }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ position: 'relative', width: 340 }}>
                <PirateShip width={340}
                cargo={filteredCargo}
                colors={filteredColors}
                sailing={stage >= 4 && tier === 'fair'}
                sailsFull={stage >= 4 && tier === 'fair'}
                bobbing={stage < 4} />
                {stage >= 2 &&
                <div style={{
                  position: 'absolute', left: 0, right: 0, bottom: '34%',
                  display: 'flex', justifyContent: 'space-around',
                  direction: 'ltr', pointerEvents: 'none', animation: 'fadeUp 500ms ease-out'
                }}>
                  {ltrIdx.map((i) => {
                    const p = pirates[i];
                    return (
                      <div key={p.kind} style={{
                        width: 70, display: 'flex', justifyContent: 'center',
                        transform: `translateY(-${maxStack * 18 + 4 + 5 + 56}px)`
                      }}>
                        <PirateAvatar kind={p.kind} size={56} />
                      </div>);

                  })}
                </div>
                }
              </div>
            </div>
            {/* gangplank */}
            <div style={{
              margin: '0 auto', width: 200, height: 12,
              background: 'linear-gradient(180deg, #A87B5A, #5D3F2A)',
              borderRadius: 6, marginTop: -8,
              boxShadow: '0 3px 0 rgba(0,0,0,0.3)'
            }} />
          </div>);

      })()
      }

      {/* stage 4: verdict */}
      {stage >= 4 &&
      <div style={{ position: 'absolute', top: 80, left: 24, right: 24, animation: 'fadeUp 700ms' }}>
          <PennantBanner tier={tier === 'fair' ? 'fair' : tier === 'coastal' ? 'coastal' : 'harbor'}>
            {tier === 'fair' && 'אי חדש התגלה!'}
            {tier === 'coastal' && 'מצאנו משהו על החוף!'}
            {tier === 'harbor' && 'הספינה קצת נטויה היום, ימאים!'}
          </PennantBanner>
        </div>
      }

      {/* Fair Winds: ship sails across, island appears */}
      {stage >= 4 && tier === 'fair' && unlockIsland &&
      <div style={{
        position: 'absolute', left: 0, right: 0, top: 180,
        display: 'flex', justifyContent: 'center',
        animation: 'fadeUp 1200ms ease-out 800ms backwards'
      }}>
          <div style={{ position: 'relative' }}>
            {/* fog (clearing) */}
            <div style={{
            position: 'absolute', inset: -20, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(197,224,232,0.95) 30%, transparent 80%)',
            animation: 'fogClear 2000ms ease-out 1000ms forwards'
          }} />
            <IslandIllustration island={unlockIsland} size={200} />
          </div>
        </div>
      }

      {/* Coastal: floating find by ship */}
      {stage >= 4 && tier === 'coastal' && coastalFind &&
      <div style={{
        position: 'absolute', left: '50%', top: 220, transform: 'translateX(-50%)',
        animation: 'fadeUp 1200ms ease-out 600ms backwards'
      }}>
          <CoastalFindIcon find={coastalFind} size={120} />
          <div style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontWeight: 700,
          fontSize: 18, color: '#FBF1DC',
          textShadow: '0 1px 0 rgba(0,0,0,0.4)', marginTop: -10 }}>
            {coastalFind.name}
          </div>
        </div>
      }

      {/* Harbor: pirates shrugging */}
      {stage >= 4 && tier === 'harbor' &&
      <div style={{
        position: 'absolute', left: 0, right: 0, top: 200,
        display: 'flex', justifyContent: 'center', gap: 12,
        animation: 'fadeUp 1000ms ease-out 600ms backwards'
      }}>
          {pirates.filter((_, i) => active[i]).map((p, i) =>
        <div key={p.kind} style={{
          transform: i === 1 ? 'rotate(-4deg)' : i === 0 ? 'rotate(2deg)' : 'rotate(0deg)'
        }}>
              <PirateAvatar kind={p.kind} size={70} />
              {i === 1 &&
          <div style={{ textAlign: 'center', marginTop: -8, fontSize: 24 }}>🤷</div>
          }
            </div>
        )}
        </div>
      }

      {/* Save & continue */}
      {stage >= 5 &&
      <div style={{
        position: 'absolute', left: 24, right: 24, bottom: 50,
        animation: 'fadeUp 500ms ease-out'
      }}>
          <PlankButton onClick={onDone}>שמור והתחל ⚓</PlankButton>
        </div>
      }
    </div>);

}

Object.assign(window, { ScreenDrive, ScreenSpyglass, ScreenReveal, computeTier });