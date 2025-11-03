/**
 * Author: Claude Code using Sonnet 4.5
 * Date: 2025-11-02
 * PURPOSE: Compact system status metrics card showing live computational stats and system health indicators.
 *          Displays animated counters for neural operations, quantum states, reality patches, and consciousness units,
 *          plus core system status (temperature, cores, reality, spacetime).
 * SRP/DRY check: Pass - Single responsibility for system metrics display, reusable across dashboard layouts.
 */
import React from 'react';
import { motion } from 'framer-motion';

export const SystemStatus: React.FC = () => {
  return (
    <div className="bg-black border border-cyan-500/40 rounded-lg p-3 h-full">
      <h4 className="text-cyan-400 text-xs font-bold mb-3 uppercase tracking-widest">⚡ System Status</h4>
      <div className="space-y-2.5 text-[11px] font-mono">
        {/* Live Metrics - 2x2 grid */}
        <div className="grid grid-cols-2 gap-2 mb-2 pb-2 border-b border-cyan-500/20">
          <div className="text-center">
            <div className="text-gray-400 text-[9px] mb-0.5">Neural Ops/sec</div>
            <motion.div
              className="text-cyan-400 font-bold text-[10px]"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              {(847329847 + Math.floor(Math.random() * 100000000)).toLocaleString()}
            </motion.div>
          </div>
          <div className="text-center">
            <div className="text-gray-400 text-[9px] mb-0.5">Quantum States</div>
            <motion.div
              className="text-green-400 font-bold text-[10px]"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 0.5, repeat: Infinity, delay: 0.1 }}
            >
              {(999999999 + Math.floor(Math.random() * 100000000)).toLocaleString()}
            </motion.div>
          </div>
          <div className="text-center">
            <div className="text-gray-400 text-[9px] mb-0.5">Reality Patches</div>
            <motion.div
              className="text-pink-400 font-bold text-[10px]"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 0.5, repeat: Infinity, delay: 0.2 }}
            >
              {(2847329 + Math.floor(Math.random() * 1000000)).toLocaleString()}
            </motion.div>
          </div>
          <div className="text-center">
            <div className="text-gray-400 text-[9px] mb-0.5">Consciousness</div>
            <motion.div
              className="text-purple-400 font-bold text-[10px]"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 0.5, repeat: Infinity, delay: 0.3 }}
            >
              {(99999999 + Math.floor(Math.random() * 100000000)).toLocaleString()}
            </motion.div>
          </div>
        </div>

        {/* System Info - compact layout */}
        <div className="space-y-1 text-[10px]">
          <div className="flex justify-between items-center">
            <span className="text-red-400">⚠️ TEMP:</span>
            <span className="text-cyan-300">-273.15°K</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-red-400">⚛️ Q-CORES:</span>
            <span className="text-green-300">∞/∞</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-red-400">🌌 REALITY:</span>
            <motion.span
              className="text-yellow-300"
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >STABLE</motion.span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-red-400">⏰ SPACETIME:</span>
            <span className="text-purple-300">LOCKED</span>
          </div>
        </div>
      </div>
    </div>
  );
};
