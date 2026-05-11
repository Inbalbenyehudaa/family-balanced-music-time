import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PirateShip } from '../components/Art';
import { PlankButton } from '../components/PlankButton';
import { ScreenBackground } from '../components/ScreenBackground';
import { useAuthStore } from '../store/authStore';

/**
 * Sign-in screen shown at `/`. Single primary action: Google OAuth.
 * The "מה זה אומר?" link expands an inline explainer.
 *
 * If the URL carries `?returnTo=/some/path`, we stash it in sessionStorage
 * so AuthCallback can redirect there after the Google handshake instead of
 * sending the user to /home or /onboarding/family. Used by the invite flow
 * when a direct-linked `/invite/:token` hit lands on a signed-out browser.
 */
const RETURN_TO_KEY = 'auth.returnTo';

export function SignInScreen() {
    const signIn = useAuthStore((s) => s.signInWithGoogle);
    const [searchParams] = useSearchParams();
    const [busy, setBusy] = useState(false);
    const [explainerOpen, setExplainerOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const rt = searchParams.get('returnTo');
        if (rt && rt.startsWith('/') && !rt.startsWith('//')) {
            try {
                sessionStorage.setItem(RETURN_TO_KEY, rt);
            } catch {
                /* sessionStorage may be blocked — ignore */
            }
        }
    }, [searchParams]);

    const handleSignIn = async () => {
        setError(null);
        setBusy(true);
        try {
            await signIn();
        } catch (err) {
            setBusy(false);
            setError(err instanceof Error ? err.message : String(err));
        }
    };

    return (
        <ScreenBackground variant="harbor">
            <div
                data-screen-label="00 Sign In"
                className="relative flex min-h-[100dvh] flex-col items-center justify-between px-6 py-10 text-center"
            >
                <div className="flex-1" />

                <div
                    className="flex w-full items-center justify-center"
                    style={{ animation: 'bob 3s ease-in-out infinite' }}
                >
                    <div
                        className="w-full"
                        style={{ maxWidth: 'min(100%, clamp(220px, 68vw, 380px))' }}
                    >
                        <PirateShip width={380} cargo={[0, 0, 0]} sailing bobbing={false} />
                    </div>
                </div>

                <div className="mt-10 w-full max-w-md">
                    <h1
                        className="mx-0 mb-2 mt-0 font-display font-bold leading-[1.15] text-text-primary"
                        style={{
                            fontSize: 'clamp(22px, 5vw, 32px)',
                            textShadow: '0 1px 0 rgba(255,255,255,0.5)',
                        }}
                    >
                        ספינת המוזיקה המשפחתית
                    </h1>
                    <p className="mx-0 mb-6 mt-0 font-body text-base text-text-secondary">
                        זמן האזנה שווה לכל המשפחה
                    </p>

                    <PlankButton onClick={handleSignIn} disabled={busy}>
                        {busy ? '...מתחבר' : 'כניסה עם Google'}
                    </PlankButton>

                    {error && (
                        <div className="mt-3 rounded-lg border border-treasure-red bg-[rgba(200,75,59,0.08)] px-3 py-2 text-sm text-treasure-red">
                            {error}
                        </div>
                    )}

                    <button
                        onClick={() => setExplainerOpen((v) => !v)}
                        className="mt-4 cursor-pointer border-none bg-transparent font-body text-sm text-text-secondary underline"
                    >
                        מה זה אומר?
                    </button>

                    {explainerOpen && (
                        <div className="mx-auto mt-3 max-w-[340px] rounded-xl border-[1.5px] border-dashed border-[rgba(93,63,42,0.3)] bg-[rgba(251,241,220,0.9)] p-3 text-start font-body text-[13px] leading-[1.5] text-text-primary">
                            ההרשמה עם Google יוצרת חשבון משפחתי משותף. אנחנו שומרים רק
                            את המידע שנחוץ להפעלת האפליקציה: שמות הפיראטים, הפלגות,
                            ואיים שהתגלו. אין פרסומות, אין סטטיסטיקות בין-משפחתיות,
                            ואפשר למחוק הכל בכל רגע מההגדרות.
                        </div>
                    )}
                </div>
            </div>
        </ScreenBackground>
    );
}
