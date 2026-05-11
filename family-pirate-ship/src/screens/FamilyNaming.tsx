import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlankButton } from '../components/PlankButton';
import { ScreenBackground } from '../components/ScreenBackground';
import { useAuthStore } from '../store/authStore';
import { createFamily } from '../api/families';
import { listPirates } from '../api/pirates';
import { getSettings } from '../api/settings';
import { usePiratesStore } from '../store/piratesStore';
import { useSettingsStore } from '../store/settingsStore';

/**
 * Onboarding step 0: ask for the family's name, create the family row
 * (+ seed three default pirates + default settings, all inside the
 * `create_family` RPC), then route to the rest of onboarding.
 */
export function FamilyNamingScreen() {
    const nav = useNavigate();
    const user = useAuthStore((s) => s.user);
    const refreshFamily = useAuthStore((s) => s.refreshFamily);

    const defaultName =
        user?.displayName && user.displayName.trim().length > 0
            ? `${user.displayName.trim().split(/\s+/)[0]} המשפחה`
            : 'המשפחה';

    const [name, setName] = useState(defaultName);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = async () => {
        const trimmed = name.trim();
        if (trimmed.length === 0) {
            setError('שם חסר');
            return;
        }
        if (trimmed.length > 60) {
            setError('השם ארוך מדי (עד 60 תווים)');
            return;
        }
        setError(null);
        setBusy(true);
        try {
            const familyId = await createFamily(trimmed);
            const [pirates, settings] = await Promise.all([
                listPirates(familyId),
                getSettings(familyId),
            ]);
            if (pirates.length === 3) usePiratesStore.getState().setPirates(pirates);
            if (settings) useSettingsStore.getState().hydrateSettings(settings);
            await refreshFamily();
            nav('/onboarding/welcome', { replace: true });
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            if (msg.includes('already belongs to a family')) {
                // The server says we're already in a family but our local
                // state didn't have one — that's a bug in the lookup, not
                // a reason to loop. Force a refresh + surface any error.
                await refreshFamily();
                const { family, familyError } = useAuthStore.getState();
                if (family) {
                    nav('/home', { replace: true });
                    return;
                }
                setError(
                    familyError
                        ? `לא הצלחנו לטעון את המשפחה הקיימת: ${familyError}`
                        : 'החשבון הזה כבר שייך למשפחה, נסה להתנתק ולהתחבר שוב',
                );
                return;
            }
            setError(msg);
        } finally {
            setBusy(false);
        }
    };

    return (
        <ScreenBackground variant="parchment">
            <div
                data-screen-label="00a Family Naming"
                className="relative flex min-h-[100dvh] flex-col px-7 pb-8 pt-10"
            >
                <div className="flex flex-1 flex-col items-center justify-center gap-6">
                    <div className="text-center">
                        <h2 className="mx-0 mb-3 mt-0 font-display text-[26px] font-bold text-text-primary">
                            איך קוראים למשפחה שלכם?
                        </h2>
                        <p className="mx-0 mt-0 font-body text-sm text-text-secondary">
                            השם יופיע בהזמנות שתשלחו לבן/בת הזוג. הילדים לא רואים אותו.
                        </p>
                    </div>

                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="שם המשפחה"
                        maxLength={60}
                        autoFocus
                        className="h-14 w-full max-w-md rounded-[14px] border-[1.5px] border-[rgba(93,63,42,0.4)] bg-surface-card px-4 py-2 text-right font-body text-lg text-text-primary outline-none focus:border-treasure-gold"
                        style={{ direction: 'rtl' }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !busy) submit();
                        }}
                    />

                    {error && (
                        <div className="w-full max-w-md rounded-lg border border-treasure-red bg-[rgba(200,75,59,0.08)] px-3 py-2 text-center text-sm text-treasure-red">
                            {error}
                        </div>
                    )}
                </div>

                <div className="pt-6">
                    <PlankButton onClick={submit} disabled={busy || name.trim().length === 0}>
                        {busy ? '...יוצר' : 'הלאה'}
                    </PlankButton>
                </div>
            </div>
        </ScreenBackground>
    );
}
