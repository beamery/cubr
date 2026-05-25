import React from 'react';
import { RollingHistory } from './RollingHistory';
import type { SolveRecord } from '../types_new';

interface HistoryModalProps {
    solves: SolveRecord[];
    onClose: () => void;
    onSolveClick: (solve: SolveRecord) => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({ solves, onClose, onSolveClick }) => {
    return (
        <div className="analytics-overlay" onClick={onClose}>
            <div className="history-modal-container glass" onClick={e => e.stopPropagation()}>
                <div className="history-modal-content">
                    <RollingHistory 
                        solves={solves}
                        onSolveClick={onSolveClick}
                        onClose={onClose}
                    />
                </div>
            </div>
        </div>
    );
};
