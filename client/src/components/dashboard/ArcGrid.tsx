import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArcAgiCard } from './DashboardCard';
import { SPACE_EMOJIS } from '../../lib/spaceEmojis';

// ARC color palette matching the image
const ARC_COLORS = ['#000000', '#0074D9', '#FF4136', '#2ECC40', '#FFDC00', '#AAAAAA', '#F012BE', '#FF851B', '#7FDBFF', '#870C25'];

// Extended emoji palettes (tech palette merged with core SPACE_EMOJIS)
const EXTENDED_EMOJIS = {
  ...SPACE_EMOJIS,
  tech: ['🤖', '🔬', '⚡', '🧬', '🚀', '💎', '⚛️', '🔮', '💫', '🌌'],
} as const;

interface ArcGridProps {
  color: string;
  title: string;
  gridSize?: number;
  patternId?: string;
  className?: string;
}

export const ArcGrid: React.FC<ArcGridProps> = ({ 
  color, 
  title, 
  gridSize = 8,
  patternId = "001",
  className,
}) => {
  const [grid, setGrid] = useState<number[][]>([]);
  const [showEmojis, setShowEmojis] = useState(false);
  const [emojiPalette, setEmojiPalette] = useState<string[]>([...SPACE_EMOJIS.legacy_default]);
  
  useEffect(() => {
    // Initialize grid
    const newGrid = Array(gridSize).fill(null).map(() =>
      Array(gridSize).fill(null).map(() => Math.floor(Math.random() * 10))
    );
    setGrid(newGrid);

    // Cycle between numbers and emojis every 3 seconds
    const displayInterval = setInterval(() => {
      setShowEmojis(prev => !prev);
      // Change emoji palette when switching to emoji mode
      if (!showEmojis) {
        const palettes = Object.values(EXTENDED_EMOJIS);
        const randomPalette = palettes[Math.floor(Math.random() * palettes.length)];
        setEmojiPalette([...randomPalette]);
      }
    }, 3000);
    
    // Rapidly update grid content
    const updateInterval = setInterval(() => {
      setGrid(prev => prev.map(row => 
        row.map(() => Math.floor(Math.random() * 10))
      ));
    }, 200 + Math.random() * 300);
    
    return () => {
      clearInterval(displayInterval);
      clearInterval(updateInterval);
    };
  }, [gridSize, showEmojis]);

  return (
    <ArcAgiCard 
      title={`${title} ${patternId}`} 
      icon="⬛" 
      color={color}
      compact={true}
      className={className}
    >
      <div className="relative">
        <motion.div 
          className={`grid gap-[1px] w-full`}
          style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
          animate={{ 
            scale: [1, 1.02, 1],
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity,
          }}
        >
          {grid.flat().map((value, i) => (
            <motion.div
              key={i}
              className="aspect-square flex items-center justify-center text-xs font-mono border-[0.5px] border-gray-600"
              style={{
                backgroundColor: showEmojis ? '#111' : ARC_COLORS[value],
                color: showEmojis ? '#fff' : '#000'
              }}
              animate={{
                opacity: [0.8, 1, 0.8],
              }}
              transition={{
                duration: 0.5 + Math.random() * 0.5,
                repeat: Infinity,
                delay: Math.random() * 2
              }}
            >
              {showEmojis ? (
                <span className="text-[8px]">{emojiPalette[value]}</span>
              ) : (
                <span className={`${gridSize > 6 ? 'text-[6px]' : 'text-[8px]'} font-bold`}>
                  {value}
                </span>
              )}
            </motion.div>
          ))}
        </motion.div>
        
        {/* Status indicator */}
        <div className="mt-1 text-center">
          <motion.span 
            className="font-mono text-[8px]"
            style={{ color }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            {showEmojis ? 'EMOJI' : 'SOLVE'} MODE
          </motion.span>
        </div>
      </div>
    </ArcAgiCard>
  );
};
