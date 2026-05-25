// @ts-nocheck
import React, { useMemo } from 'react';
import { formatTimeMs, calculateAoRaw, calculateTargetTime } from '../logic/stats';
import type { SolveRecord } from '../types_new';

interface MobileHUDProps {
    solves: SolveRecord[];
    activeEvent: string;
    scramble: string;
    onShowHistory: () => void;
    onShowPRs: () => void;
    globalBests: { b5: number | null; b12: number | null; b100: number | null };
    dailyBests: { b5: number | null; b12: number | null; b100: number | null };
}

export const MobileHUD: React.FC<MobileHUDProps> = ({ 
    solves, 
    activeEvent, 
    onShowHistory, 
    onShowPRs,
    globalBests,
    dailyBests
}) => {
    // Current Stats - Memoize to prevent expensive re-calc during timer runs
    const stats = useMemo(() => {
        return {
            mo3: calculateAoRaw(solves, 3),
            ao5: calculateAoRaw(solves, 5),
            ao12: calculateAoRaw(solves, 12),
            ao25: calculateAoRaw(solves, 25),
            ao50: calculateAoRaw(solves, 50),
            ao100: calculateAoRaw(solves, 100)
        };
    }, [solves]);

    const targets = useMemo(() => {
        return {
            ao5: calculateTargetTime(solves, 5, globalBests.b5),
            ao12: calculateTargetTime(solves, 12, globalBests.b12),
            ao100: calculateTargetTime(solves, 100, globalBests.b100)
        };
    }, [solves, globalBests]);

    // Recent Solves (Last 5)
    const recent = useMemo(() => solves.slice(-5), [solves]);
    
    const trimInfo = useMemo(() => {
        let minIdx = -1;
        let maxIdx = -1;
        if (recent.length === 5) {
            let minVal = Infinity;
            let maxVal = -Infinity;
            recent.forEach((s, idx) => {
                const val = s.penalty === 'DNF' ? Infinity : (s.penalty === '+2' ? s.timeMs + 2000 : s.timeMs);
                if (val < minVal) { minVal = val; minIdx = idx; }
                if (val >= maxVal) { maxVal = val; maxIdx = idx; }
            });
        }
        return { minIdx, maxIdx };
    }, [recent]);

    const renderRecentTimes = () => {
        if (recent.length === 0) return <div className="hud-placeholder">No solves yet</div>;
        
        return [...recent].reverse().map((s, revIdx) => {
            const origIdx = recent.length - 1 - revIdx;
            const isTrimmed = (origIdx === trimInfo.minIdx || origIdx === trimInfo.maxIdx);
            const timeStr = s.penalty === 'DNF' ? 'DNF' : formatTimeMs(s.penalty === '+2' ? s.timeMs + 2000 : s.timeMs);
            
            return (
                <span key={s.id} className={`hud-recent-time ${isTrimmed ? 'trimmed' : ''} ${revIdx === 0 ? 'newest' : ''}`}>
                    {isTrimmed ? `(${timeStr})` : timeStr}
                </span>
            );
        });
    };

    return (
        <div className="mobile-hud-container fade-in">
            {/* Left: Recent */}
            <div className="hud-column recent" onClick={onShowHistory}>
                <span className="kinetic-label">RECENT</span>
                <div className="hud-time-list">
                    {renderRecentTimes()}
                </div>
            </div>

            {/* Right: Stats Grid */}
            <div className="hud-column stats" onClick={onShowPRs}>
                <div className="hud-stats-grid">
                    <div className="hud-stat-mini is-secondary">
                        <span className="kinetic-label">MO3</span>
                        <span className="hud-stat-val">{stats.mo3 ? formatTimeMs(stats.mo3) : '--'}</span>
                    </div>
                    <div className="hud-stat-mini is-secondary">
                        <span className="kinetic-label">AO25</span>
                        <span className="hud-stat-val">{stats.ao25 ? formatTimeMs(stats.ao25) : '--'}</span>
                    </div>
                    <div className="hud-stat-mini">
                        <span className="kinetic-label">AO5</span>
                        <span className="hud-stat-val">{stats.ao5 ? formatTimeMs(stats.ao5) : '--'}</span>
                        {targets.ao5 && (
                            <div className="hud-target-stack-mini">
                                <span className="hud-target-label global">T: {formatTimeMs(targets.ao5)}</span>
                            </div>
                        )}
                    </div>
                    <div className="hud-stat-mini is-secondary">
                        <span className="kinetic-label">AO50</span>
                        <span className="hud-stat-val">{stats.ao50 ? formatTimeMs(stats.ao50) : '--'}</span>
                    </div>
                    <div className="hud-stat-mini">
                        <span className="kinetic-label">AO12</span>
                        <span className="hud-stat-val">{stats.ao12 ? formatTimeMs(stats.ao12) : '--'}</span>
                        {targets.ao12 && (
                            <div className="hud-target-stack-mini">
                                <span className="hud-target-label global">T: {formatTimeMs(targets.ao12)}</span>
                            </div>
                        )}
                    </div>
                    <div className="hud-stat-mini">
                        <span className="kinetic-label">AO100</span>
                        <span className="hud-stat-val">{stats.ao100 ? formatTimeMs(stats.ao100) : '--'}</span>
                        {targets.ao100 && (
                            <div className="hud-target-stack-mini">
                                <span className="hud-target-label global">T: {formatTimeMs(targets.ao100)}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
