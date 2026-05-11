import type { CSSProperties, ReactNode } from 'react';

export function IOSStatusBar({ dark = false, time = '9:41' }: { dark?: boolean; time?: string }) {
    const c = dark ? '#fff' : '#000';
    return (
        <div
            className="relative z-20 box-border flex w-full items-center justify-center px-6 pb-[19px] pt-[21px]"
            style={{ gap: 154 }}
        >
            <div className="flex h-[22px] flex-1 items-center justify-center pt-[1.5px]">
                <span
                    style={{
                        fontFamily: '-apple-system, "SF Pro", system-ui',
                        fontWeight: 590,
                        fontSize: 17,
                        lineHeight: '22px',
                        color: c,
                    }}
                >
                    {time}
                </span>
            </div>
            <div className="flex h-[22px] flex-1 items-center justify-center gap-[7px] pr-[1px] pt-[1px]">
                <svg width="19" height="12" viewBox="0 0 19 12">
                    <rect x="0" y="7.5" width="3.2" height="4.5" rx="0.7" fill={c} />
                    <rect x="4.8" y="5" width="3.2" height="7" rx="0.7" fill={c} />
                    <rect x="9.6" y="2.5" width="3.2" height="9.5" rx="0.7" fill={c} />
                    <rect x="14.4" y="0" width="3.2" height="12" rx="0.7" fill={c} />
                </svg>
                <svg width="17" height="12" viewBox="0 0 17 12">
                    <path
                        d="M8.5 3.2C10.8 3.2 12.9 4.1 14.4 5.6L15.5 4.5C13.7 2.7 11.2 1.5 8.5 1.5C5.8 1.5 3.3 2.7 1.5 4.5L2.6 5.6C4.1 4.1 6.2 3.2 8.5 3.2Z"
                        fill={c}
                    />
                    <path
                        d="M8.5 6.8C9.9 6.8 11.1 7.3 12 8.2L13.1 7.1C11.8 5.9 10.2 5.1 8.5 5.1C6.8 5.1 5.2 5.9 3.9 7.1L5 8.2C5.9 7.3 7.1 6.8 8.5 6.8Z"
                        fill={c}
                    />
                    <circle cx="8.5" cy="10.5" r="1.5" fill={c} />
                </svg>
                <svg width="27" height="13" viewBox="0 0 27 13">
                    <rect
                        x="0.5"
                        y="0.5"
                        width="23"
                        height="12"
                        rx="3.5"
                        stroke={c}
                        strokeOpacity="0.35"
                        fill="none"
                    />
                    <rect x="2" y="2" width="20" height="9" rx="2" fill={c} />
                    <path
                        d="M25 4.5V8.5C25.8 8.2 26.5 7.2 26.5 6.5C26.5 5.8 25.8 4.8 25 4.5Z"
                        fill={c}
                        fillOpacity="0.4"
                    />
                </svg>
            </div>
        </div>
    );
}

export function IOSGlassPill({
    children,
    dark = false,
    style = {},
}: {
    children?: ReactNode;
    dark?: boolean;
    style?: CSSProperties;
}) {
    return (
        <div
            className="relative flex h-11 min-w-[44px] items-center justify-center overflow-hidden rounded-full"
            style={{
                boxShadow: dark
                    ? '0 2px 6px rgba(0,0,0,0.35), 0 6px 16px rgba(0,0,0,0.2)'
                    : '0 1px 3px rgba(0,0,0,0.07), 0 3px 10px rgba(0,0,0,0.06)',
                ...style,
            }}
        >
            <div
                className="absolute inset-0 rounded-full"
                style={{
                    backdropFilter: 'blur(12px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                    background: dark ? 'rgba(120,120,128,0.28)' : 'rgba(255,255,255,0.5)',
                }}
            />
            <div
                className="absolute inset-0 rounded-full"
                style={{
                    boxShadow: dark
                        ? 'inset 1.5px 1.5px 1px rgba(255,255,255,0.15), inset -1px -1px 1px rgba(255,255,255,0.08)'
                        : 'inset 1.5px 1.5px 1px rgba(255,255,255,0.7), inset -1px -1px 1px rgba(255,255,255,0.4)',
                    border: dark ? '0.5px solid rgba(255,255,255,0.15)' : '0.5px solid rgba(0,0,0,0.06)',
                }}
            />
            <div className="relative z-[1] flex items-center px-1">{children}</div>
        </div>
    );
}

export function IOSDevice({
    children,
    width = 402,
    height = 874,
    dark = false,
}: {
    children?: ReactNode;
    width?: number;
    height?: number;
    dark?: boolean;
}) {
    return (
        <div
            className="relative overflow-hidden"
            style={{
                width,
                height,
                borderRadius: 48,
                background: dark ? '#000' : '#F2F2F7',
                boxShadow: '0 40px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.12)',
                fontFamily: '-apple-system, system-ui, sans-serif',
                WebkitFontSmoothing: 'antialiased',
            }}
        >
            {/* dynamic island */}
            <div
                className="absolute left-1/2 z-[50] -translate-x-1/2 bg-black"
                style={{ top: 11, width: 126, height: 37, borderRadius: 24 }}
            />
            {/* status bar (absolute) */}
            <div className="absolute inset-x-0 top-0 z-10">
                <IOSStatusBar dark={dark} />
            </div>
            {/* content */}
            <div className="flex h-full flex-col">
                <div className="flex-1 overflow-auto">{children}</div>
            </div>
            {/* home indicator — always on top */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[60] flex h-[34px] items-end justify-center pb-2">
                <div
                    className="rounded-full"
                    style={{
                        width: 139,
                        height: 5,
                        background: dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.25)',
                    }}
                />
            </div>
        </div>
    );
}
