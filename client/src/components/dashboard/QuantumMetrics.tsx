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
    warpPotential: 73.4,

    // ML / AI metrics initial values
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
        warpPotential: Math.min(100, Math.max(0, prev.warpPotential + (Math.random() - 0.5) * 1.5)),

        // Animate ML / AI metrics
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
  }, []);

  // Compact countdowns to whimsical milestones
  const targets = {
    agi: new Date('2030-01-01T00:00:00Z').getTime(),
    pVsNp: new Date('2029-06-01T00:00:00Z').getTime(),
    riemann: new Date('2028-12-31T00:00:00Z').getTime(),
    navierStokes: new Date('2032-03-14T00:00:00Z').getTime(),
    birchSwinnerton: new Date('2031-10-10T00:00:00Z').getTime(),
  };
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

  const EMOJIS = ['✨','⚡','🌀','💥','🧿','🧪','🌌','🪐','🧬','🌠','🔮','♾️'];
  const maybeEmoji = (v: React.ReactNode, chance = 0.12): React.ReactNode => {
    return Math.random() < chance ? EMOJIS[Math.floor(Math.random() * EMOJIS.length)] : v;
  };

  const MetricRow = ({ label, value, color }: { label: string; value: React.ReactNode; color: string }) => (
    <div className="flex justify-between items-center gap-1">
      <span className="text-cyan-400 whitespace-nowrap truncate">{label}:</span>
      <span className={`text-right ${color} truncate`}>{value}</span>
    </div>
  );

  return (
    <DashboardCard
      title="QUANTUM HYPERCORE STATUS 🌌 9 Archetypal Modalities 💾 Version 0.0.28 🔗 Created by PrismAI and Prof. Dr. Max Power IV, PhD, DDS, Esq. 🧠"
      icon="⚛️"
      color="#8000FF"
      className="px-0"
    >
      {/* Modality ribbon */}
      <div className="px-2 pt-2">
        <div className="relative rounded border border-cyan-700/60 bg-gradient-to-r from-cyan-300 via-pink-300 to-emerald-300">
          <div className="rounded px-3 py-1.5 bg-black/70">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-mono tracking-wide text-cyan-300">
                ARCHITECHTURAL MODALITY
              </div>
              <div className="text-[10px] font-mono text-emerald-300">
                hyper‑multimodal • symbolic • neural • quantum
              </div>
            </div>
            <motion.div
              className="mt-1 h-[2px] w-full bg-gradient-to-r from-cyan-500 via-pink-500 to-emerald-500"
              initial={{ opacity: 0.4 }}
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2.2, repeat: Infinity }}
            />
            {/* Archetypal Modalities display */}
            <div className="mt-1.5 flex items-center justify-between">
              <motion.div 
                className="text-[11px] font-mono"
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <span className="text-green-300">Archetypal Modalities</span>: <span className="text-green-400 font-semibold">9.23</span>
              </motion.div>
              <div className="text-[10px] font-mono text-pink-300">
                Rival: <span className="text-pink-400 font-semibold">7</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 text-xs leading-tight">
        {/* Core quantum metrics */}
        <div className="space-y-0.5 px-2">
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
        {/* Physics + system metrics */}
        <div className="space-y-0.5 px-2">
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
        {/* ML / AI metrics */}
        <div className="space-y-0.5 px-2">
          <MetricRow label="Loss" value={maybeEmoji(metrics.lossFunction.toFixed(4))} color="text-red-300" />
          <MetricRow label="Grad Descent Rate" value={maybeEmoji(`${metrics.gradientDescentRate.toFixed(2)}`)} color="text-cyan-400" />
          <MetricRow label="Learning Rate" value={maybeEmoji(metrics.learningRate.toExponential(2))} color="text-green-300" />
          <MetricRow label="Attention Heads" value={maybeEmoji(metrics.attentionHeads.toString())} color="text-yellow-300" />
          <MetricRow label="Embedding Dim" value={maybeEmoji(metrics.embeddingDimension.toString())} color="text-purple-300" />
          <MetricRow label="Batch Norm" value={maybeEmoji(metrics.batchNormalization.toFixed(3))} color="text-blue-300" />
          <MetricRow label="Dropout" value={maybeEmoji(`${(metrics.dropoutRate*100).toFixed(0)}%`)} color="text-pink-300" />
          <MetricRow label="Activation Entropy" value={maybeEmoji(metrics.activationEntropy.toFixed(2))} color="text-emerald-300" />
          <MetricRow label="Weight Init" value={maybeEmoji(metrics.weightInitialization.toFixed(3))} color="text-orange-300" />
          <MetricRow label="Momentum" value={maybeEmoji(metrics.optimizerMomentum.toFixed(3))} color="text-cyan-300" />
          <MetricRow label="Backprop Depth" value={maybeEmoji(metrics.backpropagationDepth.toString())} color="text-yellow-400" />
          <MetricRow label="Convergence" value={maybeEmoji(`${metrics.convergenceScore.toFixed(1)}%`)} color="text-green-400" />
          <MetricRow label="Alignment Stability" value={maybeEmoji(`${metrics.alignmentStability.toFixed(1)}%`)} color="text-green-300" />
          <MetricRow label="Nano‑Align Factor" value={maybeEmoji(metrics.nanoAlignmentFactor.toFixed(3))} color="text-purple-300" />
          <MetricRow label="Q‑Gradient Boost" value={maybeEmoji(metrics.quantumGradientBoost.toFixed(2))} color="text-blue-400" />
          <MetricRow label="Terrier Resonance" value={maybeEmoji(metrics.terrierResonance.toFixed(2))} color="text-pink-400" />
          <MetricRow label="Regularization" value={maybeEmoji(metrics.Regularization.toExponential(2))} color="text-red-400" />
        </div>
        {/* EE / Data Science / Millennium Math */}
        <div className="space-y-0.5 px-2">
          <MetricRow label="SNR" value={maybeEmoji(`${(20 + (Math.random()*10)).toFixed(1)} dB`)} color="text-green-300" />
          <MetricRow label="Impedance" value={maybeEmoji(`${(50 + (Math.random()*10)).toFixed(1)} Ω`)} color="text-yellow-300" />
          <MetricRow label="Nyquist Rate" value={maybeEmoji(`${(44.1 + (Math.random())).toFixed(1)} kHz`)} color="text-blue-300" />
          <MetricRow label="FFT Bins" value={maybeEmoji(`${(1024 + Math.floor(Math.random()*256))}`)} color="text-purple-300" />
          <MetricRow label="Voltage" value={maybeEmoji(`${(3.3 + (Math.random()*0.1)).toFixed(2)} V`)} color="text-cyan-300" />
          <MetricRow label="Current" value={maybeEmoji(`${(0.42 + (Math.random()*0.02)).toFixed(3)} A`)} color="text-pink-300" />
          <MetricRow label="AUC" value={maybeEmoji(`${(0.95 + Math.random()*0.04).toFixed(3)}`)} color="text-green-400" />
          <MetricRow label="F1 Score" value={maybeEmoji(`${(0.92 + Math.random()*0.06).toFixed(3)}`)} color="text-emerald-300" />
          <MetricRow label="R²" value={maybeEmoji(`${(0.98 + Math.random()*0.01).toFixed(3)}`)} color="text-yellow-400" />
          <MetricRow label="p‑value" value={maybeEmoji(`${(0.001 + Math.random()*0.005).toExponential(2)}`)} color="text-red-300" />
          <MetricRow label="SHAP Drift" value={maybeEmoji(`${(Math.random()*5).toFixed(2)}%`)} color="text-orange-300" />
          <MetricRow label="P vs NP" value={<span className="text-red-400">open</span>} color="text-red-400" />
          <MetricRow label="Riemann ζ" value={<span className="text-purple-400">critical line</span>} color="text-purple-400" />
          <MetricRow label="Navier‑Stokes" value={<span className="text-blue-400">regularity?</span>} color="text-blue-400" />
        </div>
      </div>
      {/* Countdowns */}
      <div className="mt-3 px-2">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 text-[10px]">
          <div className="border border-cyan-700/50 rounded px-2 py-1">
            <div className="text-cyan-300">AGI ETA</div>
            <div className="text-green-400 font-semibold">{fmt(targets.agi - now)}</div>
          </div>
          <div className="border border-pink-700/50 rounded px-2 py-1">
            <div className="text-pink-300">P vs NP</div>
            <div className="text-yellow-400 font-semibold">{fmt(targets.pVsNp - now)}</div>
          </div>
          <div className="border border-purple-700/50 rounded px-2 py-1">
            <div className="text-purple-300">Riemann</div>
            <div className="text-purple-400 font-semibold">{fmt(targets.riemann - now)}</div>
          </div>
          <div className="border border-blue-700/50 rounded px-2 py-1">
            <div className="text-blue-300">Navier‑Stokes</div>
            <div className="text-blue-400 font-semibold">{fmt(targets.navierStokes - now)}</div>
          </div>
          <div className="border border-emerald-700/50 rounded px-2 py-1">
            <div className="text-emerald-300">Birch–Swinn.</div>
            <div className="text-emerald-400 font-semibold">{fmt(targets.birchSwinnerton - now)}</div>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
};
