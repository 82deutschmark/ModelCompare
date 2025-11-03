/**
 * Author: Claude Code using Sonnet 4.5
 * Date: 2025-11-02
 * PURPOSE: Ambient theatrical experience that gradually destabilizes metrics while users view the Arc AGI dashboard.
 *          Metrics randomly destabilize (flashing, glitching), accelerating an AGI countdown. Users can discover
 *          they can click destabilized metrics to stabilize them. Countdown reaching zero triggers Singularity endgame.
 *          All interactions are subtle and discoverable - no explicit game UI.
 * SRP/DRY check: Pass - Metric configuration extracted to data structure, state management centralized in reducer,
 *                timer logic separated by concern, visual variants reusable.
 */
import React, { useState, useEffect, useReducer, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArcAgiCard } from './DashboardCard';

interface MetricsState {
  quantumFlux: number;
  tensorFields: number;
  eigenValues: number;
  hyperDimensions: number;
  consciousnessLevel: number;
  realityIntegrity: number;
  neuralPathways: number;
  quantumEntanglement: number;
  waveCollapse: number;
  darkMatter: number;
  stringTheory: number;
  multiverse: string;
  coherence: number;
  decoherenceRate: number;
  planckNoise: number;
  heisenbergVariance: number;
  tachyonDrift: number;
  anomalyIndex: number;
  warpPotential: number;

  // ML / AI metrics
  lossFunction: number;
  gradientDescentRate: number;
  learningRate: number;
  attentionHeads: number;
  embeddingDimension: number;
  batchNormalization: number;
  dropoutRate: number;
  activationEntropy: number;
  weightInitialization: number;
  optimizerMomentum: number;
  backpropagationDepth: number;
  convergenceScore: number;
  alignmentStability: number;
  nanoAlignmentFactor: number;
  quantumGradientBoost: number;
  terrierResonance: number;
  Regularization: number;
}

type DestabilizationType = 'flicker' | 'colorShift' | 'valueSpike' | 'glitch';

interface MetricConfig {
  key: keyof MetricsState;
  label: string;
  color: string;
  category: 'quantum' | 'physics' | 'ml' | 'engineering';
  destabilizationType: DestabilizationType;
  clickable: boolean;
}

// Metric configuration - single source of truth
const METRIC_CONFIGS: MetricConfig[] = [
  // Quantum metrics
  { key: 'quantumFlux', label: 'Quantum Flux', color: 'text-green-400', category: 'quantum', destabilizationType: 'flicker', clickable: true },
  { key: 'tensorFields', label: 'Tensor Fields', color: 'text-yellow-400', category: 'quantum', destabilizationType: 'valueSpike', clickable: true },
  { key: 'eigenValues', label: 'Eigenvalues', color: 'text-purple-400', category: 'quantum', destabilizationType: 'glitch', clickable: true },
  { key: 'hyperDimensions', label: 'Hyperdimensions', color: 'text-orange-400', category: 'quantum', destabilizationType: 'colorShift', clickable: false },
  { key: 'consciousnessLevel', label: 'Consciousness', color: 'text-green-400', category: 'quantum', destabilizationType: 'flicker', clickable: true },
  { key: 'realityIntegrity', label: 'Reality Integrity', color: 'text-red-400', category: 'quantum', destabilizationType: 'valueSpike', clickable: true },
  { key: 'coherence', label: 'Coherence', color: 'text-cyan-300', category: 'quantum', destabilizationType: 'flicker', clickable: true },
  { key: 'decoherenceRate', label: 'Decoherence', color: 'text-cyan-500', category: 'quantum', destabilizationType: 'valueSpike', clickable: true },

  // Physics metrics
  { key: 'neuralPathways', label: 'Neural Pathways', color: 'text-pink-400', category: 'physics', destabilizationType: 'valueSpike', clickable: true },
  { key: 'quantumEntanglement', label: 'Entanglement', color: 'text-green-400', category: 'physics', destabilizationType: 'flicker', clickable: true },
  { key: 'waveCollapse', label: 'Wave Collapse', color: 'text-blue-400', category: 'physics', destabilizationType: 'glitch', clickable: true },
  { key: 'darkMatter', label: 'Dark Matter', color: 'text-purple-400', category: 'physics', destabilizationType: 'colorShift', clickable: true },
  { key: 'stringTheory', label: 'String Theory', color: 'text-yellow-400', category: 'physics', destabilizationType: 'glitch', clickable: true },
  { key: 'planckNoise', label: 'Planck Noise', color: 'text-blue-300', category: 'physics', destabilizationType: 'valueSpike', clickable: true },
  { key: 'heisenbergVariance', label: 'Heisenberg Var.', color: 'text-emerald-300', category: 'physics', destabilizationType: 'flicker', clickable: true },
  { key: 'tachyonDrift', label: 'Tachyon Drift', color: 'text-pink-300', category: 'physics', destabilizationType: 'glitch', clickable: true },
  { key: 'anomalyIndex', label: 'Anomaly Index', color: 'text-orange-300', category: 'physics', destabilizationType: 'valueSpike', clickable: true },
  { key: 'warpPotential', label: 'Warp Potential', color: 'text-yellow-300', category: 'physics', destabilizationType: 'colorShift', clickable: true },
  { key: 'multiverse', label: 'Multiverse', color: 'text-green-400', category: 'physics', destabilizationType: 'glitch', clickable: false },

  // ML metrics
  { key: 'lossFunction', label: 'Loss', color: 'text-red-300', category: 'ml', destabilizationType: 'valueSpike', clickable: true },
  { key: 'gradientDescentRate', label: 'Grad Descent Rate', color: 'text-cyan-400', category: 'ml', destabilizationType: 'flicker', clickable: true },
  { key: 'learningRate', label: 'Learning Rate', color: 'text-green-300', category: 'ml', destabilizationType: 'glitch', clickable: true },
  { key: 'attentionHeads', label: 'Attention Heads', color: 'text-yellow-300', category: 'ml', destabilizationType: 'valueSpike', clickable: true },
  { key: 'embeddingDimension', label: 'Embedding Dim', color: 'text-purple-300', category: 'ml', destabilizationType: 'colorShift', clickable: true },
  { key: 'batchNormalization', label: 'Batch Norm', color: 'text-blue-300', category: 'ml', destabilizationType: 'flicker', clickable: true },
  { key: 'dropoutRate', label: 'Dropout', color: 'text-pink-300', category: 'ml', destabilizationType: 'valueSpike', clickable: true },
  { key: 'activationEntropy', label: 'Activation Entropy', color: 'text-emerald-300', category: 'ml', destabilizationType: 'glitch', clickable: true },
  { key: 'weightInitialization', label: 'Weight Init', color: 'text-orange-300', category: 'ml', destabilizationType: 'flicker', clickable: true },
  { key: 'optimizerMomentum', label: 'Momentum', color: 'text-cyan-300', category: 'ml', destabilizationType: 'colorShift', clickable: true },
  { key: 'backpropagationDepth', label: 'Backprop Depth', color: 'text-yellow-400', category: 'ml', destabilizationType: 'valueSpike', clickable: true },
  { key: 'convergenceScore', label: 'Convergence', color: 'text-green-400', category: 'ml', destabilizationType: 'flicker', clickable: true },
  { key: 'alignmentStability', label: 'Alignment Stability', color: 'text-green-300', category: 'ml', destabilizationType: 'valueSpike', clickable: true },
  { key: 'nanoAlignmentFactor', label: 'Nano‑Align Factor', color: 'text-purple-300', category: 'ml', destabilizationType: 'glitch', clickable: true },
  { key: 'quantumGradientBoost', label: 'Q‑Gradient Boost', color: 'text-blue-400', category: 'ml', destabilizationType: 'flicker', clickable: true },
  { key: 'terrierResonance', label: 'Terrier Resonance', color: 'text-pink-400', category: 'ml', destabilizationType: 'colorShift', clickable: true },
  { key: 'Regularization', label: 'Regularization', color: 'text-red-400', category: 'ml', destabilizationType: 'glitch', clickable: true },
];

// Ambient theater state (internal - not visible to user)
interface AmbientTheaterState {
  phase: 'dormant' | 'awakening' | 'destabilizing' | 'critical' | 'singularity';
  chaosLevel: number; // 0-100
  countdownMs: number; // AGI countdown in milliseconds
  destabilizedMetrics: Set<keyof MetricsState>;
  lastInteractionTime: number;
  stabilizationCount: number;
  justStabilized: Map<keyof MetricsState, number>; // Track recent stabilizations for feedback
}

type TheaterAction =
  | { type: 'AWAKEN' }
  | { type: 'TICK'; deltaMs: number }
  | { type: 'DESTABILIZE_METRIC'; metricKey: keyof MetricsState }
  | { type: 'STABILIZE_METRIC'; metricKey: keyof MetricsState }
  | { type: 'CLEAR_STABILIZATION_FEEDBACK'; metricKey: keyof MetricsState }
  | { type: 'RESET' };

const INITIAL_COUNTDOWN_MS = 10 * 365 * 24 * 60 * 60 * 1000; // 10 years

const initialTheaterState: AmbientTheaterState = {
  phase: 'dormant',
  chaosLevel: 0,
  countdownMs: INITIAL_COUNTDOWN_MS,
  destabilizedMetrics: new Set(),
  lastInteractionTime: Date.now(),
  stabilizationCount: 0,
  justStabilized: new Map(),
};

const BASE_DECAY_PER_TICK = 650000; // ms removed per 100ms tick before multipliers (~7.5 minutes per second)
const CHAOS_DIVISOR = 18; // smaller divisor -> higher chaos multiplier ceiling
const DESTABILIZATION_POWER = 1.3;
const DESTABILIZATION_COEFFICIENT = 2.2;

function calculateDecayMultipliers(chaosLevel: number, destabilizedCount: number) {
  const chaosMultiplier = 1 + (chaosLevel / CHAOS_DIVISOR);
  const destabilizationMultiplier = destabilizedCount === 0
    ? 1
    : 1 + (Math.pow(destabilizedCount, DESTABILIZATION_POWER) * DESTABILIZATION_COEFFICIENT);

  return {
    chaosMultiplier,
    destabilizationMultiplier,
    total: chaosMultiplier * destabilizationMultiplier,
  };
}

function theaterReducer(state: AmbientTheaterState, action: TheaterAction): AmbientTheaterState {
  switch (action.type) {
    case 'AWAKEN':
      return { ...state, phase: 'awakening' };

    case 'TICK': {
      const now = Date.now();

      // Calculate chaos growth
      const timeSinceInteraction = now - state.lastInteractionTime;
      const growthRate = timeSinceInteraction > 4000 ? 1.5 : 0.6; // Rapid escalation without stabilization
      const newChaos = Math.min(100, state.chaosLevel + (growthRate * (action.deltaMs / 100)));

      // Phase transitions based on chaos level
      let newPhase = state.phase;
      if (newChaos > 20 && state.phase === 'awakening') {
        newPhase = 'destabilizing';
      } else if (newChaos > 60 && state.phase === 'destabilizing') {
        newPhase = 'critical';
      }

      // Calculate countdown acceleration
      const { total: decayMultiplier } = calculateDecayMultipliers(newChaos, state.destabilizedMetrics.size);
      const newCountdown = state.countdownMs - (action.deltaMs * BASE_DECAY_PER_TICK * decayMultiplier);

      if (newCountdown <= 0) {
        return { ...state, phase: 'singularity', countdownMs: 0, chaosLevel: 100 };
      }

      return {
        ...state,
        chaosLevel: newChaos,
        phase: newPhase,
        countdownMs: newCountdown,
      };
    }

    case 'DESTABILIZE_METRIC': {
      const newDestabilized = new Set(state.destabilizedMetrics);
      newDestabilized.add(action.metricKey);
      return { ...state, destabilizedMetrics: newDestabilized };
    }

    case 'STABILIZE_METRIC': {
      const newDestabilized = new Set(state.destabilizedMetrics);
      newDestabilized.delete(action.metricKey);

      const newJustStabilized = new Map(state.justStabilized);
      newJustStabilized.set(action.metricKey, Date.now());

      // Small countdown bonus
      const bonusMs = 5000; // +5 seconds
      const newCountdown = Math.min(INITIAL_COUNTDOWN_MS, state.countdownMs + bonusMs);

      // Reduce chaos slightly
      const newChaos = Math.max(0, state.chaosLevel - 5);

      return {
        ...state,
        destabilizedMetrics: newDestabilized,
        lastInteractionTime: Date.now(),
        stabilizationCount: state.stabilizationCount + 1,
        justStabilized: newJustStabilized,
        countdownMs: newCountdown,
        chaosLevel: newChaos,
      };
    }

    case 'CLEAR_STABILIZATION_FEEDBACK': {
      const newJustStabilized = new Map(state.justStabilized);
      newJustStabilized.delete(action.metricKey);
      return { ...state, justStabilized: newJustStabilized };
    }

    case 'RESET':
      return {
        ...initialTheaterState,
        lastInteractionTime: Date.now(),
      };

    default:
      return state;
  }
}

export const QuantumMetrics: React.FC = () => {
  // Ambient theater state
  const [theaterState, dispatch] = useReducer(theaterReducer, initialTheaterState);

  // Existing metric animation state (preserved)
  const [metrics, setMetrics] = useState<MetricsState>({
    quantumFlux: 99.7834,
    tensorFields: 847329,
    eigenValues: 42.000001,
    hyperDimensions: 11,
    consciousnessLevel: 97.4,
    realityIntegrity: 99.99,
    neuralPathways: 9847329,
    quantumEntanglement: 99.7,
    waveCollapse: 0.00001,
    darkMatter: 23.8,
    stringTheory: 10.994,
    multiverse: 'STABLE',
    coherence: 98.2,
    decoherenceRate: 0.0032,
    planckNoise: 1.2,
    heisenbergVariance: 0.499,
    tachyonDrift: 0.004,
    anomalyIndex: 2.7,
    warpPotential: 73.4,

    lossFunction: 0.042,
    gradientDescentRate: 0.88,
    learningRate: 0.0003,
    attentionHeads: 32,
    embeddingDimension: 4096,
    batchNormalization: 0.99,
    dropoutRate: 0.12,
    activationEntropy: 3.14,
    weightInitialization: 0.707,
    optimizerMomentum: 0.9,
    backpropagationDepth: 128,
    convergenceScore: 98.6,
    alignmentStability: 97.1,
    nanoAlignmentFactor: 1.618,
    quantumGradientBoost: 2.73,
    terrierResonance: 7.77,
    Regularization: 0.001
  });

  // Immediately awaken ambient experience on mount
  useEffect(() => {
    dispatch({ type: 'AWAKEN' });
  }, []);

  // Auto-reset after Singularity - subtle restart after 3-5 seconds
  useEffect(() => {
    if (theaterState.phase !== 'singularity') return;

    const resetTimer = setTimeout(() => {
      dispatch({ type: 'RESET' });
    }, 3000 + Math.random() * 2000);

    return () => clearTimeout(resetTimer);
  }, [theaterState.phase]);

  // Main tick loop - drives countdown and chaos growth
  useEffect(() => {
    if (theaterState.phase === 'dormant' || theaterState.phase === 'singularity') return;

    const ticker = setInterval(() => {
      dispatch({ type: 'TICK', deltaMs: 100 });
    }, 100);

    return () => clearInterval(ticker);
  }, [theaterState.phase]);

  // Metric destabilization scheduler - randomly picks metrics to destabilize
  useEffect(() => {
    if (theaterState.phase === 'dormant' || theaterState.phase === 'singularity') return;

    const scheduleNext = () => {
      // Interval decreases with chaos level (faster destabilization over time)
      const interval = Math.max(1000, 5000 - (theaterState.chaosLevel * 30));

      setTimeout(() => {
        // Pick random clickable metric not currently destabilized
        const availableMetrics = METRIC_CONFIGS
          .filter(m => m.clickable && !theaterState.destabilizedMetrics.has(m.key))
          .map(m => m.key);

        if (availableMetrics.length > 0) {
          const randomKey = availableMetrics[Math.floor(Math.random() * availableMetrics.length)];
          dispatch({ type: 'DESTABILIZE_METRIC', metricKey: randomKey });
        }

        scheduleNext();
      }, interval);
    };

    scheduleNext();
  }, [theaterState.phase, theaterState.chaosLevel]);

  // Existing metric animation (preserved from original)
  useEffect(() => {
    if (theaterState.phase === 'singularity') return; // Freeze on singularity

    const interval = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        quantumFlux: 99.7834 + (Math.random() - 0.5) * 0.01,
        tensorFields: prev.tensorFields + Math.floor(Math.random() * 1000),
        eigenValues: 42.000001 + (Math.random() - 0.5) * 0.000001,
        consciousnessLevel: 97.4 + (Math.random() - 0.5) * 0.1,
        realityIntegrity: 99.99 + (Math.random() - 0.5) * 0.001,
        neuralPathways: prev.neuralPathways + Math.floor(Math.random() * 1000),
        quantumEntanglement: 99.7 + (Math.random() - 0.5) * 0.05,
        waveCollapse: 0.00001 + Math.random() * 0.00001,
        darkMatter: 23.8 + (Math.random() - 0.5) * 0.1,
        stringTheory: 10.994 + (Math.random() - 0.5) * 0.001,
        coherence: 98.2 + (Math.random() - 0.5) * 0.1,
        decoherenceRate: Math.max(0, prev.decoherenceRate + (Math.random() - 0.5) * 0.0005),
        planckNoise: Math.max(0.5, prev.planckNoise + (Math.random() - 0.5) * 0.1),
        heisenbergVariance: Math.max(0.3, prev.heisenbergVariance + (Math.random() - 0.5) * 0.01),
        tachyonDrift: Math.max(0, prev.tachyonDrift + (Math.random() - 0.5) * 0.001),
        anomalyIndex: Math.max(0, prev.anomalyIndex + (Math.random() - 0.5) * 0.2),
        warpPotential: Math.min(100, Math.max(0, prev.warpPotential + (Math.random() - 0.5) * 1.5)),

        lossFunction: Math.max(0, prev.lossFunction + (Math.random() - 0.5) * 0.002),
        gradientDescentRate: Math.min(1, Math.max(0, prev.gradientDescentRate + (Math.random() - 0.5) * 0.02)),
        learningRate: Math.max(0.00001, prev.learningRate * (1 + (Math.random() - 0.5) * 0.02)),
        attentionHeads: Math.max(1, Math.min(128, Math.round(prev.attentionHeads + (Math.random() - 0.5) * 2))),
        embeddingDimension: Math.max(256, Math.min(16384, Math.round(prev.embeddingDimension + (Math.random() - 0.5) * 64))),
        batchNormalization: Math.min(0.999, Math.max(0.8, prev.batchNormalization + (Math.random() - 0.5) * 0.01)),
        dropoutRate: Math.min(0.8, Math.max(0, prev.dropoutRate + (Math.random() - 0.5) * 0.02)),
        activationEntropy: Math.max(0, prev.activationEntropy + (Math.random() - 0.5) * 0.05),
        weightInitialization: Math.max(0, prev.weightInitialization + (Math.random() - 0.5) * 0.01),
        optimizerMomentum: Math.min(0.999, Math.max(0, prev.optimizerMomentum + (Math.random() - 0.5) * 0.02)),
        backpropagationDepth: Math.max(8, Math.min(1024, Math.round(prev.backpropagationDepth + (Math.random() - 0.5) * 8))),
        convergenceScore: Math.min(100, Math.max(0, prev.convergenceScore + (Math.random() - 0.5) * 0.5)),
        alignmentStability: Math.min(100, Math.max(0, prev.alignmentStability + (Math.random() - 0.5) * 0.5)),
        nanoAlignmentFactor: Math.max(0.1, prev.nanoAlignmentFactor * (1 + (Math.random() - 0.5) * 0.02)),
        quantumGradientBoost: Math.max(0, prev.quantumGradientBoost + (Math.random() - 0.5) * 0.05),
        terrierResonance: Math.max(0, prev.terrierResonance + (Math.random() - 0.5) * 0.2),
        Regularization: Math.max(0, prev.Regularization + (Math.random() - 0.5) * 0.0002)
      }));
    }, 50);
    return () => clearInterval(interval);
  }, [theaterState.phase]);

  // Click handler for metric stabilization
  const handleMetricClick = useCallback((metricKey: keyof MetricsState) => {
    if (theaterState.phase === 'singularity') return;
    if (!theaterState.destabilizedMetrics.has(metricKey)) return;

    dispatch({ type: 'STABILIZE_METRIC', metricKey });

    // Clear feedback after brief delay
    setTimeout(() => {
      dispatch({ type: 'CLEAR_STABILIZATION_FEEDBACK', metricKey });
    }, 800);
  }, [theaterState.phase, theaterState.destabilizedMetrics]);

  // Utility functions
  const EMOJIS = ['✨','⚡','🌀','💥','🧿','🧪','🌌','🪐','🧬','🌠','🔮','♾️'];
  const maybeEmoji = (v: React.ReactNode, chance = 0.12): React.ReactNode => {
    // Increase emoji frequency slightly during awakening
    const adjustedChance = theaterState.phase === 'awakening' ? chance * 1.5 : chance;
    return Math.random() < adjustedChance ? EMOJIS[Math.floor(Math.random() * EMOJIS.length)] : v;
  };

  const formatCountdown = (ms: number) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    return `${d}d ${h}h ${m}m ${ss}s`;
  };

  // Glitch characters for destabilization effects
  const GLITCH_CHARS = ['��', '⚠', '�', '∞', 'NaN', 'ERR', '???', '���'];

  // Get destabilization animation props based on type
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

  // Format metric value (with glitching for destabilized metrics)
  const formatMetricValue = (config: MetricConfig, rawValue: any): React.ReactNode => {
    const isDestabilized = theaterState.destabilizedMetrics.has(config.key);

    // Occasionally show glitch for destabilized metrics
    if (isDestabilized && config.destabilizationType === 'glitch' && Math.random() < 0.15) {
      return GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
    }

    // Format based on metric type
    let formatted: string;
    switch (config.key) {
      case 'quantumFlux':
      case 'consciousnessLevel':
      case 'realityIntegrity':
      case 'coherence':
      case 'decoherenceRate':
      case 'quantumEntanglement':
      case 'darkMatter':
      case 'warpPotential':
      case 'convergenceScore':
      case 'alignmentStability':
        formatted = `${rawValue.toFixed(2)}%`;
        break;
      case 'tensorFields':
      case 'neuralPathways':
      case 'attentionHeads':
      case 'embeddingDimension':
      case 'backpropagationDepth':
        formatted = rawValue.toLocaleString();
        break;
      case 'eigenValues':
        formatted = rawValue.toFixed(6);
        break;
      case 'hyperDimensions':
        formatted = `${rawValue}.D`;
        break;
      case 'waveCollapse':
      case 'tachyonDrift':
        formatted = `${rawValue.toFixed(5)}μs`;
        break;
      case 'planckNoise':
        formatted = `${rawValue.toFixed(2)} dB`;
        break;
      case 'stringTheory':
      case 'heisenbergVariance':
      case 'anomalyIndex':
      case 'weightInitialization':
      case 'nanoAlignmentFactor':
      case 'quantumGradientBoost':
      case 'terrierResonance':
        formatted = rawValue.toFixed(3);
        break;
      case 'lossFunction':
      case 'learningRate':
      case 'Regularization':
        formatted = rawValue.toExponential(2);
        break;
      case 'gradientDescentRate':
      case 'batchNormalization':
      case 'optimizerMomentum':
        formatted = rawValue.toFixed(3);
        break;
      case 'dropoutRate':
        formatted = `${(rawValue * 100).toFixed(0)}%`;
        break;
      case 'activationEntropy':
        formatted = rawValue.toFixed(2);
        break;
      case 'multiverse':
        return maybeEmoji(rawValue, 0.05);
      default:
        formatted = String(rawValue);
    }

    return maybeEmoji(formatted);
  };

  // Render special animated metrics (preserve original animations)
  const renderSpecialMetric = (config: MetricConfig, value: React.ReactNode): React.ReactNode => {
    switch (config.key) {
      case 'quantumFlux':
        return (
          <motion.span
            className={config.color}
            animate={{ textShadow: ['0 0 5px #00FF41', '0 0 15px #00FF41', '0 0 5px #00FF41'] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            {value}
          </motion.span>
        );
      case 'consciousnessLevel':
        return (
          <motion.span
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {value}
          </motion.span>
        );
      case 'multiverse':
        return (
          <motion.span
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            ◉ {value}
          </motion.span>
        );
      default:
        return value;
    }
  };

  // Metric row component with destabilization support
  const MetricRow = ({ config }: { config: MetricConfig }) => {
    const rawValue = metrics[config.key];
    const isDestabilized = theaterState.destabilizedMetrics.has(config.key);
    const isClickable = config.clickable && isDestabilized;
    const wasJustStabilized = theaterState.justStabilized.has(config.key);

    const formattedValue = formatMetricValue(config, rawValue);
    const displayValue = ['quantumFlux', 'consciousnessLevel', 'multiverse'].includes(config.key)
      ? renderSpecialMetric(config, formattedValue)
      : formattedValue;

    const destabilizationProps = isDestabilized
      ? getDestabilizationProps(config.destabilizationType)
      : {};

    return (
      <motion.div
        className={`flex justify-between items-center gap-1 ${isClickable ? 'cursor-pointer' : ''}`}
        onClick={isClickable ? () => handleMetricClick(config.key) : undefined}
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
        <span className="text-cyan-400 whitespace-nowrap truncate">{config.label}:</span>
        <span className={`text-right ${config.color} truncate`}>{displayValue}</span>
      </motion.div>
    );
  };

  // Calculate countdown urgency level
  const getCountdownUrgency = () => {
    if (theaterState.countdownMs < 30000) return 'critical';
    if (theaterState.countdownMs < 60000) return 'warning';
    return 'normal';
  };

  const urgency = getCountdownUrgency();
  const decayMultipliers = calculateDecayMultipliers(theaterState.chaosLevel, theaterState.destabilizedMetrics.size);
  const decayPressurePercent = Math.max(0, (decayMultipliers.total - 1) * 100);

  // Other countdown targets (preserved from original, these remain fixed)
  const targets = {
    pVsNp: new Date('2029-06-01T00:00:00Z').getTime(),
    riemann: new Date('2028-12-31T00:00:00Z').getTime(),
    navierStokes: new Date('2032-03-14T00:00:00Z').getTime(),
    birchSwinnerton: new Date('2031-10-10T00:00:00Z').getTime(),
  };

  const staticCountdownConfigs: Array<{
    key: keyof typeof targets;
    label: string;
    borderClass: string;
    labelClass: string;
    valueClass: string;
    glow: string[];
  }> = [
    {
      key: 'pVsNp',
      label: 'P vs NP',
      borderClass: 'border-pink-700/50 bg-pink-900/20',
      labelClass: 'text-pink-300',
      valueClass: 'text-yellow-300',
      glow: ['#F472B6', '#FDE68A'],
    },
    {
      key: 'riemann',
      label: 'Riemann',
      borderClass: 'border-purple-700/50 bg-purple-900/20',
      labelClass: 'text-purple-300',
      valueClass: 'text-purple-200',
      glow: ['#C084FC', '#A855F7'],
    },
    {
      key: 'navierStokes',
      label: 'Navier-Stokes',
      borderClass: 'border-blue-700/50 bg-blue-900/20',
      labelClass: 'text-blue-300',
      valueClass: 'text-blue-200',
      glow: ['#60A5FA', '#38BDF8'],
    },
    {
      key: 'birchSwinnerton',
      label: 'Birch–Swinn.',
      borderClass: 'border-emerald-700/50 bg-emerald-900/20',
      labelClass: 'text-emerald-300',
      valueClass: 'text-emerald-200',
      glow: ['#34D399', '#A7F3D0'],
    },
  ];
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const fmt = (ms: number) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    return `${d}d ${h}h ${m}m ${ss}s`;
  };

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
        title={`QUANTUM HYPERCORE STATUS 🌌 ${
          theaterState.phase === 'singularity' ? '⚠️ SINGULARITY ACHIEVED' :
          theaterState.destabilizedMetrics.size > 5 ? `⚡ ${theaterState.destabilizedMetrics.size} UNSTABLE` :
          theaterState.destabilizedMetrics.size > 0 ? `⚡ ${theaterState.destabilizedMetrics.size} UNSTABLE` :
          '✓ STABLE'
        } 💾 Version 0.0.29 🔗 Created by PrismAI and Prof. Dr. Max Power IV, PhD, DDS, Esq. 🧠`}
        icon="⚛️"
        color="#8000FF"
        className="px-0 relative"
      >
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 text-xs leading-tight">
        {/* Core quantum metrics */}
        <div className="space-y-0.5 px-2">
          {METRIC_CONFIGS.filter(m => m.category === 'quantum').map(config => (
            <MetricRow key={config.key} config={config} />
          ))}
          <div className="flex justify-between items-center gap-1">
            <span className="text-cyan-400 whitespace-nowrap truncate">Archetypal Modalities:</span>
            <span className="text-right text-green-400 truncate">
              <span className="text-green-300">9.23</span> <span className="text-cyan-400">vs</span> <span className="text-pink-400">7</span>
            </span>
          </div>
        </div>

        {/* Physics metrics */}
        <div className="space-y-0.5 px-2">
          {METRIC_CONFIGS.filter(m => m.category === 'physics').map(config => (
            <MetricRow key={config.key} config={config} />
          ))}
        </div>

        {/* ML metrics */}
        <div className="space-y-0.5 px-2">
          {METRIC_CONFIGS.filter(m => m.category === 'ml').map(config => (
            <MetricRow key={config.key} config={config} />
          ))}
        </div>

        {/* Engineering / Data Science / Millennium Math (computed on-the-fly) */}
        <div className="space-y-0.5 px-2">
          <div className="flex justify-between items-center gap-1">
            <span className="text-cyan-400 whitespace-nowrap truncate">SNR:</span>
            <span className="text-right text-green-300 truncate">{maybeEmoji(`${(20 + (Math.random()*10)).toFixed(1)} dB`)}</span>
          </div>
          <div className="flex justify-between items-center gap-1">
            <span className="text-cyan-400 whitespace-nowrap truncate">Impedance:</span>
            <span className="text-right text-yellow-300 truncate">{maybeEmoji(`${(50 + (Math.random()*10)).toFixed(1)} Ω`)}</span>
          </div>
          <div className="flex justify-between items-center gap-1">
            <span className="text-cyan-400 whitespace-nowrap truncate">Nyquist Rate:</span>
            <span className="text-right text-blue-300 truncate">{maybeEmoji(`${(44.1 + (Math.random())).toFixed(1)} kHz`)}</span>
          </div>
          <div className="flex justify-between items-center gap-1">
            <span className="text-cyan-400 whitespace-nowrap truncate">FFT Bins:</span>
            <span className="text-right text-purple-300 truncate">{maybeEmoji(`${(1024 + Math.floor(Math.random()*256))}`)}</span>
          </div>
          <div className="flex justify-between items-center gap-1">
            <span className="text-cyan-400 whitespace-nowrap truncate">Voltage:</span>
            <span className="text-right text-cyan-300 truncate">{maybeEmoji(`${(3.3 + (Math.random()*0.1)).toFixed(2)} V`)}</span>
          </div>
          <div className="flex justify-between items-center gap-1">
            <span className="text-cyan-400 whitespace-nowrap truncate">Current:</span>
            <span className="text-right text-pink-300 truncate">{maybeEmoji(`${(0.42 + (Math.random()*0.02)).toFixed(3)} A`)}</span>
          </div>
          <div className="flex justify-between items-center gap-1">
            <span className="text-cyan-400 whitespace-nowrap truncate">AUC:</span>
            <span className="text-right text-green-400 truncate">{maybeEmoji(`${(0.95 + Math.random()*0.04).toFixed(3)}`)}</span>
          </div>
          <div className="flex justify-between items-center gap-1">
            <span className="text-cyan-400 whitespace-nowrap truncate">F1 Score:</span>
            <span className="text-right text-emerald-300 truncate">{maybeEmoji(`${(0.92 + Math.random()*0.06).toFixed(3)}`)}</span>
          </div>
          <div className="flex justify-between items-center gap-1">
            <span className="text-cyan-400 whitespace-nowrap truncate">R²:</span>
            <span className="text-right text-yellow-400 truncate">{maybeEmoji(`${(0.98 + Math.random()*0.01).toFixed(3)}`)}</span>
          </div>
          <div className="flex justify-between items-center gap-1">
            <span className="text-cyan-400 whitespace-nowrap truncate">p‑value:</span>
            <span className="text-right text-red-300 truncate">{maybeEmoji(`${(0.001 + Math.random()*0.005).toExponential(2)}`)}</span>
          </div>
          <div className="flex justify-between items-center gap-1">
            <span className="text-cyan-400 whitespace-nowrap truncate">SHAP Drift:</span>
            <span className="text-right text-orange-300 truncate">{maybeEmoji(`${(Math.random()*5).toFixed(2)}%`)}</span>
          </div>
          <div className="flex justify-between items-center gap-1">
            <span className="text-cyan-400 whitespace-nowrap truncate">P vs NP:</span>
            <span className="text-right text-red-400 truncate">open</span>
          </div>
          <div className="flex justify-between items-center gap-1">
            <span className="text-cyan-400 whitespace-nowrap truncate">Riemann ζ:</span>
            <span className="text-right text-purple-400 truncate">critical line</span>
          </div>
          <div className="flex justify-between items-center gap-1">
            <span className="text-cyan-400 whitespace-nowrap truncate">Navier‑Stokes:</span>
            <span className="text-right text-blue-400 truncate">regularity?</span>
          </div>
        </div>
      </div>

      {/* Countdowns */}
      <div className="mt-3 px-2">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 text-[10px]">
          {/* Static countdowns (styled to match AGI ticker) */}
          {staticCountdownConfigs.map(config => (
            <motion.div
              key={config.key}
              className={`border rounded px-3 py-2 flex flex-col items-center text-center gap-1 ${config.borderClass}`}
              animate={{
                boxShadow: config.glow.map(color => `0 0 10px ${color}`),
              }}
              transition={{ duration: 2.2, repeat: Infinity }}
            >
              <div className={`font-mono text-[11px] tracking-[0.2em] uppercase ${config.labelClass}`}>
                {config.label}
              </div>
              <motion.div
                className={`font-bold font-mono text-lg md:text-2xl tracking-wide ${config.valueClass}`}
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ duration: 1.6, repeat: Infinity }}
              >
                {fmt(targets[config.key] - now)}
              </motion.div>
            </motion.div>
          ))}

          {/* Dynamic AGI countdown (ambient theater) - moved to central position */}
          <motion.div
            className={`border rounded px-3 py-2 flex flex-col items-center text-center gap-1 ${
              urgency === 'critical' ? 'border-red-700 bg-red-900/30' :
              urgency === 'warning' ? 'border-yellow-700 bg-yellow-900/20' :
              'border-cyan-700/50 bg-slate-900/40'
            }`}
            animate={urgency === 'critical' ? {
              boxShadow: ['0 0 10px #DC2626', '0 0 30px #DC2626', '0 0 10px #DC2626']
            } : {
              boxShadow: ['0 0 6px #0EA5E9', '0 0 12px #22D3EE', '0 0 6px #0EA5E9']
            }}
            transition={{ duration: 0.8, repeat: Infinity }}
          >
            <div
              className={`font-mono text-[11px] tracking-[0.2em] uppercase ${
                urgency === 'critical' ? 'text-red-300' :
                urgency === 'warning' ? 'text-yellow-300' :
                'text-cyan-300'
              }`}
            >
              AGI ETA
            </div>
            <motion.div
              className={`font-bold font-mono text-xl md:text-3xl tracking-wide ${
                urgency === 'critical' ? 'text-red-400' :
                urgency === 'warning' ? 'text-yellow-400' :
                'text-green-400'
              }`}
              animate={urgency === 'critical' ? {
                scale: [1, 1.2, 1]
              } : {
                scale: [1, 1.05, 1]
              }}
              transition={{ duration: urgency === 'critical' ? 0.5 : 1.2, repeat: Infinity }}
            >
              {formatCountdown(theaterState.countdownMs)}
            </motion.div>
            {decayPressurePercent > 0 && (
              <div className="text-red-400 text-[9px] font-mono tracking-wide uppercase">
                +{decayPressurePercent.toLocaleString(undefined, { maximumFractionDigits: 0 })}% decay
              </div>
            )}
          </motion.div>

        </div>
      </div>

    </ArcAgiCard>
    </motion.div>
  );
};
