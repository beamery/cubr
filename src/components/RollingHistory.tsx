import React, { useMemo, useState, useEffect, useRef } from 'react';
import type { SolveRecord } from '../types_new';
import { formatTimeMs, getRunningRecords } from '../logic/stats';
import { History, X } from 'lucide-react';

interface RollingHistoryProps {
    solves: SolveRecord[];
    onSolveClick?: (solve: SolveRecord) => void;
    hideHeader?: boolean;
    onClose?: () => void;
}

export const RollingHistory: React.FC<RollingHistoryProps> = ({ solves, onSolveClick, hideHeader, onClose }) => {
    const [displayLimit, setDisplayLimit] = useState(50);
    const [statsView, setStatsView] = useState<'standard' | 'extended'>('standard');
    const [isDesktop, setIsDesktop] = useState(window.innerWidth > 800);
    const observerTarget = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleResize = () => setIsDesktop(window.innerWidth > 800);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const cycleStats = () => {
        if (isDesktop) return; // No cycling on desktop
        setStatsView(prev => prev === 'standard' ? 'extended' : 'standard');
    };

    // Calculate running records for the entire history to find historical PBs
    const historical = useMemo(() => getRunningRecords(solves), [solves]);

    // Reset limit when solves change significantly or event changes
    useEffect(() => {
        setDisplayLimit(50);
    }, [solves.length]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && displayLimit < solves.length) {
                    setDisplayLimit(prev => prev + 50);
                }
            },
            { threshold: 0.1 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => observer.disconnect();
    }, [displayLimit, solves.length]);

    // Render recent solves for the sidebar to maintain 60fps performance
    const visibleItems = useMemo(() => {
        const slicedHistorical = historical.slice(-displayLimit);

        return slicedHistorical.reverse().map((stat, i) => {
            const originalIndex = historical.length - 1 - i;
            return {
                solve: solves[originalIndex],
                stat,
                realIndex: originalIndex + 1,
                isInAo5: i < 5,
                isInAo12: i < 12
            };
        });
    }, [solves, historical, displayLimit]);

    const getHighlightClass = (isRecord: boolean, isGlobal: boolean) => {
        if (isGlobal) return 'global-highlight';
        if (isRecord) return 'highlight';
        return '';
    };

    // Calculate counts per date for the entire history
    const dateCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        solves.forEach(s => {
            const d = new Date(s.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            counts[d] = (counts[d] || 0) + 1;
        });
        return counts;
    }, [solves]);

    return (
        <aside className={`sidebar right ${isDesktop ? 'desktop-full' : ''}`}>
            {!hideHeader && (
                <header className="sidebar-header">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <History size={18} className="icon-accent" />
                            <span className="label">Solve History</span>
                        </div>
                        {onClose && (
                            <button className="close-btn" onClick={onClose}>
                                <X size={20} />
                            </button>
                        )}
                    </div>
                    <div className="label" style={{ opacity: 0.5 }}>
                        {solves.length} TOTAL
                    </div>
                </header>
            )}

            <div className={`history-list-header ${!isDesktop ? 'interactive-header' : ''}`} onClick={cycleStats}>
                <span>Idx</span>
                <span>Time</span>
                {isDesktop ? (
                    <>
                        <span className="align-right is-secondary">Mo3</span>
                        <span className="align-right is-primary">Ao5</span>
                        <span className="align-right is-primary">Ao12</span>
                        <span className="align-right is-secondary">Ao25</span>
                        <span className="align-right is-secondary">Ao50</span>
                        <span className="align-right is-primary">Ao100</span>
                    </>
                ) : (
                    statsView === 'standard' ? (
                        <>
                            <span className="align-right is-primary">Ao5</span>
                            <span className="align-right is-primary">Ao12</span>
                            <span className="align-right is-primary">Ao100</span>
                        </>
                    ) : (
                        <>
                            <span className="align-right is-secondary">Mo3</span>
                            <span className="align-right is-secondary">Ao25</span>
                            <span className="align-right is-secondary">Ao50</span>
                        </>
                    )
                )}
            </div>

            <div className="sidebar-scroll">
                <div className="history-list">
                    {(() => {
                        let lastDate = '';
                        return visibleItems.map(({ solve, stat, realIndex, isInAo5, isInAo12 }, idx) => {
                            const currentDate = new Date(solve.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                            const showSeparator = currentDate !== lastDate;
                            lastDate = currentDate;

                            return (
                                <React.Fragment key={solve.id}>
                                    {showSeparator && (
                                        <div className={`date-separator ${idx === 0 ? 'first' : ''}`}>
                                            <span className="kinetic-label">{currentDate}</span>
                                            <span className="kinetic-label solve-count">{dateCounts[currentDate]} solves</span>
                                        </div>
                                    )}
                                    <div 
                                        className={`history-item ${isInAo5 ? 'in-ao5' : ''} ${isInAo12 ? 'in-ao12' : ''}`} 
                                        onClick={() => onSolveClick?.(solve)}
                                    >
                                        <span className="history-index">{realIndex}</span>
                                        
                                        <span className={`history-time data-point ${getHighlightClass(stat.isRecord.single, stat.isGlobalRecord.single)}`}>
                                            {solve.penalty === 'DNF' ? 'DNF' : formatTimeMs(solve.penalty === '+2' ? solve.timeMs + 2000 : solve.timeMs)}
                                            {solve.penalty === '+2' && <span className="penalty-tag" style={{ color: 'var(--kinetic-primary)', marginLeft: '4px', fontSize: '10px' }}>(+2)</span>}
                                        </span>
                                        
                                        {isDesktop ? (
                                            <>
                                                <div className={`history-avg-val is-secondary ${getHighlightClass(stat.isRecord.mo3, stat.isGlobalRecord.mo3)}`}>
                                                    {stat.mo3 ? formatTimeMs(stat.mo3) : '--'}
                                                </div>
                                                <div className={`history-avg-val is-primary ${getHighlightClass(stat.isRecord.ao5, stat.isGlobalRecord.ao5)}`}>
                                                    {stat.ao5 ? formatTimeMs(stat.ao5) : '--'}
                                                </div>
                                                <div className={`history-avg-val is-primary ${getHighlightClass(stat.isRecord.ao12, stat.isGlobalRecord.ao12)}`}>
                                                    {stat.ao12 ? formatTimeMs(stat.ao12) : '--'}
                                                </div>
                                                <div className={`history-avg-val is-secondary ${getHighlightClass(stat.isRecord.ao25, stat.isGlobalRecord.ao25)}`}>
                                                    {stat.ao25 ? formatTimeMs(stat.ao25) : '--'}
                                                </div>
                                                <div className={`history-avg-val is-secondary ${getHighlightClass(stat.isRecord.ao50, stat.isGlobalRecord.ao50)}`}>
                                                    {stat.ao50 ? formatTimeMs(stat.ao50) : '--'}
                                                </div>
                                                <div className={`history-avg-val is-primary ${getHighlightClass(stat.isRecord.ao100, stat.isGlobalRecord.ao100)}`}>
                                                    {stat.ao100 ? formatTimeMs(stat.ao100) : '--'}
                                                </div>
                                            </>
                                        ) : (
                                            statsView === 'standard' ? (
                                                <>
                                                    <div className={`history-avg-val is-primary ${getHighlightClass(stat.isRecord.ao5, stat.isGlobalRecord.ao5)}`}>
                                                        {stat.ao5 ? formatTimeMs(stat.ao5) : '--'}
                                                    </div>
                                                    <div className={`history-avg-val is-primary ${getHighlightClass(stat.isRecord.ao12, stat.isGlobalRecord.ao12)}`}>
                                                        {stat.ao12 ? formatTimeMs(stat.ao12) : '--'}
                                                    </div>
                                                    <div className={`history-avg-val is-primary ${getHighlightClass(stat.isRecord.ao100, stat.isGlobalRecord.ao100)}`}>
                                                        {stat.ao100 ? formatTimeMs(stat.ao100) : '--'}
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className={`history-avg-val is-secondary ${getHighlightClass(stat.isRecord.mo3, stat.isGlobalRecord.mo3)}`}>
                                                        {stat.mo3 ? formatTimeMs(stat.mo3) : '--'}
                                                    </div>
                                                    <div className={`history-avg-val is-secondary ${getHighlightClass(stat.isRecord.ao25, stat.isGlobalRecord.ao25)}`}>
                                                        {stat.ao25 ? formatTimeMs(stat.ao25) : '--'}
                                                    </div>
                                                    <div className={`history-avg-val is-secondary ${getHighlightClass(stat.isRecord.ao50, stat.isGlobalRecord.ao50)}`}>
                                                        {stat.ao50 ? formatTimeMs(stat.ao50) : '--'}
                                                    </div>
                                                </>
                                            )
                                        )}
                                    </div>
                                </React.Fragment>
                            );
                        });
                    })()}
                    
                    {/* Sentinel for infinite scrolling */}
                    <div ref={observerTarget} className="scroll-sentinel" style={{ height: '20px', margin: '10px 0' }}>
                        {displayLimit < solves.length && (
                            <div className="label" style={{ textAlign: 'center', opacity: 0.3 }}>
                                Loading more solves...
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </aside>
    );
};

