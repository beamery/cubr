import React, { useMemo } from 'react';
import { X, Trophy } from 'lucide-react';
import { formatTimeMs, calculateAoRaw } from '../logic/stats';
import type { SolveRecord } from '../types_new';

interface PRModalProps {
    solves: SolveRecord[];
    onClose: () => void;
    onSolveClick: (solve: SolveRecord) => void;
}

export const PRModal: React.FC<PRModalProps> = ({ solves, onClose, onSolveClick }) => {
    const today = new Date().toDateString();

    const stats = useMemo(() => {
        const calculateBests = (list: SolveRecord[], filterDate?: string) => {
            const getBestSingle = (l: SolveRecord[]): { value: number; sequence: SolveRecord[] } => {
                let bestVal = Infinity;
                let bestSolve: SolveRecord | null = null;
                l.forEach(s => {
                    if (filterDate && new Date(s.date).toDateString() !== filterDate) return;
                    const val = s.penalty === '+2' ? s.timeMs + 2000 : s.timeMs;
                    if (s.penalty !== 'DNF' && val < bestVal) {
                        bestVal = val;
                        bestSolve = s;
                    }
                });

                return { value: bestVal, sequence: bestSolve ? [bestSolve] : [] };
            };

            const getBestAo = (l: SolveRecord[], n: number): { value: number; sequence: SolveRecord[] } => {
                if (l.length < n) return { value: Infinity, sequence: [] };
                let best = Infinity;
                let bestSeq: SolveRecord[] = [];
                for (let i = 0; i <= l.length - n; i++) {
                    const seq = l.slice(i, i + n);
                    // Check if the average ended on the filter date
                    if (filterDate && new Date(seq[n-1].date).toDateString() !== filterDate) continue;

                    const avg = calculateAoRaw(seq, n);
                    if (avg !== null && avg < best) {
                        best = avg;
                        bestSeq = seq;
                    }
                }
                return { value: best, sequence: bestSeq };
            };

            return {
                single: getBestSingle(list),
                mo3: getBestAo(list, 3),
                ao5: getBestAo(list, 5),
                ao12: getBestAo(list, 12),
                ao25: getBestAo(list, 25),
                ao50: getBestAo(list, 50),
                ao100: getBestAo(list, 100),
                count: filterDate 
                    ? list.filter(s => new Date(s.date).toDateString() === filterDate).length 
                    : list.length
            };
        };

        return {
            today: calculateBests(solves, today),
            lifetime: calculateBests(solves)
        };
    }, [solves, today]);

    const [selectedSeq, setSelectedSeq] = React.useState<{ label: string; sequence: SolveRecord[] } | null>(null);

    const renderCompareBox = (label: string, today: { value: number; sequence: SolveRecord[] }, lifetime: { value: number; sequence: SolveRecord[] }) => {
        const isNewPR = today.value !== Infinity && today.value <= lifetime.value;
        
        return (
            <div className={`pr-compare-box ${isNewPR ? 'is-new-pr' : ''}`}>
                <div className="pr-label-row">
                    <span className="kinetic-label">{label}</span>
                    {isNewPR && <Trophy size={14} className="pr-icon-gold" />}
                </div>
                <div className="pr-values-grid">
                    <div 
                        className="pr-value-col interactive" 
                        onClick={() => today.value !== Infinity && setSelectedSeq({ label: `Today's ${label}`, sequence: today.sequence })}
                    >
                        <span className="pr-sub-label">TODAY</span>
                        <span className="pr-value kinetic-timer-font">
                            {today.value === Infinity ? '--' : formatTimeMs(today.value)}
                        </span>
                    </div>
                    <div className="pr-divider" />
                    <div 
                        className="pr-value-col align-right interactive"
                        onClick={() => lifetime.value !== Infinity && setSelectedSeq({ label: `All-Time ${label}`, sequence: lifetime.sequence })}
                    >
                        <span className="pr-sub-label">ALL TIME</span>
                        <span className="pr-value lifetime kinetic-timer-font">
                            {lifetime.value === Infinity ? '--' : formatTimeMs(lifetime.value)}
                        </span>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="analytics-overlay" onClick={onClose}>
            <div className="pr-modal-container glass" onClick={e => e.stopPropagation()}>
                <header className="pr-modal-header">
                    <span className="kinetic-label">SESSION BESTS</span>
                    <button className="close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </header>

                <div className="pr-modal-content">
                    {/* Solve Count Metrics */}
                    <div className="pr-counts-grid">
                        <div className="pr-count-box">
                            <span className="pr-sub-label">TODAY'S SOLVES</span>
                            <span className="pr-count-val">{stats.today.count}</span>
                        </div>
                        <div className="pr-divider" />
                        <div className="pr-count-box align-right">
                            <span className="pr-sub-label">LIFETIME SOLVES</span>
                            <span className="pr-count-val highlight">{stats.lifetime.count}</span>
                        </div>
                    </div>

                    {renderCompareBox('BEST SINGLE', stats.today.single, stats.lifetime.single)}
                    {renderCompareBox('BEST MO3', stats.today.mo3, stats.lifetime.mo3)}
                    {renderCompareBox('BEST AO5', stats.today.ao5, stats.lifetime.ao5)}
                    {renderCompareBox('BEST AO12', stats.today.ao12, stats.lifetime.ao12)}
                    {renderCompareBox('BEST AO25', stats.today.ao25, stats.lifetime.ao25)}
                    {renderCompareBox('BEST AO50', stats.today.ao50, stats.lifetime.ao50)}
                    {renderCompareBox('BEST AO100', stats.today.ao100, stats.lifetime.ao100)}
                </div>


                {/* Nested Sequence Modal */}
                {selectedSeq && (
                    <div className="sequence-overlay" onClick={() => setSelectedSeq(null)}>
                        <div className="sequence-modal glass" onClick={e => e.stopPropagation()}>
                            <header className="pr-modal-header" style={{ padding: '24px 24px 12px 24px' }}>
                                <span className="kinetic-label">{selectedSeq.label}</span>
                                <button className="close-btn" onClick={() => setSelectedSeq(null)}>
                                    <X size={16} />
                                </button>
                            </header>
                            <div className="history-list-header">
                                <span>Idx</span>
                                <span>Time</span>
                                <span className="align-right">Date</span>
                                <span className="align-right">Penalty</span>
                                <span></span>
                            </div>
                            <div className="sidebar-scroll">
                                <div className="history-list">
                                    {selectedSeq.sequence.map((s, idx) => {
                                        const dateStr = new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                        return (
                                            <div 
                                                key={s.id} 
                                                className="history-item interactive"
                                                onClick={() => onSolveClick(s)}
                                            >
                                                <span className="history-index">{idx + 1}</span>
                                                <span className="history-time data-point">
                                                    {s.penalty === 'DNF' ? 'DNF' : formatTimeMs(s.penalty === '+2' ? s.timeMs + 2000 : s.timeMs)}
                                                </span>
                                                <div className="history-avg-val">{dateStr}</div>
                                                <div className="history-avg-val">{s.penalty !== 'NONE' ? s.penalty : '--'}</div>
                                                <div className="history-avg-val"></div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
