import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface LiveCounterProps {
  label: string;
  value: number;
  suffix?: string;
  color?: string;
  increment: () => number;
}

export const LiveCounter: React.FC<LiveCounterProps> = ({ 
  label, 
  value, 
  suffix = '', 
  color = 'text-white',
  increment
}) => {
  const [count, setCount] = useState(value);

  useEffect(() => {
    const interval = setInterval(() => {
      setCount(prev => prev + increment());
    }, 100 + Math.random() * 200);
    return () => clearInterval(interval);
  }, [increment]);

  return (
    <div className="text-center">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <motion.div 
        className={`font-mono text-lg ${color}`}
        animate={{ 
          scale: [1, 1.05, 1],
          textShadow: [`0 0 5px currentColor`, `0 0 15px currentColor`, `0 0 5px currentColor`]
        }}
        transition={{ duration: 0.5, repeat: Infinity }}
      >
        {count.toLocaleString()}{suffix}
      </motion.div>
    </div>
  );
};
