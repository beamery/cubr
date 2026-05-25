export type PenaltyType = 'NONE' | '+2' | 'DNF';

export type SolveRecord = {
    id: string;
    timeMs: number;
    penalty: PenaltyType;
    comment?: string;
    scramble: string;
    date: Date;
};

export type SessionContext = {
    id: string;
    name: string;
    puzzleType: string;
    filePath?: string;
};

export type TimerState = 'IDLE' | 'HOLDING' | 'READY' | 'RUNNING' | 'STOPPED';

export type TimerMode = 'TIMER' | 'LAB';
