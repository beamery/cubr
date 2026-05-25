import React, { useEffect } from 'react';
import { formatTimeMs } from '../logic/stats';
import { Trophy } from 'lucide-react';

interface RecordModalProps {
    type: string; // 'Single' | 'Ao5' | 'Ao12' | 'Ao100'
    timeMs: number;
    isGlobal: boolean;
    onClose: () => void;
}

export const RecordModal: React.FC<RecordModalProps> = ({ type, timeMs, isGlobal, onClose }) => {
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    return (
        <div className="pr-modal-overlay" onClick={onClose}>
            <div className="pr-modal glass" onClick={e => e.stopPropagation()}>
                <div className="pr-content">
                    <div className="pr-badge">
                        <Trophy size={14} style={{ marginRight: '8px' }} />
                        {type.toUpperCase()} RECORD
                    </div>
                    
                    <div className="pr-time">{formatTimeMs(timeMs)}</div>
                    
                    <div className="pr-rank">
                        {isGlobal ? 'New Global PB!' : 'Session Best!'}
                    </div>
                    
                    <div className="pr-close-hint">Tap anywhere to continue</div>
                </div>
            </div>
        </div>
    );
};
