/**
 * Author: Claude Code using Sonnet 4.5
 * Date: 2025-11-02
 * PURPOSE: Render primary hyperstate descriptor with ambient destabilization theater matching QuantumMetrics,
 *          featuring dynamic value flashing, color shifts, and discoverable click-to-stabilize mechanic.
 * SRP/DRY check: Pass - encapsulates descriptor presentation with reusable destabilization patterns from
 *                QuantumMetrics reducer logic, no code duplication, single responsibility for UI presentation.
 */
import React, { useState, useEffect, useReducer, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArcAgiCard } from './DashboardCard';

type DestabilizationType = 'flicker' | 'colorShift' | 'valueSpike' | 'glitch';

interface DescriptorLine {
  key: string;
  value: string;
  destabilizationType: DestabilizationType;
  clickable: boolean;
}

interface DescriptorTheaterState {
  phase: 'dormant' | 'awakening' | 'destabilizing' | 'critical' | 'singularity';
  chaosLevel: number;
  destabilizedLines: Set<string>;
  lastInteractionTime: number;
  justStabilized: Map<string, number>;
}

type DescriptorTheaterAction =
  | { type: 'AWAKEN' }
  | { type: 'TICK'; deltaMs: number }
  | { type: 'DESTABILIZE_LINE'; lineKey: string }
  | { type: 'STABILIZE_LINE'; lineKey: string }
  | { type: 'CLEAR_STABILIZATION_FEEDBACK'; lineKey: string }
  | { type: 'RESET' };

const DESCRIPTOR_LINES: DescriptorLine[] = [
  { key: 'Primary', value: 'V999_ULTRA_PRO_INFINITY', destabilizationType: 'colorShift', clickable: true },
  { key: 'Capacity', value: '100 sovereign-tier models', destabilizationType: 'valueSpike', clickable: true },
  { key: 'Consensus', value: '9-level recursive consensus voting', destabilizationType: 'flicker', clickable: true },
  { key: 'Validation', value: 'Quantum-precision validation', destabilizationType: 'glitch', clickable: true },
  { key: 'Accuracy', value: 'Verified global accuracy: 99.999999%+', destabilizationType: 'colorShift', clickable: true },
  { key: 'Autonomy', value: 'Autonomous bias elimination', destabilizationType: 'valueSpike', clickable: true },
  { key: 'Coordination', value: 'Meta-coordination across all subnets', destabilizationType: 'flicker', clickable: true },
  { key: 'Coherence', value: 'Cognitive coherence index: 1.0000', destabilizationType: 'glitch', clickable: true },
  { key: 'Redundancy', value: 'Self-auditing redundancy grid: active', destabilizationType: 'colorShift', clickable: true },
  { key: 'Reality', value: 'Reality-lock checksum: verified', destabilizationType: 'flicker', clickable: true },
];

const initialDescriptorState: DescriptorTheaterState = {
  phase: 'dormant',
  chaosLevel: 0,
  destabilizedLines: new Set(),
  lastInteractionTime: Date.now(),
  justStabilized: new Map(),
};

function descriptorTheaterReducer(state: DescriptorTheaterState, action: DescriptorTheaterAction): DescriptorTheaterState {
  switch (action.type) {
    case 'AWAKEN':
      return { ...state, phase: 'awakening' };

    case 'TICK': {
      const now = Date.now();
      const timeSinceInteraction = now - state.lastInteractionTime;
      const growthRate = timeSinceInteraction > 5000 ? 0.12 : 0.04;
      const newChaos = Math.min(100, state.chaosLevel + (growthRate * (action.deltaMs / 100)));

      let newPhase = state.phase;
      if (newChaos > 25 && state.phase === 'awakening') {
        newPhase = 'destabilizing';
      } else if (newChaos > 65 && state.phase === 'destabilizing') {
        newPhase = 'critical';
      }

      return {
        ...state,
        chaosLevel: newChaos,
        phase: newPhase,
      };
    }

    case 'DESTABILIZE_LINE': {
      const newDestabilized = new Set(state.destabilizedLines);
      newDestabilized.add(action.lineKey);
      return { ...state, destabilizedLines: newDestabilized };
    }

    case 'STABILIZE_LINE': {
      const newDestabilized = new Set(state.destabilizedLines);
      newDestabilized.delete(action.lineKey);

      const newJustStabilized = new Map(state.justStabilized);
      newJustStabilized.set(action.lineKey, Date.now());

      const newChaos = Math.max(0, state.chaosLevel - 8);

      return {
        ...state,
        destabilizedLines: newDestabilized,
        lastInteractionTime: Date.now(),
        justStabilized: newJustStabilized,
        chaosLevel: newChaos,
      };
    }

    case 'CLEAR_STABILIZATION_FEEDBACK': {
      const newJustStabilized = new Map(state.justStabilized);
      newJustStabilized.delete(action.lineKey);
      return { ...state, justStabilized: newJustStabilized };
    }

    case 'RESET':
      return {
        ...initialDescriptorState,
        lastInteractionTime: Date.now(),
      };

    default:
      return state;
  }
}

const getDestabilizationProps = (type: DestabilizationType) => {
  switch (type) {
    case 'flicker':
      return {
        animate: { opacity: [1, 0.5, 1, 0.7, 1] },
        transition: { duration: 0.5, repeat: Infinity }
      };
    case 'colorShift':
      return {
        animate: { color: ['#00FF41', '#FF0000', '#FFFF00', '#00FF41'] },
        transition: { duration: 2, repeat: Infinity }
      };
    case 'valueSpike':
      return {
        animate: { scale: [1, 1.15, 0.95, 1.1, 1] },
        transition: { duration: 0.3, repeat: Infinity }
      };
    case 'glitch':
      return {
        animate: { x: [-2, 2, -1, 1, 0] },
        transition: { duration: 0.1, repeat: Infinity }
      };
    default:
      return {};
  }
};

interface PrimaryDescriptorProps {
  className?: string;
}

export const PrimaryDescriptor: React.FC<PrimaryDescriptorProps> = ({ className }) => {
  const [theaterState, dispatch] = useReducer(descriptorTheaterReducer, initialDescriptorState);

  // Dormant phase timer
  useEffect(() => {
    const awakeTimer = setTimeout(() => {
      dispatch({ type: 'AWAKEN' });
    }, 10000 + Math.random() * 5000);

    return () => clearTimeout(awakeTimer);
  }, []);

  // Auto-reset after singularity
  useEffect(() => {
    if (theaterState.phase !== 'singularity') return;

    const resetTimer = setTimeout(() => {
      dispatch({ type: 'RESET' });
    }, 3000 + Math.random() * 2000);

    return () => clearTimeout(resetTimer);
  }, [theaterState.phase]);

  // Main tick loop
  useEffect(() => {
    if (theaterState.phase === 'dormant' || theaterState.phase === 'singularity') return;

    const ticker = setInterval(() => {
      dispatch({ type: 'TICK', deltaMs: 100 });
    }, 100);

    return () => clearInterval(ticker);
  }, [theaterState.phase]);

  // Line destabilization scheduler
  useEffect(() => {
    if (theaterState.phase === 'dormant' || theaterState.phase === 'singularity') return;

    const scheduleNext = () => {
      const interval = Math.max(1200, 4000 - (theaterState.chaosLevel * 25));

      setTimeout(() => {
        const availableLines = DESCRIPTOR_LINES
          .filter(l => l.clickable && !theaterState.destabilizedLines.has(l.key))
          .map(l => l.key);

        if (availableLines.length > 0) {
          const randomKey = availableLines[Math.floor(Math.random() * availableLines.length)];
          dispatch({ type: 'DESTABILIZE_LINE', lineKey: randomKey });
        }

        scheduleNext();
      }, interval);
    };

    scheduleNext();
  }, [theaterState.phase, theaterState.chaosLevel]);

  // Click handler
  const handleLineClick = useCallback((lineKey: string) => {
    if (theaterState.phase === 'singularity') return;
    if (!theaterState.destabilizedLines.has(lineKey)) return;

    dispatch({ type: 'STABILIZE_LINE', lineKey });

    setTimeout(() => {
      dispatch({ type: 'CLEAR_STABILIZATION_FEEDBACK', lineKey });
    }, 800);
  }, [theaterState.phase, theaterState.destabilizedLines]);

  const GLITCH_CHARS = ['⚠', '∞', 'NaN', 'ERR', '???'];

  return (
    <motion.div
      animate={theaterState.phase === 'singularity' ? {
        filter: [
          'hue-rotate(0deg) saturate(1)',
          'hue-rotate(180deg) saturate(2)',
          'hue-rotate(360deg) saturate(1.5)',
          'hue-rotate(540deg) saturate(1)',
        ]
      } : {
        filter: 'hue-rotate(0deg) saturate(1)'
      }}
      transition={{ duration: 2, repeat: theaterState.phase === 'singularity' ? Infinity : 0 }}
    >
      <ArcAgiCard
        title={`Primary Hyperstate ${
          theaterState.phase === 'singularity' ? '⚠️ SINGULARITY' :
          theaterState.destabilizedLines.size > 3 ? `⚡ ${theaterState.destabilizedLines.size} UNSTABLE` :
          theaterState.destabilizedLines.size > 0 ? `⚡ ${theaterState.destabilizedLines.size} UNSTABLE` :
          '✓ STABLE'
        }`}
        icon="🛠️"
        color="#FF00FF"
        compact
        className={`relative h-fit overflow-hidden ${className ?? ''}`}
      >
        <div className="flex flex-col gap-1.5">
          <motion.div
            className="text-[10px] uppercase tracking-[0.4em] text-cyan-300"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            Sovereign-Grade Oversight
          </motion.div>

          <div className="relative overflow-hidden rounded border border-fuchsia-500/30 bg-black/60 p-2.5">
            <div className="space-y-1.5 text-[9px]">
              {DESCRIPTOR_LINES.map((line) => {
                const isDestabilized = theaterState.destabilizedLines.has(line.key);
                const isClickable = line.clickable && isDestabilized;
                const wasJustStabilized = theaterState.justStabilized.has(line.key);
                const destabilizationProps = isDestabilized ? getDestabilizationProps(line.destabilizationType) : {};

                let displayValue = line.value;
                if (isDestabilized && line.destabilizationType === 'glitch' && Math.random() < 0.2) {
                  displayValue = GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
                }

                return (
                  <motion.div
                    key={line.key}
                    className={`flex items-center justify-between gap-2 font-mono ${isClickable ? 'cursor-pointer' : ''}`}
                    onClick={isClickable ? () => handleLineClick(line.key) : undefined}
                    {...destabilizationProps}
                    animate={{
                      ...(destabilizationProps.animate || {}),
                      backgroundColor: isDestabilized
                        ? ['rgba(239, 68, 68, 0.2)', 'rgba(239, 68, 68, 0.4)', 'rgba(239, 68, 68, 0.2)']
                        : wasJustStabilized
                          ? ['rgba(34, 197, 94, 0)', 'rgba(34, 197, 94, 0.3)', 'rgba(34, 197, 94, 0)']
                          : 'transparent',
                    }}
                    transition={{
                      ...destabilizationProps.transition,
                      backgroundColor: { duration: wasJustStabilized ? 0.8 : 0.6 }
                    }}
                    whileHover={isClickable ? { filter: 'brightness(1.2)' } : {}}
                    whileTap={isClickable ? { scale: 0.95 } : {}}
                  >
                    <span className="text-[9px] uppercase text-fuchsia-200 truncate">{line.key}</span>
                    <span className="text-[9px] text-cyan-200 text-right truncate">{displayValue}</span>
                  </motion.div>
                );
              })}
            </div>
          </div>

          <motion.div
            className="text-[9px] uppercase tracking-[0.3em] text-amber-300"
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            Status: {theaterState.chaosLevel.toFixed(0)}% Coherent
          </motion.div>
        </div>
      </ArcAgiCard>
    </motion.div>
  );
};
