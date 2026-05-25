import React from 'react';
import { 
    ComposedChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine 
} from 'recharts';
import type { ComparisonData } from '../logic/stats';
import { formatTimeMs } from '../logic/stats';

interface ComparisonHistogramProps {
    data: ComparisonData;
    windowMin: number;
    windowMax: number;
}

export const ComparisonHistogram: React.FC<ComparisonHistogramProps> = ({ data, windowMin, windowMax }) => {
    return (
        <div className="histogram-container" style={{ width: '100%', height: '400px' }}>
            {data.currentTotal === 0 && data.compareTotal === 0 ? (
                <div className="empty-state kinetic-label" style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
                    No solve data for these periods
                </div>
            ) : (
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data.buckets} margin={{ top: 30, right: 20, left: 0, bottom: 20 }}>
                        <XAxis 
                            dataKey="time" 
                            type="number" 
                            domain={[windowMin, windowMax]} 
                            tickFormatter={(val) => formatTimeMs(val).split('.')[0] + 's'}
                            stroke="rgba(255,255,255,0.2)"
                            tick={{ fill: 'var(--kinetic-outline)', fontSize: 10, fontFamily: 'var(--font-data)' }}
                        />
                        <YAxis hide />
                        <Tooltip 
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const bucket = payload[0].payload;
                                    return (
                                        <div className="glass" style={{ padding: '12px', border: '1px solid var(--kinetic-border)', borderRadius: '8px' }}>
                                            <p className="kinetic-label" style={{ marginBottom: '8px', fontSize: '10px' }}>
                                                {formatTimeMs(bucket.time)} - {formatTimeMs(bucket.time + 1000)}
                                            </p>
                                            <div style={{ color: 'var(--kinetic-primary)', display: 'flex', justifyContent: 'space-between', gap: '24px', fontSize: '12px', fontWeight: 'bold' }}>
                                                <span>Current:</span>
                                                <span className="data-point">{bucket.currentPercent.toFixed(1)}%</span>
                                            </div>
                                            <div style={{ color: 'var(--kinetic-outline)', display: 'flex', justifyContent: 'space-between', gap: '24px', fontSize: '12px', opacity: 0.8 }}>
                                                <span>Previous:</span>
                                                <span className="data-point">{bucket.comparePercent.toFixed(1)}%</span>
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />

                        {/* Comparison Period (Background) */}
                        <Area 
                            type="step" 
                            dataKey="comparePercent" 
                            stroke="rgba(255,255,255,0.3)" 
                            fill="rgba(255,255,255,0.05)" 
                            strokeWidth={1}
                            strokeDasharray="4 4"
                            isAnimationActive={true}
                        />

                        {/* Current Period (Foreground) */}
                        <Area 
                            type="step" 
                            dataKey="currentPercent" 
                            stroke="var(--kinetic-primary)" 
                            fill="rgba(0, 162, 255, 0.15)" 
                            strokeWidth={2}
                            isAnimationActive={true}
                        />

                        {/* Median Lines */}
                        {data.compareMedian && (
                            <ReferenceLine 
                                x={data.compareMedian} 
                                stroke="rgba(255,255,255,0.3)" 
                                strokeDasharray="3 3"
                                label={{ position: 'top', value: 'PREV MEDIAN', fill: 'rgba(255,255,255,0.4)', fontSize: 8, fontFamily: 'var(--font-data)', fontWeight: 'bold' }}
                            />
                        )}
                        {data.currentMedian && (
                            <ReferenceLine 
                                x={data.currentMedian} 
                                stroke="var(--kinetic-primary)" 
                                label={{ position: 'top', value: 'CURRENT MEDIAN', fill: 'var(--kinetic-primary)', fontSize: 8, fontFamily: 'var(--font-data)', fontWeight: 'bold' }}
                            />
                        )}
                    </ComposedChart>
                </ResponsiveContainer>
            )}
        </div>
    );
};
