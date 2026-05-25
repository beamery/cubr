import { useState, useMemo } from 'react'
import './App.css'
import { TimerPanel } from './components/TimerPanel';
import { RollingHistory } from './components/RollingHistory';
import { AnalyticsView } from './components/AnalyticsView';
import { HistoryModal } from './components/HistoryModal';
import { SolveDetail } from './components/SolveDetail';
import { PRModal } from './components/PRModal';
import { getRunningRecords } from './logic/stats';
import { useSync } from './hooks/useSync';
import { AuthModal } from './components/AuthModal';
import { AnimatePresence } from 'framer-motion';
import type { SolveRecord, EventType } from './types_new';

export default function App() {
    const { 
        solves, 
        addSolve, 
        addSolves,
        updateSolve, 
        deleteSolve, 
        isAuthenticated, 
        isSyncing, 
        signOut,
        clearSolves,
        deduplicateCloud,
        unsyncedCount,
        syncSolves
    } = useSync();

  // UI State
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showPRs, setShowPRs] = useState(false);
  const [showMobileHistory, setShowMobileHistory] = useState(false);
  const [selectedSolve, setSelectedSolve] = useState<SolveRecord | null>(null);
  const [activeEvent, setActiveEvent] = useState<EventType>('333');

  // Filter solves by event
  const filteredSolves = useMemo(() => {
    return solves.filter(s => (s.event || '333') === activeEvent);
  }, [solves, activeEvent]);

  // Optimized stats calculation
  const sessionStats = useMemo(() => {
    if (filteredSolves.length === 0) return null;
    const historical = getRunningRecords(filteredSolves);
    
    // We can also find the daily bests by looking at the last item
    // because getRunningRecords tracks daily bests internally too.
    // However, the 'isRecord' flag only tells us if the LAST solve was a record.
    // We actually need to find the min of the historical averages across the whole array.
    // Wait! Since getRunningRecords tracks globalBestAo5 etc internally,
    // I should modify getRunningRecords to also return the current running bests in the object.
    
    // Actually, a simple O(N) pass to find the min is fine now that we don't have O(N^2).
    let bS = Infinity; let b3 = Infinity; let b5 = Infinity; let b12 = Infinity; let b25 = Infinity; let b50 = Infinity; let b100 = Infinity;
    let d3 = Infinity; let d5 = Infinity; let d12 = Infinity; let d25 = Infinity; let d50 = Infinity; let d100 = Infinity;
    
    const today = new Date().toDateString();

    historical.forEach((h, i) => {
        if (h.single !== null && h.single < bS) bS = h.single;
        if (h.mo3 !== null && h.mo3 < b3) b3 = h.mo3;
        if (h.ao5 !== null && h.ao5 < b5) b5 = h.ao5;
        if (h.ao12 !== null && h.ao12 < b12) b12 = h.ao12;
        if (h.ao25 !== null && h.ao25 < b25) b25 = h.ao25;
        if (h.ao50 !== null && h.ao50 < b50) b50 = h.ao50;
        if (h.ao100 !== null && h.ao100 < b100) b100 = h.ao100;
        
        // Daily check
        if (new Date(filteredSolves[i].date).toDateString() === today) {
            if (h.mo3 !== null && h.mo3 < d3) d3 = h.mo3;
            if (h.ao5 !== null && h.ao5 < d5) d5 = h.ao5;
            if (h.ao12 !== null && h.ao12 < d12) d12 = h.ao12;
            if (h.ao25 !== null && h.ao25 < d25) d25 = h.ao25;
            if (h.ao50 !== null && h.ao50 < d50) d50 = h.ao50;
            if (h.ao100 !== null && h.ao100 < d100) d100 = h.ao100;
        }
    });

    return {
        global: { 
            single: bS === Infinity ? null : bS, 
            b3: b3 === Infinity ? null : b3,
            b5: b5 === Infinity ? null : b5, 
            b12: b12 === Infinity ? null : b12, 
            b25: b25 === Infinity ? null : b25,
            b50: b50 === Infinity ? null : b50,
            b100: b100 === Infinity ? null : b100 
        },
        daily: { 
            b3: d3 === Infinity ? null : d3,
            b5: d5 === Infinity ? null : d5, 
            b12: d12 === Infinity ? null : d12, 
            b25: d25 === Infinity ? null : d25,
            b50: d50 === Infinity ? null : d50,
            b100: d100 === Infinity ? null : d100 
        }
    };
  }, [filteredSolves]);

  const globalBests = sessionStats?.global || { single: null, b3: null, b5: null, b12: null, b25: null, b50: null, b100: null };
  const dailyBests = sessionStats?.daily || { b3: null, b5: null, b12: null, b25: null, b50: null, b100: null };

  const handleSolveComplete = (solve: SolveRecord) => {
    addSolve({ ...solve, event: activeEvent });
  };


  return (
    <div className="dashboard-grid">
      <main className="main-panel">
        <TimerPanel 
            solves={filteredSolves}
            onSolveComplete={handleSolveComplete} 
            onUpdateSolve={updateSolve}
            onDeleteSolve={deleteSolve}
            onImportSolves={addSolves}
            onShowAnalytics={() => setShowAnalytics(true)}
            onShowHistory={() => setShowMobileHistory(true)}
            onShowPRs={() => setShowPRs(true)}
            activeEvent={activeEvent}
            onEventChange={setActiveEvent}
            isMobileHistoryOpen={showMobileHistory}
            isAuthenticated={isAuthenticated}
            isSyncing={isSyncing}
            unsyncedCount={unsyncedCount}
            onSignOut={signOut}
            onSignIn={() => setShowAuth(true)}
            globalBests={globalBests}
            dailyBests={dailyBests}
            onSolveClick={setSelectedSolve}
            onSync={syncSolves}
        />
      </main>

      <RollingHistory 
        solves={filteredSolves}
        onSolveClick={setSelectedSolve}
      />
        
      {showMobileHistory && (
          <HistoryModal 
              solves={filteredSolves}
              onClose={() => setShowMobileHistory(false)}
              onSolveClick={setSelectedSolve}
          />
      )}

      {showAnalytics && (
          <AnalyticsView 
              solves={filteredSolves} 
              onClose={() => setShowAnalytics(false)} 
              onSolveClick={setSelectedSolve}
              onClearData={clearSolves}
              onDeduplicate={deduplicateCloud}
          />
      )}

      {selectedSolve && (
        <SolveDetail 
          solve={selectedSolve as SolveRecord}
          sessionName="3x3 Session"
          onClose={() => setSelectedSolve(null)}
          onUpdatePenalty={(id, p) => updateSolve(id, { penalty: p })}
          onUpdateComment={(id, c) => updateSolve(id, { comment: c })}
          onDelete={deleteSolve}
        />
      )}

      <AnimatePresence>
        {showAuth && (
            <AuthModal onClose={() => setShowAuth(false)} />
        )}
      </AnimatePresence>

      {showPRs && (
          <PRModal 
            solves={filteredSolves} 
            onClose={() => setShowPRs(false)} 
            onSolveClick={setSelectedSolve}
          />
      )}
    </div>
  );
}
