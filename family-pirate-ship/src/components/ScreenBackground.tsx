import type { ReactNode } from 'react';
import { HarborScene, SubtleWaves } from './Art';

export type BackgroundVariant =
    | 'harbor'
    | 'parchment'
    | 'waves'
    | 'dark'
    | 'sky'
    | 'map';

/**
 * Full-bleed background layer for a screen. Lives at z-index 0 inside the
 * .app-shell column. Children render above it.
 *
 * Keeping this as a single primitive means screens don't need to know
 * whether the backdrop is an SVG scene, a parchment texture, or a gradient.
 */
export function ScreenBackground({
    variant,
    children,
}: {
    variant: BackgroundVariant;
    children?: ReactNode;
}) {
    return (
        <div className="relative min-h-[100dvh]">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                {variant === 'harbor' && <HarborScene />}
                {variant === 'waves' && <SubtleWaves />}
                {variant === 'parchment' && <ParchmentBg />}
                {variant === 'dark' && <div className="absolute inset-0 bg-[#1E1612]" />}
                {variant === 'sky' && <SkyBg />}
                {variant === 'map' && <MapBg />}
            </div>
            {children}
        </div>
    );
}

function ParchmentBg() {
    return (
        <div
            className="tex-paper tex-grain absolute inset-0 bg-sand-cream"
            aria-hidden="true"
        />
    );
}

function SkyBg() {
    return (
        <div
            className="absolute inset-0"
            style={{
                background:
                    'linear-gradient(180deg, #C5E0E8 0%, #5FA8C7 55%, #1E5F7A 100%)',
            }}
            aria-hidden="true"
        />
    );
}

function MapBg() {
    return (
        <div
            className="tex-paper tex-grain absolute inset-0"
            style={{ background: 'linear-gradient(135deg, #F0D49B, #E5C8A8)' }}
            aria-hidden="true"
        />
    );
}
