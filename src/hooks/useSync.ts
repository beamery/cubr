import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../logic/supabase';
import { SupabaseStorageProvider } from '../logic/SupabaseStorageProvider';
import type { SolveRecord } from '../types_new';
import type { User } from '@supabase/supabase-js';
import { parseSafeDate } from '../logic/dateUtils';

export function useSync() {
    const [solves, setSolves] = useState<SolveRecord[]>([]);
    const [user, setUser] = useState<User | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncedIds, setSyncedIds] = useState<Set<string>>(new Set());
    const [storageProvider] = useState(() => new SupabaseStorageProvider());

    // Use a ref for solves to avoid dependency loops in callbacks
    const solvesRef = useRef<SolveRecord[]>([]);
    useEffect(() => {
        solvesRef.current = solves;
    }, [solves]);

    // Helper to save synced IDs to localStorage
    const saveSyncedIds = useCallback((ids: Set<string>) => {
        localStorage.setItem('cubr_synced_ids', JSON.stringify(Array.from(ids)));
    }, []);

    // Listen for auth changes
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    // Load local data on mount
    useEffect(() => {
        const local = localStorage.getItem('cubr_solves');
        const syncedLocal = localStorage.getItem('cubr_synced_ids');
        
        if (local) {
            try {
                const parsed = JSON.parse(local).map((s: any) => ({ ...s, date: parseSafeDate(s.date) }));
                setSolves(parsed);
                solvesRef.current = parsed;
            } catch (e) {
                console.error('Failed to load local solves', e);
            }
        }
        
        if (syncedLocal) {
            try {
                setSyncedIds(new Set(JSON.parse(syncedLocal)));
            } catch (e) {
                console.error('Failed to load synced IDs', e);
            }
        }
    }, []);

    const syncSolves = useCallback(async (currentSolvesOverride?: SolveRecord[]) => {
        if (!user || isSyncing) return;
        
        setIsSyncing(true);
        console.log('[Sync] Starting synchronization...');
        try {
            // 1. Fetch remote state
            const remoteSolves = await storageProvider.loadSolves(user.id);
            const remoteMap = new Map<string, SolveRecord>(remoteSolves.map(s => [s.id, s]));
            console.log(`[Sync] Loaded ${remoteSolves.length} solves from cloud.`);
            
            // 2. Merge Logic (Union with Conflict Resolution)
            const localToMerge = currentSolvesOverride || solvesRef.current;
            const mergedMap = new Map<string, SolveRecord>();
            
            // Loop through local first to process their sync state
            localToMerge.forEach(s => {
                const r = remoteMap.get(s.id);
                if (!r) {
                    // Local-only solve (new solve)
                    mergedMap.set(s.id, s);
                } else {
                    // Conflict check: does local version differ from remote database?
                    const isDifferent = s.penalty !== r.penalty || s.comment !== r.comment;
                    if (!isDifferent) {
                        // Identical, local version is fine
                        mergedMap.set(s.id, s);
                    } else {
                        // They differ! Determine which one wins:
                        // If it's NOT in syncedIds, local has unsynced changes. Local wins!
                        if (!syncedIds.has(s.id)) {
                            mergedMap.set(s.id, s);
                        } else {
                            // Already synced previously, so the remote update wins (set from another device)
                            mergedMap.set(s.id, r);
                        }
                    }
                }
            });

            // Add any remote solves that were not present in local
            remoteSolves.forEach(r => {
                if (!mergedMap.has(r.id)) {
                    mergedMap.set(r.id, r);
                }
            });

            const mergedSolves = Array.from(mergedMap.values())
                .sort((a, b) => a.date.getTime() - b.date.getTime());

            // 3. Update local state immediately before push (so UI is snappy)
            setSolves(mergedSolves);
            localStorage.setItem('cubr_solves', JSON.stringify(mergedSolves));

            // 4. Identify and push local-only / updated solves
            const unsynced = mergedSolves.filter(s => {
                const r = remoteMap.get(s.id);
                if (!r) return true; // not in remote database
                return s.penalty !== r.penalty || s.comment !== r.comment; // edited locally
            });
            
            if (unsynced.length > 0) {
                console.log(`[Sync] Found ${unsynced.length} unsynced/modified solves locally. Pushing to cloud...`);
                try {
                    await storageProvider.upsertSolves(user.id, unsynced);
                    console.log(`[Sync] Successfully pushed ${unsynced.length} solves.`);
                    
                    const finalSyncedIds = new Set(mergedSolves.map(s => s.id));
                    setSyncedIds(finalSyncedIds);
                    saveSyncedIds(finalSyncedIds);
                } catch (pushErr) {
                    console.error('[Sync] Failed to push unsynced solves:', pushErr);
                    alert(`Cubr Sync: Failed to push unsynced solves. ${pushErr && typeof pushErr === 'object' ? JSON.stringify(pushErr, null, 2) : String(pushErr)}`);
                    
                    // Update syncedIds to only those that were NOT unsynced (i.e. already synced)
                    const unsyncedSet = new Set(unsynced.map(s => s.id));
                    const partiallySyncedIds = new Set(
                        mergedSolves
                            .map(s => s.id)
                            .filter(id => !unsyncedSet.has(id))
                    );
                    setSyncedIds(partiallySyncedIds);
                    saveSyncedIds(partiallySyncedIds);
                }
            } else {
                console.log('[Sync] No unsynced solves found locally.');
                const finalSyncedIds = new Set(mergedSolves.map(s => s.id));
                setSyncedIds(finalSyncedIds);
                saveSyncedIds(finalSyncedIds);
            }

        } catch (err) {
            console.error('[Sync] Overall sync process failed:', err);
            alert(`Cubr Sync: Overall sync failed. ${err && typeof err === 'object' ? JSON.stringify(err, null, 2) : String(err)}`);
        } finally {
            setIsSyncing(false);
            console.log('[Sync] Synchronization finished.');
        }
    }, [user, storageProvider, saveSyncedIds, syncedIds]);
 // REMOVED solves dependency

    // Auto-sync triggers
    useEffect(() => {
        if (user) {
            // Initial sync on mount/login
            syncSolves(); 

            const interval = setInterval(() => syncSolves(), 5 * 60 * 1000);
            
            const handleVisibilityChange = () => {
                if (document.visibilityState === 'visible') {
                    console.log('[Sync] App resumed, triggering sync...');
                    syncSolves();
                }
            };
            
            window.addEventListener('visibilitychange', handleVisibilityChange);
            return () => {
                clearInterval(interval);
                window.removeEventListener('visibilitychange', handleVisibilityChange);
            };
        }
    }, [user, syncSolves]);

    // Track unsynced count via memo
    const unsyncedCount = useMemo(() => {
        if (!user) return 0;
        const pending = solves.filter(s => !syncedIds.has(s.id));
        return pending.length;
    }, [solves, syncedIds, user]);

    const addSolve = useCallback(async (solve: SolveRecord) => {
        const roundedSolve = { ...solve, timeMs: Math.round(solve.timeMs) };
        setSolves(prev => {
            const next = [...prev, roundedSolve];
            localStorage.setItem('cubr_solves', JSON.stringify(next));
            return next;
        });

        if (user) {
            try {
                await storageProvider.saveSolve(user.id, roundedSolve);
                setSyncedIds(prev => {
                    const next = new Set(prev);
                    next.add(roundedSolve.id);
                    saveSyncedIds(next);
                    return next;
                });
            } catch (err) {
                console.error('[Sync] Error saving solve to cloud:', err);
            }
        }
    }, [user, storageProvider, saveSyncedIds]);

    const addSolves = useCallback(async (newSolves: SolveRecord[]) => {
        const roundedSolves = newSolves.map(s => ({ ...s, timeMs: Math.round(s.timeMs) }));
        setSolves(prev => {
            const next = [...prev, ...roundedSolves].sort((a, b) => a.date.getTime() - b.date.getTime());
            localStorage.setItem('cubr_solves', JSON.stringify(next));
            return next;
        });

        if (user) {
            try {
                await storageProvider.upsertSolves(user.id, roundedSolves);
                setSyncedIds(prev => {
                    const next = new Set(prev);
                    roundedSolves.forEach(s => next.add(s.id));
                    saveSyncedIds(next);
                    return next;
                });
            } catch (err) {
                console.error('[Sync] Error bulk saving solves to cloud:', err);
            }
        }
    }, [user, storageProvider, saveSyncedIds]);

    const updateSolve = useCallback(async (id: string, updates: Partial<SolveRecord>) => {
        let updatedSolve: SolveRecord | undefined;
        setSolves(prev => {
            const next = prev.map(s => {
                if (s.id === id) {
                    updatedSolve = { ...s, ...updates };
                    return updatedSolve;
                }
                return s;
            });
            localStorage.setItem('cubr_solves', JSON.stringify(next));
            return next;
        });

        // Mark as unsynced locally until successfully confirmed in cloud
        setSyncedIds(prev => {
            const next = new Set(prev);
            next.delete(id);
            saveSyncedIds(next);
            return next;
        });

        if (user && updatedSolve) {
            try {
                await storageProvider.saveSolve(user.id, updatedSolve);
                setSyncedIds(prev => {
                    const next = new Set(prev);
                    next.add(id);
                    saveSyncedIds(next);
                    return next;
                });
            } catch (err) {
                console.error('[Sync] Error updating solve in cloud:', err);
            }
        }
    }, [user, storageProvider, saveSyncedIds]);

    const deleteSolve = useCallback(async (id: string) => {
        setSolves(prev => {
            const next = prev.filter(s => s.id !== id);
            localStorage.setItem('cubr_solves', JSON.stringify(next));
            return next;
        });
        
        setSyncedIds(prev => {
            const next = new Set(prev);
            next.delete(id);
            saveSyncedIds(next);
            return next;
        });

        if (user) {
            try {
                await storageProvider.deleteSolve(user.id, id);
            } catch (err) {
                console.error('[Sync] Error deleting solve from cloud:', err);
            }
        }
    }, [user, storageProvider, saveSyncedIds]);

    const signOut = useCallback(async (force: boolean = false) => {
        if (!force && unsyncedCount > 0) {
            const confirmed = window.confirm(`You have ${unsyncedCount} unsynced solves. Logging out will delete them from this device permanently. Proceed?`);
            if (!confirmed) return false;
        }

        await supabase.auth.signOut();
        localStorage.removeItem('cubr_solves');
        localStorage.removeItem('cubr_synced_ids');
        setSolves([]);
        setSyncedIds(new Set());
        return true;
    }, [unsyncedCount]);

    const clearSolves = useCallback(async () => {
        setSolves([]);
        setSyncedIds(new Set());
        localStorage.removeItem('cubr_solves');
        localStorage.removeItem('cubr_synced_ids');

        if (user) {
            try {
                await storageProvider.deleteAllSolves(user.id);
            } catch (err) {
                console.error('[Sync] Error clearing cloud data:', err);
            }
        }
    }, [user, storageProvider]);

    const deduplicateCloud = useCallback(async () => {
        if (!user) return;
        setIsSyncing(true);
        try {
            const count = await storageProvider.cleanupDuplicates(user.id);
            if (count > 0) {
                const refreshed = await storageProvider.loadSolves(user.id);
                setSolves(refreshed);
                const ids = new Set(refreshed.map(s => s.id));
                setSyncedIds(ids);
                localStorage.setItem('cubr_solves', JSON.stringify(refreshed));
                saveSyncedIds(ids);
            }
        } catch (err) {
            console.error('[Sync] Error during cloud deduplication:', err);
        } finally {
            setIsSyncing(false);
        }
    }, [user, storageProvider, saveSyncedIds]);

    return {
        solves,
        addSolve,
        addSolves,
        updateSolve,
        deleteSolve,
        isSyncing,
        isAuthenticated: !!user,
        user,
        signOut,
        clearSolves,
        deduplicateCloud,
        unsyncedCount,
        syncSolves
    };
}
