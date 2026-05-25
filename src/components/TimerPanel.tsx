// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback } from 'react'
import type { TimerState, SolveRecord, EventType } from '../types_new'
import { randomScrambleForEvent } from 'cubing/scramble'
import { Trash2, BarChart2, History, Bluetooth, BluetoothConnected, ChevronDown, Upload, Download, Cloud, CloudOff, RefreshCw, Keyboard, Timer, Eye, Wrench } from 'lucide-react'
import { connectSmartTimer } from 'cubing/bluetooth'
import "cubing/twisty"
import { parseCsTimerSession, createCsTimerExport } from '../logic/cstimerImport';
import { MobileHUD } from './MobileHUD';
import { ScrambleVisualizer } from './ScrambleVisualizer';
import { useWakeLock } from '../hooks/useWakeLock';

interface TimerPanelProps {
    solves: SolveRecord[];
    onSolveComplete: (solve: SolveRecord) => void;
    onUpdateSolve: (id: string, updates: Partial<SolveRecord>) => void;
    onDeleteSolve: (id: string) => void;
    onImportSolves: (solves: SolveRecord[]) => void;
    onShowAnalytics?: () => void;
    onShowHistory?: () => void;
    onShowPRs?: () => void;
    activeEvent: EventType;
    onEventChange: (event: EventType) => void;
    isMobileHistoryOpen?: boolean;
    isAuthenticated?: boolean;
    isSyncing?: boolean;
    unsyncedCount?: number;
    onSignOut?: () => void;
    onSignIn?: () => void;
    globalBests: { b5: number | null; b12: number | null; b100: number | null };
    dailyBests: { b5: number | null; b12: number | null; b100: number | null };
    onSolveClick: (solve: SolveRecord) => void;
    onSync?: () => void;
}

const EVENTS: { id: EventType; label: string }[] = [
    { id: '222', label: '2x2x2' },
    { id: '333', label: '3x3x3' },
    { id: '444', label: '4x4x4' },
    { id: '555', label: '5x5x5' },
    { id: '666', label: '6x6x6' },
    { id: '777', label: '7x7x7' },
    { id: 'minx', label: 'Megaminx' },
];

export function TimerPanel({ 
    solves, 
    onSolveComplete, 
    onUpdateSolve, 
    onDeleteSolve, 
    onImportSolves,
    onShowAnalytics, 
    onShowHistory, 
    onShowPRs,
    activeEvent, 
    onEventChange,
    isMobileHistoryOpen,
    isAuthenticated,
    isSyncing,
    unsyncedCount,
    onSignOut,
    onSignIn,
    globalBests,
    dailyBests,
    onSolveClick,
    onSync
}: TimerPanelProps) {
    const { requestWakeLock, releaseWakeLock } = useWakeLock();
    const [timerState, setTimerState] = useState<TimerState>('IDLE');
    const timerStateRef = useRef<TimerState>('IDLE');
    const [scramble, setScramble] = useState<string>('Generating...');
    const scrambleRef = useRef<string>('');
    const activeEventRef = useRef<EventType>(activeEvent);
    
    const [isManualMode, setIsManualMode] = useState(false);
    const [manualTime, setManualTime] = useState('');
    const [showVisualizer, setShowVisualizer] = useState(false);
    const [showPenaltyModal, setShowPenaltyModal] = useState(false);
    const manualInputRef = useRef<HTMLInputElement>(null);

    const timerTextRef = useRef<HTMLDivElement>(null);
    const startTimeRef = useRef<number>(0);
    const requestRef = useRef<number | null>(null);
    const holdTimeoutRef = useRef<any>(null);
    const scrambleHoldTimerRef = useRef<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [bluetoothStatus, setBluetoothStatus] = useState<'DISCONNECTED' | 'CONNECTING' | 'CONNECTED'>('DISCONNECTED');
    const timerRef = useRef<any>(null);

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            const sessionKey = data.session1 ? 'session1' : Object.keys(data).find(k => Array.isArray(data[k]));
            
            if (!sessionKey) {
                alert("Could not find any valid sessions in this csTimer export.");
                return;
            }

            const imported = parseCsTimerSession(data[sessionKey], activeEvent);
            if (confirm(`Found ${imported.length} solves in "${sessionKey}". Import them into the current session?`)) {
                onImportSolves(imported);
            }
        } catch (err) {
            console.error("Import failed:", err);
            alert("Failed to parse csTimer export. Make sure it's a valid JSON export.");
        }
        
        e.target.value = '';
    };

    const handleExportClick = () => {
        if (solves.length === 0) {
            alert("No solves in the current session to export.");
            return;
        }
        
        const eventLabel = EVENTS.find(e => e.id === activeEvent)?.label || activeEvent;
        const exportData = createCsTimerExport(solves, `Cubr - ${eventLabel}`);
        
        const blob = new Blob([exportData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        
        const safeEventName = eventLabel.replace(/\s+/g, '_').toLowerCase();
        const dateStr = new Date().toISOString().slice(0, 10);
        link.download = `cubr_session_${safeEventName}_${dateStr}.json`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const lastSolve = solves.length > 0 ? solves[solves.length - 1] : null;

    useEffect(() => { timerStateRef.current = timerState; }, [timerState]);
    useEffect(() => { scrambleRef.current = scramble; }, [scramble]);
    useEffect(() => { activeEventRef.current = activeEvent; }, [activeEvent]);

    const formatTime = useCallback((ms: number) => {
        const seconds = (ms / 1000).toFixed(2);
        if (ms < 60000) return seconds;
        const mins = Math.floor(ms / 60000);
        const secs = ((ms % 60000) / 1000).toFixed(2);
        return `${mins}:${secs.padStart(5, '0')}`;
    }, []);

    const parseManualTime = (input: string): number | null => {
        const clean = input.trim();
        if (!clean) return null;

        // Pattern 1: Pure digits (csTimer style)
        // 123 -> 1.23, 1234 -> 12.34, 12345 -> 1:23.45
        if (/^\d+$/.test(clean)) {
            const val = parseInt(clean, 10);
            const ms = (val % 100) * 10;
            const secondsTotal = Math.floor(val / 100);
            const seconds = secondsTotal % 60;
            const minutes = Math.floor(secondsTotal / 60);
            return (minutes * 60 * 1000) + (seconds * 1000) + ms;
        }

        // Pattern 2: Standard time 1:23.45 or 23.45
        const parts = clean.split(/[:.]/);
        if (parts.length === 1) return parseFloat(parts[0]) * 1000;
        if (parts.length === 2) {
            // Check if it was 1:23 or 23.45
            if (clean.includes(':')) {
                return (parseInt(parts[0]) * 60 + parseFloat(parts[1])) * 1000;
            }
            return (parseInt(parts[0]) + parseFloat('0.' + parts[1])) * 1000;
        }
        if (parts.length === 3) {
            return (parseInt(parts[0]) * 60 + parseInt(parts[1]) + parseFloat('0.' + parts[2])) * 1000;
        }

        return null;
    };

    const handleManualSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        const ms = parseManualTime(manualTime);
        if (ms !== null && ms > 0) {
            onSolveComplete({
                id: crypto.randomUUID(),
                timeMs: ms,
                penalty: 'NONE',
                scramble: scrambleRef.current,
                date: new Date(),
                event: activeEventRef.current
            });
            setManualTime('');
            generateScramble();
        }
    };

    const updateTimer = useCallback(() => {
        const start = startTimeRef.current;
        if (start) {
            const now = performance.now();
            const elapsed = now - start;
            if (timerTextRef.current) {
                timerTextRef.current.textContent = formatTime(elapsed);
            }
            requestRef.current = requestAnimationFrame(updateTimer);
        }
    }, [formatTime]);

    const generateScramble = async () => {
        try {
            const s = await randomScrambleForEvent(activeEvent);
            setScramble(s.toString());
        } catch (e) {
            console.error('[Scramble Error]', e);
            setScramble('Error generating scramble');
        }
    };

    useEffect(() => { 
        generateScramble(); 
    }, [activeEvent, solves.length]);

    // Keyboard Listeners
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isManualMode) return;
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
            
            const state = timerStateRef.current;
            if (state === 'RUNNING') {
                stopTimer();
                if (e.code === 'Space') e.preventDefault();
                return;
            }
            
            if (e.code === 'Space') {
                e.preventDefault();
                if (state === 'IDLE') {
                    startHolding();
                }
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (isManualMode) return;
            if (e.code === 'Space') {
                const state = timerStateRef.current;
                if (state === 'HOLDING') {
                    cancelHolding();
                } else if (state === 'READY') {
                    startTimer();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [isManualMode]);

    const handlePointerDown = (e: React.PointerEvent) => {
        if (isManualMode) return;
        const current = timerStateRef.current;
        
        if (current === 'RUNNING') {
            stopTimer();
            e.stopPropagation();
            if (e.cancelable) e.preventDefault();
            return;
        }

        if (e.button !== 0) return;
        
        if ((e.target as HTMLElement).closest('.system-pill') || 
            (e.target as HTMLElement).closest('.hud-mini-btn') ||
            (e.target as HTMLElement).closest('.mobile-hud-container')) {
            return;
        }

        try {
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        } catch (err) {}

        if (current === 'IDLE') {
            startHolding();
        }
    };

    const handlePointerUp = () => {
        if (isManualMode) return;
        const current = timerStateRef.current;
        if (current === 'HOLDING') {
            cancelHolding();
        } else if (current === 'READY') {
            startTimer();
        }
    };

    const startHolding = () => {
        setTimerState('HOLDING');
        holdTimeoutRef.current = setTimeout(() => {
            setTimerState('READY');
            if (navigator.vibrate) navigator.vibrate(20);
        }, 300);
    };

    const cancelHolding = () => {
        if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);
        setTimerState('IDLE');
    };

    const startTimer = () => {
        if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);
        setTimerState('RUNNING');
        setShowVisualizer(false); // Hide visualizer on start
        setShowPenaltyModal(false); // Hide penalty modal on start
        startTimeRef.current = performance.now();
        requestRef.current = requestAnimationFrame(updateTimer);
    };

    const stopTimer = () => {
        const now = performance.now();
        const start = startTimeRef.current;
        if (requestRef.current) cancelAnimationFrame(requestRef.current);

        const finalTime = now - start;

        if (timerTextRef.current) {
            timerTextRef.current.classList.remove('running');
            timerTextRef.current.classList.remove('ready');
            timerTextRef.current.textContent = formatTime(finalTime);
        }

        startTimeRef.current = 0;
        timerStateRef.current = 'IDLE';

        setTimeout(() => {
            setTimerState('IDLE');
            onSolveComplete({
                id: crypto.randomUUID(),
                timeMs: finalTime,
                penalty: 'NONE',
                scramble: scrambleRef.current,
                date: new Date(),
                event: activeEventRef.current
            });
            generateScramble();
        }, 100);
    };

    const handleBluetoothConnect = async () => {
        try {
            setBluetoothStatus('CONNECTING');
            const timer = await connectSmartTimer();
            timerRef.current = timer;
            setBluetoothStatus('CONNECTED');
            
            timer.addEventListener("start", () => {
                timerStateRef.current = 'RUNNING';
                setTimerState('RUNNING');
                setShowVisualizer(false); // Hide visualizer on Bluetooth start
                startTimeRef.current = performance.now();
                requestRef.current = requestAnimationFrame(updateTimer);
            });

            timer.addEventListener("update", (e: any) => {
                if (e.detail.currentTime === 0 && timerStateRef.current === 'IDLE') {
                    timerStateRef.current = 'READY';
                    setTimerState('READY');
                }
            });

            timer.addEventListener("reset", () => {
                setTimerState('READY');
                if (timerTextRef.current) {
                    timerTextRef.current.textContent = '0.00';
                }
            });

            timer.addEventListener("stop", (e: any) => {
                const timeMs = e.detail.currentTime;
                if (requestRef.current) cancelAnimationFrame(requestRef.current);
                if (timerTextRef.current) {
                    timerTextRef.current.classList.remove('running');
                    timerTextRef.current.classList.remove('ready');
                    timerTextRef.current.textContent = formatTime(timeMs);
                }
                setTimeout(() => {
                    startTimeRef.current = 0;
                    timerStateRef.current = 'IDLE';
                    setTimerState('IDLE');
                    onSolveComplete({
                        id: crypto.randomUUID(),
                        timeMs: timeMs,
                        penalty: 'NONE',
                        scramble: scrambleRef.current,
                        date: new Date(),
                        event: activeEvent
                    });
                    generateScramble();
                }, 100);
            });

            timer.addEventListener("disconnect", () => {
                setBluetoothStatus('DISCONNECTED');
                timerRef.current = null;
            });

            try {
                const service = await timer.server.getPrimaryService('0000fff0-0000-1000-8000-00805f9b34fb');
                const stateChar = await service.getCharacteristic('0000fff5-0000-1000-8000-00805f9b34fb');
                
                const handleStateUpdate = (e: any) => {
                    const value = new Uint8Array(e.target.value.buffer);
                    const status = value[3];
                    if (status === 0x06 || status === 0x01) {
                        if (timerStateRef.current !== 'READY') {
                            timerStateRef.current = 'READY';
                            setTimerState('READY');
                            if (navigator.vibrate) navigator.vibrate(20);
                        }
                    } 
                    else if (status === 0x03) {
                        if (timerStateRef.current !== 'RUNNING') {
                            timerStateRef.current = 'RUNNING';
                            setTimerState('RUNNING');
                            startTimeRef.current = performance.now();
                            requestRef.current = requestAnimationFrame(updateTimer);
                        }
                    }
                    else if (status === 0x04 || status === 0x05 || status === 0x07) {
                        if (timerStateRef.current === 'READY' || timerStateRef.current === 'RUNNING') {
                            if (status === 0x05 && timerStateRef.current !== 'IDLE') {
                                timerStateRef.current = 'IDLE';
                                setTimerState('IDLE');
                            }
                        }
                    }
                };
                stateChar.addEventListener('characteristicvaluechanged', handleStateUpdate);
                await stateChar.startNotifications();
            } catch (err) {
                console.warn('[Bluetooth] Could not attach to status characteristic:', err);
            }
        } catch (err) {
            console.error(err);
            setBluetoothStatus('DISCONNECTED');
        }
    };

    const handleScramblePointerDown = (e: React.PointerEvent) => {
        e.stopPropagation();
        if (scrambleHoldTimerRef.current) clearTimeout(scrambleHoldTimerRef.current);
        scrambleHoldTimerRef.current = setTimeout(() => {
            generateScramble();
            if (navigator.vibrate) navigator.vibrate(20);
            scrambleHoldTimerRef.current = null;
        }, 500);
    };

    const handleScramblePointerUp = () => {
        if (scrambleHoldTimerRef.current) {
            clearTimeout(scrambleHoldTimerRef.current);
            scrambleHoldTimerRef.current = null;
        }
    };

    const renderScramble = () => {
        if (!scramble) return null;
        if (activeEvent === 'minx') {
            const moves = scramble.trim().split(/\s+/);
            const chunks: string[] = [];
            let currentChunk: string[] = [];
            for (const move of moves) {
                currentChunk.push(move);
                if (move === 'U' || move === "U'") {
                    chunks.push(currentChunk.join(' '));
                    currentChunk = [];
                }
            }
            if (currentChunk.length > 0) chunks.push(currentChunk.join(' '));
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.65em' }}>
                    {chunks.map((chunk, idx) => (
                        <div key={idx} style={{ whiteSpace: 'nowrap' }}>{chunk}</div>
                    ))}
                </div>
            );
        }
        return scramble;
    };

    const isTimerActive = timerState === 'RUNNING';
    const isTimerPriming = timerState === 'HOLDING' || timerState === 'READY';

    return (
        <div 
            className={`kinetic-timer-container ${isTimerActive ? 'timer-active' : ''} ${isTimerPriming ? 'timer-priming' : ''} ${isManualMode ? 'manual-mode' : ''}`}
            onPointerDown={handlePointerDown} 
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
        >
            <div className="system-pill-container">
                <div className="system-pill" onPointerDown={e => e.stopPropagation()}>
                    <button 
                        className={`pill-icon-btn ${bluetoothStatus === 'CONNECTED' ? 'active' : ''}`}
                        onClick={handleBluetoothConnect}
                        title="Connect Smart Timer"
                    >
                        {bluetoothStatus === 'CONNECTED' ? <BluetoothConnected size={18} /> : 
                         <Bluetooth size={18} className={bluetoothStatus === 'CONNECTING' ? 'spinning' : ''} />}
                    </button>

                    <div className="pill-divider" />

                    <div className="event-selector-wrapper">
                        <select 
                            value={activeEvent} 
                            onChange={(e) => onEventChange(e.target.value as EventType)}
                            className="event-selector"
                        >
                            {EVENTS.map(ev => (
                                <option key={ev.id} value={ev.id}>{ev.label}</option>
                            ))}
                        </select>
                        <ChevronDown size={14} className="selector-icon" />
                    </div>

                    <div className="pill-divider desktop-only" />

                    <button 
                        className={`pill-icon-btn desktop-only ${isManualMode ? 'active' : ''}`}
                        onClick={() => {
                            setIsManualMode(!isManualMode);
                            setTimeout(() => manualInputRef.current?.focus(), 10);
                        }}
                        title="Toggle Manual Input"
                    >
                        {isManualMode ? <Timer size={18} /> : <Keyboard size={18} />}
                    </button>

                    <div className="pill-divider" />
                    
                    <button className="pill-icon-btn" onClick={handleImportClick} title="Import csTimer Session">
                        <Download size={18} />
                    </button>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        style={{ display: 'none' }} 
                        accept=".json,.txt"
                        onChange={handleFileChange}
                    />

                    <button className="pill-icon-btn" onClick={handleExportClick} title="Export csTimer Session">
                        <Upload size={18} />
                    </button>

                    <button className="pill-icon-btn" onClick={onShowAnalytics} title="Show Analytics">
                        <BarChart2 size={18} />
                    </button>

                    <div className="pill-divider" />

                    <button 
                        className={`pill-icon-btn ${isAuthenticated ? 'active' : ''}`}
                        onClick={() => {
                            if (!isAuthenticated) onSignIn();
                            else if (unsyncedCount > 0) onSync?.();
                            else onSignOut();
                        }}
                        title={isAuthenticated ? (isSyncing ? 'Syncing...' : (unsyncedCount > 0 ? `Retry Sync (${unsyncedCount})` : 'Signed In')) : 'Connect Sync'}
                    >
                        {isSyncing ? <RefreshCw size={18} className="spinning" /> : 
                         (isAuthenticated ? (
                            <div style={{ position: 'relative' }}>
                                <Cloud size={18} />
                                {unsyncedCount > 0 && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '-4px',
                                        right: '-8px',
                                        background: 'var(--kinetic-primary)',
                                        color: 'white',
                                        fontSize: '9px',
                                        borderRadius: '6px',
                                        minWidth: '13px',
                                        height: '13px',
                                        padding: '0 3px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: '900',
                                        pointerEvents: 'none',
                                        fontFamily: 'monospace'
                                    }}>
                                        {unsyncedCount}
                                    </div>
                                )}
                            </div>
                         ) : <CloudOff size={18} />)}
                    </button>
                </div>
            </div>

            <div 
                className="kinetic-scramble-card"
                onPointerDown={handleScramblePointerDown}
                onPointerUp={handleScramblePointerUp}
                onPointerLeave={handleScramblePointerUp}
                style={{ position: 'relative', marginBottom: '4px' }}
            >
                <div className="kinetic-label">SCRAMBLE (Hold to Refresh)</div>
                <div className={`kinetic-scramble-text ${['minx', '555', '666', '777'].includes(activeEvent) ? 'long-scramble' : ''}`}>
                    {renderScramble()}
                </div>

                <div style={{ 
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    right: '4px',
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center',
                    zIndex: 102
                }}>
                    <button 
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowVisualizer(!showVisualizer);
                            setShowPenaltyModal(false);
                        }}
                        style={{ 
                            background: 'none',
                            border: 'none',
                            color: showVisualizer ? 'var(--kinetic-primary)' : 'var(--kinetic-outline)',
                            cursor: 'pointer',
                            padding: '4px', 
                            transition: 'color 0.2s ease, opacity 0.2s ease',
                            opacity: showVisualizer ? 1 : 0.6
                        }}
                    >
                        <Eye size={28} />
                    </button>

                    {lastSolve && (
                        <button 
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowPenaltyModal(!showPenaltyModal);
                                setShowVisualizer(false);
                            }}
                            style={{ 
                                background: 'none',
                                border: 'none',
                                color: showPenaltyModal ? 'var(--kinetic-primary)' : 'var(--kinetic-outline)',
                                cursor: 'pointer',
                                padding: '4px', 
                                transition: 'color 0.2s ease, opacity 0.2s ease',
                                opacity: showPenaltyModal ? 1 : 0.6
                            }}
                        >
                            <Wrench size={28} />
                        </button>
                    )}
                </div>

                {showVisualizer && (
                    <div 
                        style={{ 
                            position: 'absolute', 
                            top: '100%', 
                            left: '50%', 
                            marginTop: '45px',
                            zIndex: 100,
                            animation: 'kinetic-modal-up 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <ScrambleVisualizer 
                            scramble={scramble} 
                            event={activeEvent} 
                            size={160} 
                        />
                    </div>
                )}

                {showPenaltyModal && lastSolve && (
                    <div 
                        className="glass"
                        style={{ 
                            position: 'absolute', 
                            top: '100%', 
                            left: '50%', 
                            marginTop: '45px',
                            zIndex: 101,
                            padding: '12px',
                            borderRadius: '16px',
                            display: 'flex',
                            gap: '12px',
                            boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
                            animation: 'kinetic-modal-up 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button 
                            className={`hud-mini-btn ${lastSolve.penalty === '+2' ? 'active' : ''}`}
                            onClick={() => {
                                onUpdateSolve(lastSolve.id, { penalty: lastSolve.penalty === '+2' ? 'NONE' : '+2' });
                                setShowPenaltyModal(false);
                            }}
                        >
                            +2
                        </button>
                        <button 
                            className={`hud-mini-btn ${lastSolve.penalty === 'DNF' ? 'active' : ''}`}
                            onClick={() => {
                                onUpdateSolve(lastSolve.id, { penalty: lastSolve.penalty === 'DNF' ? 'NONE' : 'DNF' });
                                setShowPenaltyModal(false);
                            }}
                        >
                            DNF
                        </button>
                        <button 
                            className="hud-mini-btn is-danger"
                            onClick={() => {
                                if (confirm('Delete this solve?')) {
                                    onDeleteSolve(lastSolve.id);
                                    setShowPenaltyModal(false);
                                }
                            }}
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                )}
            </div>

            <div className="kinetic-timer-area">
                {isManualMode ? (
                    <form onSubmit={handleManualSubmit} style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                        <input 
                            ref={manualInputRef}
                            type="text"
                            className="manual-time-input"
                            placeholder="Type time..."
                            value={manualTime}
                            onChange={(e) => setManualTime(e.target.value)}
                            autoFocus
                        />
                    </form>
                ) : (
                    <div ref={timerTextRef} className={`timer-display ${timerState.toLowerCase()}`}>
                        {timerState === 'IDLE' && lastSolve ? formatTime(lastSolve.penalty === '+2' ? lastSolve.timeMs + 2000 : lastSolve.timeMs) : (timerState === 'RUNNING' ? '0.00' : '0.00')}
                    </div>
                )}
            </div>

            {/* Penalty buttons moved to modal above */}

            <MobileHUD 
                solves={solves}
                activeEvent={activeEvent}
                scramble={scramble}
                onShowHistory={() => onShowHistory?.()}
                onShowPRs={() => onShowPRs?.()}
                globalBests={globalBests}
                dailyBests={dailyBests}
            />
        </div>
    );
}
