import { useEffect, useState } from 'react';
import { supabase } from '../api/client';
import { useAuthStore } from '../store/authStore';

/**
 * Diagnostic screen mounted at `/debug/auth`. Shows the raw auth state and
 * the three queries that decide whether a user is a family member:
 *   1. supabase.auth.getUser() — who the server thinks you are
 *   2. family_member where user_id = auth.uid() — the exact row the guard
 *      uses to decide family membership
 *   3. family — the row that row joins to
 *
 * The goal is to diagnose "signed in on phone, blank on web" situations
 * by comparing the output side-by-side across devices.
 */

type Json = unknown;

interface Snapshot {
    origin: string;
    userAgent: string;
    storeUser: Json;
    storeFamily: Json;
    storeFamilyError: Json;
    sessionUser: Json;
    familyMemberRow: Json;
    familyMemberError: Json;
    familyRow: Json;
    allMemberRowsForThisUid: Json;
    timestamp: string;
}

export function AuthDebugScreen() {
    const [snap, setSnap] = useState<Snapshot | null>(null);
    const [loading, setLoading] = useState(true);
    const storeUser = useAuthStore((s) => s.user);
    const storeFamily = useAuthStore((s) => s.family);
    const storeFamilyError = useAuthStore((s) => s.familyError);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const result: Partial<Snapshot> = {
                origin: window.location.origin,
                userAgent: navigator.userAgent,
                storeUser,
                storeFamily,
                storeFamilyError,
                timestamp: new Date().toISOString(),
            };
            try {
                const u = await supabase.auth.getUser();
                result.sessionUser = u.data.user
                    ? {
                          id: u.data.user.id,
                          email: u.data.user.email,
                          app_metadata: u.data.user.app_metadata,
                      }
                    : null;

                const uid = u.data.user?.id;
                if (uid) {
                    const mr = await supabase
                        .from('family_member')
                        .select('family_id, user_id, role, joined_at')
                        .eq('user_id', uid);
                    result.familyMemberRow = mr.data;
                    result.familyMemberError = mr.error;

                    const allForUid = await supabase
                        .from('family_member')
                        .select('*')
                        .eq('user_id', uid);
                    result.allMemberRowsForThisUid = allForUid.data;

                    if (mr.data && mr.data.length > 0) {
                        const fid = (mr.data[0] as { family_id: string }).family_id;
                        const f = await supabase
                            .from('family')
                            .select('*')
                            .eq('id', fid)
                            .maybeSingle();
                        result.familyRow = f.data;
                    }
                }
            } catch (err) {
                (result as { probeError?: string }).probeError =
                    err instanceof Error ? err.message : String(err);
            }
            if (!cancelled) {
                setSnap(result as Snapshot);
                setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [storeUser, storeFamily, storeFamilyError]);

    return (
        <div dir="ltr" className="min-h-[100dvh] bg-sand-cream p-4 font-mono text-xs">
            <h1 className="mb-3 font-display text-lg font-bold">Auth debug</h1>
            {loading && <div>Loading…</div>}
            {snap && (
                <pre className="overflow-x-auto whitespace-pre-wrap rounded border border-wood-deep bg-white p-3 text-[11px] leading-[1.4]">
                    {JSON.stringify(snap, null, 2)}
                </pre>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
                <button
                    className="rounded border border-wood-deep bg-sand-warm px-3 py-1 text-sm"
                    onClick={() => useAuthStore.getState().refreshFamily()}
                >
                    refreshFamily()
                </button>
                <button
                    className="rounded border border-treasure-red bg-white px-3 py-1 text-sm text-treasure-red"
                    onClick={async () => {
                        await useAuthStore.getState().signOut();
                        window.location.href = '/';
                    }}
                >
                    sign out
                </button>
                <button
                    className="rounded border border-wood-deep bg-white px-3 py-1 text-sm"
                    onClick={() => {
                        navigator.clipboard
                            ?.writeText(JSON.stringify(snap, null, 2))
                            .catch(() => {});
                    }}
                >
                    copy snapshot
                </button>
            </div>
        </div>
    );
}
