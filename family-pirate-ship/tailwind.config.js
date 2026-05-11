import rtl from 'tailwindcss-rtl';

/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
    theme: {
        extend: {
            colors: {
                'ocean-deep': 'var(--ocean-deep)',
                'ocean-bright': 'var(--ocean-bright)',
                'ocean-foam': 'var(--ocean-foam)',
                'sand-warm': 'var(--sand-warm)',
                'sand-cream': 'var(--sand-cream)',
                'wood-deep': 'var(--wood-deep)',
                'wood-light': 'var(--wood-light)',
                'treasure-gold': 'var(--treasure-gold)',
                'treasure-red': 'var(--treasure-red)',
                'flag-kid': 'var(--flag-kid)',
                'flag-mom': 'var(--flag-mom)',
                'flag-dad': 'var(--flag-dad)',
                'tier-fair': 'var(--tier-fair)',
                'tier-coastal': 'var(--tier-coastal)',
                'tier-harbor': 'var(--tier-harbor)',
                'text-primary': 'var(--text-primary)',
                'text-secondary': 'var(--text-secondary)',
                'surface-card': 'var(--surface-card)',
            },
            fontFamily: {
                display: ['var(--font-display)'],
                body: ['var(--font-body)'],
                map: ['var(--font-map)'],
            },
            keyframes: {
                softPulse: {
                    '0%, 100%': { transform: 'scale(1)', opacity: '1' },
                    '50%': { transform: 'scale(1.05)', opacity: '0.95' },
                },
                musicBar: {
                    '0%, 100%': { height: '4px' },
                    '50%': { height: '18px' },
                },
                bob: {
                    '0%, 100%': { transform: 'translateY(0) rotate(-0.6deg)' },
                    '50%': { transform: 'translateY(-3px) rotate(0.6deg)' },
                },
                seagullDrift: {
                    '0%': { transform: 'translate(-40px, 0) scaleX(1)' },
                    '45%': { transform: 'translate(220px, -10px) scaleX(1)' },
                    '50%': { transform: 'translate(220px, -10px) scaleX(-1)' },
                    '100%': { transform: 'translate(-40px, 6px) scaleX(-1)' },
                },
                irisIn: {
                    '0%': { clipPath: 'circle(0% at 50% 50%)' },
                    '100%': { clipPath: 'circle(120% at 50% 50%)' },
                },
                splash: {
                    '0%': { transform: 'scale(0.4) rotate(-8deg)', opacity: '0' },
                    '60%': { transform: 'scale(1.1) rotate(2deg)', opacity: '1' },
                    '100%': { transform: 'scale(1) rotate(0deg)', opacity: '1' },
                },
                fogClear: {
                    '0%': { opacity: '1', transform: 'scale(1)' },
                    '100%': { opacity: '0', transform: 'scale(1.4)' },
                },
                fadeUp: {
                    '0%': { transform: 'translateY(20px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                fadeOnly: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(100%)' },
                    '100%': { transform: 'translateY(0)' },
                },
                pennantWave: {
                    '0%, 100%': { transform: 'skewY(-2deg)' },
                    '50%': { transform: 'skewY(2deg)' },
                },
                glowPulse: {
                    '0%, 100%': { boxShadow: '0 0 0 2px rgba(93,63,42,0.45), 0 0 12px rgba(229,178,58,0.3)' },
                    '50%': { boxShadow: '0 0 0 4px rgba(229,178,58,0.6), 0 0 26px rgba(229,178,58,0.55)' },
                },
            },
            animation: {
                'soft-pulse': 'softPulse 3s ease-in-out infinite',
                'music-bar': 'musicBar 900ms ease-in-out infinite',
                bob: 'bob 2.5s ease-in-out infinite',
                'seagull-drift': 'seagullDrift 9s linear infinite',
                'iris-in': 'irisIn 1500ms ease-in-out',
                splash: 'splash 800ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                'fog-clear': 'fogClear 2000ms ease-out forwards',
                'fade-up': 'fadeUp 250ms ease-out',
                'fade-only': 'fadeOnly 360ms ease-out',
                'slide-up': 'slideUp 350ms ease-out',
                'pennant-wave': 'pennantWave 2.4s ease-in-out infinite',
                'glow-pulse': 'glowPulse 1.5s ease-in-out infinite',
            },
        },
    },
    plugins: [rtl],
};
