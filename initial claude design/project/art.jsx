/* global React */
// art.jsx — hand-drawn-style placeholder illustrations made from simple SVG shapes
// All exports attached to window at the bottom for cross-script babel scope.

const { useEffect, useState, useRef, useMemo } = React;

// ─────────────────────────────────────────────────────────────
// Sky + ocean background scene
// ─────────────────────────────────────────────────────────────
function HarborScene({ children, time = "dawn" }) {
  // dawn: foam top → gold horizon
  return (
    <div style={{
      position: 'absolute', inset: 0, overflow: 'hidden',
      background: time === "dawn" ?
      `linear-gradient(180deg,
            #C5E0E8 0%,
            #E5C8A8 45%,
            #E5B23A 60%,
            #5FA8C7 70%,
            #1E5F7A 100%)` :
      `linear-gradient(180deg, #C5E0E8 0%, #5FA8C7 50%, #1E5F7A 100%)`
    }}>
      {/* sun */}
      <div style={{
        position: 'absolute', left: '50%', top: '38%', transform: 'translate(-50%, -50%)',
        width: 90, height: 90, borderRadius: '50%',
        background: 'radial-gradient(circle, #FCEAB6 0%, #F4B942 55%, rgba(244,185,66,0) 75%)',
        filter: 'blur(2px)'
      }} />
      {/* sun rays — soft */}
      <div style={{
        position: 'absolute', left: '50%', top: '38%', transform: 'translate(-50%, -50%)',
        width: 260, height: 260, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(252,234,182,0.5) 0%, rgba(252,234,182,0) 60%)'
      }} />
      {/* watercolor clouds */}
      <Cloud style={{ left: 30, top: 70, width: 90 }} />
      <Cloud style={{ right: 40, top: 110, width: 70 }} />
      {/* seagull drifters */}
      <div style={{
        position: 'absolute', top: 90, left: 0, width: 18, height: 12,
        animation: 'seagullDrift 9s linear infinite'
      }}>
        <Seagull />
      </div>
      <div style={{
        position: 'absolute', top: 150, left: 0, width: 14, height: 10,
        animation: 'seagullDrift 12s linear infinite 2s'
      }}>
        <Seagull />
      </div>
      {/* watercolor sea waves */}
      <svg viewBox="0 0 400 200" preserveAspectRatio="none" style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, width: '100%', height: '50%'
      }}>
        <defs>
          <linearGradient id="seaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5FA8C7" />
            <stop offset="100%" stopColor="#1E5F7A" />
          </linearGradient>
        </defs>
        <path d="M0,40 Q50,20 100,30 T200,30 T300,30 T400,30 L400,200 L0,200 Z" fill="url(#seaGrad)" opacity="0.95" />
        <path d="M0,80 Q60,60 120,72 T240,72 T360,72 T480,72 L480,200 L0,200 Z" fill="#1E5F7A" opacity="0.85" transform="translate(-40,0)" />
        <path d="M0,120 Q40,108 90,116 T180,116 T270,116 T360,116 T450,116 L450,200 L0,200 Z" fill="#1E5F7A" />
        {/* foam strokes */}
        <g stroke="#C5E0E8" strokeWidth="1.2" fill="none" opacity="0.55" strokeLinecap="round">
          <path d="M20,90 q12,-3 22,0" />
          <path d="M120,108 q14,-3 26,0" />
          <path d="M220,98 q12,-3 22,0" />
          <path d="M310,118 q14,-3 26,0" />
          <path d="M70,140 q12,-3 22,0" />
          <path d="M250,140 q14,-3 26,0" />
        </g>
      </svg>
      {children}
    </div>);

}

function Cloud({ style }) {
  return (
    <svg viewBox="0 0 100 40" style={{ position: 'absolute', opacity: 0.85, ...style }}>
      <ellipse cx="25" cy="25" rx="20" ry="12" fill="#FBF1DC" />
      <ellipse cx="50" cy="20" rx="22" ry="14" fill="#FBF1DC" />
      <ellipse cx="75" cy="26" rx="18" ry="10" fill="#FBF1DC" />
      <ellipse cx="50" cy="28" rx="35" ry="6" fill="#FBF1DC" opacity="0.7" />
    </svg>);

}

function Seagull({ size = 18, color = "#2A2620" }) {
  return (
    <svg width={size} height={size * 0.7} viewBox="0 0 20 14">
      <path d="M1 8 Q5 2 10 7 Q15 2 19 8" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>);

}

// ─────────────────────────────────────────────────────────────
// Pirate avatar — simple painted character heads
// ─────────────────────────────────────────────────────────────
function PirateAvatar({ kind = "kid", size = 80, sleeping = false }) {
  // kid: red bandana, mom: green scarf, dad: purple hat
  const palettes = {
    kid: { hat: "#E63946", skin: "#F4C794", hair: "#5D3F2A", shirt: "#A87B5A", trim: "#FBF1DC" },
    mom: { hat: "#2A9D8F", skin: "#F0C49B", hair: "#3A2418", shirt: "#1E5F7A", trim: "#E5B23A" },
    dad: { hat: "#7B4B94", skin: "#E8B98E", hair: "#3A2418", shirt: "#5D3F2A", trim: "#E5B23A" }
  };
  const p = palettes[kind];
  return (
    <div style={{ width: size, height: size, position: 'relative', filter: sleeping ? 'grayscale(0.6) opacity(0.5)' : 'none' }}>
      <svg viewBox="0 0 80 80" width={size} height={size}>
        {/* halo glow */}
        <circle cx="40" cy="40" r="36" fill={p.shirt} opacity="0.18" />
        {/* shoulders / shirt */}
        <path d="M10 78 Q10 56 40 56 Q70 56 70 78 L70 80 L10 80 Z" fill={p.shirt} />
        <path d="M22 60 Q40 52 58 60" stroke={p.trim} strokeWidth="2" fill="none" />
        {/* face */}
        <ellipse cx="40" cy="42" rx="20" ry="22" fill={p.skin} />
        {/* hair sideburn */}
        {kind !== "kid" && <path d="M22 40 Q20 50 24 56 Q28 50 28 44" fill={p.hair} />}
        {kind === "dad" &&
        <>
            {/* beard */}
            <path d="M24 50 Q40 70 56 50 Q56 60 50 64 Q40 68 30 64 Q24 60 24 50 Z" fill={p.hair} />
            {/* monocle */}
            <circle cx="50" cy="40" r="5" fill="none" stroke="#2A2620" strokeWidth="1.4" />
            <line x1="55" y1="42" x2="60" y2="48" stroke="#2A2620" strokeWidth="1" />
          </>
        }
        {kind === "mom" &&
        <>
            {/* hair tied back */}
            <path d="M22 32 Q26 22 40 22 Q54 22 58 32 Q56 28 40 28 Q24 28 22 32 Z" fill={p.hair} />
            {/* parrot on shoulder */}
            <g transform="translate(8 50)">
              <ellipse cx="6" cy="6" rx="6" ry="5" fill="#C84B3B" />
              <circle cx="9" cy="4" r="3" fill="#E5B23A" />
              <circle cx="10" cy="3.5" r="0.6" fill="#2A2620" />
              <path d="M11 4 l3 -1" stroke="#E5B23A" strokeWidth="1.4" />
            </g>
          </>
        }
        {kind === "kid" &&
        <>
            {/* gap-tooth grin */}
            <path d="M34 50 Q40 56 46 50" stroke="#2A2620" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          </>
        }
        {/* eyes */}
        <circle cx="33" cy="40" r="1.6" fill="#2A2620" />
        <circle cx={kind === "dad" ? "50" : "47"} cy="40" r="1.6" fill="#2A2620" />
        {/* hat / bandana */}
        {kind === "kid" &&
        <g>
            <path d="M18 28 Q40 14 62 28 L62 32 Q40 22 18 32 Z" fill={p.hat} />
            <circle cx="58" cy="29" r="2.5" fill={p.trim} />
            <path d="M62 30 l8 6 l-2 -8 z" fill={p.hat} />
          </g>
        }
        {kind === "mom" &&
        <g>
            <path d="M22 26 Q40 18 58 26 L58 30 Q40 22 22 30 Z" fill={p.hat} />
            <path d="M58 28 l10 4 l-4 -8" fill={p.hat} />
          </g>
        }
        {kind === "dad" &&
        <g>
            {/* tricorn hat */}
            <path d="M14 28 Q40 10 66 28 Q60 22 40 22 Q20 22 14 28 Z" fill={p.hat} />
            <path d="M14 28 Q40 22 66 28 Q66 32 40 32 Q14 32 14 28 Z" fill="#2A2620" opacity="0.4" />
            {/* skull */}
            <circle cx="40" cy="22" r="3" fill={p.trim} />
          </g>
        }
      </svg>
      {sleeping &&
      <div style={{ position: 'absolute', top: -2, right: -2, fontFamily: 'var(--font-display)',
        fontSize: 14, color: 'var(--text-secondary)', fontWeight: 'bold' }}>z<span style={{ fontSize: 10 }}>z</span><span style={{ fontSize: 8 }}>z</span></div>
      }
    </div>);

}

// ─────────────────────────────────────────────────────────────
// Pirate flag (small fabric pennant)
// ─────────────────────────────────────────────────────────────
function FlagBadge({ color, size = 22, waving = false }) {
  return (
    <svg width={size} height={size * 1.2} viewBox="0 0 22 26" style={{
      animation: waving ? 'pennantWave 2.4s ease-in-out infinite' : 'none',
      transformOrigin: '2px 50%'
    }}>
      <line x1="2" y1="0" x2="2" y2="26" stroke="#5D3F2A" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M3 2 Q12 4 20 3 L20 14 Q12 13 3 15 Z" fill={color} />
      <path d="M3 2 Q12 4 20 3 L20 14 Q12 13 3 15 Z" fill="rgba(0,0,0,0.12)" style={{ mixBlendMode: 'multiply' }} />
      <circle cx="11" cy="8" r="2.5" fill="#FBF1DC" opacity="0.85" />
    </svg>);

}

// ─────────────────────────────────────────────────────────────
// Cargo stack — barrels/sacks/chests, height proportional to count
// ─────────────────────────────────────────────────────────────
function CargoStack({ count = 3, color = "#E63946", width = 70 }) {
  const items = [];
  for (let i = 0; i < count; i++) items.push(i);
  const itemH = 22;
  const totalH = Math.max(itemH, count * (itemH - 4) + 4);
  return (
    <div style={{
      width, height: totalH + 4, position: 'relative',
      display: 'flex', flexDirection: 'column-reverse', alignItems: 'center'
    }}>
      {items.map((_, i) =>
      <CargoItem key={i} accent={color} style={{ marginTop: -4 }} />
      )}
    </div>);

}

function CargoItem({ accent = "#E63946", style }) {
  // Single cargo type — a colored crate/box, tinted by pirate flag.
  return (
    <svg width={56} height={24} viewBox="0 0 56 24" style={style}>
      <ellipse cx="28" cy="22" rx="22" ry="3" fill="rgba(0,0,0,0.2)" />
      <rect x="6" y="3" width="44" height="18" rx="3" fill={accent} />
      <rect x="6" y="3" width="44" height="18" rx="3" fill="url(#crateShade)" />
      <rect x="6" y="3" width="44" height="18" rx="3" fill="none" stroke="#2A2620" strokeWidth="1.6" />
      <line x1="6" y1="12" x2="50" y2="12" stroke="#2A2620" strokeWidth="1" opacity="0.5" />
      <defs>
        <linearGradient id="crateShade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.25)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.18)" />
        </linearGradient>
      </defs>
    </svg>);

}

// ─────────────────────────────────────────────────────────────
// Pirate Ship — three masts, three flags, three cargo zones
// ─────────────────────────────────────────────────────────────
function PirateShip({ width = 340, cargo = [3, 3, 3], colors = ["#E63946", "#2A9D8F", "#7B4B94"], sailing = false, sailsFull = false, bobbing = false }) {
  const h = width * 0.72;
  const n = cargo.length;
  const mastXs = n === 1 ? [200] : n === 2 ? [135, 265] : [100, 200, 300];
  return (
    <div style={{ width, height: h, position: 'relative',
      animation: bobbing ? 'bob 2.5s ease-in-out infinite' : 'none' }}>
      <svg viewBox="0 0 400 290" width={width} height={h}>
        <defs>
          <linearGradient id="hull" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#A87B5A" />
            <stop offset="60%" stopColor="#7A5238" />
            <stop offset="100%" stopColor="#5D3F2A" />
          </linearGradient>
          <linearGradient id="sail" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FBF1DC" />
            <stop offset="100%" stopColor="#E5C8A8" />
          </linearGradient>
        </defs>
        {/* Masts */}
        {mastXs.map((x, i) =>
        <line key={i} x1={x} y1="30" x2={x} y2="180" stroke="#5D3F2A" strokeWidth="6" strokeLinecap="round" />
        )}
        {/* Sails — only if sailing */}
        {sailing && mastXs.map((x, i) =>
        <g key={i}>
            <path d={sailsFull ?
          `M${x - 32} 50 Q${x} 40 ${x + 32} 50 L${x + 34} 110 Q${x} 124 ${x - 34} 110 Z` :
          `M${x - 22} 50 Q${x} 46 ${x + 22} 50 L${x + 24} 110 Q${x} 116 ${x - 24} 110 Z`}
          fill="url(#sail)" stroke="#5D3F2A" strokeWidth="1.4" />
            <line x1={x - 22} y1="80" x2={x + 22} y2="80" stroke="#5D3F2A" strokeWidth="0.8" opacity="0.4" />
          </g>
        )}
        {/* Flags — at top of each mast */}
        {mastXs.map((x, i) =>
        <g key={i}>
            <path d={`M${x + 1} 30 Q${x + 12} 32 ${x + 22} 30 L${x + 22} 44 Q${x + 12} 46 ${x + 1} 44 Z`}
          fill={colors[i]} />
            <circle cx={x + 11} cy={37} r="3" fill="#FBF1DC" opacity="0.85" />
          </g>
        )}
        {/* Hull — curved boat */}
        <path d="M30 200 Q50 180 100 180 L300 180 Q350 180 370 200 L340 250 Q320 270 280 270 L120 270 Q80 270 60 250 Z"
        fill="url(#hull)" stroke="#3A2418" strokeWidth="2" />
        {/* hull planks */}
        <line x1="50" y1="220" x2="350" y2="220" stroke="#3A2418" strokeWidth="1" opacity="0.5" />
        <line x1="55" y1="240" x2="345" y2="240" stroke="#3A2418" strokeWidth="1" opacity="0.5" />
        {/* portholes */}
        <circle cx="120" cy="225" r="6" fill="#3A2418" />
        <circle cx="170" cy="225" r="6" fill="#3A2418" />
        <circle cx="220" cy="225" r="6" fill="#3A2418" />
        <circle cx="270" cy="225" r="6" fill="#3A2418" />
        <circle cx="120" cy="225" r="3.5" fill="#E5B23A" />
        <circle cx="170" cy="225" r="3.5" fill="#E5B23A" />
        <circle cx="220" cy="225" r="3.5" fill="#E5B23A" />
        <circle cx="270" cy="225" r="3.5" fill="#E5B23A" />
        {/* deck divider posts (mast feet) */}
        {mastXs.map((x, i) =>
        <line key={i} x1={x} y1="180" x2={x} y2="200" stroke="#5D3F2A" strokeWidth="6" />
        )}
        {/* deck tint */}
        <path d="M30 200 Q50 180 100 180 L300 180 Q350 180 370 200 Z" fill="#A87B5A" />
        <path d="M30 200 Q50 180 100 180 L300 180 Q350 180 370 200 Z" fill="rgba(93,63,42,0.18)" />
      </svg>
      {/* cargo stacks overlaid on deck zones — force LTR so order matches the SVG masts */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: '34%', height: 0,
        display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end',
        pointerEvents: 'none', direction: 'ltr'
      }}>
        {[...Array(n).keys()].map((i) =>
        <div key={i} style={{ width: 70, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', position: 'relative', top: -2 }}>
            <CargoStack count={cargo[i]} color={colors[i]} />
          </div>
        )}
      </div>
    </div>);

}

// ─────────────────────────────────────────────────────────────
// Compass / spyglass / map / anchor icons (custom, pirate-themed)
// ─────────────────────────────────────────────────────────────
function CompassIcon({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="14" fill="#E5B23A" stroke="#5D3F2A" strokeWidth="2" />
      <circle cx="16" cy="16" r="11" fill="#FBF1DC" />
      <path d="M16 5 L18 16 L16 27 L14 16 Z" fill="#C84B3B" />
      <path d="M5 16 L16 14 L27 16 L16 18 Z" fill="#5D3F2A" opacity="0.7" />
      <circle cx="16" cy="16" r="1.6" fill="#5D3F2A" />
      <text x="16" y="9" textAnchor="middle" fontSize="3.5" fill="#5D3F2A" fontFamily="serif" fontWeight="bold">N</text>
    </svg>);

}

function SpyglassIcon({ size = 56, glow = false }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(251,241,220,0.85)',
      boxShadow: glow ?
      '0 0 0 2px rgba(229,178,58,0.5), 0 0 22px rgba(229,178,58,0.65), 0 4px 10px rgba(93,63,42,0.25)' :
      '0 0 0 2px rgba(93,63,42,0.4), 0 4px 10px rgba(93,63,42,0.22)',
      animation: glow ? 'softPulse 3s ease-in-out infinite' : 'none',
      cursor: 'pointer'
    }}>
      <svg width={size * 0.65} height={size * 0.65} viewBox="0 0 32 32">
        <g transform="rotate(-30 16 16)">
          {/* small end */}
          <rect x="3" y="14" width="6" height="4" fill="#5D3F2A" />
          <rect x="3" y="13.5" width="6" height="1" fill="#E5B23A" />
          {/* mid tube */}
          <rect x="9" y="13" width="9" height="6" fill="#A87B5A" />
          <rect x="9" y="13" width="9" height="6" fill="url(#spyShade)" />
          {/* big end */}
          <rect x="18" y="11" width="11" height="10" fill="#5D3F2A" />
          <rect x="18" y="10.5" width="11" height="1.4" fill="#E5B23A" />
          <rect x="18" y="20.2" width="11" height="1.4" fill="#E5B23A" />
          <ellipse cx="29" cy="16" rx="1.4" ry="5" fill="#1E5F7A" />
        </g>
        <defs>
          <linearGradient id="spyShade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.3)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.2)" />
          </linearGradient>
        </defs>
      </svg>
    </div>);

}

function AnchorIcon({ size = 22, color = "#5D3F2A" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <circle cx="12" cy="5" r="2.4" fill="none" stroke={color} strokeWidth="1.8" />
      <line x1="12" y1="7.2" x2="12" y2="20" stroke={color} strokeWidth="2" />
      <line x1="8" y1="10" x2="16" y2="10" stroke={color} strokeWidth="1.8" />
      <path d="M4 14 Q4 20 12 21 Q20 20 20 14" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>);

}

function MapIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d="M3 5 L9 4 L15 6 L21 5 L21 19 L15 20 L9 18 L3 19 Z" fill="#F0D49B" stroke="#5D3F2A" strokeWidth="1.4" />
      <line x1="9" y1="4" x2="9" y2="18" stroke="#5D3F2A" strokeWidth="1" opacity="0.4" />
      <line x1="15" y1="6" x2="15" y2="20" stroke="#5D3F2A" strokeWidth="1" opacity="0.4" />
      <text x="12" y="13" textAnchor="middle" fontSize="6" fill="#C84B3B" fontWeight="bold">X</text>
    </svg>);

}

function PirateFlagIcon({ size = 20, color = "#2A2620" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <line x1="4" y1="2" x2="4" y2="22" stroke="#5D3F2A" strokeWidth="1.6" />
      <rect x="5" y="3" width="16" height="11" fill={color} />
      <circle cx="13" cy="8" r="2.4" fill="#FBF1DC" />
      <circle cx="11.8" cy="7.6" r="0.4" fill={color} />
      <circle cx="14.2" cy="7.6" r="0.4" fill={color} />
      <path d="M10 11 l6 0" stroke="#FBF1DC" strokeWidth="0.8" />
    </svg>);

}

// ─────────────────────────────────────────────────────────────
// Pennant banner (tier reveal)
// ─────────────────────────────────────────────────────────────
function PennantBanner({ tier, children }) {
  const colors = {
    fair: { bg: '#F4B942', edge: '#C8941F', text: '#2A2620' },
    coastal: { bg: '#6B95A0', edge: '#4A6E78', text: '#FBF1DC' },
    harbor: { bg: '#8C7A6B', edge: '#5D4F44', text: '#FBF1DC' }
  };
  const p = colors[tier] || colors.fair;
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg viewBox="0 0 320 64" preserveAspectRatio="none" style={{ height: 64, width: "100%", display: 'block' }}>
        <path d="M0 0 L320 0 L300 32 L320 64 L0 64 L20 32 Z" fill={p.bg} stroke={p.edge} strokeWidth="2" />
        {tier === 'fair' &&
        <g>
            {/* sun rays behind */}
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) =>
          <line key={i} x1="160" y1="32" x2={160 + Math.cos(i * Math.PI / 4) * 80} y2={32 + Math.sin(i * Math.PI / 4) * 30} stroke="#FCEAB6" strokeWidth="2" opacity="0.4" />
          )}
          </g>
        }
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: p.text,
        textShadow: tier === 'fair' ? '0 1px 0 rgba(255,255,255,0.4)' : '0 1px 2px rgba(0,0,0,0.25)'
      }}>{children}</div>
    </div>);

}

// ─────────────────────────────────────────────────────────────
// Island placeholder card — big colored circle + creature name
// ─────────────────────────────────────────────────────────────
function IslandIllustration({ island, size = 220 }) {
  // pseudo-random palette per island id
  if (!island) return null;
  const seed = island.id.charCodeAt(0) + island.id.charCodeAt(island.id.length - 1);
  const palettes = [
  ['#E5B23A', '#C84B3B'],
  ['#2A9D8F', '#1E5F7A'],
  ['#7B4B94', '#C5E0E8'],
  ['#F4B942', '#A87B5A'],
  ['#5FA8C7', '#FBF1DC'],
  ['#C84B3B', '#E5B23A']];

  const [c1, c2] = palettes[seed % palettes.length];
  return (
    <div style={{
      width: size, height: size, position: 'relative',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
    }}>
      <svg viewBox="0 0 220 220" width={size} height={size}>
        <defs>
          <radialGradient id={`isl-${island.id}`} cx="0.5" cy="0.4">
            <stop offset="0%" stopColor={c1} />
            <stop offset="70%" stopColor={c2} />
            <stop offset="100%" stopColor="#1E5F7A" />
          </radialGradient>
        </defs>
        {/* sea ring */}
        <circle cx="110" cy="110" r="100" fill="#5FA8C7" opacity="0.4" />
        <circle cx="110" cy="110" r="92" fill="#C5E0E8" opacity="0.5" />
        {/* island land */}
        <path d="M40 140 Q60 100 110 92 Q160 100 180 140 Q170 165 110 168 Q50 165 40 140 Z"
        fill={`url(#isl-${island.id})`} stroke="#5D3F2A" strokeWidth="2" />
        {/* palm or shape */}
        <line x1="100" y1="140" x2="92" y2="100" stroke="#5D3F2A" strokeWidth="3" />
        <path d="M92 100 q-20 -2 -22 -16 q12 4 22 8" fill="#2A9D8F" />
        <path d="M92 100 q22 -2 28 -18 q-14 4 -28 10" fill="#2A9D8F" />
        <path d="M92 100 q-4 -16 4 -28 q4 12 0 28" fill="#2A9D8F" />
        {/* X */}
        <text x="140" y="148" fontSize="20" fill="#C84B3B" fontFamily="serif" fontWeight="bold">×</text>
        {/* foam edges */}
        <path d="M50 152 Q70 156 110 156 Q150 156 170 152" stroke="#FBF1DC" strokeWidth="2" fill="none" opacity="0.7" />
      </svg>
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, textAlign: 'center',
        fontFamily: 'var(--font-map)', fontWeight: 700, fontSize: 18, color: '#5D3F2A',
        letterSpacing: 0.4
      }}>{island.creatureName}</div>
    </div>);

}

// ─────────────────────────────────────────────────────────────
// Coastal find — small icon
// ─────────────────────────────────────────────────────────────
function CoastalFindIcon({ find, size = 100 }) {
  if (!find) return null;
  // simple visual based on id keyword
  const kind = find.id;
  const c = "#E5B23A";
  return (
    <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg viewBox="0 0 80 80" width={size} height={size}>
        <circle cx="40" cy="40" r="36" fill="#C5E0E8" opacity="0.7" />
        <circle cx="40" cy="40" r="30" fill="#5FA8C7" opacity="0.4" />
        {kind === 'bottle-message' &&
        <g>
            <rect x="32" y="20" width="16" height="36" rx="6" fill="#2A9D8F" opacity="0.7" />
            <rect x="35" y="18" width="10" height="6" fill="#5D3F2A" />
            <rect x="35" y="32" width="10" height="20" fill="#FBF1DC" />
            <line x1="36" y1="38" x2="44" y2="38" stroke="#2A2620" strokeWidth="1" />
            <line x1="36" y1="42" x2="44" y2="42" stroke="#2A2620" strokeWidth="1" />
          </g>
        }
        {kind === 'rubber-duck' &&
        <g>
            <ellipse cx="40" cy="50" rx="22" ry="10" fill="#E5B23A" />
            <circle cx="52" cy="38" r="10" fill="#E5B23A" />
            <circle cx="55" cy="36" r="1.4" fill="#2A2620" />
            <path d="M58 40 l8 -1 l-8 4 z" fill="#C84B3B" />
          </g>
        }
        {kind === 'brass-key' &&
        <g>
            <circle cx="28" cy="40" r="10" fill="none" stroke="#E5B23A" strokeWidth="4" />
            <rect x="38" y="38" width="28" height="4" fill="#E5B23A" />
            <rect x="56" y="42" width="4" height="8" fill="#E5B23A" />
            <rect x="62" y="42" width="4" height="6" fill="#E5B23A" />
          </g>
        }
        {!['bottle-message', 'rubber-duck', 'brass-key'].includes(kind) &&
        <g>
            <circle cx="40" cy="40" r="20" fill={c} opacity="0.5" />
            <text x="40" y="46" textAnchor="middle" fontSize="22" fontFamily="var(--font-display)" fill="#5D3F2A" fontWeight="bold">?</text>
          </g>
        }
      </svg>
    </div>);

}

// Ocean wave background (subtle, for during-drive)
function SubtleWaves() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: 'var(--sand-cream)' }}>
      <svg viewBox="0 0 400 800" preserveAspectRatio="none" style={{ width: '100%', height: '100%', opacity: 0.4 }}>
        {Array.from({ length: 12 }).map((_, i) =>
        <path key={i}
        d={`M0 ${i * 70 + 30} Q40 ${i * 70 + 18} 80 ${i * 70 + 30} T160 ${i * 70 + 30} T240 ${i * 70 + 30} T320 ${i * 70 + 30} T400 ${i * 70 + 30}`}
        stroke="#C5E0E8" strokeWidth="1.4" fill="none" opacity="0.7" />
        )}
      </svg>
    </div>);

}

// expose
Object.assign(window, {
  HarborScene, Cloud, Seagull, PirateAvatar, FlagBadge, CargoStack, CargoItem,
  PirateShip, CompassIcon, SpyglassIcon, AnchorIcon, MapIcon, PirateFlagIcon,
  PennantBanner, IslandIllustration, CoastalFindIcon, SubtleWaves
});