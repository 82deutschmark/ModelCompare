import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DashboardCard } from './DashboardCard';

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
}

export const QuantumMetrics: React.FC = () => {
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
    warpPotential: 73.4
  });

  useEffect(() => {
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
        warpPotential: Math.min(100, Math.max(0, prev.warpPotential + (Math.random() - 0.5) * 1.5))
      }));
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const EMOJIS = ['✨','⚡','🌀','💥','🧿','🧪','🌌','🪐','🧬','🌠','🔮','♾️'];
  const maybeEmoji = (v: React.ReactNode, chance = 0.12): React.ReactNode => {
    return Math.random() < chance ? EMOJIS[Math.floor(Math.random() * EMOJIS.length)] : v;
  };

  const MetricRow = ({ label, value, color }: { label: string; value: React.ReactNode; color: string }) => (
    <div className="flex justify-between items-center gap-2">
      <span className="text-cyan-400 whitespace-nowrap">{label}:</span>
      <span className={`text-right ${color}`}>{value}</span>
    </div>
  );

  return (
    <DashboardCard
      title="QUANTUM HYPERCORE STATUS"
      icon="⚛️"
      color="#8000FF"
    >
      <div className="grid grid-cols-2 gap-6 text-sm">
        <div className="space-y-1">
          <MetricRow 
            label="Quantum Flux" 
            value={
              <motion.span 
                className="text-green-400"
                animate={{ textShadow: ['0 0 5px #00FF41', '0 0 15px #00FF41', '0 0 5px #00FF41'] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                {maybeEmoji(`${metrics.quantumFlux.toFixed(4)}%`, 0.06)}
              </motion.span>
            }
            color="text-green-400"
          />
          <MetricRow label="Tensor Fields" value={maybeEmoji(metrics.tensorFields.toLocaleString())} color="text-yellow-400" />
          <MetricRow label="Eigenvalues" value={maybeEmoji(metrics.eigenValues.toFixed(6))} color="text-purple-400" />
          <MetricRow label="Hyperdimensions" value={maybeEmoji(`${metrics.hyperDimensions}.D`)} color="text-orange-400" />
          <MetricRow 
            label="Consciousness" 
            value={
              <motion.span 
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {maybeEmoji(`${metrics.consciousnessLevel.toFixed(1)}%`)}
              </motion.span>
            }
            color="text-green-400"
          />
          <MetricRow label="Reality Integrity" value={maybeEmoji(`${metrics.realityIntegrity.toFixed(2)}%`)} color="text-red-400" />
          <MetricRow label="Coherence" value={maybeEmoji(`${metrics.coherence.toFixed(2)}%`)} color="text-cyan-300" />
          <MetricRow label="Decoherence" value={maybeEmoji(`${metrics.decoherenceRate.toFixed(4)}%`)} color="text-cyan-500" />
        </div>
        <div className="space-y-1">
          <MetricRow label="Neural Pathways" value={maybeEmoji(metrics.neuralPathways.toLocaleString())} color="text-pink-400" />
          <MetricRow label="Entanglement" value={maybeEmoji(`${metrics.quantumEntanglement.toFixed(1)}%`)} color="text-green-400" />
          <MetricRow label="Wave Collapse" value={maybeEmoji(`${metrics.waveCollapse.toFixed(5)}μs`)} color="text-blue-400" />
          <MetricRow label="Dark Matter" value={maybeEmoji(`${metrics.darkMatter.toFixed(1)}%`)} color="text-purple-400" />
          <MetricRow label="String Theory" value={maybeEmoji(metrics.stringTheory.toFixed(3))} color="text-yellow-400" />
          <MetricRow label="Planck Noise" value={maybeEmoji(`${metrics.planckNoise.toFixed(2)} dB`)} color="text-blue-300" />
          <MetricRow label="Heisenberg Var." value={maybeEmoji(metrics.heisenbergVariance.toFixed(3))} color="text-emerald-300" />
          <MetricRow label="Tachyon Drift" value={maybeEmoji(`${metrics.tachyonDrift.toFixed(3)}c`)} color="text-pink-300" />
          <MetricRow label="Anomaly Index" value={maybeEmoji(metrics.anomalyIndex.toFixed(2))} color="text-orange-300" />
          <MetricRow label="Warp Potential" value={maybeEmoji(`${metrics.warpPotential.toFixed(1)}%`)} color="text-yellow-300" />
          <MetricRow 
            label="Multiverse" 
            value={
              <motion.span 
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                ◉ {maybeEmoji(metrics.multiverse, 0.05)}
              </motion.span>
            }
            color="text-green-400"
          />
        </div>
      </div>
    </DashboardCard>
  );
};
