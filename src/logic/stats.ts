import type { SolveRecord } from '../types_new';

export function formatTimeMs(ms: number): string {
    if (ms === Infinity) return 'DNF';
    const seconds = (ms / 1000).toFixed(2);
    if (ms < 60000) return seconds;
    
    const mins = Math.floor(ms / 60000);
    const secs = ((ms % 60000) / 1000).toFixed(2);
    return `${mins}:${secs.padStart(5, '0')}`;
}

export function calculateAoRaw(solves: SolveRecord[], size: number): number | null {
    if (solves.length < size) return null;
    const subset = solves.slice(-size);
    const times = subset.map(s => s.penalty === 'DNF' ? Infinity : (s.penalty === '+2' ? s.timeMs + 2000 : s.timeMs));
    
    if (size === 3) {
        const dnfCount = times.filter(t => t === Infinity).length;
        if (dnfCount > 0) return Infinity;
        return times.reduce((a, b) => a + b, 0) / 3;
    }

    // WCA 9f2: Exclude best and worst 5% (rounded up)
    const trimCount = Math.ceil(size * 0.05);
    const dnfCount = times.filter(t => t === Infinity).length;
    
    if (dnfCount > trimCount) return Infinity;
    
    times.sort((a, b) => a - b);
    const trimmed = times.slice(trimCount, -trimCount);
    return trimmed.reduce((a, b) => a + b, 0) / (size - (2 * trimCount));
}

export function calculateAo(solves: SolveRecord[], size: number): string {
    const raw = calculateAoRaw(solves, size);
    if (raw === null) return '--';
    return formatTimeMs(raw);
}

export function getSessionBest(solves: SolveRecord[], size: number): number | null {
    if (solves.length < size) return null;
    let best = Infinity;
    
    for (let i = 0; i <= solves.length - size; i++) {
        const currentAo = calculateAoRaw(solves.slice(i, i + size), size);
        if (currentAo !== null && currentAo < best) {
            best = currentAo;
        }
    }
    
    return best === Infinity ? null : best;
}

/**
 * Calculates what time is needed on the next solve to break the current personal best (PB).
 * Based on csTimer's target logic.
 */
export function calculateTargetTime(solves: SolveRecord[], n: number, bestAoMs: number | null): number | null {
    if (!bestAoMs || solves.length < n - 1) return null;
    
    const lastNMinus1 = solves.slice(-(n - 1));
    
    // Test if 0.001 beats it. If not, PB is impossible this solve.
    const testSolve0 = { timeMs: 1, penalty: 'NONE', id: 'tmp', scramble: '', date: new Date() } as SolveRecord;
    const testAo0 = calculateAoRaw([...lastNMinus1, testSolve0], n);
    if (testAo0 === null || testAo0 >= bestAoMs) {
        return null;
    }

    // Binary search for the highest ms that still beats PB
    let low = 0;
    let high = 600000; // 10 minutes
    let result = 0;
    
    for (let i = 0; i < 20; i++) {
        let mid = (low + high) / 2;
        const testSolve = { timeMs: mid, penalty: 'NONE', id: 'tmp', scramble: '', date: new Date() } as SolveRecord;
        const testAo = calculateAoRaw([...lastNMinus1, testSolve], n);
        if (testAo !== null && testAo < bestAoMs) {
            result = mid;
            low = mid;
        } else {
            high = mid;
        }
    }
    
    return result > 0 ? result : null;
}

export interface HistoricalStats {
    single: number | null;
    mo3: number | null;
    ao5: number | null;
    ao12: number | null;
    ao25: number | null;
    ao50: number | null;
    ao100: number | null;
    isRecord: {
        single: boolean;
        mo3: boolean;
        ao5: boolean;
        ao12: boolean;
        ao25: boolean;
        ao50: boolean;
        ao100: boolean;
    };
    isGlobalRecord: {
        single: boolean;
        mo3: boolean;
        ao5: boolean;
        ao12: boolean;
        ao25: boolean;
        ao50: boolean;
        ao100: boolean;
    };
}

/**
 * Calculates records within day-based sessions.
 */
export function getRunningRecords(solves: SolveRecord[]): HistoricalStats[] {
    let globalBestSingle = Infinity;
    let globalBestMo3 = Infinity;
    let globalBestAo5 = Infinity;
    let globalBestAo12 = Infinity;
    let globalBestAo25 = Infinity;
    let globalBestAo50 = Infinity;
    let globalBestAo100 = Infinity;

    // Daily bests (reset each day)
    let dailyBestSingle = Infinity;
    let dailyBestMo3 = Infinity;
    let dailyBestAo5 = Infinity;
    let dailyBestAo12 = Infinity;
    let dailyBestAo25 = Infinity;
    let dailyBestAo50 = Infinity;
    let dailyBestAo100 = Infinity;
    let lastDate = "";

    return solves.map((s, i) => {
        const date = new Date(s.date).toDateString(); 
        if (date !== lastDate) {
            dailyBestSingle = Infinity;
            dailyBestMo3 = Infinity;
            dailyBestAo5 = Infinity;
            dailyBestAo12 = Infinity;
            dailyBestAo25 = Infinity;
            dailyBestAo50 = Infinity;
            dailyBestAo100 = Infinity;
            lastDate = date;
        }

        const currentSingle = s.penalty === 'DNF' ? Infinity : (s.penalty === '+2' ? s.timeMs + 2000 : s.timeMs);
        
        // Rolling Averages
        const currentMo3 = i >= 2 ? calculateAoRaw(solves.slice(i - 2, i + 1), 3) : null;
        const currentAo5 = i >= 4 ? calculateAoRaw(solves.slice(i - 4, i + 1), 5) : null;
        const currentAo12 = i >= 11 ? calculateAoRaw(solves.slice(i - 11, i + 1), 12) : null;
        const currentAo25 = i >= 24 ? calculateAoRaw(solves.slice(i - 24, i + 1), 25) : null;
        const currentAo50 = i >= 49 ? calculateAoRaw(solves.slice(i - 49, i + 1), 50) : null;
        const currentAo100 = i >= 99 ? calculateAoRaw(solves.slice(i - 99, i + 1), 100) : null;

        // Daily Record Flags
        const isDailyRecordSingle = currentSingle < dailyBestSingle && currentSingle !== Infinity;
        if (isDailyRecordSingle) dailyBestSingle = currentSingle;

        const isDailyRecordMo3 = currentMo3 !== null && currentMo3 < dailyBestMo3 && currentMo3 !== Infinity;
        if (isDailyRecordMo3) dailyBestMo3 = currentMo3!;

        const isDailyRecordAo5 = currentAo5 !== null && currentAo5 < dailyBestAo5 && currentAo5 !== Infinity;
        if (isDailyRecordAo5) dailyBestAo5 = currentAo5!;

        const isDailyRecordAo12 = currentAo12 !== null && currentAo12 < dailyBestAo12 && currentAo12 !== Infinity;
        if (isDailyRecordAo12) dailyBestAo12 = currentAo12!;

        const isDailyRecordAo25 = currentAo25 !== null && currentAo25 < dailyBestAo25 && currentAo25 !== Infinity;
        if (isDailyRecordAo25) dailyBestAo25 = currentAo25!;

        const isDailyRecordAo50 = currentAo50 !== null && currentAo50 < dailyBestAo50 && currentAo50 !== Infinity;
        if (isDailyRecordAo50) dailyBestAo50 = currentAo50!;

        const isDailyRecordAo100 = currentAo100 !== null && currentAo100 < dailyBestAo100 && currentAo100 !== Infinity;
        if (isDailyRecordAo100) dailyBestAo100 = currentAo100!;

        // Global Record Flags
        const isGlobalRecordSingle = currentSingle < globalBestSingle && currentSingle !== Infinity;
        if (isGlobalRecordSingle) globalBestSingle = currentSingle;

        const isGlobalRecordMo3 = currentMo3 !== null && currentMo3 < globalBestMo3 && currentMo3 !== Infinity;
        if (isGlobalRecordMo3) globalBestMo3 = currentMo3!;
        
        const isGlobalRecordAo5 = currentAo5 !== null && currentAo5 < globalBestAo5 && currentAo5 !== Infinity;
        if (isGlobalRecordAo5) globalBestAo5 = currentAo5!;

        const isGlobalRecordAo12 = currentAo12 !== null && currentAo12 < globalBestAo12 && currentAo12 !== Infinity;
        if (isGlobalRecordAo12) globalBestAo12 = currentAo12!;

        const isGlobalRecordAo25 = currentAo25 !== null && currentAo25 < globalBestAo25 && currentAo25 !== Infinity;
        if (isGlobalRecordAo25) globalBestAo25 = currentAo25!;

        const isGlobalRecordAo50 = currentAo50 !== null && currentAo50 < globalBestAo50 && currentAo50 !== Infinity;
        if (isGlobalRecordAo50) globalBestAo50 = currentAo50!;

        const isGlobalRecordAo100 = currentAo100 !== null && currentAo100 < globalBestAo100 && currentAo100 !== Infinity;
        if (isGlobalRecordAo100) globalBestAo100 = currentAo100!;

        return {
            single: currentSingle === Infinity ? null : currentSingle,
            mo3: (currentMo3 === null || currentMo3 === Infinity) ? null : currentMo3,
            ao5: (currentAo5 === null || currentAo5 === Infinity) ? null : currentAo5,
            ao12: (currentAo12 === null || currentAo12 === Infinity) ? null : currentAo12,
            ao25: (currentAo25 === null || currentAo25 === Infinity) ? null : currentAo25,
            ao50: (currentAo50 === null || currentAo50 === Infinity) ? null : currentAo50,
            ao100: (currentAo100 === null || currentAo100 === Infinity) ? null : currentAo100,
            isRecord: {
                single: isDailyRecordSingle,
                mo3: isDailyRecordMo3,
                ao5: isDailyRecordAo5,
                ao12: isDailyRecordAo12,
                ao25: isDailyRecordAo25,
                ao50: isDailyRecordAo50,
                ao100: isDailyRecordAo100
            },
            isGlobalRecord: {
                single: isGlobalRecordSingle,
                mo3: isGlobalRecordMo3,
                ao5: isGlobalRecordAo5,
                ao12: isGlobalRecordAo12,
                ao25: isGlobalRecordAo25,
                ao50: isGlobalRecordAo50,
                ao100: isGlobalRecordAo100
            }
        };
    });
}

export interface DaySession {
    date: string;
    solves: SolveRecord[];
    bestSingle: number | null;
    bestAo5: number | null;
    bestAo12: number | null;
    bestAo100: number | null;
    globalBestBefore: {
        single: number | null;
        ao5: number | null;
        ao12: number | null;
        ao100: number | null;
    };
}

export function groupSolvesByDay(solves: SolveRecord[]): DaySession[] {
    const historical = getRunningRecords(solves);
    const groups: Record<string, { solves: SolveRecord[], stats: HistoricalStats[] }> = {};
    
    solves.forEach((s, i) => {
        const date = new Date(s.date).toISOString().split('T')[0];
        if (!groups[date]) groups[date] = { solves: [], stats: [] };
        groups[date].solves.push(s);
        groups[date].stats.push(historical[i]);
    });

    const sortedDates = Object.keys(groups).sort();
    const daySessions: DaySession[] = [];
    
    let globalBestSingle: number | null = null;
    let globalBestAo5: number | null = null;
    let globalBestAo12: number | null = null;
    let globalBestAo100: number | null = null;

    sortedDates.forEach(date => {
        const dayData = groups[date];
        const dayBestSingle = Math.min(...dayData.stats.map(s => s.single ?? Infinity));
        const dayBestAo5 = Math.min(...dayData.stats.map(s => s.ao5 ?? Infinity));
        const dayBestAo12 = Math.min(...dayData.stats.map(s => s.ao12 ?? Infinity));
        const dayBestAo100 = Math.min(...dayData.stats.map(s => s.ao100 ?? Infinity));

        daySessions.push({
            date,
            solves: dayData.solves,
            bestSingle: dayBestSingle === Infinity ? null : dayBestSingle,
            bestAo5: dayBestAo5 === Infinity ? null : dayBestAo5,
            bestAo12: dayBestAo12 === Infinity ? null : dayBestAo12,
            bestAo100: dayBestAo100 === Infinity ? null : dayBestAo100,
            globalBestBefore: {
                single: globalBestSingle,
                ao5: globalBestAo5,
                ao12: globalBestAo12,
                ao100: globalBestAo100
            }
        });

        if (dayBestSingle !== Infinity && (globalBestSingle === null || dayBestSingle < globalBestSingle)) globalBestSingle = dayBestSingle;
        if (dayBestAo5 !== Infinity && (globalBestAo5 === null || dayBestAo5 < globalBestAo5)) globalBestAo5 = dayBestAo5;
        if (dayBestAo12 !== Infinity && (globalBestAo12 === null || dayBestAo12 < globalBestAo12)) globalBestAo12 = dayBestAo12;
        if (dayBestAo100 !== Infinity && (globalBestAo100 === null || dayBestAo100 < globalBestAo100)) globalBestAo100 = dayBestAo100;
    });

    return daySessions.reverse();
}

/**
 * Calculates a sensible X-axis window for a set of solves.
 * Uses 1st and 99th percentiles with a buffer.
 */
export function calculateSmartWindow(solves: SolveRecord[]): { min: number, max: number } {
    if (solves.length === 0) return { min: 0, max: 60000 };
    
    const times = solves
        .map(s => s.penalty === 'DNF' ? Infinity : (s.penalty === '+2' ? s.timeMs + 2000 : s.timeMs))
        .filter(t => t !== Infinity)
        .sort((a, b) => a - b);
        
    if (times.length === 0) return { min: 0, max: 60000 };
    
    // Use 1st and 99th percentile
    const p1 = times[Math.floor(times.length * 0.01)];
    const p99 = times[Math.floor(times.length * 0.99)];
    
    // Add 10% buffer
    const range = p99 - p1;
    const buffer = Math.max(range * 0.1, 2000); // at least 2s buffer
    
    return {
        min: Math.max(0, Math.floor((p1 - buffer) / 1000) * 1000),
        max: Math.ceil((p99 + buffer) / 1000) * 1000
    };
}

export interface ComparisonBucket {
    time: number;
    currentCount: number;
    compareCount: number;
    currentPercent: number;
    comparePercent: number;
}

export interface ComparisonData {
    buckets: ComparisonBucket[];
    currentMedian: number | null;
    compareMedian: number | null;
    currentTotal: number;
    compareTotal: number;
}

/**
 * Generates comparative distribution data for two time periods.
 * Normalizes counts to percentages to allow for fair comparison.
 */
export function getComparisonHistogramData(
    solves: SolveRecord[],
    currentDays: number,
    compareDays: number,
    windowMin: number,
    windowMax: number,
    bucketSizeMs: number
): ComparisonData {
    const today = new Date();
    
    const currentSolves = solves.filter(s => {
        const diffDays = (today.getTime() - new Date(s.date).getTime()) / (1000 * 60 * 60 * 24);
        return diffDays >= 0 && diffDays < currentDays;
    });
    
    const compareSolves = solves.filter(s => {
        const diffDays = (today.getTime() - new Date(s.date).getTime()) / (1000 * 60 * 60 * 24);
        return diffDays >= currentDays && diffDays < currentDays + compareDays;
    });

    const currentTimes = currentSolves
        .map(s => s.penalty === 'DNF' ? Infinity : (s.penalty === '+2' ? s.timeMs + 2000 : s.timeMs))
        .filter(t => t !== Infinity)
        .sort((a, b) => a - b);
        
    const compareTimes = compareSolves
        .map(s => s.penalty === 'DNF' ? Infinity : (s.penalty === '+2' ? s.timeMs + 2000 : s.timeMs))
        .filter(t => t !== Infinity)
        .sort((a, b) => a - b);

    const buckets: ComparisonBucket[] = [];
    for (let t = windowMin; t <= windowMax; t += bucketSizeMs) {
        const currentCount = currentTimes.filter(time => time >= t && time < t + bucketSizeMs).length;
        const compareCount = compareTimes.filter(time => time >= t && time < t + bucketSizeMs).length;
        
        buckets.push({
            time: t,
            currentCount,
            compareCount,
            currentPercent: currentTimes.length > 0 ? (currentCount / currentTimes.length) * 100 : 0,
            comparePercent: compareTimes.length > 0 ? (compareCount / compareTimes.length) * 100 : 0
        });
    }

    return {
        buckets,
        currentMedian: currentTimes.length > 0 ? currentTimes[Math.floor(currentTimes.length * 0.5)] : null,
        compareMedian: compareTimes.length > 0 ? compareTimes[Math.floor(compareTimes.length * 0.5)] : null,
        currentTotal: currentTimes.length,
        compareTotal: compareTimes.length
    };
}


