import type { SolveRecord, PenaltyType, EventType } from '../types_new';

export interface CsTimerExport {
    [sessionName: string]: any[][];
}

/**
 * Parses a csTimer session export (nested array format) into Cubr SolveRecords.
 * Format: [[penalty, timeMs], scramble, comment, timestamp]
 */
export function parseCsTimerSession(
    sessionData: any[][], 
    event: EventType = '333'
): SolveRecord[] {
    const MIN_TIMESTAMP = 946684800; // Jan 1, 2000

    return sessionData
        .map((item, index) => {
            if (!Array.isArray(item) || item.length < 3) return null;

            const [timeInfo, scramble, commentOrTs, tsOrComment] = item;
            if (!Array.isArray(timeInfo) || timeInfo.length < 2) return null;

            const [, timeMs] = timeInfo;
            const penaltyVal = timeInfo[0];

            let penalty: PenaltyType = 'NONE';
            if (penaltyVal === 2000) penalty = '+2';
            else if (penaltyVal === -1) penalty = 'DNF';

            // Identify timestamp. csTimer usually puts it at index 3, 
            // but some variants might have it at index 2 if comment is missing.
            let timestamp = typeof tsOrComment === 'number' ? tsOrComment : 
                            (typeof commentOrTs === 'number' ? commentOrTs : 0);

            // If timestamp is still 0 or suspicious, and the other field is a string that looks like a number
            if (timestamp === 0) {
                if (typeof tsOrComment === 'string' && !isNaN(Number(tsOrComment)) && Number(tsOrComment) > MIN_TIMESTAMP) {
                    timestamp = Number(tsOrComment);
                } else if (typeof commentOrTs === 'string' && !isNaN(Number(commentOrTs)) && Number(commentOrTs) > MIN_TIMESTAMP) {
                    timestamp = Number(commentOrTs);
                }
            }

            // Filter out pre-2000 or invalid timestamps
            if (timestamp < MIN_TIMESTAMP) {
                console.warn(`[cstimerImport] Skipping solve at index ${index} due to invalid timestamp: ${timestamp}`);
                return null;
            }

            return {
                id: `cstimer-${timestamp}-${index}-${Math.random().toString(36).substring(2, 11)}`,
                timeMs: timeMs,
                penalty: penalty,
                comment: typeof commentOrTs === 'string' ? commentOrTs : undefined,
                scramble: typeof scramble === 'string' ? scramble : '',
                date: new Date(timestamp * 1000),
                event: event
            } as SolveRecord;
        })
        .filter((s): s is SolveRecord => s !== null);
}

/**
 * Formats a list of Cubr SolveRecords into the csTimer session array format.
 * Format: [[penalty, timeMs], scramble, comment, timestamp]
 */
export function formatAsCsTimerSession(solves: SolveRecord[]): any[][] {
    return solves.map(solve => {
        let penaltyVal = 0;
        if (solve.penalty === '+2') {
            penaltyVal = 2000;
        } else if (solve.penalty === 'DNF') {
            penaltyVal = -1;
        }

        // csTimer uses Unix timestamp in seconds
        const timestamp = Math.floor(new Date(solve.date).getTime() / 1000);

        return [
            [penaltyVal, solve.timeMs],
            solve.scramble || '',
            solve.comment || '',
            timestamp
        ];
    });
}

/**
 * Creates a full csTimer export JSON structure for a given list of solves.
 * This can be imported by csTimer's "Import from file" option.
 */
export function createCsTimerExport(solves: SolveRecord[], sessionName: string = 'Cubr Session'): string {
    const formattedSession = formatAsCsTimerSession(solves);
    const exportObj = {
        properties: {
            sessionData: JSON.stringify({
                "1": {
                    "name": sessionName,
                    "opt": {}
                }
            })
        },
        session1: formattedSession
    };
    return JSON.stringify(exportObj, null, 2);
}

