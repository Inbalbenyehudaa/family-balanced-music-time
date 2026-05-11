# Implementation Diff — Music-Voyage Ship

Two effects to apply, each isolated to one file.

| Effect | File | Location |
|---|---|---|
| Sails breathing | `theme.css` + `art.jsx` | new keyframes + sail group `animation` |
| Music notes rising | `theme.css` + `art.jsx` | new keyframe + new JSX block above cargo |

---

## 1. `theme.css` — add three keyframes

Insert into the keyframes block (anywhere alongside the existing `@keyframes shipRock`, `sailFlutter`, etc.):

```css
/* Sails breathing — inflates on the beat, slackens between */
@keyframes sailBreathe {
  0%, 100% { transform: scaleX(0.96) scaleY(0.99) skewX(-1deg); }
  35%      { transform: scaleX(1.06) scaleY(1.02) skewX(1.5deg); }
  55%      { transform: scaleX(1.04) scaleY(1.015) skewX(0.5deg); }
}

/* Skull glow — pulses softly with the beat (optional helper) */
@keyframes skullPulse {
  0%, 100% { opacity: 0.0; transform: scale(0.9); }
  35%      { opacity: 0.55; transform: scale(1.15); }
  55%      { opacity: 0.4;  transform: scale(1.05); }
}

/* Music notes rising from cargo */
@keyframes noteRise {
  0%   { transform: translate(0, 0)      rotate(-6deg) scale(0.6); opacity: 0; }
  15%  {                                                            opacity: 0.95;
         transform: translate(2px, -10px)  rotate(0deg)  scale(1); }
  60%  { transform: translate(-6px, -55px) rotate(8deg)  scale(1.05); opacity: 0.85; }
  100% { transform: translate(8px, -110px) rotate(-4deg) scale(0.85); opacity: 0; }
}
```

> **Tip:** keep `sailBreathe` running ~3.8s and stagger per-mast delays by ~0.25s for a "live" feel.

---

## 2. `art.jsx` — `PirateShip` component, two edits

### 2a. Swap the sail animation from `sailFlutter` → `sailBreathe`

Inside the `{sailing && mastXs.map(...)}` block, change the wrapping `<g>`:

**Before**
```jsx
<g key={i} style={{
  transformOrigin: `${x}px ${top}px`,
  animation: 'sailFlutter 2.6s ease-in-out infinite',
  animationDelay: `${i * 0.2}s`
}}>
```

**After**
```jsx
<g key={i} style={{
  transformOrigin: `${x}px ${top}px`,
  animation: 'sailBreathe 3.8s ease-in-out infinite',
  animationDelay: `${i * 0.25}s`
}}>
```

### 2b. Insert the music-notes overlay just above the cargo overlay

Find the comment `{/* cargo stacks overlaid on deck zones ... */}` near the bottom of `PirateShip`'s return. Insert this block **immediately before** it:

```jsx
{/* Music notes rising from each pirate's cargo zone */}
{sailing && (
  <div style={{
    position: 'absolute', left: 0, right: 0, bottom: '40%', height: 0,
    display: 'flex', justifyContent: 'space-around',
    pointerEvents: 'none', direction: 'ltr'
  }}>
    {[...Array(n).keys()].map((i) => (
      <div key={i} style={{ width: 70, position: 'relative', height: 0 }}>
        {[0, 1.3, 2.6].map((delay, k) => (
          <span key={k} style={{
            position: 'absolute',
            left: `${20 + k * 14}%`,
            bottom: 0,
            fontSize: 18 + k * 2,
            color: colors[i],
            textShadow: '0 1px 0 rgba(255,255,255,0.5)',
            filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.25))',
            animation: `noteRise 3.2s ease-out ${delay + i * 0.4}s infinite`,
            fontWeight: 700,
            fontFamily: 'serif'
          }}>{k % 2 === 0 ? '♪' : '♫'}</span>
        ))}
      </div>
    ))}
  </div>
)}
```

Notes:
- Gated by `sailing` prop so notes only appear when the ship is actively voyaging.
- Each pirate's notes use that pirate's flag color (`colors[i]`).
- Three notes per pirate, staggered (`0`, `1.3`, `2.6`s) so the loop feels continuous.
- Per-pirate offset (`+ i * 0.4`) keeps the masts from emitting in lockstep.

---

## 3. Where the ship is rendered

For these effects to show, ensure call sites pass `sailing` (and ideally `sailsFull`, `bobbing`, `water`):

```jsx
<PirateShip
  width={340}
  cargo={filteredCargo}
  colors={filteredColors}
  sailing={true}
  sailsFull={true}
  bobbing={true}
  water={true}
/>
```

Reveal screen: pass `sailing={stage >= 4 && tier === 'fair'}` so notes/breathing kick in only on the celebratory stage.

---

## Acceptance check

- Sails subtly inflate/deflate on a ~3.8s loop, each mast slightly offset.
- Three music glyphs rise from each pirate's cargo zone, tinted in the pirate's flag color, fading as they reach the sails.
- No glyphs rendered when `sailing={false}` (e.g. docked ship).
