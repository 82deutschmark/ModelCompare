import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArcAgiCard } from './DashboardCard';

interface ChessBoardProps {
  color: string;
  title: string;
  sizePx?: number; // outer square size in pixels (width/height)
  emojiMode?: boolean; // if true, show emojis instead of colored squares
}

// Simple emoji palette for emojiMode
const EMOJIS = ['♞','♟️','♜','♛','♚','⭐','💥','⚡','🧠','🚀','🌀','💎','🔮','⚛️','🌌'];

export const ChessBoard: React.FC<ChessBoardProps> = ({ color, title, sizePx = 320, emojiMode = false }) => {
  const [board, setBoard] = useState<number[][]>([]);
  
  useEffect(() => {
    // Initialize 8x8 chess board with random states
    const newBoard = Array(8).fill(null).map(() => 
      Array(8).fill(null).map(() => Math.random())
    );
    setBoard(newBoard);
    
    // Rapidly update board state for frantic effect - getting faster over time
    let updateSpeed = 80;
    const interval = setInterval(() => {
      setBoard(prev => prev.map(row => 
        row.map(() => Math.random())
      ));
      // Increase speed over time for escalating effect
      updateSpeed = Math.max(15, updateSpeed - 1);
      clearInterval(interval);
      setTimeout(() => {
        const newInterval = setInterval(() => {
          setBoard(prev => prev.map(row => 
            row.map(() => Math.random())
          ));
        }, updateSpeed);
      }, updateSpeed);
    }, updateSpeed);
    
    return () => clearInterval(interval);
  }, []);

  // compute cell size
  const cellSize = sizePx / 8;

  return (
    <ArcAgiCard title={title} icon="♛" color={color}>
      <div className="relative w-full flex items-center justify-center" style={{ height: sizePx + 64 }}>
        <motion.div 
          className="grid grid-cols-8 gap-[1px]"
          style={{ width: sizePx, height: sizePx }}
          animate={{ 
            rotateY: [0, 360],
            scale: [1, 1.1, 0.95, 1.05, 1],
            rotateZ: [0, 5, -3, 2, 0]
          }}
          transition={{ 
            rotateY: { duration: 1.5, repeat: Infinity, ease: "linear" },
            scale: { duration: 0.3, repeat: Infinity },
            rotateZ: { duration: 0.5, repeat: Infinity }
          }}
        >
          {board.flat().map((intensity, i) => {
            const row = Math.floor(i / 8);
            const col = i % 8;
            const isBlack = (row + col) % 2 === 1;
            
            return (
              <motion.div
                key={i}
                className="aspect-square flex items-center justify-center select-none"
                style={{
                  width: cellSize,
                  height: cellSize,
                  backgroundColor: emojiMode
                    ? (isBlack ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.1)')
                    : (isBlack 
                        ? `rgba(${color.replace('#', '')
                            .match(/.{2}/g)?.map(x => parseInt(x, 16)).join(',') || '0,0,0'}, ${intensity})`
                        : `rgba(255, 255, 255, ${intensity * 0.3})`),
                  boxShadow: !emojiMode && intensity > 0.6 ? `0 0 12px ${color}` : 'none',
                  color: emojiMode ? (isBlack ? '#0ff' : '#ff0') : undefined,
                  fontSize: emojiMode ? Math.max(14, cellSize * 0.6) : undefined,
                }}
                animate={{
                  opacity: emojiMode ? [0.7, 1, 0.8] : [0.2, 1, 0.4, 0.8, 0.2],
                  scale: emojiMode ? [1, 1.1, 1] : (intensity > 0.7 ? [1, 1.4, 0.8, 1.2, 1] : [1, 1.1, 0.9, 1.05, 1])
                }}
                transition={{
                  duration: 0.1 + Math.random() * 0.15,
                  repeat: Infinity
                }}
              >
                {emojiMode ? EMOJIS[(Math.floor(intensity * EMOJIS.length)) % EMOJIS.length] : null}
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </ArcAgiCard>
  );
}
;
