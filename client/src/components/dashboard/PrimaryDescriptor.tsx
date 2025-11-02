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

const TEXT_GRADIENTS = [
  'from-cyan-400 via-fuchsia-500 to-amber-500',
  'from-emerald-400 via-sky-400 to-pink-500',
  'from-yellow-300 via-orange-500 to-red-500',
  'from-purple-400 via-indigo-500 to-cyan-400',
];

const PULSE_GRADIENTS = [
  'from-pink-500/40 via-cyan-500/30 to-yellow-400/40',
  'from-violet-500/40 via-emerald-400/30 to-orange-500/30',
];

export const PrimaryDescriptor: React.FC = () => {
  return (
    <ArcAgiCard title="Primary Hyperstate" icon="🛠️" color="#FF00FF" className="relative overflow-hidden">
      <div className="relative z-10 space-y-3 text-xs sm:text-sm">
        <motion.div
          className="font-mono text-[10px] uppercase tracking-[0.4em] text-cyan-300"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          Sovereign-Grade Oversight Module
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {DESCRIPTOR_LINES.map((line, index) => {
            const gradient = TEXT_GRADIENTS[index % TEXT_GRADIENTS.length];
            return (
              <motion.div
                key={line.key}
                className="rounded-md border border-white/5 bg-black/40 p-3 shadow-lg shadow-fuchsia-500/10"
                animate={{
                  scale: [1, 1.02, 1],
                  boxShadow: [
                    '0 0 16px rgba(255,0,255,0.2)',
                    '0 0 24px rgba(0,255,255,0.3)',
                    '0 0 16px rgba(255,0,255,0.2)',
                  ],
                }}
                transition={{ duration: 3 + index * 0.1, repeat: Infinity }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400">
                    {line.key}
                  </span>
                  <motion.span
                    className={`bg-gradient-to-r ${gradient} bg-clip-text text-right font-bold text-transparent`}
                    animate={{
                      backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                    }}
                    transition={{ duration: 2.2 + index * 0.15, repeat: Infinity }}
                  >
                    {line.value}
                  </motion.span>
                </div>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          className="font-mono text-[11px] uppercase tracking-[0.35em] text-amber-300"
          animate={{
            opacity: [0.4, 1, 0.4],
            letterSpacing: ['0.35em', '0.45em', '0.35em'],
          }}
          transition={{ duration: 3.6, repeat: Infinity }}
        >
          Status: Stable · Omniscient · Holographically Certified
        </motion.div>
      </div>

      {/* Animated background flares */}
      {PULSE_GRADIENTS.map((gradient, index) => (
        <motion.div
          key={`pulse-${index}`}
          className={`absolute -inset-1 z-0 bg-gradient-to-br ${gradient} blur-3xl`}
          style={{ mixBlendMode: 'screen' }}
          animate={{
            rotate: [0, 360],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 20 + index * 4,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      ))}

      <motion.div
        className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.15),_transparent_55%)]"
        animate={{ opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 5, repeat: Infinity }}
      />
    </ArcAgiCard>
  );
};
