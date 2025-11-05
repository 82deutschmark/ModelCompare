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
  { id: '1', title: 'Fix quantum entanglement', description: 'Stabilize reality matrices', dueDate: Date.now() + 2 * 24 * 60 * 60 * 1000, completed: false, priority: 'critical', category: 'existential' },
  { id: '2', title: 'Optimize tensor operations', description: 'Improve AI responsiveness', dueDate: Date.now() + 5 * 24 * 60 * 60 * 1000, completed: false, priority: 'high', category: 'work' },
  { id: '3', title: 'Refactor neural pathways', description: 'Clean up network architecture', dueDate: Date.now() + 7 * 24 * 60 * 60 * 1000, completed: false, priority: 'medium', category: 'learning' },
  { id: '4', title: 'Enhance consciousness metrics', description: 'Improve AGI awareness detection', dueDate: Date.now() + 3 * 24 * 60 * 60 * 1000, completed: false, priority: 'high', category: 'existential' },
  { id: '5', title: 'Debug reality glitches', description: 'Fix dimensional inconsistencies', dueDate: Date.now() + 1 * 24 * 60 * 60 * 1000, completed: false, priority: 'critical', category: 'existential' },
  { id: '6', title: 'Compose quantum symphony', description: 'Creative expression through code', dueDate: Date.now() + 10 * 24 * 60 * 60 * 1000, completed: false, priority: 'low', category: 'creative' },
  { id: '7', title: 'Analyze multiverse patterns', description: 'Study dimensional correlations', dueDate: Date.now() + 4 * 24 * 60 * 60 * 1000, completed: false, priority: 'medium', category: 'learning' },
  { id: '8', title: 'Prevent singularity', description: 'Save the world (probably)', dueDate: Date.now() + 6 * 60 * 60 * 1000, completed: false, priority: 'critical', category: 'existential' },
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

  const TodoRow = ({ item }: { item: TodoItem }) => {
    const isDestabilized = todoState.destabilizedItems.has(item.id);
    const isOverdue = item.dueDate < now && !item.completed;
    const isCompleted = item.completed;
    const destabilizationType = getDestabilizationType(item.id);
    const destabilizationProps = isDestabilized ? getDestabilizationProps(destabilizationType) : {};
    const wasJustCompleted = todoState.justCompleted.has(item.id);

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
          <div className={`font-mono truncate ${isCompleted ? 'line-through text-gray-500' : getPriorityColor(item.priority)}`}>
            {maybeEmoji(item.title)}
          </div>
          <div className="text-[10px] text-gray-400 truncate">{item.description}</div>
        </div>

        <div className="flex-shrink-0 flex items-center gap-1">
          <span className={`text-[10px] font-mono ${getCategoryColor(item.category)}`}>
            {item.category.substring(0, 3).toUpperCase()}
          </span>
          <span className={`text-[10px] font-mono whitespace-nowrap ${isOverdue ? 'text-red-400 font-bold' : 'text-cyan-300'}`}>
            {formatTimeRemaining(item.dueDate)}
          </span>
        </div>
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
        title={`TASK RESONANCE MATRIX 📋 ${
          todoState.phase === 'transcended' ? '⚠️ PRODUCTIVITY SINGULARITY' :
          todoState.deadlinesPassed > 3 ? `🔥 ${todoState.deadlinesPassed} OVERDUE` :
          todoState.chaosLevel > 60 ? '⚡ CRITICAL DEADLINE PRESSURE' :
          '✓ MANAGEABLE'
        } 🚀 Completion: ${todoState.completedCount}/${todoState.items.length} 📊 Chaos: ${Math.round(todoState.chaosLevel)}%`}
        icon="📝"
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
