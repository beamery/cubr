// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { formatTimeMs } from '../logic/stats';
import type { SolveRecord, PenaltyType } from '../types_new';
import { X, Trash2 } from 'lucide-react';

interface SolveDetailProps {
    solve: SolveRecord;
    sessionName: string;
    onClose: () => void;
    onUpdatePenalty: (id: string, newPenalty: PenaltyType) => void;
    onUpdateComment: (id: string, newComment: string) => void;
    onDelete: (id: string) => void;
}

const PUZZLE_MAP: Record<string, string> = {
    '222': '2x2x2',
    '333': '3x3x3',
    '444': '4x4x4',
    '555': '5x5x5',
    '666': '6x6x6',
    '777': '7x7x7',
    'minx': 'megaminx'
};

export const SolveDetail: React.FC<SolveDetailProps> = ({ 
    solve, 
    sessionName, 
    onClose, 
    onUpdatePenalty, 
    onUpdateComment, 
    onDelete
}) => {
    const [comment, setComment] = useState(solve.comment || '');

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    const handleCommentBlur = () => {
        if (comment !== solve.comment) {
            onUpdateComment(solve.id, comment);
        }
    };

    return (
        <div className="solve-detail-overlay" onClick={onClose}>
            <div className="solve-detail-card glass" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="detail-header">
                    <div className="header-info">
                        <span className="kinetic-label">SOLVE DETAIL</span>
                        <span className="header-meta">{sessionName} • {new Date(solve.date).toLocaleString()}</span>
                    </div>
                    <button className="close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Main Time */}
                <div className="detail-time-area">
                    <div className={`detail-time data-point ${solve.penalty === 'DNF' ? 'dnf' : ''}`}>
                        {solve.penalty === 'DNF' ? 'DNF' : formatTimeMs(solve.timeMs + (solve.penalty === '+2' ? 2000 : 0))}
                        {solve.penalty === '+2' && <span className="penalty-plus">+</span>}
                    </div>
                </div>

                {/* Scramble & Visualizer */}
                <div className="detail-scramble-section">
                    <div className="scramble-info">
                        <span className="kinetic-label">SCRAMBLE</span>
                        <div className="scramble-text data-point">{solve.scramble}</div>
                    </div>
                    <div className="scramble-viz">
                        {/* @ts-ignore */}
                        <twisty-player
                            experimental-setup-alg={solve.scramble}
                            alg=""
                            puzzle={PUZZLE_MAP[solve.event || '333'] || '3x3x3'}
                            visualization="experimental-2D-LL"
                            control-panel="none"
                            background="none"
                        ></twisty-player>
                    </div>
                </div>

                {/* Comment */}
                <div className="detail-comment-section">
                    <span className="kinetic-label">COMMENT</span>
                    <textarea 
                        className="detail-textarea"
                        placeholder="Add a note..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        onBlur={handleCommentBlur}
                    />
                </div>

                {/* Actions */}
                <div className="detail-actions">
                    {(['NONE', '+2', 'DNF'] as PenaltyType[]).map(p => (
                        <button 
                            key={p}
                            className={`penalty-btn ${solve.penalty === p ? 'active' : ''}`}
                            onClick={() => onUpdatePenalty(solve.id, p)}
                        >
                            {p}
                        </button>
                    ))}
                    <button 
                        className="delete-btn"
                        onClick={() => {
                            if (confirm("Delete this solve?")) {
                                onDelete(solve.id);
                                onClose();
                            }
                        }}
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};
