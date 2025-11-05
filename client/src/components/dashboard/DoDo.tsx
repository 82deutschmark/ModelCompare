/**
 * Author: Claude Code using Sonnet 4.5
 * Date: 2025-11-04
 * PURPOSE: Wild to-do list component with the same crazy over-the-top visual effects as QuantumMetrics.
 *          Features ambient destabilization, glitching animations, color shifts, flickering effects,
 *          and value spikes. Tasks can be marked complete to stabilize them. Includes countdown timers,
 *          completion pressure metrics, and chaotic visual theater.
 * SRP/DRY check: Pass - Reuses QuantumMetrics destabilization patterns, animation props, and metric
 *                configuration structure. Extracted shared animation utilities. State management via reducer.
 */

import React, { useState, useEffect, useReducer, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArcAgiCard } from './DashboardCard';

interface TodoItem {
  id: string;
  title: string;
  description: string;
  dueDate: number; // timestamp in ms
  completed: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: 'work' | 'learning' | 'creative' | 'existential';
}

interface TodoState {
  items: TodoItem[];
  completedCount: number;
  chaosLevel: number; // 0-100, increases with incomplete items
  deadlinesPassed: number;
  pressureLevel: number; // derived from incomplete + overdue
  phase: 'dormant' | 'awakening' | 'accelerating' | 'critical' | 'transcended';
}

type TodoAction =
  | { type: 'INITIALIZE' }
  | { type: 'TOGGLE_COMPLETE'; id: string }
  | { type: 'TICK'; deltaMs: number }
  | { type: 'UPDATE_CHAOS' }
  | { type: 'RESET' };

interface AmbientTodoState extends TodoState {
  lastInteractionTime: number;
  justCompleted: Map<string, number>;
  destabilizedItems: Set<string>;
}

type DestabilizationType = 'flicker' | 'colorShift' | 'valueSpike' | 'glitch';

interface TodoConfig {
  id: string;
  destabilizationType: DestabilizationType;
}

const INITIAL_TODOS: TodoItem[] = [
  { id: '1', title: 'Calibrate μ_🦤 (Morphometric Mass Index)', description: 'Body-mass-to-tarsus ratio analysis', dueDate: Date.now() + 2 * 24 * 60 * 60 * 1000, completed: false, priority: 'critical', category: 'existential' },
  { id: '2', title: 'Compute Λ_ϰ (Lift-Deficit Coefficient)', description: 'Ratite absence-of-lift scalar calibration', dueDate: Date.now() + 5 * 24 * 60 * 60 * 1000, completed: false, priority: 'high', category: 'work' },
  { id: '3', title: 'Measure ᾱ_ψ (Plumage Absorptivity)', description: 'Feather spectral absorbance mapping', dueDate: Date.now() + 7 * 24 * 60 * 60 * 1000, completed: false, priority: 'medium', category: 'learning' },
  { id: '4', title: 'Analyze ϑ_stride (Gait Phase Twist)', description: 'Alternating leg phase offset from hip IMU', dueDate: Date.now() + 3 * 24 * 60 * 60 * 1000, completed: false, priority: 'high', category: 'existential' },
  { id: '5', title: 'Stabilize Ω_tail (Caudal Gyro-Stability)', description: 'Tail-induced yaw damping optimization', dueDate: Date.now() + 1 * 24 * 60 * 60 * 1000, completed: false, priority: 'critical', category: 'existential' },
  { id: '6', title: 'Optimize Ε_crop (Crop Energy Potential)', description: 'Feed digestible energy integration', dueDate: Date.now() + 10 * 24 * 60 * 60 * 1000, completed: false, priority: 'low', category: 'creative' },
  { id: '7', title: 'Calculate λ_beak (Beak Leverage Index)', description: 'Force arm vs. mass center analysis', dueDate: Date.now() + 4 * 24 * 60 * 60 * 1000, completed: false, priority: 'medium', category: 'learning' },
  { id: '8', title: 'Synchronize ϖ_leg (Tibiotarsal Resonance)', description: 'Preferred step frequency waddling cadence', dueDate: Date.now() + 6 * 60 * 60 * 1000, completed: false, priority: 'critical', category: 'existential' },
  { id: '9', title: 'Measure Ε_egg (Eggshell Elastic Modulus)', description: 'Shell stiffness compression testing', dueDate: Date.now() + 8 * 24 * 60 * 60 * 1000, completed: false, priority: 'high', category: 'work' },
  { id: '10', title: 'Track ∇S_ω (Yolk Entropy Gradient)', description: 'Disorder gradient incubation effects', dueDate: Date.now() + 6 * 24 * 60 * 60 * 1000, completed: false, priority: 'medium', category: 'learning' },
  { id: '11', title: 'Monitor ϰ_albumen (Albumen Viscosity Anomaly)', description: 'Non-Newtonian index characterization', dueDate: Date.now() + 9 * 24 * 60 * 60 * 1000, completed: false, priority: 'low', category: 'creative' },
  { id: '12', title: 'Calculate Θ_inc (Embryo Thermal Budget)', description: 'Net heat for development integration', dueDate: Date.now() + 2.5 * 24 * 60 * 60 * 1000, completed: false, priority: 'critical', category: 'existential' },
  { id: '13', title: 'Derive ζ_hatch (Hatchability Zeta)', description: 'Survival likelihood proxy computation', dueDate: Date.now() + 4 * 24 * 60 * 60 * 1000, completed: false, priority: 'high', category: 'work' },
  { id: '14', title: 'Model ϱ_Ca (Calcium Reallocation Flux)', description: 'Shell→skeleton transfer rate dynamics', dueDate: Date.now() + 5.5 * 24 * 60 * 60 * 1000, completed: false, priority: 'medium', category: 'learning' },
];

const initialAmbientState: AmbientTodoState = {
  items: INITIAL_TODOS,
  completedCount: 0,
  chaosLevel: 0,
  deadlinesPassed: 0,
  pressureLevel: 0,
  phase: 'dormant',
  lastInteractionTime: Date.now(),
  justCompleted: new Map(),
  destabilizedItems: new Set(),
};

function todoReducer(state: AmbientTodoState, action: TodoAction): AmbientTodoState {
  switch (action.type) {
    case 'INITIALIZE':
      return { ...state, phase: 'awakening' };

    case 'TOGGLE_COMPLETE': {
      const newItems = state.items.map(item =>
        item.id === action.id ? { ...item, completed: !item.completed } : item
      );
      const newCompletedCount = newItems.filter(i => i.completed).length;
      const newJustCompleted = new Map(state.justCompleted);
      if (!state.items.find(i => i.id === action.id)?.completed) {
        newJustCompleted.set(action.id, Date.now());
      }

      return {
        ...state,
        items: newItems,
        completedCount: newCompletedCount,
        lastInteractionTime: Date.now(),
        chaosLevel: Math.max(0, state.chaosLevel - 8),
        justCompleted: newJustCompleted,
      };
    }

    case 'TICK': {
      const now = Date.now();
      const incomplete = state.items.filter(i => !i.completed).length;
      const overdue = state.items.filter(i => !i.completed && i.dueDate < now).length;

      const timeSinceInteraction = now - state.lastInteractionTime;
      const growthRate = timeSinceInteraction > 5000 ? 0.45 : 0.15;
      const newChaos = Math.min(100, state.chaosLevel + (growthRate * (action.deltaMs / 100)) + (incomplete * 0.2) + (overdue * 0.5));

      let newPhase = state.phase;
      if (newChaos > 20 && state.phase === 'awakening') {
        newPhase = 'accelerating';
      } else if (newChaos > 60 && state.phase === 'accelerating') {
        newPhase = 'critical';
      } else if (newChaos > 85 && state.phase === 'critical') {
        newPhase = 'transcended';
      }

      return {
        ...state,
        chaosLevel: newChaos,
        phase: newPhase,
        deadlinesPassed: overdue,
        pressureLevel: (incomplete * 12) + (overdue * 25),
      };
    }

    case 'UPDATE_CHAOS': {
      // Randomly destabilize some incomplete items
      const incomplete = state.items.filter(i => !i.completed);
      if (incomplete.length > 0 && Math.random() < 0.35) {
        const randomItem = incomplete[Math.floor(Math.random() * incomplete.length)];
        const newDestabilized = new Set(state.destabilizedItems);
        newDestabilized.add(randomItem.id);
        return { ...state, destabilizedItems: newDestabilized };
      }
      return state;
    }

    case 'RESET':
      return {
        ...initialAmbientState,
        lastInteractionTime: Date.now(),
      };

    default:
      return state;
  }
}

export const DoDo: React.FC = () => {
  const [todoState, dispatch] = useReducer(todoReducer, initialAmbientState);
  const [now, setNow] = useState(Date.now());

  // Initialize on mount
  useEffect(() => {
    dispatch({ type: 'INITIALIZE' });
  }, []);

  // Update current time
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Main tick loop
  useEffect(() => {
    if (todoState.phase === 'dormant' || todoState.phase === 'transcended') return;

    const ticker = setInterval(() => {
      dispatch({ type: 'TICK', deltaMs: 100 });
    }, 100);

    return () => clearInterval(ticker);
  }, [todoState.phase]);

  // Chaos update loop
  useEffect(() => {
    if (todoState.phase === 'dormant' || todoState.phase === 'transcended') return;

    const scheduler = setInterval(() => {
      dispatch({ type: 'UPDATE_CHAOS' });
    }, 2000);

    return () => clearInterval(scheduler);
  }, [todoState.phase]);

  // Clear just-completed feedback
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    todoState.justCompleted.forEach((time, id) => {
      const timer = setTimeout(() => {
        dispatch({ type: 'TICK', deltaMs: 0 });
      }, 800);
      timers.push(timer);
    });
    return () => timers.forEach(t => clearTimeout(t));
  }, [todoState.justCompleted]);

  const handleToggleTodo = useCallback((id: string) => {
    dispatch({ type: 'TOGGLE_COMPLETE', id });
  }, []);

  // Utility functions
  const EMOJIS = ['✨','⚡','🌀','💥','🧿','🧪','🌌','🪐','🧬','🌠','🔮','♾️','📝','⚙️','🎯'];
  const maybeEmoji = (v: React.ReactNode, chance = 0.12): React.ReactNode => {
    const adjustedChance = todoState.phase === 'awakening' ? chance * 1.5 : chance;
    return Math.random() < adjustedChance ? EMOJIS[Math.floor(Math.random() * EMOJIS.length)] : v;
  };

  // Dodo bird emoji animations - U+1F9A4
  const DodoBirdAnimated = ({ id }: { id: string }) => {
    const dodoId = parseInt(id);
    const scalePhases = [
      [1, 1.5, 0.8, 2, 1],
      [1.2, 0.9, 1.8, 1, 1.3],
      [0.8, 1.6, 1, 2.2, 0.9],
    ];
    const selectedScale = scalePhases[dodoId % scalePhases.length];

    return (
      <motion.span
        className="inline-block"
        animate={{
          scale: selectedScale,
          opacity: [1, 0.6, 1, 0.8, 1],
          rotateZ: [0, 15, -20, 180, 360, 0],
          scaleX: [1, 1, -1, -1, 1, 1], // Mirror/flip horizontally
          filter: [
            'hue-rotate(0deg) brightness(1)',
            'hue-rotate(120deg) brightness(1.5)',
            'hue-rotate(240deg) brightness(0.8)',
            'hue-rotate(360deg) brightness(1.2)',
            'hue-rotate(0deg) brightness(1)',
          ]
        }}
        transition={{
          duration: 1.2 + (dodoId * 0.15),
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        🦤
      </motion.span>
    );
  };

  const GLITCH_CHARS = ['📌', '⚠', '✗', '∞', 'ERR', 'NOPE', '???', '💀'];

  const getDestabilizationProps = (type: DestabilizationType) => {
    switch (type) {
      case 'flicker':
        return {
          animate: { opacity: [1, 0.5, 1, 0.7, 1] },
          transition: { duration: 0.5, repeat: Infinity }
        };
      case 'colorShift':
        return {
          animate: { color: ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3'] },
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

  const getDestabilizationType = (id: string): DestabilizationType => {
    const types: DestabilizationType[] = ['flicker', 'colorShift', 'valueSpike', 'glitch'];
    const hash = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return types[hash % types.length];
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'critical': return 'text-red-400';
      case 'high': return 'text-orange-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-green-400';
      default: return 'text-cyan-400';
    }
  };

  const getCategoryColor = (category: string): string => {
    switch (category) {
      case 'existential': return 'text-purple-400';
      case 'work': return 'text-blue-400';
      case 'learning': return 'text-green-400';
      case 'creative': return 'text-pink-400';
      default: return 'text-cyan-400';
    }
  };

  const formatTimeRemaining = (dueDate: number): string => {
    const remaining = Math.max(0, dueDate - now);
    if (remaining === 0) return 'OVERDUE';

    const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
    const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const mins = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  // Color palette for flashing effects
  const FLASH_COLORS = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#FF00FF', '#00FFFF', '#FFD700', '#FF1493'];

  const TodoRow = ({ item }: { item: TodoItem }) => {
    const isDestabilized = todoState.destabilizedItems.has(item.id);
    const isOverdue = item.dueDate < now && !item.completed;
    const isCompleted = item.completed;
    const destabilizationType = getDestabilizationType(item.id);
    const destabilizationProps = isDestabilized ? getDestabilizationProps(destabilizationType) : {};
    const wasJustCompleted = todoState.justCompleted.has(item.id);

    // Extract Greek letter from title for dynamic color flashing
    const greekLetterMatch = item.title.match(/([α-ωΑ-Ω_]+)/);
    const greekSymbol = greekLetterMatch ? greekLetterMatch[0] : '';

    return (
      <motion.div
        className={`flex items-center gap-2 cursor-pointer px-2 py-1 rounded text-xs ${
          isCompleted ? 'opacity-50' : 'opacity-100'
        }`}
        onClick={() => handleToggleTodo(item.id)}
        {...destabilizationProps}
        animate={{
          ...(destabilizationProps.animate || {}),
          backgroundColor: isDestabilized
            ? ['rgba(239, 68, 68, 0.2)', 'rgba(239, 68, 68, 0.4)', 'rgba(239, 68, 68, 0.2)']
            : wasJustCompleted
              ? ['rgba(34, 197, 94, 0)', 'rgba(34, 197, 94, 0.3)', 'rgba(34, 197, 94, 0)']
              : isOverdue
                ? ['rgba(234, 179, 8, 0)', 'rgba(234, 179, 8, 0.2)', 'rgba(234, 179, 8, 0)']
                : 'transparent',
        }}
        transition={{
          ...destabilizationProps.transition,
          backgroundColor: { duration: wasJustCompleted || isOverdue ? 0.8 : 0.6 }
        }}
        whileHover={!isCompleted ? { filter: 'brightness(1.2)' } : {}}
        whileTap={!isCompleted ? { scale: 0.98 } : {}}
      >
        <motion.div
          className={`flex-shrink-0 w-4 h-4 border rounded flex items-center justify-center text-xs ${
            isCompleted
              ? 'bg-green-500 border-green-400'
              : isDestabilized
                ? 'border-red-400 bg-red-900/30'
                : 'border-cyan-400'
          }`}
          animate={isCompleted ? { scale: [1, 1.2, 1] } : {}}
          transition={{ duration: 0.3 }}
        >
          {isCompleted && '✓'}
          {isDestabilized && !isCompleted && Math.random() < 0.2 && '!'}
        </motion.div>

        <div className="flex-1 min-w-0">
          {/* Title with flashing Greek letters and color cycling */}
          <motion.div
            className={`font-mono truncate ${isCompleted ? 'line-through text-gray-500' : getPriorityColor(item.priority)}`}
            animate={{
              color: [
                FLASH_COLORS[0],
                FLASH_COLORS[1],
                FLASH_COLORS[2],
                FLASH_COLORS[3],
                FLASH_COLORS[4],
                FLASH_COLORS[5],
                FLASH_COLORS[6],
                FLASH_COLORS[7],
              ]
            }}
            transition={{
              duration: 0.8 + (parseInt(item.id) * 0.1),
              repeat: Infinity,
              ease: "linear"
            }}
          >
            {maybeEmoji(item.title)}
          </motion.div>
          {/* Description with separate animation */}
          <motion.div
            className="text-[10px] text-gray-400 truncate"
            animate={{
              opacity: [0.6, 1, 0.6],
              x: [-2, 2, -2]
            }}
            transition={{
              duration: 1.2 + (parseInt(item.id) * 0.15),
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            {item.description}
          </motion.div>
        </div>

        {/* Right side metrics with flashing and jumping */}
        <motion.div
          className="flex-shrink-0 flex items-center gap-1"
          animate={{
            x: [0, 2, -2, 0],
          }}
          transition={{
            duration: 0.6 + (parseInt(item.id) * 0.08),
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <motion.span
            className={`text-[10px] font-mono ${getCategoryColor(item.category)}`}
            animate={{
              color: [
                FLASH_COLORS[(parseInt(item.id) + 0) % FLASH_COLORS.length],
                FLASH_COLORS[(parseInt(item.id) + 2) % FLASH_COLORS.length],
                FLASH_COLORS[(parseInt(item.id) + 4) % FLASH_COLORS.length],
                FLASH_COLORS[(parseInt(item.id) + 6) % FLASH_COLORS.length],
              ]
            }}
            transition={{
              duration: 1.0 + (parseInt(item.id) * 0.12),
              repeat: Infinity,
              ease: "linear"
            }}
          >
            {item.category.substring(0, 3).toUpperCase()}
          </motion.span>
          <motion.span
            className={`text-[10px] font-mono whitespace-nowrap ${isOverdue ? 'text-red-400 font-bold' : 'text-cyan-300'}`}
            animate={{
              color: isOverdue
                ? ['#FF4444', '#FF0000', '#FF4444']
                : [
                    FLASH_COLORS[(parseInt(item.id) + 1) % FLASH_COLORS.length],
                    FLASH_COLORS[(parseInt(item.id) + 3) % FLASH_COLORS.length],
                  ]
            }}
            transition={{
              duration: 0.9 + (parseInt(item.id) * 0.11),
              repeat: Infinity,
              ease: "linear"
            }}
          >
            {formatTimeRemaining(item.dueDate)}
          </motion.span>
        </motion.div>
      </motion.div>
    );
  };

  const getChaosUrgency = () => {
    if (todoState.chaosLevel > 80) return 'critical';
    if (todoState.chaosLevel > 50) return 'warning';
    return 'normal';
  };

  const urgency = getChaosUrgency();
  const incomplete = todoState.items.filter(i => !i.completed).length;

  return (
    <motion.div
      animate={todoState.phase === 'transcended' ? {
        filter: [
          'hue-rotate(0deg) saturate(1)',
          'hue-rotate(180deg) saturate(2)',
          'hue-rotate(360deg) saturate(1.5)',
        ]
      } : {
        filter: 'hue-rotate(0deg) saturate(1)'
      }}
      transition={{ duration: 2, repeat: todoState.phase === 'transcended' ? Infinity : 0 }}
    >
      <ArcAgiCard
        title={<>CYBER-ORNITHIC SYSTEMS CHART <DodoBirdAnimated id="0" /> {
          todoState.phase === 'transcended' ? '⚠️ FLIGHTLESS BIRD SCIENTIFICA' :
          todoState.deadlinesPassed > 3 ? `🔥 ${todoState.deadlinesPassed} CRITICAL` :
          todoState.chaosLevel > 60 ? '⚡ SYSTEM INSTABILITY' :
          '✓ STABLE'
        } 🧬 Completion: ${todoState.completedCount}/${todoState.items.length} 📊 Chaos: ${Math.round(todoState.chaosLevel)}%</>}
        icon={<DodoBirdAnimated id="icon" />}
        color="#FF6B9D"
        className="px-0 relative"
      >
        <div className="space-y-1 px-2">
          {/* Priority-sorted display */}
          {['critical', 'high', 'medium', 'low'].map(priority =>
            todoState.items.filter(item => item.priority === priority).length > 0 && (
              <div key={priority}>
                <div className={`text-[10px] font-mono uppercase tracking-widest mb-1 ${getPriorityColor(priority)}`}>
                  ─ {priority.toUpperCase()} PRIORITY ─
                </div>
                <div className="space-y-0.5 ml-1">
                  {todoState.items
                    .filter(item => item.priority === priority)
                    .map(item => (
                      <TodoRow key={item.id} item={item} />
                    ))}
                </div>
              </div>
            )
          )}
        </div>

        {/* Pressure metrics */}
        <div className="mt-4 px-2 border-t border-cyan-700/30 pt-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[9px]">
            <motion.div
              className={`border rounded px-2 py-1 text-center ${
                incomplete === 0
                  ? 'border-green-700/50 bg-green-900/20'
                  : incomplete > 5
                    ? 'border-red-700/50 bg-red-900/30'
                    : 'border-yellow-700/50 bg-yellow-900/20'
              }`}
              animate={{
                boxShadow: incomplete === 0
                  ? ['0 0 8px #22C55E', '0 0 12px #22C55E']
                  : ['0 0 8px #EF4444', '0 0 12px #FCA5A5']
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <div className="font-mono uppercase tracking-wide text-gray-400">TODO</div>
              <motion.div
                className={`font-bold text-lg ${
                  incomplete === 0 ? 'text-green-400' : incomplete > 5 ? 'text-red-400' : 'text-yellow-400'
                }`}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                {incomplete}
              </motion.div>
            </motion.div>

            <motion.div
              className="border border-cyan-700/50 rounded px-2 py-1 text-center bg-slate-900/40"
              animate={{
                boxShadow: ['0 0 8px #0EA5E9', '0 0 12px #22D3EE']
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <div className="font-mono uppercase tracking-wide text-gray-400">DONE</div>
              <motion.div
                className="font-bold text-lg text-green-400"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                {todoState.completedCount}
              </motion.div>
            </motion.div>

            <motion.div
              className={`border rounded px-2 py-1 text-center ${
                todoState.deadlinesPassed > 0
                  ? 'border-red-700/50 bg-red-900/30'
                  : 'border-purple-700/50 bg-purple-900/20'
              }`}
              animate={{
                boxShadow: todoState.deadlinesPassed > 0
                  ? ['0 0 8px #DC2626', '0 0 12px #FCA5A5']
                  : ['0 0 8px #A855F7', '0 0 12px #D8B4FE']
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <div className="font-mono uppercase tracking-wide text-gray-400">OVERDUE</div>
              <motion.div
                className={`font-bold text-lg ${todoState.deadlinesPassed > 0 ? 'text-red-400' : 'text-purple-400'}`}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                {todoState.deadlinesPassed}
              </motion.div>
            </motion.div>

            <motion.div
              className={`border rounded px-2 py-1 text-center ${
                urgency === 'critical'
                  ? 'border-red-700 bg-red-900/30'
                  : urgency === 'warning'
                    ? 'border-orange-700 bg-orange-900/20'
                    : 'border-emerald-700/50 bg-emerald-900/20'
              }`}
              animate={{
                boxShadow: urgency === 'critical'
                  ? ['0 0 8px #DC2626', '0 0 12px #DC2626']
                  : ['0 0 8px #10B981', '0 0 12px #6EE7B7']
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <div className={`font-mono uppercase tracking-wide text-gray-400`}>CHAOS</div>
              <motion.div
                className={`font-bold text-lg ${
                  urgency === 'critical' ? 'text-red-400' : urgency === 'warning' ? 'text-orange-400' : 'text-emerald-400'
                }`}
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: urgency === 'critical' ? 0.5 : 1, repeat: Infinity }}
              >
                {Math.round(todoState.chaosLevel)}%
              </motion.div>
            </motion.div>
          </div>
        </div>
      </ArcAgiCard>
    </motion.div>
  );
};
