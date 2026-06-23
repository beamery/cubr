import React, { useMemo, useState, useEffect } from 'react';
import { 
    LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid 
} from 'recharts';
import { formatTimeMs, calculateAoRaw, calculateSmartWindow, getComparisonHistogramData } from '../logic/stats';
import { X, TrendingUp, Award, Calendar, Trash2, RefreshCw, BarChart2, Settings2, GitCompare } from 'lucide-react';
import { ComparisonHistogram } from './ComparisonHistogram';
import type { SolveRecord } from '../types_new';

interface AnalyticsViewProps {
    solves: SolveRecord[];
    onClose: () => void;
    onSolveClick?: (solve: SolveRecord) => void;
    onClearData?: () => void;
    onDeduplicate?: () => void;
}

function getIsoDate(d: Date | string | undefined | null): string {
    const validDate = (d instanceof Date && !isNaN(d.getTime())) ? d : (typeof d === 'string' ? new Date(d) : null);
    if (!validDate || isNaN(validDate.getTime())) return "Unknown";
    const y = validDate.getFullYear();
    const m = String(validDate.getMonth() + 1).padStart(2, '0');
    const day = String(validDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function formatMonthDay(isoDate: string): string {
    const parts = isoDate.split('-');
    if (parts.length < 3) return isoDate;
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    return `${m}/${d}`;
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
             <div className="glass" style={{ padding: '12px', border: '1px solid var(--kinetic-border)', borderRadius: '8px' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '11px', color: 'var(--kinetic-outline)', fontFamily: 'var(--font-data)' }}>{formatMonthDay(label)}</p>
                {payload.map((entry: any, index: number) => (
                    <div key={index} style={{ color: entry.color, display: 'flex', justifyContent: 'space-between', gap: '16px', fontSize: '12px', fontWeight: 'bold' }}>
                        <span>{entry.name}:</span>
                        <span style={{ fontFamily: 'var(--font-data)' }}>{formatTimeMs(entry.value)}</span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ solves, onClose, onSolveClick: _onSolveClick, onClearData, onDeduplicate }) => {
    const [activeTab, setActiveTab] = useState<'PROGRESSION' | 'DISTRIBUTION'>('PROGRESSION');
    const [period, setPeriod] = useState<7 | 30 | 90>(() => {
        const saved = localStorage.getItem('cubr_analytics_period');
        const val = saved ? Number(saved) : 7;
        return (val === 7 || val === 30 || val === 90) ? val as any : 7;
    });
    const [compareWith, setCompareWith] = useState<number>(() => {
        const saved = localStorage.getItem('cubr_analytics_compare');
        return saved ? Number(saved) : 7;
    });
    const [bucketSize, setBucketSize] = useState<number>(() => {
        const saved = localStorage.getItem('cubr_analytics_bucket');
        return saved ? Number(saved) : 1000;
    });
    
    const smartWindow = useMemo(() => calculateSmartWindow(solves), [solves]);
    const [windowRange, setWindowRange] = useState(() => {
        const saved = localStorage.getItem('cubr_analytics_window');
        return saved ? JSON.parse(saved) : { min: smartWindow.min, max: smartWindow.max };
    });

    // Save settings when they change
    useEffect(() => {
        localStorage.setItem('cubr_analytics_period', period.toString());
        localStorage.setItem('cubr_analytics_compare', compareWith.toString());
        localStorage.setItem('cubr_analytics_bucket', bucketSize.toString());
        localStorage.setItem('cubr_analytics_window', JSON.stringify(windowRange));
    }, [period, compareWith, bucketSize, windowRange]);

    // Sync window range when smart window changes IF it was a default
    useEffect(() => {
        const saved = localStorage.getItem('cubr_analytics_window');
        if (!saved) {
            setWindowRange({ min: smartWindow.min, max: smartWindow.max });
        }
    }, [smartWindow]);

    const histogramData = useMemo(() => {
        return getComparisonHistogramData(solves, period, compareWith, windowRange.min, windowRange.max, bucketSize);
    }, [solves, windowRange, bucketSize, period, compareWith]);
    const metrics = useMemo(() => {
        const MIN_DATE = new Date('2000-01-01').getTime();
        const validSolves = solves.filter(s => {
            const t = new Date(s.date).getTime();
            return !isNaN(t) && t >= MIN_DATE;
        });

        const sortedSolves = [...validSolves].sort((a, b) => {
            const da = new Date(a.date).getTime();
            const db = new Date(b.date).getTime();
            return da - db;
        });

        let gBestSingle = Infinity;
        let gBest5 = Infinity;
        let gBest12 = Infinity;
        let gBest100 = Infinity;

        const rollingAverages: Record<string, { 
            b5: number; 
            b12: number; 
            b100: number; 
            bestS: number; 
            count: number;
            isPRSingle: boolean;
            isPRAo5: boolean;
            isPRAo12: boolean;
            isPRAo100: boolean;
        }> = {};
        
        for (let i = 0; i < sortedSolves.length; i++) {
            const dateStr = getIsoDate(sortedSolves[i].date);
            if (!rollingAverages[dateStr]) {
                rollingAverages[dateStr] = { 
                    b5: Infinity, 
                    b12: Infinity, 
                    b100: Infinity, 
                    bestS: Infinity, 
                    count: 0,
                    isPRSingle: false,
                    isPRAo5: false,
                    isPRAo12: false,
                    isPRAo100: false
                };
            }

            const currentS = sortedSolves[i].penalty === 'DNF' ? Infinity : (sortedSolves[i].penalty === '+2' ? sortedSolves[i].timeMs + 2000 : sortedSolves[i].timeMs);
            if (currentS < gBestSingle) {
                gBestSingle = currentS;
                rollingAverages[dateStr].isPRSingle = true;
            }
            if (currentS < rollingAverages[dateStr].bestS) rollingAverages[dateStr].bestS = currentS;
            rollingAverages[dateStr].count++;

            if (i >= 4) {
                const a5 = calculateAoRaw(sortedSolves.slice(i - 4, i + 1), 5);
                if (a5 !== null && a5 !== Infinity) {
                    if (a5 < gBest5) {
                        gBest5 = a5;
                        rollingAverages[dateStr].isPRAo5 = true;
                    }
                    if (a5 < rollingAverages[dateStr].b5) rollingAverages[dateStr].b5 = a5;
                }
            }
            if (i >= 11) {
                const a12 = calculateAoRaw(sortedSolves.slice(i - 11, i + 1), 12);
                if (a12 !== null && a12 !== Infinity) {
                    if (a12 < gBest12) {
                        gBest12 = a12;
                        rollingAverages[dateStr].isPRAo12 = true;
                    }
                    if (a12 < rollingAverages[dateStr].b12) rollingAverages[dateStr].b12 = a12;
                }
            }
            if (i >= 99) {
                const a100 = calculateAoRaw(sortedSolves.slice(i - 99, i + 1), 100);
                if (a100 !== null && a100 !== Infinity) {
                    if (a100 < gBest100) {
                        gBest100 = a100;
                        rollingAverages[dateStr].isPRAo100 = true;
                    }
                    if (a100 < rollingAverages[dateStr].b100) rollingAverages[dateStr].b100 = a100;
                }
            }
        }

        const dailyList = Object.keys(rollingAverages).sort().map(date => ({
            date,
            dayCount: rollingAverages[date].count,
            bestSingle: rollingAverages[date].bestS === Infinity ? null : rollingAverages[date].bestS,
            best5: rollingAverages[date].b5 === Infinity ? null : rollingAverages[date].b5,
            best12: rollingAverages[date].b12 === Infinity ? null : rollingAverages[date].b12,
            best100: rollingAverages[date].b100 === Infinity ? null : rollingAverages[date].b100,
            isPRSingle: rollingAverages[date].isPRSingle,
            isPRAo5: rollingAverages[date].isPRAo5,
            isPRAo12: rollingAverages[date].isPRAo12,
            isPRAo100: rollingAverages[date].isPRAo100
        }));

        const top10 = [...solves]
            .map(s => ({ ...s, realTime: s.penalty === 'DNF' ? Infinity : (s.penalty === '+2' ? s.timeMs + 2000 : s.timeMs) }))
            .filter(s => s.realTime !== Infinity)
            .sort((a, b) => a.realTime - b.realTime)
            .slice(0, 10);

        return {
            chartData: dailyList,
            dailyTableData: [...dailyList].reverse(),
            globalBest: {
                single: gBestSingle === Infinity ? null : gBestSingle,
                b5: gBest5 === Infinity ? null : gBest5,
                b12: gBest12 === Infinity ? null : gBest12,
                b100: gBest100 === Infinity ? null : gBest100
            },
            top10Singles: top10,
            filteredCount: validSolves.length
        };
    }, [solves]);

    const { chartData, dailyTableData, globalBest, top10Singles, filteredCount } = metrics;

    return (
        <div className="analytics-overlay glass">
            <div className="analytics-container glass no-scrollbar">
                <header className="analytics-header">
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span className="kinetic-label" style={{ fontSize: '10px', letterSpacing: '1px' }}>METRICS DASHBOARD</span>
                        <span style={{ fontSize: '18px', fontWeight: 'bold', fontFamily: 'var(--font-headline)' }}>All Solves ({filteredCount})</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {onDeduplicate && (
                            <button 
                                className="pill-icon-btn" 
                                onClick={() => {
                                    if (confirm("Remove duplicate solves (identical timestamps) from the cloud?")) {
                                        onDeduplicate();
                                    }
                                }}
                                title="Clean Duplicate Solves"
                            >
                                <RefreshCw size={20} />
                            </button>
                        )}
                        {onClearData && (
                            <button 
                                className="pill-icon-btn danger" 
                                onClick={() => {
                                    if (confirm("Permanently delete ALL solve history? This cannot be undone.")) {
                                        onClearData();
                                    }
                                }}
                                title="Clear All History"
                            >
                                <Trash2 size={20} />
                            </button>
                        )}
                        <button className="close-btn" onClick={onClose}>
                            <X size={24} />
                        </button>
                    </div>
                </header>

                <div className="analytics-content no-scrollbar">
                    {/* Hall of Fame Summary */}
                    <div className="hall-of-fame-grid">
                        <div className="record-stat glass">
                            <span className="kinetic-label">GLOBAL BEST SINGLE</span>
                            <span className="val data-point">{globalBest.single ? formatTimeMs(globalBest.single) : '--'}</span>
                        </div>
                        <div className="record-stat glass">
                            <span className="kinetic-label">GLOBAL BEST Ao5</span>
                            <span className="val data-point">{globalBest.b5 ? formatTimeMs(globalBest.b5) : '--'}</span>
                        </div>
                        <div className="record-stat glass">
                            <span className="kinetic-label">GLOBAL BEST Ao12</span>
                            <span className="val data-point">{globalBest.b12 ? formatTimeMs(globalBest.b12) : '--'}</span>
                        </div>
                        <div className="record-stat glass">
                            <span className="kinetic-label">GLOBAL BEST Ao100</span>
                            <span className="val data-point">{globalBest.b100 ? formatTimeMs(globalBest.b100) : '--'}</span>
                        </div>
                    </div>

                    {/* Tab Navigation */}
                    <div className="analytics-tabs" style={{ display: 'flex', gap: '24px', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <button 
                            className={`tab-btn ${activeTab === 'PROGRESSION' ? 'active' : ''}`}
                            onClick={() => setActiveTab('PROGRESSION')}
                        >
                            <TrendingUp size={14} />
                            <span>PROGRESSION</span>
                        </button>
                        <button 
                            className={`tab-btn ${activeTab === 'DISTRIBUTION' ? 'active' : ''}`}
                            onClick={() => setActiveTab('DISTRIBUTION')}
                        >
                            <BarChart2 size={14} />
                            <span>DISTRIBUTION</span>
                        </button>
                    </div>

                    {activeTab === 'PROGRESSION' ? (
                        <section className="analytics-section">
                            <div className="section-header">
                                <TrendingUp size={16} className="icon-accent" />
                                <span className="kinetic-label">Overall Progression</span>
                            </div>
                            <div className="chart-container glass">
                                <ResponsiveContainer width="100%" height={350}>
                                    <LineChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                        <XAxis dataKey="date" hide />
                                        <YAxis 
                                            stroke="rgba(255,255,255,0.2)" 
                                            tick={{ fill: 'var(--kinetic-outline)', fontSize: 10, fontFamily: 'var(--font-data)' }} 
                                            domain={['auto', 'auto']} 
                                            tickFormatter={(val) => formatTimeMs(val).split('.')[0]}
                                        />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontFamily: 'var(--font-data)', paddingTop: '20px' }} />
                                        <Line type="monotone" name="Best Ao100" dataKey="best100" stroke="#4bc0c0" strokeWidth={2} dot={false} activeDot={{ r: 4 }} connectNulls />
                                        <Line type="monotone" name="Best Ao12" dataKey="best12" stroke="#ff9f40" strokeWidth={1.5} dot={false} strokeDasharray="5 5" connectNulls />
                                        <Line type="monotone" name="Best Ao5" dataKey="best5" stroke="var(--kinetic-primary)" strokeWidth={1} dot={false} connectNulls />
                                        <Line type="monotone" name="Best Single" dataKey="bestSingle" stroke="#9966ff" strokeWidth={0} dot={{ r: 2, fill: '#9966ff', strokeWidth: 0 }} activeDot={{ r: 4 }} connectNulls />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </section>
                    ) : (
                        <section className="analytics-section">
                            <div className="section-header" style={{ justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <BarChart2 size={16} className="icon-accent" />
                                    <span className="kinetic-label">Solve Distribution Comparison</span>
                                </div>
                                <div className="chart-controls">
                                    <div className="control-group">
                                        <span className="control-label">PRIMARY PERIOD</span>
                                        <select value={period} onChange={(e) => setPeriod(Number(e.target.value) as any)}>
                                            <option value={7}>This Week</option>
                                            <option value={30}>This Month</option>
                                            <option value={90}>Last 90 Days</option>
                                        </select>
                                    </div>
                                    <div className="mobile-hide" style={{ alignSelf: 'center', opacity: 0.3, marginTop: '12px' }}>
                                        <GitCompare size={12} />
                                    </div>
                                    <div className="control-group">
                                        <span className="control-label">COMPARE WITH</span>
                                        <select value={compareWith} onChange={(e) => setCompareWith(Number(e.target.value))}>
                                            <option value={7}>Prev Week</option>
                                            <option value={14}>Prev 2 Weeks</option>
                                            <option value={30}>Prev Month</option>
                                            <option value={90}>Prev 90 Days</option>
                                        </select>
                                    </div>
                                    <div className="control-trace-divider" style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)', alignSelf: 'center' }} />
                                    <div className="control-group">
                                        <span className="control-label">BUCKET</span>
                                        <select value={bucketSize} onChange={(e) => setBucketSize(Number(e.target.value))}>
                                            <option value={500}>0.5s</option>
                                            <option value={1000}>1.0s</option>
                                            <option value={2000}>2.0s</option>
                                            <option value={5000}>5.0s</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="chart-container glass" style={{ minHeight: '400px', padding: '20px' }}>
                                <ComparisonHistogram 
                                    data={histogramData} 
                                    windowMin={windowRange.min} 
                                    windowMax={windowRange.max} 
                                />
                                
                                <div className="histogram-legend">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ width: '12px', height: '12px', background: 'rgba(0, 162, 255, 0.4)', borderRadius: '2px', border: '1px solid var(--kinetic-primary)' }} />
                                        <span className="kinetic-label" style={{ fontSize: '8px' }}>PRIMARY ({histogramData.currentTotal})</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ width: '12px', height: '12px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '2px', border: '1px solid rgba(255,255,255,0.3)', borderStyle: 'dashed' }} />
                                        <span className="kinetic-label" style={{ fontSize: '8px' }}>COMPARISON ({histogramData.compareTotal})</span>
                                    </div>
                                </div>
                                
                                <div className="range-controls" style={{ marginTop: '24px', padding: '16px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '20px', alignItems: 'center' }}>
                                    <Settings2 size={14} className="icon-accent" />
                                    <div style={{ flex: 1, display: 'flex', gap: '12px', alignItems: 'center' }}>
                                        <span className="control-label">WINDOW MIN</span>
                                        <input 
                                            type="range" 
                                            min={0} 
                                            max={windowRange.max - 5000} 
                                            step={1000} 
                                            value={windowRange.min} 
                                            onChange={(e) => setWindowRange((prev: {min: number, max: number}) => ({ ...prev, min: Number(e.target.value) }))} 
                                        />
                                        <span className="val-hint">{formatTimeMs(windowRange.min)}</span>
                                    </div>
                                    <div style={{ flex: 1, display: 'flex', gap: '12px', alignItems: 'center' }}>
                                        <span className="control-label">WINDOW MAX</span>
                                        <input 
                                            type="range" 
                                            min={windowRange.min + 5000} 
                                            max={120000} 
                                            step={1000} 
                                            value={windowRange.max} 
                                            onChange={(e) => setWindowRange((prev: {min: number, max: number}) => ({ ...prev, max: Number(e.target.value) }))} 
                                        />
                                        <span className="val-hint">{formatTimeMs(windowRange.max)}</span>
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}

                    <div className="analytics-grid">
                        {/* Leaderboard */}
                        <section className="analytics-section">
                            <div className="section-header">
                                <Award size={16} className="icon-accent" />
                                <span className="kinetic-label">ALL-TIME TOP 10 SINGLES</span>
                            </div>
                            <div className="leaderboard glass">
                                {top10Singles.map((s, i) => (
                                    <div key={i} className="leaderboard-item">
                                        <span className="rank">{i + 1}.</span>
                                        <span className="time data-point" style={{ opacity: i === 0 ? 1 : 0.8 }}>{formatTimeMs(s.penalty === '+2' ? s.timeMs + 2000 : s.timeMs)}</span>
                                        <span className="date">{getIsoDate(s.date)}</span>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Lifetime Daily Breakdown */}
                        <section className="analytics-section">
                            <div className="section-header">
                                <Calendar size={16} className="icon-accent" />
                                <span className="kinetic-label">Lifetime Daily Breakdown</span>
                            </div>
                            <div className="daily-breakdown glass" style={{ border: '1px solid var(--kinetic-border)' }}>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                                        <thead className="analytics-table-head">
                                            <tr>
                                                <th className="kinetic-label">Date</th>
                                                <th className="kinetic-label">#</th>
                                                <th className="kinetic-label">Single</th>
                                                <th className="kinetic-label">ao5</th>
                                                <th className="kinetic-label">ao12</th>
                                                <th className="kinetic-label">ao100</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(() => {
                                                let currentYear = '';
                                                const rows: React.ReactNode[] = [];
                                                
                                                dailyTableData.forEach((row, i) => {
                                                    const year = row.date.substring(0, 4);
                                                    const monthDayLabel = formatMonthDay(row.date);
                                                    
                                                    if (year !== currentYear) {
                                                        rows.push(
                                                            <tr key={`year-${year}`} style={{ background: 'rgba(255,255,255,0.01)', borderBottom: '1px solid var(--kinetic-border)' }}>
                                                                <td colSpan={6} style={{ padding: '8px 10px', fontSize: '10px', fontWeight: 'bold', color: 'var(--kinetic-outline)', letterSpacing: '2px', opacity: 0.5 }}>
                                                                    {year}
                                                                </td>
                                                            </tr>
                                                        );
                                                        currentYear = year;
                                                    }
                                                    
                                                    rows.push(
                                                        <tr key={i} className="analytics-table-row">
                                                            <td className="date-cell">
                                                                <u>{monthDayLabel}</u>
                                                            </td>
                                                            <td className="count-cell">{row.dayCount}</td>
                                                            <td className={`stat-cell ${row.isPRSingle ? 'global-highlight' : ''}`}>
                                                                {row.bestSingle ? formatTimeMs(row.bestSingle) : '--'}
                                                            </td>
                                                            <td className={`stat-cell ${row.isPRAo5 ? 'global-highlight' : ''}`}>
                                                                {row.best5 ? formatTimeMs(row.best5) : '--'}
                                                            </td>
                                                            <td className={`stat-cell ${row.isPRAo12 ? 'global-highlight' : ''}`}>
                                                                {row.best12 ? formatTimeMs(row.best12) : '--'}
                                                            </td>
                                                            <td className={`stat-cell ${row.isPRAo100 ? 'global-highlight' : ''}`}>
                                                                {row.best100 ? formatTimeMs(row.best100) : '--'}
                                                            </td>
                                                        </tr>
                                                    );
                                                });
                                                return rows;
                                            })()}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
};
