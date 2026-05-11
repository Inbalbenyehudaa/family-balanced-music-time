import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { PlankButton } from '../components/PlankButton';
import { ScreenBackground } from '../components/ScreenBackground';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../api/client';
import { acceptInvite } from '../api/invites';
import { pullFamilyState } from '../sync/pull';
import { useSyncStore } from '../store/syncStore';

type Status =
    | 'loading'
    | 'valid'
    | 'mismatch'
    | 'invalid' // expired / revoked / unknown
    | 'accepting'
    | 'accepted'
    | 'need_sign_in'
    | 'already_in_other_family';

interface InviteRow {
    id: string;
    family_id: string;
    invitee_email: string;
    invited_by_user: string;
    expires_at: string;
    accepted_at: string | null;
}

interface InviteContext {
    familyName: string;
    inviterDisplayName: string;
    inviteeEmail: string;
}

/**
 * /invite/:token — four-state accept screen.
 *
 * 1. valid + match: "Inbal invited you" + Join the ship button
 * 2. mismatch: signed-in email ≠ invite.invitee_email → hard block
 * 3. invalid: expired, revoked, already-accepted (and user isn't the one
 *    who accepted) → no-longer-valid copy
 * 4. need_sign_in: user isn't authed → kick to /?returnTo=/invite/:token
 *
 * The flow assumes Supabase's magic-link handshake has already signed
 * the user in by the time we mount. If not (e.g. user navigated directly
 * to the URL), we route through sign-in with a returnTo param.
 */
export function InviteAcceptScreen() {
    const { inviteId = '' } = useParams<{ inviteId: string }>();
    const nav = useNavigate();

    const user = useAuthStore((s) => s.user);
    const family = useAuthStore((s) => s.family);
    const role = useAuthStore((s) => s.role);
    const isLoading = useAuthStore((s) => s.isLoading);
    const refreshFamily = useAuthStore((s) => s.refreshFamily);

    const [status, setStatus] = useState<Status>('loading');
    const [ctx, setCtx] = useState<InviteContext | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Look up the invite row. The RLS policy allows SELECT when
    // invitee_email matches the JWT, OR when the caller is a member of
    // the invite's family. For an accepting spouse that means: once the
    // magic link has signed them in, the SELECT works.
    useEffect(() => {
        if (isLoading) return;
        if (!user) {
            setStatus('need_sign_in');
            return;
        }
        if (!inviteId) {
            setStatus('invalid');
            return;
        }

        let cancelled = false;

        (async () => {
            try {
                const { data: invite, error } = await supabase
                    .from('family_invite')
                    .select(
                        'id, family_id, invitee_email, invited_by_user, expires_at, accepted_at',
                    )
                    .eq('id', inviteId)
                    .maybeSingle<InviteRow>();
                if (cancelled) return;
                if (error) throw error;

                if (!invite) {
                    setStatus('invalid');
                    return;
                }

                // Expired?
                if (Date.parse(invite.expires_at) < Date.now()) {
                    setStatus('invalid');
                    return;
                }

                // Already accepted by this user? Render as accepted so we
                // silently redirect them home.
                if (invite.accepted_at) {
                    // If the current user is already a member of this family,
                    // that's the "clicked the link twice" case → silent redirect.
                    if (family && family.id === invite.family_id) {
                        setStatus('accepted');
                        return;
                    }
                    // Otherwise the invite was used by someone else — treat
                    // as invalid to avoid leaking info.
                    setStatus('invalid');
                    return;
                }

                // Email mismatch?
                const jwtEmail = (user.email ?? '').toLowerCase();
                const inviteEmail = invite.invitee_email.toLowerCase();
                if (jwtEmail !== inviteEmail) {
                    setCtx({
                        familyName: '',
                        inviterDisplayName: '',
                        inviteeEmail: invite.invitee_email,
                    });
                    setStatus('mismatch');
                    return;
                }

                // Already a member of a different family → block.
                if (family && family.id !== invite.family_id) {
                    setStatus('already_in_other_family');
                    return;
                }

                // Already a member of THIS family → silent redirect.
                if (family && family.id === invite.family_id) {
                    setStatus('accepted');
                    return;
                }

                // Fetch the display context: family name + inviter name.
                const [familyResult, inviterResult] = await Promise.all([
                    supabase
                        .from('family')
                        .select('id, name')
                        .eq('id', invite.family_id)
                        .maybeSingle(),
                    // auth.users isn't queryable from the client. Best-effort:
                    // fall back to "your family" if we can't resolve it.
                    Promise.resolve<{
                        data: { display_name: string } | null;
                    }>({ data: null }),
                ]);

                if (cancelled) return;

                setCtx({
                    familyName:
                        (familyResult.data?.name as string | undefined) ?? 'המשפחה',
                    inviterDisplayName: inviterResult.data?.display_name ?? '',
                    inviteeEmail: invite.invitee_email,
                });
                setStatus('valid');
            } catch (err) {
                if (cancelled) return;
                const msg = err instanceof Error ? err.message : String(err);
                console.warn('[InviteAccept] lookup failed', err);
                setErrorMsg(msg);
                setStatus('invalid');
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [inviteId, user, family, isLoading]);

    const handleAccept = async () => {
        if (!inviteId) return;
        setStatus('accepting');
        setErrorMsg(null);
        try {
            await acceptInvite(inviteId);
            // CRITICAL ordering: refresh the auth store's family BEFORE
            // navigating. Without this, RequireFamily sees `family: null`
            // and bounces the new member to /onboarding/family — which is
            // the exact bug this phase is avoiding.
            await refreshFamily();

            // Pull server state into the brand-new device. Must run AFTER
            // the family_member insert or RLS returns empty rows. Best-
            // effort — a failure here shouldn't block the redirect.
            try {
                await pullFamilyState();
                useSyncStore.getState().flush().catch(() => {});
            } catch (pullErr) {
                console.warn('[InviteAccept] post-accept pull failed', pullErr);
            }

            nav('/home', { replace: true });
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.warn('[InviteAccept] accept failed', err);
            // Idempotent: if the user is already a member by the time we
            // reach here, refreshFamily populated the store; route home.
            const latest = useAuthStore.getState();
            if (latest.family) {
                nav('/home', { replace: true });
                return;
            }
            setErrorMsg(msg);
            setStatus('valid');
        }
    };

    const handleSignOutAndRetry = async () => {
        try {
            await useAuthStore.getState().signOut();
        } finally {
            // Send them back through sign-in, then let them re-open the
            // invite link from the email.
            window.location.href = `/?returnTo=${encodeURIComponent(
                `/invite/${inviteId}`,
            )}`;
        }
    };

    // ── Render ────────────────────────────────────────────────

    if (status === 'loading' || isLoading) {
        return <LoadingShell />;
    }

    if (status === 'need_sign_in') {
        // Route to sign-in carrying the invite path so SignIn can bounce
        // back once a session is established. Unknown users (no Google
        // session) will be signed in via Google OAuth and, on first
        // sign-in, Supabase's magic-link should already have carried them
        // through — this branch catches direct URL pastes.
        return (
            <Navigate
                to={`/?returnTo=${encodeURIComponent(`/invite/${inviteId}`)}`}
                replace
            />
        );
    }

    if (status === 'accepted') {
        return <Navigate to="/home" replace />;
    }

    if (status === 'invalid') {
        return (
            <ScreenBackground variant="parchment">
                <InviteCard>
                    <h2 className="mx-0 mb-3 mt-0 font-display text-[24px] font-bold text-text-primary">
                        ההזמנה כבר לא בתוקף
                    </h2>
                    <p className="mb-6 font-body text-sm text-text-secondary">
                        הקישור פג או בוטל. בקשו ממי ששלח את ההזמנה לשלוח אחת חדשה.
                    </p>
                    <PlankButton onClick={() => nav('/', { replace: true })}>
                        לדף הבית
                    </PlankButton>
                </InviteCard>
            </ScreenBackground>
        );
    }

    if (status === 'mismatch') {
        return (
            <ScreenBackground variant="parchment">
                <InviteCard>
                    <h2 className="mx-0 mb-3 mt-0 font-display text-[24px] font-bold text-text-primary">
                        ההזמנה לא מיועדת לחשבון הזה
                    </h2>
                    <p className="mb-2 font-body text-sm text-text-secondary">
                        ההזמנה נשלחה ל־
                        <span className="font-semibold text-text-primary">
                            {' '}
                            {ctx?.inviteeEmail}
                        </span>
                    </p>
                    <p className="mb-6 font-body text-sm text-text-secondary">
                        אתם מחוברים כ־
                        <span className="font-semibold text-text-primary">
                            {' '}
                            {user?.email}
                        </span>
                    </p>
                    <div className="flex flex-col gap-3">
                        <PlankButton onClick={handleSignOutAndRetry}>
                            התנתקות וניסיון מחדש
                        </PlankButton>
                        <button
                            onClick={() => nav('/', { replace: true })}
                            className="cursor-pointer border-none bg-transparent font-body text-sm text-text-secondary underline"
                        >
                            לדף הבית
                        </button>
                    </div>
                </InviteCard>
            </ScreenBackground>
        );
    }

    if (status === 'already_in_other_family') {
        return (
            <ScreenBackground variant="parchment">
                <InviteCard>
                    <h2 className="mx-0 mb-3 mt-0 font-display text-[24px] font-bold text-text-primary">
                        אתם כבר חלק ממשפחה אחרת
                    </h2>
                    <p className="mb-6 font-body text-sm text-text-secondary">
                        כדי להצטרף לספינה הזו, צריך קודם לצאת מהמשפחה הקיימת בהגדרות.
                    </p>
                    <PlankButton
                        onClick={() => nav(role === 'owner' ? '/settings/gate' : '/home', {
                            replace: true,
                        })}
                    >
                        להגדרות
                    </PlankButton>
                </InviteCard>
            </ScreenBackground>
        );
    }

    // status === 'valid' or 'accepting'
    return (
        <ScreenBackground variant="parchment">
            <InviteCard>
                <div className="mb-2 text-4xl">🏴‍☠️</div>
                <h2 className="mx-0 mb-2 mt-0 font-display text-[24px] font-bold text-text-primary">
                    הוזמנתם להצטרף לספינה
                </h2>
                <p className="mx-0 mb-6 mt-0 font-body text-base text-text-primary">
                    {ctx?.inviterDisplayName
                        ? `${ctx.inviterDisplayName} הזמינו אתכם ל־${ctx?.familyName}`
                        : `הוזמנתם ל־${ctx?.familyName}`}
                </p>
                {errorMsg && (
                    <div className="mb-4 rounded-lg border border-treasure-red bg-[rgba(200,75,59,0.08)] px-3 py-2 text-sm text-treasure-red">
                        {errorMsg}
                    </div>
                )}
                <PlankButton
                    onClick={handleAccept}
                    disabled={status === 'accepting'}
                >
                    {status === 'accepting' ? '...מצטרף' : 'להצטרף לספינה'}
                </PlankButton>
                <button
                    onClick={handleSignOutAndRetry}
                    className="mt-4 cursor-pointer border-none bg-transparent font-body text-sm text-text-secondary underline"
                >
                    לא אני? התנתקות
                </button>
            </InviteCard>
        </ScreenBackground>
    );
}

function LoadingShell() {
    return (
        <div className="flex min-h-[100dvh] items-center justify-center bg-sand-cream">
            <div
                className="h-8 w-8 rounded-full border-[3px] border-[rgba(93,63,42,0.2)] border-t-wood-deep"
                style={{ animation: 'spin 1s linear infinite' }}
            />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}

function InviteCard({ children }: { children: React.ReactNode }) {
    return (
        <div
            data-screen-label="00c Invite Accept"
            className="relative flex min-h-[100dvh] items-center justify-center px-6 py-10"
        >
            <div className="w-full max-w-md rounded-2xl border-[1.5px] border-[rgba(93,63,42,0.25)] bg-surface-card p-6 text-center">
                {children}
            </div>
        </div>
    );
}
