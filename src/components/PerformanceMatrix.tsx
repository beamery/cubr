import React, { useMemo } from 'react';
import { calculateAo, formatTimeMs, calculateTargetTime } from '../logic/stats';
import type { SolveRecord } from '../types_new';

interface PerformanceMatrixProps {
    solves: SolveRecord[];
    globalBests: {
        b5: number | null;
        b12: number | null;
        b100: number | null;
    };
    dailyBests: {
        b5: number | null;
        b12: number | null;
        b100: number | null;
    };
}

export const PerformanceMatrix: React.FC<PerformanceMatrixProps> = ({ solves, globalBests, dailyBests }) => {
    const targets = useMemo(() => {
        return {
            global: {
                ao5: calculateTargetTime(solves, 5, globalBests.b5),
                ao12: calculateTargetTime(solves, 12, globalBests.b12),
                ao100: calculateTargetTime(solves, 100, globalBests.b100)
            },
            daily: {
                ao5: calculateTargetTime(solves, 5, dailyBests.b5),
                ao12: calculateTargetTime(solves, 12, dailyBests.b12),
                ao100: calculateTargetTime(solves, 100, dailyBests.b100)
            }
        };
    }, [solves, globalBests, dailyBests]);

    return (
        <div className="performance-matrix-container">
            <div className="matrix-grid">
                {[
                    { label: 'Ao5', current: calculateAo(solves, 5), global: targets.global.ao5, daily: targets.daily.ao5 },
                    { label: 'Ao12', current: calculateAo(solves, 12), global: targets.global.ao12, daily: targets.daily.ao12 },
                    { label: 'Ao100', current: calculateAo(solves, 100), global: targets.global.ao100, daily: targets.daily.ao100 }
                ].map(s => (
                    <div key={s.label} className="matrix-card glass">
                        <span className="label">{s.label}</span>
                        <span className="current data-point">{s.current}</span>
                        
                        <div className="target-box">
                            <div className="target-row">
                                <span className="target-label">DAILY</span>
                                <span className="target-val daily">
                                    {s.daily ? formatTimeMs(s.daily) : '--'}
                                </span>
                            </div>
                            <div className="target-row">
                                <span className="target-label">GLOBAL</span>
                                <span className="target-val global">
                                    {s.global ? formatTimeMs(s.global) : '--'}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
