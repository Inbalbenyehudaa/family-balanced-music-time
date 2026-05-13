import type { CSSProperties, ReactNode } from 'react';

export type PlankVariant = 'wood' | 'sand' | 'cream' | 'danger' | 'safe';
export type PlankSize = 'sm' | 'md' | 'lg';

const SIZE_CLASSES: Record<PlankSize, string> = {
    lg: 'h-16 px-6 py-[18px] text-[22px]',
    md: 'h-[52px] px-[22px] py-[14px] text-[19px]',
    sm: 'h-10 px-4 py-[10px] text-base',
};

const VARIANT_CLASS: Record<PlankVariant, string> = {
    wood: '',
    sand: 'sand',
    cream: 'cream',
    danger: 'danger',
    safe: 'safe',
};

export function PlankButton({
    children,
    onClick,
    variant = 'wood',
    size = 'lg',
    style,
    disabled,
}: {
    children?: ReactNode;
    onClick?: () => void;
    variant?: PlankVariant;
    size?: PlankSize;
    style?: CSSProperties;
    disabled?: boolean;
}) {
    return (
        <button
            onClick={disabled ? undefined : onClick}
            className={[
                'btn-plank w-full',
                VARIANT_CLASS[variant],
                SIZE_CLASSES[size],
                disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer opacity-100',
            ]
                .filter(Boolean)
                .join(' ')}
            style={style}
        >
            {children}
        </button>
    );
}
