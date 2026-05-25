// @ts-nocheck
import React from 'react';
import "cubing/twisty";

interface ScrambleVisualizerProps {
    scramble: string;
    event: string;
    size?: number;
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

export const ScrambleVisualizer: React.FC<ScrambleVisualizerProps> = ({ 
    scramble, 
    event,
    size = 180
}) => {
    return (
        <div className="hud-viz-wrapper glass" style={{ 
            width: size, 
            height: size, 
            background: 'rgba(255,255,255,0.05)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px'
        }}>
            <twisty-player
                experimental-setup-alg={scramble}
                alg=""
                puzzle={PUZZLE_MAP[event] || '3x3x3'}
                visualization="experimental-2D-LL"
                control-panel="none"
                background="none"
                style={{ width: '100%', height: '100%' }}
            ></twisty-player>
        </div>
    );
};
