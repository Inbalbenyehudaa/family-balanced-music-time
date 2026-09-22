/**
 * Catches render-time exceptions.
 *
 * Until now a thrown error during render took the whole tree down and left a
 * white screen with nothing recorded anywhere — the app had no boundary, no
 * window.onerror, and no crash reporting of any kind.
 *
 * Note what this does *not* cover, because it shaped the rest of the
 * telemetry design: neither of the two bugs shipped so far would have landed
 * here. Both were silent state loss after the OS discarded a tab, and nothing
 * threw. Error boundaries catch the unknown-unknowns; the lifecycle
 * breadcrumbs in telemetry/codes.ts catch the failure class this app actually
 * suffers from.
 */
import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { record } from '../telemetry/record';

interface Props {
    children: ReactNode;
}

interface State {
    failed: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
    state: State = { failed: false };

    static getDerivedStateFromError(): State {
        return { failed: true };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        // The component stack names real component names, which are not user
        // data — but it can be long and is of limited use without source
        // maps, so only its depth travels. The scrubbed error message is the
        // part worth having.
        const stackDepth = (info.componentStack ?? '').split('\n').filter(Boolean).length;
        record('render_error', { stackDepth }, error);
    }

    render() {
        if (!this.state.failed) return this.props.children;

        return (
            <div
                dir="rtl"
                className="flex min-h-[100dvh] items-center justify-center bg-sand-cream p-6"
            >
                <div className="w-full max-w-md rounded-2xl border-[1.5px] border-[rgba(93,63,42,0.25)] bg-surface-card p-6 text-center">
                    <div className="mb-3 text-3xl">⚓</div>
                    <h3 className="mb-2 font-display text-xl font-bold text-text-primary">
                        משהו השתבש
                    </h3>
                    <p className="mb-4 font-body text-sm text-text-secondary">
                        הספינה נתקלה בסלע. רעננו את הדף כדי להמשיך.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full cursor-pointer rounded-lg border-2 border-wood-deep bg-sand-warm px-4 py-3 font-body text-sm font-semibold text-text-primary"
                    >
                        רענון
                    </button>
                </div>
            </div>
        );
    }
}
