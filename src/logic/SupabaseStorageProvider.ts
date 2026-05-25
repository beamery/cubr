import { supabase } from './supabase';
import type { SolveRecord, PenaltyType } from '../types_new';
import { parseSafeDate } from './dateUtils';

export class SupabaseStorageProvider {
    async loadSolves(userId: string): Promise<SolveRecord[]> {
        const allRows: any[] = [];
        let from = 0;
        const PAGE_SIZE = 1000;

        while (true) {
            const { data, error } = await supabase
                .from('solves')
                .select('*')
                .eq('user_id', userId)
                .order('date', { ascending: true })
                .range(from, from + PAGE_SIZE - 1);

            if (error) {
                console.error('[Supabase] Error loading solves:', error);
                throw error;
            }

            if (!data || data.length === 0) break;
            allRows.push(...data);

            if (data.length < PAGE_SIZE) break;
            from += PAGE_SIZE;
        }

        return allRows.map(row => ({
            id: row.id,
            timeMs: row.time_ms,
            penalty: row.penalty as PenaltyType,
            scramble: row.scramble,
            comment: row.comment,
            date: parseSafeDate(row.date),
            event: row.event
        }));
    }

    async saveSolve(userId: string, solve: SolveRecord): Promise<void> {
        const { error } = await supabase
            .from('solves')
            .upsert({
                id: solve.id,
                user_id: userId,
                time_ms: Math.round(solve.timeMs || 0),
                penalty: solve.penalty || 'NONE',
                scramble: solve.scramble || '',
                comment: solve.comment || null,
                date: parseSafeDate(solve.date).toISOString(),
                event: solve.event || '333'
            });

        if (error) {
            console.error('[Supabase] Error saving solve:', error);
            throw error;
        }
    }

    async upsertSolves(userId: string, solves: SolveRecord[]): Promise<void> {
        if (solves.length === 0) return;

        const chunks = this.chunkArray(solves, 500);
        for (const chunk of chunks) {
            const { error } = await supabase
                .from('solves')
                .upsert(chunk.map(s => ({
                    id: s.id,
                    user_id: userId,
                    time_ms: Math.round(s.timeMs || 0),
                    penalty: s.penalty || 'NONE',
                    scramble: s.scramble || '',
                    comment: s.comment || null,
                    date: parseSafeDate(s.date).toISOString(),
                    event: s.event || '333'
                })));

            if (error) {
                console.error('[Supabase] Error bulk upserting solves:', error);
                throw error;
            }
        }
    }

    async deleteSolve(userId: string, id: string): Promise<void> {
        const { error } = await supabase
            .from('solves')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);

        if (error) {
            console.error('[Supabase] Error deleting solve:', error);
            throw error;
        }
    }

    async cleanupDuplicates(userId: string): Promise<number> {
        const solves = await this.loadSolves(userId);
        const seen = new Map<number, string>(); // timestamp -> id to keep
        const toDelete: string[] = [];

        // Identify duplicates
        solves.forEach(s => {
            const ts = s.date.getTime();
            if (seen.has(ts)) {
                toDelete.push(s.id);
            } else {
                seen.set(ts, s.id);
            }
        });

        if (toDelete.length === 0) return 0;

        console.log(`[Supabase] Cleaning up ${toDelete.length} duplicate solves...`);
        
        // Delete in chunks of 100
        const chunks = this.chunkArray(toDelete, 100);
        for (const chunk of chunks) {
            const { error } = await supabase
                .from('solves')
                .delete()
                .in('id', chunk)
                .eq('user_id', userId);

            if (error) {
                console.error('[Supabase] Error deleting duplicates:', error);
                throw error;
            }
        }

        return toDelete.length;
    }

    async deleteAllSolves(userId: string): Promise<void> {
        const { error } = await supabase
            .from('solves')
            .delete()
            .eq('user_id', userId);

        if (error) {
            console.error('[Supabase] Error clearing all solves:', error);
            throw error;
        }
    }

    private chunkArray<T>(array: T[], size: number): T[][] {
        const chunks: T[][] = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }
}
