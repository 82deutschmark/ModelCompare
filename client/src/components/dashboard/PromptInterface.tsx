import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { DashboardCard } from './DashboardCard';

export const PromptInterface: React.FC = () => {
  return (
    <DashboardCard
      title="NEURAL COMMAND INTERFACE"
      icon="🧠"
      color="#00FF41"
    >
      <div className="space-y-4">
        <motion.div 
          className="relative"
          animate={{ 
            boxShadow: ['0 0 5px #00FF41', '0 0 15px #00FF41', '0 0 5px #00FF41']
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <textarea
            className="w-full bg-gray-900 border border-green-500 rounded-lg p-4 text-green-400 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
            placeholder=">> ENTER HYPERDIMENSIONAL QUERY FOR AGI NEURAL PROCESSING..."
            rows={3}
            style={{
              background: 'linear-gradient(135deg, #001100, #000500)',
              textShadow: '0 0 5px #00FF41'
            }}
          />
          <motion.div
            className="absolute bottom-2 right-2 text-xs text-gray-500 font-mono"
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            QUANTUM_READY
          </motion.div>
        </motion.div>
        
        <div className="flex justify-between items-center">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button 
              className="px-6 py-2 bg-gradient-to-r from-green-600 to-cyan-600 text-black font-mono font-bold"
              style={{
                boxShadow: '0 0 10px #00FF41'
              }}
            >
              ⚡ PROCESS NEURAL INPUT
            </Button>
          </motion.div>
          
          <div className="flex space-x-4 text-xs font-mono">
            <motion.div 
              className="text-cyan-400"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            >
              🔮 QUANTUM_CORES: ACTIVE
            </motion.div>
            <motion.div 
              className="text-pink-400"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            >
              🧬 DNA_ANALYSIS: READY
            </motion.div>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
};
