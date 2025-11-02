/**
 * Author: Cascade (OpenAI GPT-4.1)
 * Date: 2025-11-02 and the 04:42 UTC
 * PURPOSE: Render the hyperbolic primary descriptor panel with animated neon gradients and pseudo-scientific accolades using existing dashboard card primitives.
 * SRP/DRY check: Pass - encapsulates parody descriptor presentation without duplicating behavior from other dashboard modules.
 */
import React from 'react';
import { motion } from 'framer-motion';
import { ArcAgiCard } from './DashboardCard';

const DESCRIPTOR_LINES = [
  { key: 'Primary', value: 'V999_ULTRA_PRO_INFINITY' },
  { key: 'Capacity', value: '100 sovereign-tier models' },
  { key: 'Consensus', value: '9-level recursive consensus voting' },
  { key: 'Validation', value: 'Quantum-precision validation' },
  { key: 'Accuracy', value: 'Verified global accuracy: 99.999999%+' },
  { key: 'Autonomy', value: 'Autonomous bias elimination' },
  { key: 'Coordination', value: 'Meta-coordination across all subnets' },
  { key: 'Coherence', value: 'Cognitive coherence index: 1.0000' },
  { key: 'Redundancy', value: 'Self-auditing redundancy grid: active' },
  { key: 'Reality', value: 'Reality-lock checksum: verified' },
] as const;

interface PrimaryDescriptorProps {
  className?: string;
}

export const PrimaryDescriptor: React.FC<PrimaryDescriptorProps> = ({ className }) => {
  return (
    <ArcAgiCard
      title="Primary Hyperstate"
      icon="🛠️"
      color="#FF00FF"
      compact
      className={`relative h-48 overflow-hidden ${className ?? ''}`}
    >
      <div className="flex h-full flex-col gap-2">
        <motion.div
          className="text-[10px] uppercase tracking-[0.4em] text-cyan-300"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          Sovereign-Grade Oversight
        </motion.div>

        <div className="relative flex-1 overflow-hidden rounded border border-fuchsia-500/30 bg-black/60">
          <motion.div
            className="flex flex-col gap-2 p-3 text-[10px] leading-tight tracking-wide"
            animate={{
              y: [0, -12, 0],
            }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          >
            {DESCRIPTOR_LINES.map((line, index) => (
              <motion.div
                key={line.key}
                className="flex items-center justify-between gap-2 font-mono"
                animate={{
                  opacity: [0.7, 1, 0.7],
                }}
                transition={{ duration: 3, repeat: Infinity, delay: index * 0.1 }}
              >
                <span className="text-[9px] uppercase text-fuchsia-200">{line.key}</span>
                <span className="text-[9px] text-cyan-200 text-right">
                  {line.value}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </div>

        <motion.div
          className="text-[9px] uppercase tracking-[0.3em] text-amber-300"
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 4, repeat: Infinity }}
        >
          Status: Omniscient & Certified
        </motion.div>
      </div>
    </ArcAgiCard>
  );
};
