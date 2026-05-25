import React, { useMemo } from 'react';
import type { SolveRecord } from '../types_new';
import { formatTimeMs, calculateAoRaw } from '../logic/stats';
import { Trophy, Globe } from 'lucide-react';

interface SidebarStatsProps {
    solves: SolveRecord[];
    isCloudConnected: boolean;
    onConnectCloud: () => void;
}

export const SidebarStats: React.FC<SidebarStatsProps> = ({ 
    solves, 
    isCloudConnected, 
    onConnectCloud 
}) => {
    const stats = useMemo(() => {
        const getBest = (n: number) => {
            let best = Infinity;
            for (let i = n; i <= solves.length; i++) {
                const avg = calculateAoRaw(solves.slice(0, i), n);
                if (avg !== null && avg < best) best = avg;
            }
            return best === Infinity ? null : best;
        };

        const singleTimes = solves.map(s => s.penalty === 'DNF' ? Infinity : (s.penalty === '+2' ? s.timeMs + 2000 : s.timeMs));
        const bestSingle = singleTimes.length > 0 ? Math.min(...singleTimes) : null;

        return {
            bestSingle: bestSingle === Infinity ? null : bestSingle,
            currMo3: calculateAoRaw(solves, 3),
            bestMo3: getBest(3),
            currAo5: calculateAoRaw(solves, 5),
            bestAo5: getBest(5),
            currAo12: calculateAoRaw(solves, 12),
            bestAo12: getBest(12),
            currAo25: calculateAoRaw(solves, 25),
            bestAo25: getBest(25),
            currAo50: calculateAoRaw(solves, 50),
            bestAo50: getBest(50),
            currAo100: calculateAoRaw(solves, 100),
            bestAo100: getBest(100),
        };
    }, [solves]);

    return (
        <aside className="sidebar left">
            <header className="sidebar-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Trophy size={18} className="icon-accent" />
                    <span className="label">Telemetry</span>
                </div>
            </header>

            <div className="sidebar-scroll">
                <table className="stats-table">
                    <tbody>
                        <tr>
                            <td className="metric-label">Best Single</td>
                            <td className="metric-value best">{stats.bestSingle ? formatTimeMs(stats.bestSingle) : '--'}</td>
                        </tr>
                        <tr>
                            <td className="metric-label">Current Mo3</td>
                            <td className="metric-value data-point">{stats.currMo3 ? formatTimeMs(stats.currMo3) : '--'}</td>
                        </tr>
                        <tr>
                            <td className="metric-label">Best Mo3</td>
                            <td className="metric-value data-point">{stats.bestMo3 ? formatTimeMs(stats.bestMo3) : '--'}</td>
                        </tr>
                        <tr>
                            <td className="metric-label">Current Ao5</td>
                            <td className="metric-value data-point">{stats.currAo5 ? formatTimeMs(stats.currAo5) : '--'}</td>
                        </tr>
                        <tr>
                            <td className="metric-label">Best Ao5</td>
                            <td className="metric-value data-point">{stats.bestAo5 ? formatTimeMs(stats.bestAo5) : '--'}</td>
                        </tr>
                        <tr>
                            <td className="metric-label">Current Ao12</td>
                            <td className="metric-value data-point">{stats.currAo12 ? formatTimeMs(stats.currAo12) : '--'}</td>
                        </tr>
                        <tr>
                            <td className="metric-label">Best Ao12</td>
                            <td className="metric-value data-point">{stats.bestAo12 ? formatTimeMs(stats.bestAo12) : '--'}</td>
                        </tr>
                        <tr>
                            <td className="metric-label">Current Ao25</td>
                            <td className="metric-value data-point">{stats.currAo25 ? formatTimeMs(stats.currAo25) : '--'}</td>
                        </tr>
                        <tr>
                            <td className="metric-label">Best Ao25</td>
                            <td className="metric-value data-point">{stats.bestAo25 ? formatTimeMs(stats.bestAo25) : '--'}</td>
                        </tr>
                        <tr>
                            <td className="metric-label">Current Ao50</td>
                            <td className="metric-value data-point">{stats.currAo50 ? formatTimeMs(stats.currAo50) : '--'}</td>
                        </tr>
                        <tr>
                            <td className="metric-label">Best Ao50</td>
                            <td className="metric-value data-point">{stats.bestAo50 ? formatTimeMs(stats.bestAo50) : '--'}</td>
                        </tr>
                        <tr>
                            <td className="metric-label">Current Ao100</td>
                            <td className="metric-value data-point">{stats.currAo100 ? formatTimeMs(stats.currAo100) : '--'}</td>
                        </tr>
                        <tr>
                            <td className="metric-label">Best Ao100</td>
                            <td className="metric-value data-point">{stats.bestAo100 ? formatTimeMs(stats.bestAo100) : '--'}</td>
                        </tr>
                        <tr>
                            <td className="metric-label">Total Solves</td>
                            <td className="metric-value data-point">{solves.length}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <footer className="sidebar-footer">
                <div 
                    className={`status-dot ${isCloudConnected ? 'online' : 'offline'}`} 
                    onClick={onConnectCloud}
                    style={{ cursor: 'pointer' }}
                />
                <span className="status-text">
                    {isCloudConnected ? 'Cloud Sync Active' : 'Offline Mode'}
                </span>
                <button 
                    className={`hud-btn ${isCloudConnected ? 'active' : ''}`}
                    onClick={onConnectCloud}
                    style={{ marginLeft: 'auto' }}
                >
                    <Globe size={16} />
                </button>
            </footer>
        </aside>
    );
};
