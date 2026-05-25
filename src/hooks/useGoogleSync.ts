import { useState, useEffect, useCallback } from 'react';
import { StorageProvider } from '../logic/StorageProvider';
import type { SolveRecord } from '../types_new';
import { parseSafeDate } from '../logic/dateUtils';

export function useGoogleSync() {
    const [solves, setSolves] = useState<SolveRecord[]>([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [storageProvider, setStorageProvider] = useState<StorageProvider | null>(null);

    const init = useCallback(async (clientId: string) => {
        setIsSyncing(true);
        try {
            const provider = new StorageProvider(clientId);
            await provider.connectCloud();
            setStorageProvider(provider);
            setIsAuthenticated(true);
            
            const loadedSolves = await provider.loadSolves();
            setSolves(loadedSolves);
            
            // Store client ID locally for future sessions
            localStorage.setItem('cubr_google_client_id', clientId);
        } catch (err) {
            console.error('Failed to sync with Google Drive:', err);
        } finally {
            setIsSyncing(false);
        }
    }, []);

    // Initial load from local storage
    useEffect(() => {
        const local = localStorage.getItem('cubr_solves');
        if (local) {
            const parsed = JSON.parse(local).map((s: any) => ({ ...s, date: parseSafeDate(s.date) }));
            const MIN_DATE = new Date('2000-01-01').getTime();
            
            // Chronological Integrity: Filter out invalid/corrupted dates and sort by date ascending
            const sorted = parsed
                .filter((s: any) => {
                    const t = s.date.getTime();
                    return !isNaN(t) && t >= MIN_DATE;
                })
                .sort((a: any, b: any) => a.date.getTime() - b.date.getTime());
            
            setSolves(sorted);
        }
    }, []);

    // Auto-init if client ID exists
    useEffect(() => {
        const envClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        const savedClientId = localStorage.getItem('cubr_google_client_id') || envClientId;
        
        if (savedClientId && !isAuthenticated && savedClientId !== 'your-client-id-here.apps.googleusercontent.com') {
            init(savedClientId);
        }
    }, [init, isAuthenticated]);

    const addSolve = useCallback(async (solve: SolveRecord) => {
        setSolves(prev => {
            const updated = [...prev, solve];
            localStorage.setItem('cubr_solves', JSON.stringify(updated));
            return updated;
        });
        if (storageProvider) {
            await storageProvider.saveSolve(solve);
        }
    }, [storageProvider]);

    const addSolves = useCallback(async (newSolves: SolveRecord[]) => {
        setSolves(prev => {
            const updated = [...prev, ...newSolves];
            localStorage.setItem('cubr_solves', JSON.stringify(updated));
            return updated;
        });
        
        if (storageProvider) {
            for (const solve of newSolves) {
                await storageProvider.saveSolve(solve);
            }
        }
    }, [storageProvider]);

    const updateSolve = useCallback(async (id: string, updates: Partial<SolveRecord>) => {
        setSolves(prev => {
            const updated = prev.map(s => s.id === id ? { ...s, ...updates } : s);
            localStorage.setItem('cubr_solves', JSON.stringify(updated));
            return updated;
        });
    }, []);

    const deleteSolve = useCallback(async (id: string) => {
        setSolves(prev => {
            const filtered = prev.filter(s => s.id !== id);
            localStorage.setItem('cubr_solves', JSON.stringify(filtered));
            return filtered;
        });
    }, []);

    return {
        solves,
        setSolves,
        addSolve,
        addSolves,
        updateSolve,
        deleteSolve,
        isSyncing,
        isAuthenticated,
        connect: init
    };
}
