import type { CSSProperties, ReactNode } from 'react';
import type { Island, CoastalFind, PirateKind, Tier } from '../types';
import kidAvatarUrl from '../assets/avatars/kid.png';
import momAvatarUrl from '../assets/avatars/mom.png';
import dadAvatarUrl from '../assets/avatars/dad.png';
import bottleMessageUrl from '../assets/coastal-findings/bottle-message.png';
import brassKeyUrl from '../assets/coastal-findings/brass-key.jpeg';
import rubberDuckUrl from '../assets/coastal-findings/rubber-duck.jpeg';
import lonelySockUrl from '../assets/coastal-findings/lonely-sock.jpg';
import musicBoxUrl from '../assets/coastal-findings/music-box.jpeg';
import clothesPegUrl from '../assets/coastal-findings/clothes-peg.png';
import judoBeltUrl from '../assets/coastal-findings/judo-belt.jpeg';
import longStickUrl from '../assets/coastal-findings/long-stick.png';
import pastaStraitUrl from '../assets/islands/pasta-strait.png';
import candyIslandUrl from '../assets/islands/candy-island.png';
import cocoaBeachUrl from '../assets/islands/cocoa-beach.jpeg';
import libraryIslandUrl from '../assets/islands/library-island.jpeg';
import itamarsDreamsUrl from '../assets/islands/itamars-dreams.jpeg';
import pancakePointUrl from '../assets/islands/pancake-point.png';
import origamiIslandUrl from '../assets/islands/origami-island.png';
import adventureBayUrl from '../assets/islands/adventure-bay.jpeg';
import kinderEggIslandUrl from '../assets/islands/kinder-egg-island.png';
import redClickBayUrl from '../assets/islands/red-click-bay.png';
import glowLagoonUrl from '../assets/islands/glow-lagoon.png';
import peaIslandUrl from '../assets/islands/pea-island.png';
import bubbleBayUrl from '../assets/islands/bubble-bay.png';
import croissantBayUrl from '../assets/islands/croissant-bay.png';
import bambaPoolUrl from '../assets/islands/bamba-pool.jpeg';

const RASTER_AVATARS: Partial<Record<PirateKind, string>> = {
    kid: kidAvatarUrl,
    mom: momAvatarUrl,
    dad: dadAvatarUrl,
};

const COASTAL_FIND_IMAGES: Record<string, string> = {
    'bottle-message': bottleMessageUrl,
    'brass-key': brassKeyUrl,
    'rubber-duck': rubberDuckUrl,
    'lonely-sock': lonelySockUrl,
    'music-box': musicBoxUrl,
    'clothes-peg': clothesPegUrl,
    'judo-belt': judoBeltUrl,
    'long-stick': longStickUrl,
};

export const ISLAND_IMAGES: Record<string, string> = {
    'pasta-strait': pastaStraitUrl,
    'candy-island': candyIslandUrl,
    'cocoa-beach': cocoaBeachUrl,
    'library-island': libraryIslandUrl,
    'itamars-dreams': itamarsDreamsUrl,
    'pancake-point': pancakePointUrl,
    'origami-island': origamiIslandUrl,
    'adventure-bay': adventureBayUrl,
    'kinder-egg-island': kinderEggIslandUrl,
    'red-click-bay': redClickBayUrl,
    'glow-lagoon': glowLagoonUrl,
    'pea-island': peaIslandUrl,
    'bubble-bay': bubbleBayUrl,
    'croissant-bay': croissantBayUrl,
    'bamba-pool': bambaPoolUrl,
};

// ─────────────────────────────────────────────────────────────
// Sky + ocean background scene
// ─────────────────────────────────────────────────────────────
export function HarborScene({
    children,
    time = 'dawn',
}: {
    children?: ReactNode;
    time?: 'dawn' | 'day';
}) {
    return (
        <div
            style={{
                position: 'absolute',
                inset: 0,
                overflow: 'hidden',
                background:
                    time === 'dawn'
                        ? `linear-gradient(180deg,
            #C5E0E8 0%,
            #E5C8A8 45%,
            #E5B23A 60%,
            #5FA8C7 70%,
            #1E5F7A 100%)`
                        : `linear-gradient(180deg, #C5E0E8 0%, #5FA8C7 50%, #1E5F7A 100%)`,
            }}
        >
            {/* sun */}
            <div
                style={{
                    position: 'absolute',
                    left: '50%',
                    top: 'calc(38% - 60px)',
                    transform: 'translate(-50%, -50%)',
                    width: 90,
                    height: 90,
                    borderRadius: '50%',
                    background:
                        'radial-gradient(circle, #FCEAB6 0%, #F4B942 55%, rgba(244,185,66,0) 75%)',
                    filter: 'blur(2px)',
                }}
            />
            {/* sun rays — soft */}
            <div
                style={{
                    position: 'absolute',
                    left: '50%',
                    top: 'calc(38% - 60px)',
                    transform: 'translate(-50%, -50%)',
                    width: 260,
                    height: 260,
                    borderRadius: '50%',
                    background:
                        'radial-gradient(circle, rgba(252,234,182,0.5) 0%, rgba(252,234,182,0) 60%)',
                }}
            />
            {/* watercolor clouds */}
            <Cloud style={{ left: 30, top: 70, width: 90 }} />
            <Cloud style={{ right: 40, top: 110, width: 70 }} />
            {/* seagull drifters */}
            <div
                style={{
                    position: 'absolute',
                    top: 90,
                    left: 0,
                    width: 18,
                    height: 12,
                    animation: 'seagullDrift 9s linear infinite',
                }}
            >
                <Seagull />
            </div>
            <div
                style={{
                    position: 'absolute',
                    top: 150,
                    left: 0,
                    width: 14,
                    height: 10,
                    animation: 'seagullDrift 12s linear infinite 2s',
                }}
            >
                <Seagull />
            </div>
            {/* watercolor sea waves */}
            <svg
                viewBox="0 0 400 200"
                preserveAspectRatio="none"
                style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    width: '100%',
                    height: '50%',
                }}
            >
                <defs>
                    <linearGradient id="seaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#5FA8C7" />
                        <stop offset="100%" stopColor="#1E5F7A" />
                    </linearGradient>
                </defs>
                <path
                    d="M0,40 Q50,20 100,30 T200,30 T300,30 T400,30 L400,200 L0,200 Z"
                    fill="url(#seaGrad)"
                    opacity="0.95"
                />
                <path
                    d="M0,80 Q60,60 120,72 T240,72 T360,72 T480,72 L480,200 L0,200 Z"
                    fill="#1E5F7A"
                    opacity="0.85"
                    transform="translate(-40,0)"
                />
                <path
                    d="M0,120 Q40,108 90,116 T180,116 T270,116 T360,116 T450,116 L450,200 L0,200 Z"
                    fill="#1E5F7A"
                />
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
        </div>
    );
}

export function Cloud({ style }: { style?: CSSProperties }) {
    return (
        <svg viewBox="0 0 100 40" style={{ position: 'absolute', opacity: 0.85, ...style }}>
            <ellipse cx="25" cy="25" rx="20" ry="12" fill="#FBF1DC" />
            <ellipse cx="50" cy="20" rx="22" ry="14" fill="#FBF1DC" />
            <ellipse cx="75" cy="26" rx="18" ry="10" fill="#FBF1DC" />
            <ellipse cx="50" cy="28" rx="35" ry="6" fill="#FBF1DC" opacity="0.7" />
        </svg>
    );
}

export function Seagull({ size = 18, color = '#2A2620' }: { size?: number; color?: string }) {
    return (
        <svg width={size} height={size * 0.7} viewBox="0 0 20 14">
            <path
                d="M1 8 Q5 2 10 7 Q15 2 19 8"
                fill="none"
                stroke={color}
                strokeWidth="1.6"
                strokeLinecap="round"
            />
        </svg>
    );
}

// ─────────────────────────────────────────────────────────────
// Pirate avatar — simple painted character heads
// ─────────────────────────────────────────────────────────────
export function PirateAvatar({
    kind = 'kid',
    size = 80,
    sleeping = false,
}: {
    kind?: PirateKind;
    size?: number;
    sleeping?: boolean;
}) {
    const hatColor: Record<PirateKind, string> = {
        kid: '#E63946',
        mom: '#2A9D8F',
        dad: '#7B4B94',
    };
    const src = RASTER_AVATARS[kind] ?? RASTER_AVATARS.kid!;
    return (
        <div
            style={{
                width: size,
                height: size,
                position: 'relative',
                filter: sleeping ? 'grayscale(0.6) opacity(0.5)' : 'none',
            }}
        >
            {/* Raster avatar — clipped to a circle with the pirate's hat
                color as a faint halo behind it so it keeps visual weight
                at small sizes. */}
            <div
                style={{
                    width: size,
                    height: size,
                    borderRadius: '50%',
                    overflow: 'hidden',
                    background: `radial-gradient(circle, ${hatColor[kind]}22 0%, transparent 70%)`,
                }}
            >
                <img
                    src={src}
                    alt=""
                    width={size}
                    height={size}
                    draggable={false}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        // Nudge the crop up slightly so the face — not the
                        // shoulders — is the dominant element at small sizes.
                        objectPosition: 'center 20%',
                        display: 'block',
                        userSelect: 'none',
                    }}
                />
            </div>
            {sleeping && (
                <div
                    style={{
                        position: 'absolute',
                        top: -2,
                        right: -2,
                        fontFamily: 'var(--font-display)',
                        fontSize: 14,
                        color: 'var(--text-secondary)',
                        fontWeight: 'bold',
                    }}
                >
                    z<span style={{ fontSize: 10 }}>z</span>
                    <span style={{ fontSize: 8 }}>z</span>
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// Pirate flag (small fabric pennant)
// ─────────────────────────────────────────────────────────────
export function FlagBadge({
    color,
    size = 22,
    waving = false,
}: {
    color: string;
    size?: number;
    waving?: boolean;
}) {
    return (
        <svg
            width={size}
            height={size * 1.2}
            viewBox="0 0 22 26"
            style={{
                animation: waving ? 'pennantWave 2.4s ease-in-out infinite' : 'none',
                transformOrigin: '2px 50%',
            }}
        >
            <line x1="2" y1="0" x2="2" y2="26" stroke="#5D3F2A" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M3 2 Q12 4 20 3 L20 14 Q12 13 3 15 Z" fill={color} />
            <path
                d="M3 2 Q12 4 20 3 L20 14 Q12 13 3 15 Z"
                fill="rgba(0,0,0,0.12)"
                style={{ mixBlendMode: 'multiply' }}
            />
            <circle cx="11" cy="8" r="2.5" fill="#FBF1DC" opacity="0.85" />
        </svg>
    );
}

// ─────────────────────────────────────────────────────────────
// Cargo stack — barrels/sacks/chests, height proportional to count
// ─────────────────────────────────────────────────────────────
export function CargoStack({
    count = 3,
    color = '#E63946',
    width = 70,
}: {
    count?: number;
    color?: string;
    width?: number;
}) {
    const items: number[] = [];
    for (let i = 0; i < count; i++) items.push(i);
    const itemH = 22;
    const totalH = Math.max(itemH, count * (itemH - 4) + 4);
    return (
        <div
            style={{
                width,
                height: totalH + 4,
                position: 'relative',
                display: 'flex',
                flexDirection: 'column-reverse',
                alignItems: 'center',
            }}
        >
            {items.map((_, i) => (
                <CargoItem key={i} accent={color} style={{ marginTop: -4 }} />
            ))}
        </div>
    );
}

export function CargoItem({
    accent = '#E63946',
    style,
}: {
    accent?: string;
    style?: CSSProperties;
}) {
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
        </svg>
    );
}

// ─────────────────────────────────────────────────────────────
// Pirate Ship — three masts, three flags, three cargo zones
// ─────────────────────────────────────────────────────────────
export function PirateShip({
    width = 340,
    cargo = [3, 3, 3],
    colors = ['#E63946', '#2A9D8F', '#7B4B94'],
    sailing = false,
    sailsFull = false,
    bobbing = false,
}: {
    width?: number;
    cargo?: number[];
    colors?: string[];
    sailing?: boolean;
    sailsFull?: boolean;
    bobbing?: boolean;
}) {
    const n = cargo.length;
    const mastXs = n === 1 ? [200] : n === 2 ? [135, 265] : [100, 200, 300];
    // Center mast (only exists for n===3) is taller so we can perch a
    // crow's nest at the top — classic cartoon-ship silhouette.
    const centerIdx = n === 3 ? 1 : -1;
    const mastTopY = (i: number) => (i === centerIdx ? 12 : 30);
    return (
        <div
            style={{
                width: '100%',
                maxWidth: width,
                aspectRatio: '400 / 290',
                position: 'relative',
                margin: '0 auto',
                // Anchor for em-based music-note sizing. Bumped up so the
                // notes read clearly on the Home hero (320–420px wide) and
                // still degrade gracefully on the tiny map-corner ship.
                fontSize: 'clamp(12px, 8%, 32px)',
                animation: bobbing ? 'bob 2.5s ease-in-out infinite' : 'none',
            }}
        >
            <svg viewBox="0 0 400 290" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
                <defs>
                    <linearGradient id="hull" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#C89878" />
                        <stop offset="55%" stopColor="#A27554" />
                        <stop offset="100%" stopColor="#7C5638" />
                    </linearGradient>
                    <linearGradient id="sail" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FBF1DC" />
                        <stop offset="100%" stopColor="#E5C8A8" />
                    </linearGradient>
                    <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#F4E097" />
                        <stop offset="50%" stopColor="#E5B23A" />
                        <stop offset="100%" stopColor="#B8891F" />
                    </linearGradient>
                </defs>

                {/* Water ring — two expanding ripples at the waterline.
                    Gated by sailing so the docked ship sits still. */}
                {sailing && (
                    <g>
                        <ellipse
                            cx="200"
                            cy="270"
                            rx="190"
                            ry="14"
                            fill="none"
                            stroke="#C5E0E8"
                            strokeWidth="2"
                            opacity="0.7"
                            style={{
                                transformBox: 'fill-box',
                                transformOrigin: 'center',
                                animation: 'waterRing 2.8s ease-out infinite',
                            }}
                        />
                        <ellipse
                            cx="200"
                            cy="276"
                            rx="170"
                            ry="10"
                            fill="none"
                            stroke="#C5E0E8"
                            strokeWidth="1.4"
                            opacity="0.55"
                            style={{
                                transformBox: 'fill-box',
                                transformOrigin: 'center',
                                animation: 'waterRing 2.8s ease-out 1.4s infinite',
                            }}
                        />
                    </g>
                )}

                {/* Masts — center is taller so the crow's nest sits high. */}
                {mastXs.map((x, i) => (
                    <line
                        key={i}
                        x1={x}
                        y1={mastTopY(i)}
                        x2={x}
                        y2="180"
                        stroke="#5D3F2A"
                        strokeWidth="6"
                        strokeLinecap="round"
                    />
                ))}

                {/* Crow's nest on the center mast (n===3 only). Sits on
                    the mast right below the pennant. */}
                {centerIdx >= 0 && (
                    <g>
                        {/* support struts fanning out from the mast */}
                        <line x1="192" y1="38" x2="200" y2="30" stroke="#3A2418" strokeWidth="1.4" />
                        <line x1="208" y1="38" x2="200" y2="30" stroke="#3A2418" strokeWidth="1.4" />
                        {/* basket body */}
                        <path
                            d="M184 30 L216 30 L212 46 Q200 48 188 46 Z"
                            fill="#7A5238"
                            stroke="#3A2418"
                            strokeWidth="1.4"
                        />
                        {/* basket rim (gold trim to match hull) */}
                        <rect
                            x="183"
                            y="28"
                            width="34"
                            height="4"
                            rx="1.2"
                            fill="url(#gold)"
                            stroke="#8A6410"
                            strokeWidth="0.8"
                        />
                        {/* vertical staves */}
                        <line x1="192" y1="32" x2="193" y2="46" stroke="#3A2418" strokeWidth="0.8" opacity="0.6" />
                        <line x1="200" y1="32" x2="200" y2="47" stroke="#3A2418" strokeWidth="0.8" opacity="0.6" />
                        <line x1="208" y1="32" x2="207" y2="46" stroke="#3A2418" strokeWidth="0.8" opacity="0.6" />
                    </g>
                )}

                {/* Sails — billowing when sailing, furled (rolled up and
                    tied to the yardarm) otherwise. Each billowing sail
                    "breathes" on a 3.8s cycle, pivoting at the yardarm
                    (y=50) so it inflates downward. */}
                {mastXs.map((x, i) =>
                    sailing ? (
                        <g
                            key={i}
                            style={{
                                transformOrigin: `${x}px 50px`,
                                animation: `sailBreathe 3.8s ease-in-out ${i * 0.25}s infinite`,
                            }}
                        >
                            <path
                                d={
                                    sailsFull
                                        ? `M${x - 32} 60 Q${x} 50 ${x + 32} 60 L${x + 34} 120 Q${x} 134 ${x - 34} 120 Z`
                                        : `M${x - 22} 60 Q${x} 56 ${x + 22} 60 L${x + 24} 120 Q${x} 126 ${x - 24} 120 Z`
                                }
                                fill="url(#sail)"
                                stroke="#5D3F2A"
                                strokeWidth="1.4"
                            />
                            {/* yardarm (horizontal spar) in gold */}
                            <line
                                x1={x - (sailsFull ? 36 : 26)}
                                y1="58"
                                x2={x + (sailsFull ? 36 : 26)}
                                y2="58"
                                stroke="url(#gold)"
                                strokeWidth="2.2"
                                strokeLinecap="round"
                            />
                            <line
                                x1={x - 22}
                                y1="90"
                                x2={x + 22}
                                y2="90"
                                stroke="#5D3F2A"
                                strokeWidth="0.8"
                                opacity="0.4"
                            />
                        </g>
                    ) : (
                        <g key={i}>
                            {/* furled sail — rolled canvas slung under the yardarm */}
                            <path
                                d={`M${x - 24} 60 Q${x} 68 ${x + 24} 60 Q${x + 22} 66 ${x} 70 Q${x - 22} 66 ${x - 24} 60 Z`}
                                fill="url(#sail)"
                                stroke="#5D3F2A"
                                strokeWidth="1.2"
                                strokeLinejoin="round"
                            />
                            {/* yardarm (horizontal spar) in gold */}
                            <line
                                x1={x - 26}
                                y1="58"
                                x2={x + 26}
                                y2="58"
                                stroke="url(#gold)"
                                strokeWidth="2.2"
                                strokeLinecap="round"
                            />
                            {/* gaskets — short ties wrapping the furled canvas */}
                            <line
                                x1={x - 10}
                                y1="57"
                                x2={x - 10}
                                y2="69"
                                stroke="#5D3F2A"
                                strokeWidth="0.9"
                                opacity="0.7"
                            />
                            <line
                                x1={x + 10}
                                y1="57"
                                x2={x + 10}
                                y2="69"
                                stroke="#5D3F2A"
                                strokeWidth="0.9"
                                opacity="0.7"
                            />
                        </g>
                    ),
                )}

                {/* Flags — pennants at the top of each mast, waving on a
                    skew loop. Pivot at the mast so the free edge swings. */}
                {mastXs.map((x, i) => {
                    const y = mastTopY(i);
                    return (
                        <g
                            key={i}
                            style={{
                                transformBox: 'fill-box',
                                transformOrigin: '0% 50%',
                                animation: `flagWave 2.2s ease-in-out ${i * 0.18}s infinite`,
                            }}
                        >
                            <path
                                d={`M${x + 1} ${y} Q${x + 12} ${y + 2} ${x + 22} ${y} L${x + 22} ${y + 14} Q${x + 12} ${y + 16} ${x + 1} ${y + 14} Z`}
                                fill={colors[i]}
                            />
                            <circle
                                cx={x + 11}
                                cy={y + 7}
                                r="3"
                                fill="#FBF1DC"
                                opacity="0.85"
                            />
                        </g>
                    );
                })}

                {/* Hull — medium-brown cartoon silhouette matching the
                    reference: flatter top rail, gentle curve down to the
                    keel, no wide trim band. */}
                <path
                    d="M26 198 Q48 176 96 176 L304 176 Q352 176 374 198 L352 256 Q328 274 284 274 L116 274 Q72 274 48 256 Z"
                    fill="url(#hull)"
                    stroke="#3A2418"
                    strokeWidth="2.4"
                />

                {/* Deck-railing stakes — vertical posts along the top of
                    the hull, as in the reference. Shorter at the bow/stern
                    where the gunwale curves. */}
                {Array.from({ length: 22 }).map((_, k) => {
                    // Distribute from x=40 to x=360, skip where the masts sit.
                    const x = 40 + k * 14.5;
                    const nearMast = mastXs.some((mx) => Math.abs(mx - x) < 8);
                    if (nearMast) return null;
                    return (
                        <line
                            key={k}
                            x1={x}
                            y1="176.5"
                            x2={x}
                            y2="188"
                            stroke="#3A2418"
                            strokeWidth="1.2"
                            strokeLinecap="round"
                        />
                    );
                })}

                {/* Hull planks — subtle horizontals following the curve */}
                <path d="M46 208 Q200 200 354 208" stroke="#6B4730" strokeWidth="1" fill="none" opacity="0.45" />
                <path d="M42 240 Q200 232 358 240" stroke="#6B4730" strokeWidth="1" fill="none" opacity="0.4" />
                <path d="M56 260 Q200 256 344 260" stroke="#6B4730" strokeWidth="0.9" fill="none" opacity="0.3" />

                {/* Cannon hatches — small rounded squares matching the
                    reference: thin gold outline, dark interior, single
                    gold dot centered. Four evenly-spaced ports. */}
                {[110, 165, 220, 275].map((cx) => (
                    <g key={cx}>
                        {/* hatch interior */}
                        <rect
                            x={cx - 6}
                            y="218"
                            width="12"
                            height="12"
                            rx="2"
                            fill="#1A100A"
                            stroke="#E5B23A"
                            strokeWidth="1.4"
                        />
                        {/* center gold dot */}
                        <circle cx={cx} cy="224" r="1.6" fill="#E5B23A" />
                    </g>
                ))}

                {/* deck divider posts (mast feet) */}
                {mastXs.map((x, i) => (
                    <line key={i} x1={x} y1="180" x2={x} y2="198" stroke="#5D3F2A" strokeWidth="6" />
                ))}
                {/* deck tint — curved top of gunwale */}
                <path
                    d="M26 198 Q48 176 96 176 L304 176 Q352 176 374 198 Z"
                    fill="#B88763"
                />
                <path
                    d="M26 198 Q48 176 96 176 L304 176 Q352 176 374 198 Z"
                    fill="rgba(93,63,42,0.10)"
                />
            </svg>
            {/* cargo stacks overlaid on deck zones — force LTR so order matches the SVG masts */}
            <div
                style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: '34%',
                    height: 0,
                    display: 'flex',
                    justifyContent: 'space-around',
                    alignItems: 'flex-end',
                    pointerEvents: 'none',
                    direction: 'ltr',
                }}
            >
                {[...Array(n).keys()].map((i) => (
                    <div
                        key={i}
                        style={{
                            width: 70,
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'flex-end',
                            position: 'relative',
                            top: -2,
                        }}
                    >
                        <CargoStack count={cargo[i]} color={colors[i]} />
                    </div>
                ))}
            </div>
            {/* Music notes rising from each pirate's cargo zone — fixed
                3-note bloom per mast, tinted in that pirate's flag color.
                Only while sailing. Staggered delays so each column loops
                continuously; per-mast offset keeps the three masts from
                emitting in lockstep. */}
            {sailing && (
                <div
                    aria-hidden="true"
                    style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        bottom: '40%',
                        height: 0,
                        display: 'flex',
                        justifyContent: 'space-around',
                        pointerEvents: 'none',
                        direction: 'ltr',
                    }}
                >
                    {[...Array(n).keys()].map((i) => (
                        <div
                            key={i}
                            style={{ width: 70, position: 'relative', height: 0 }}
                        >
                            {[0, 1.3, 2.6].map((delay, k) => (
                                <span
                                    key={k}
                                    style={{
                                        position: 'absolute',
                                        left: `${14 + k * 16}%`,
                                        bottom: 0,
                                        // 1.6em | 1.85em | 2.1em — scales
                                        // with the wrapper's clamp() font
                                        // so the notes read clearly on the
                                        // Home hero (~22–32px glyphs) but
                                        // don't overflow the map-corner
                                        // ship (~19px glyphs).
                                        fontSize: `${1.6 + k * 0.25}em`,
                                        lineHeight: 1,
                                        color: colors[i],
                                        textShadow:
                                            '0 1px 0 rgba(255,255,255,0.6), 0 0 6px rgba(0,0,0,0.18)',
                                        filter:
                                            'drop-shadow(0 2px 2px rgba(0,0,0,0.28))',
                                        fontWeight: 700,
                                        fontFamily: 'serif',
                                        opacity: 0,
                                        animation: `noteRise 3.2s ease-out ${delay + i * 0.4}s infinite`,
                                    }}
                                >
                                    {k % 2 === 0 ? '♪' : '♫'}
                                </span>
                            ))}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// Compass / spyglass / map / anchor icons (custom, pirate-themed)
// ─────────────────────────────────────────────────────────────
export function CompassIcon({ size = 28 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 32 32">
            <circle cx="16" cy="16" r="14" fill="#E5B23A" stroke="#5D3F2A" strokeWidth="2" />
            <circle cx="16" cy="16" r="11" fill="#FBF1DC" />
            <path d="M16 5 L18 16 L16 27 L14 16 Z" fill="#C84B3B" />
            <path d="M5 16 L16 14 L27 16 L16 18 Z" fill="#5D3F2A" opacity="0.7" />
            <circle cx="16" cy="16" r="1.6" fill="#5D3F2A" />
            <text x="16" y="9" textAnchor="middle" fontSize="3.5" fill="#5D3F2A" fontFamily="serif" fontWeight="bold">
                N
            </text>
        </svg>
    );
}

export function SpyglassIcon({
    size = 56,
    glow = false,
    onClick,
}: {
    size?: number;
    glow?: boolean;
    onClick?: () => void;
}) {
    return (
        <div
            onClick={onClick}
            style={{
                width: size,
                height: size,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(251,241,220,0.85)',
                boxShadow: glow
                    ? '0 0 0 2px rgba(229,178,58,0.5), 0 0 22px rgba(229,178,58,0.65), 0 4px 10px rgba(93,63,42,0.25)'
                    : '0 0 0 2px rgba(93,63,42,0.4), 0 4px 10px rgba(93,63,42,0.22)',
                animation: glow ? 'softPulse 3s ease-in-out infinite' : 'none',
                cursor: 'pointer',
            }}
        >
            <svg width={size * 0.65} height={size * 0.65} viewBox="0 0 32 32">
                <g transform="rotate(-30 16 16)">
                    <rect x="3" y="14" width="6" height="4" fill="#5D3F2A" />
                    <rect x="3" y="13.5" width="6" height="1" fill="#E5B23A" />
                    <rect x="9" y="13" width="9" height="6" fill="#A87B5A" />
                    <rect x="9" y="13" width="9" height="6" fill="url(#spyShade)" />
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
        </div>
    );
}

export function AnchorIcon({ size = 22, color = '#5D3F2A' }: { size?: number; color?: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24">
            <circle cx="12" cy="5" r="2.4" fill="none" stroke={color} strokeWidth="1.8" />
            <line x1="12" y1="7.2" x2="12" y2="20" stroke={color} strokeWidth="2" />
            <line x1="8" y1="10" x2="16" y2="10" stroke={color} strokeWidth="1.8" />
            <path d="M4 14 Q4 20 12 21 Q20 20 20 14" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        </svg>
    );
}

export function SailingShipIcon({
    size = 64,
    sail = '#FBF1DC',
    hull = '#5D3F2A',
    accent = '#C84B3B',
}: {
    size?: number;
    sail?: string;
    hull?: string;
    accent?: string;
}) {
    return (
        <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
            {/* Mast */}
            <line x1="32" y1="10" x2="32" y2="44" stroke={hull} strokeWidth="2.5" strokeLinecap="round" />
            {/* Pennant on top of mast */}
            <path d="M32 10 L40 13 L32 16 Z" fill={accent} />
            {/* Main sail — billowing right (wind from behind) */}
            <path
                d="M32 14 Q50 22 48 40 L32 40 Z"
                fill={sail}
                stroke={hull}
                strokeWidth="1.4"
                strokeLinejoin="round"
            />
            {/* Foresail — smaller, billowing left */}
            <path
                d="M32 18 Q18 26 20 40 L32 40 Z"
                fill={sail}
                stroke={hull}
                strokeWidth="1.4"
                strokeLinejoin="round"
                opacity="0.92"
            />
            {/* Hull — curved boat */}
            <path
                d="M10 42 Q12 52 18 54 L46 54 Q52 52 54 42 Z"
                fill={hull}
                stroke="#3A2516"
                strokeWidth="1"
                strokeLinejoin="round"
            />
            {/* Hull plank line */}
            <path
                d="M14 46 Q32 49 50 46"
                stroke="#A87B5A"
                strokeWidth="1"
                fill="none"
                strokeLinecap="round"
            />
            {/* Water ripples below */}
            <path
                d="M6 58 Q14 56 22 58 T38 58 T54 58 T62 58"
                stroke="#5FA8C7"
                strokeWidth="1.6"
                fill="none"
                strokeLinecap="round"
                opacity="0.7"
            />
        </svg>
    );
}

export function SunIcon({ size = 64, color = '#F4B942' }: { size?: number; color?: string }) {
    const rays = Array.from({ length: 8 }, (_, i) => i * 45);
    return (
        <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
            {rays.map((deg) => (
                <line
                    key={deg}
                    x1="32"
                    y1="6"
                    x2="32"
                    y2="14"
                    stroke={color}
                    strokeWidth="3"
                    strokeLinecap="round"
                    transform={`rotate(${deg} 32 32)`}
                />
            ))}
            <circle cx="32" cy="32" r="14" fill={color} />
            <circle cx="32" cy="32" r="14" fill="none" stroke="#C8941F" strokeWidth="1.5" />
        </svg>
    );
}

export function WaveIcon({ size = 64, color = '#5FA8C7' }: { size?: number; color?: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
            <path
                d="M2 13 Q6 9 10 13 T18 13 T22 13"
                stroke={color}
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
            />
            <path
                d="M2 17 Q6 13 10 17 T18 17 T22 17"
                stroke={color}
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                opacity="0.6"
            />
        </svg>
    );
}

export function IslandIcon({ size = 24 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="11" fill="#5FA8C7" opacity="0.35" />
            <path d="M4 16 Q12 9 20 16 L20 18 L4 18 Z" fill="#F0D49B" />
            <path d="M13 14 L13 8 M13 8 Q11 8.5 10 10 M13 8 Q15 8.5 16 10" stroke="#3F7A3F" strokeWidth="1.4" strokeLinecap="round" fill="none" />
        </svg>
    );
}

export function LockIcon({ size = 22, color = '#5D3F2A' }: { size?: number; color?: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24">
            <path
                d="M7 11 V8 Q7 4 12 4 Q17 4 17 8 V11"
                fill="none"
                stroke={color}
                strokeWidth="1.8"
                strokeLinecap="round"
            />
            <rect
                x="5"
                y="11"
                width="14"
                height="10"
                rx="2"
                fill="none"
                stroke={color}
                strokeWidth="1.8"
                strokeLinejoin="round"
            />
            <circle cx="12" cy="15.5" r="1.4" fill={color} />
            <line x1="12" y1="16.5" x2="12" y2="18.5" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
        </svg>
    );
}

export function MapIcon({ size = 22 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24">
            <path
                d="M3 5 L9 4 L15 6 L21 5 L21 19 L15 20 L9 18 L3 19 Z"
                fill="#F0D49B"
                stroke="#5D3F2A"
                strokeWidth="1.4"
            />
            <line x1="9" y1="4" x2="9" y2="18" stroke="#5D3F2A" strokeWidth="1" opacity="0.4" />
            <line x1="15" y1="6" x2="15" y2="20" stroke="#5D3F2A" strokeWidth="1" opacity="0.4" />
            <text x="12" y="13" textAnchor="middle" fontSize="6" fill="#C84B3B" fontWeight="bold">
                X
            </text>
        </svg>
    );
}

export function PirateFlagIcon({ size = 20, color = '#2A2620' }: { size?: number; color?: string }) {
    const skull = '#FBF1DC';
    return (
        <svg width={size} height={size} viewBox="0 0 24 24">
            {/* Flag cloth — full canvas, no pole */}
            <rect x="1" y="3" width="22" height="18" rx="1.5" fill={color} />
            {/* Skull — cranium */}
            <ellipse cx="12" cy="10.5" rx="4.2" ry="3.8" fill={skull} />
            {/* Skull — jaw */}
            <path
                d="M9 13.2 Q9 15.4 12 15.6 Q15 15.4 15 13.2 Z"
                fill={skull}
            />
            {/* Eye sockets */}
            <ellipse cx="10.4" cy="10.4" rx="0.95" ry="1.15" fill={color} />
            <ellipse cx="13.6" cy="10.4" rx="0.95" ry="1.15" fill={color} />
            {/* Nose */}
            <path d="M11.6 12.3 L12 13.2 L12.4 12.3 Z" fill={color} />
            {/* Teeth gap */}
            <line x1="12" y1="13.6" x2="12" y2="15.4" stroke={color} strokeWidth="0.5" />
            <line x1="10.6" y1="14" x2="10.6" y2="15.2" stroke={color} strokeWidth="0.4" />
            <line x1="13.4" y1="14" x2="13.4" y2="15.2" stroke={color} strokeWidth="0.4" />
            {/* Crossbones — drawn behind skull would mean reordering; instead draw the
                two bones diagonally across the lower flag, ends visible past skull */}
            <g stroke={skull} strokeWidth="1.4" strokeLinecap="round">
                <line x1="6.5" y1="17.5" x2="17.5" y2="17.5" />
            </g>
            {/* Bone knobs — flank the crossbar so it reads as a single bone */}
            <circle cx="6.2" cy="17.5" r="1" fill={skull} />
            <circle cx="17.8" cy="17.5" r="1" fill={skull} />
        </svg>
    );
}

// ─────────────────────────────────────────────────────────────
// Pennant banner (tier reveal)
// ─────────────────────────────────────────────────────────────
export function PennantBanner({ tier, children }: { tier: Tier; children?: ReactNode }) {
    const colors: Record<Tier, { bg: string; edge: string; text: string }> = {
        fair: { bg: '#F4B942', edge: '#C8941F', text: '#2A2620' },
        coastal: { bg: '#6B95A0', edge: '#4A6E78', text: '#FBF1DC' },
        harbor: { bg: '#8C7A6B', edge: '#5D4F44', text: '#FBF1DC' },
    };
    const p = colors[tier] || colors.fair;
    return (
        <div style={{ position: 'relative', width: '100%' }}>
            <svg
                viewBox="0 0 320 64"
                preserveAspectRatio="none"
                style={{ height: 64, width: '100%', display: 'block' }}
            >
                <path
                    d="M0 0 L320 0 L300 32 L320 64 L0 64 L20 32 Z"
                    fill={p.bg}
                    stroke={p.edge}
                    strokeWidth="2"
                />
                {tier === 'fair' && (
                    <g>
                        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                            <line
                                key={i}
                                x1="160"
                                y1="32"
                                x2={160 + Math.cos((i * Math.PI) / 4) * 80}
                                y2={32 + Math.sin((i * Math.PI) / 4) * 30}
                                stroke="#FCEAB6"
                                strokeWidth="2"
                                opacity="0.4"
                            />
                        ))}
                    </g>
                )}
            </svg>
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: 22,
                    color: p.text,
                    textShadow:
                        tier === 'fair' ? '0 1px 0 rgba(255,255,255,0.4)' : '0 1px 2px rgba(0,0,0,0.25)',
                }}
            >
                {children}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// Frosted tier banner — iOS-style glass overlay (Reveal screen)
// ─────────────────────────────────────────────────────────────
export function FrostedBanner({ children }: { tier?: Tier; children?: ReactNode }) {
    return (
        <div
            style={{
                position: 'relative',
                width: '100%',
                borderRadius: 14,
                padding: '8px 16px',
                background: 'rgba(251, 241, 220, 0.06)',
                backdropFilter: 'blur(10px) saturate(1.35)',
                WebkitBackdropFilter: 'blur(10px) saturate(1.35)',
                border: '1px solid rgba(255, 255, 255, 0.55)',
                boxShadow:
                    '0 8px 24px rgba(20, 30, 40, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.55)',
                textAlign: 'center',
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: 15,
                lineHeight: 1.25,
                color: '#2A2620',
                textShadow: '0 1px 1px rgba(255, 255, 255, 0.6)',
                letterSpacing: 0.2,
            }}
        >
            {children}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// Island — illustrated image clipped into a circular frame
// ─────────────────────────────────────────────────────────────
export function IslandIllustration({ island, size = 220, label, showLabel = true }: { island: Island | null; size?: number; label?: string; showLabel?: boolean }) {
    if (!island) return null;
    const imageUrl = ISLAND_IMAGES[island.id];
    const clipId = `island-clip-${island.id}`;
    return (
        <div
            style={{
                width: size,
                height: size,
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <svg viewBox="0 0 220 220" width={size} height={size}>
                <circle cx="110" cy="110" r="100" fill="#5FA8C7" opacity="0.4" />
                <circle cx="110" cy="110" r="92" fill="#C5E0E8" opacity="0.5" />
                {imageUrl ? (
                    <>
                        <defs>
                            <clipPath id={clipId}>
                                <circle cx="110" cy="110" r="86" />
                            </clipPath>
                        </defs>
                        <image
                            href={imageUrl}
                            x="24"
                            y="24"
                            width="172"
                            height="172"
                            preserveAspectRatio="xMidYMid slice"
                            clipPath={`url(#${clipId})`}
                        />
                        <circle
                            cx="110"
                            cy="110"
                            r="86"
                            fill="none"
                            stroke="#5D3F2A"
                            strokeWidth="2"
                            opacity="0.6"
                        />
                    </>
                ) : (
                    <g>
                        <circle cx="110" cy="110" r="86" fill="#F0D49B" />
                        <text
                            x="110"
                            y="122"
                            textAnchor="middle"
                            fontSize="60"
                            fontFamily="var(--font-display)"
                            fill="#5D3F2A"
                            fontWeight="bold"
                        >
                            ?
                        </text>
                    </g>
                )}
            </svg>
            {showLabel && (
                <div
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        textAlign: 'center',
                        fontFamily: 'var(--font-map)',
                        fontWeight: 700,
                        fontSize: 15,
                        color: '#5D3F2A',
                        letterSpacing: 0.4,
                    }}
                >
                    {label ?? island.name}
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// Coastal find — small icon
// ─────────────────────────────────────────────────────────────
export function CoastalFindIcon({
    find,
    size = 100,
    label,
}: {
    find: CoastalFind | null;
    size?: number;
    label?: string;
}) {
    if (!find) return null;
    const imageUrl = COASTAL_FIND_IMAGES[find.id];
    const clipId = `coastal-clip-${find.id}`;
    return (
        <div
            style={{
                width: size,
                height: size,
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <svg viewBox="0 0 120 120" width={size} height={size}>
                <circle cx="60" cy="60" r="56" fill="#C5E0E8" opacity="0.7" />
                <circle cx="60" cy="60" r="50" fill="#5FA8C7" opacity="0.4" />
                {imageUrl ? (
                    <>
                        <defs>
                            <clipPath id={clipId}>
                                <circle cx="60" cy="60" r="50" />
                            </clipPath>
                        </defs>
                        <image
                            href={imageUrl}
                            x="10"
                            y="10"
                            width="100"
                            height="100"
                            preserveAspectRatio="xMidYMid slice"
                            clipPath={`url(#${clipId})`}
                        />
                    </>
                ) : (
                    <g>
                        <circle cx="60" cy="60" r="20" fill="#E5B23A" opacity="0.5" />
                        <text
                            x="60"
                            y="66"
                            textAnchor="middle"
                            fontSize="22"
                            fontFamily="var(--font-display)"
                            fill="#5D3F2A"
                            fontWeight="bold"
                        >
                            ?
                        </text>
                    </g>
                )}
            </svg>
            <div
                style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    textAlign: 'center',
                    fontFamily: 'var(--font-map)',
                    fontWeight: 700,
                    fontSize: 15,
                    color: '#5D3F2A',
                    letterSpacing: 0.4,
                }}
            >
                {label ?? find.name}
            </div>
        </div>
    );
}

// Ocean wave background (subtle, for during-drive)
export function SubtleWaves() {
    return (
        <div
            style={{
                position: 'absolute',
                inset: 0,
                overflow: 'hidden',
                background: 'var(--sand-cream)',
            }}
        >
            <svg
                viewBox="0 0 400 800"
                preserveAspectRatio="none"
                style={{ width: '100%', height: '100%', opacity: 0.4 }}
            >
                {Array.from({ length: 12 }).map((_, i) => (
                    <path
                        key={i}
                        d={`M0 ${i * 70 + 30} Q40 ${i * 70 + 18} 80 ${i * 70 + 30} T160 ${i * 70 + 30} T240 ${i * 70 + 30} T320 ${i * 70 + 30} T400 ${i * 70 + 30}`}
                        stroke="#C5E0E8"
                        strokeWidth="1.4"
                        fill="none"
                        opacity="0.7"
                    />
                ))}
            </svg>
        </div>
    );
}
