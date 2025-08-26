import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArcAgiCard } from '../components/dashboard/DashboardCard';
import { PromptInterface } from '../components/dashboard/PromptInterface';
import { LiveCounter } from '../components/dashboard/LiveCounter';
import { QuantumMetrics } from '../components/dashboard/QuantumMetrics';
import { ChessBoard } from '../components/dashboard/ChessBoard';
import { ArcGrid } from '../components/dashboard/ArcGrid';
import { BioCard } from '../components/dashboard/BioCard';

// Neon color palette for cyberpunk theme
const neonColors = {
  cyan: '#00FFFF',
  pink: '#FF0080', 
  green: '#00FF41',
  purple: '#8000FF',
  yellow: '#FFFF00',
  orange: '#FF4000',
};

// Matrix rain characters - Japanese katakana
const matrixChars = 'ア イ ウ エ オ カ キ ク ケ コ サ シ ス セ ソ タ チ ツ テ ト ナ ニ ヌ ネ ハ ヒ フ ヘ ホ マ ミ ム メ モ ヤ ユ ヨ ラ リ ル レ ロ ワ ヲ ン'.split(' ');

// ARC-aligned space emoji palettes (each list is exactly length-10: indices 0..9)
// 0 is the explicit "empty/black" cell to avoid null handling.
export const SPACE_EMOJIS = {
  // Legacy default (backward compatibility with previous single-map implementation)
  legacy_default: ['⬛', '✅', '👽', '👤', '🪐', '🌍', '🛸', '☄️', '♥️', '⚠️'],  
  // Birds - For the hardest tasks (filled to length-10)
  birds: ['🐦', '🦃', '🦆', '🦉', '🐤', '🦅', '🦜', '🦢', '🐓', '🦩'],
} as const;

// Matrix Rain Effect Component
const MatrixRain = () => {
  const [columns, setColumns] = useState<Array<{chars: string[], speeds: number[]}>>([]);
  
  useEffect(() => {
    const cols = Math.floor(window.innerWidth / 20);
    const newColumns = Array(cols).fill(null).map(() => ({
      chars: Array(30).fill(null).map(() => matrixChars[Math.floor(Math.random() * matrixChars.length)]),
      speeds: Array(30).fill(null).map(() => Math.random() * 100 + 50)
    }));
    setColumns(newColumns);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none opacity-5 z-0">
      {columns.map((col, i) => (
        <div key={i} className="absolute top-0 text-green-400 font-mono text-sm" style={{ left: i * 20 }}>
          {col.chars.map((char, j) => (
            <motion.div
              key={j}
              animate={{ y: [0, window.innerHeight + 100] }}
              transition={{ duration: col.speeds[j] / 10, repeat: Infinity, ease: "linear" }}
              className="opacity-60"
            >
              {char}
            </motion.div>
          ))}
        </div>
      ))}
    </div>
  );
};


// Neural Network Visualization
const NeuralNetwork = () => {
  const [nodes, setNodes] = useState<Array<{id: string; x: number; y: number; pulsing: boolean}>>([]);
  
  useEffect(() => {
    const newNodes = Array(25).fill(null).map((_, i) => ({
      id: `node-${i}`,
      x: Math.random() * 380,
      y: Math.random() * 280,
      pulsing: Math.random() > 0.6
    }));
    setNodes(newNodes);
  }, []);

  return (
    <div className="bg-black border border-cyan-500 rounded-lg p-4">
      <h3 className="text-cyan-400 font-mono text-sm mb-3">🧠 NEURAL MESH TOPOLOGY</h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: animated neural mesh SVG */}
        <div className="relative w-full h-72 overflow-hidden">
          <svg className="w-full h-full">
          {/* Connection lines */}
          {nodes.map((node, i) => 
            nodes.slice(i + 1, i + 4).map((targetNode, j) => (
              <motion.line
                key={`${node.id}-${targetNode.id}`}
                x1={node.x}
                y1={node.y}
                x2={targetNode.x}
                y2={targetNode.y}
                stroke="#00FFFF"
                strokeWidth="1"
                opacity="0.6"
                animate={{ 
                  strokeWidth: [0.5, 3, 0.5], 
                  opacity: [0.2, 0.9, 0.2],
                  stroke: ['#00FFFF', '#FF0080', '#00FF41', '#00FFFF']
                }}
                transition={{ duration: 2 + Math.random(), repeat: Infinity, delay: Math.random() * 2 }}
              />
            ))
          )}
          
          {/* Neural nodes */}
          {nodes.map((node) => (
            <motion.circle
              key={node.id}
              cx={node.x}
              cy={node.y}
              r={node.pulsing ? 6 : 3}
              fill="#00FF41"
              animate={{
                r: node.pulsing ? [3, 10, 3] : [3, 5, 3],
                fill: ['#00FF41', '#00FFFF', '#FF0080', '#FFFF00', '#00FF41']
              }}
              transition={{ duration: 1.5 + Math.random(), repeat: Infinity }}
            />
          ))}
          </svg>
        </div>

        {/* Right: ARC grid + chess boards */}
        <div className="flex flex-col gap-4">
          <ArcGrid color="#00FFFF" title="ARC GRID" gridSize={10} className="w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ChessBoard color="#FF0080" title="Neural Chess" sizePx={260} />
            <ChessBoard color="#00FF41" title="Emoji Chess" sizePx={260} emojiMode />
          </div>
        </div>
      </div>
    </div>
  );
};

// Advanced Metrics Display
const AdvancedMetrics = () => {
  const [metrics, setMetrics] = useState({
    quantumFlux: 99.7834,
    tensorFields: 847329.234,
    eigenValues: 42.000001,
    hyperDimensions: 11,
    consciousnessLevel: 97.4,
    realityIntegrity: 99.99,
    neuralPathways: 2847392,
    quantumEntanglement: 99.7,
    waveCollapse: 0.00001,
    darkMatter: 23.8,
    stringTheory: 10.994,
    multiverse: 'STABLE'
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        quantumFlux: 99.7834 + (Math.random() - 0.5) * 0.01,
        tensorFields: prev.tensorFields + Math.random() * 10000,
        eigenValues: 42.000001 + (Math.random() - 0.5) * 0.000001,
        consciousnessLevel: 97.4 + (Math.random() - 0.5) * 0.1,
        realityIntegrity: 99.99 + (Math.random() - 0.5) * 0.001,
        neuralPathways: prev.neuralPathways + Math.floor(Math.random() * 1000),
        quantumEntanglement: 99.7 + (Math.random() - 0.5) * 0.05,
        waveCollapse: 0.00001 + Math.random() * 0.00001,
        darkMatter: 23.8 + (Math.random() - 0.5) * 0.1,
        stringTheory: 10.994 + (Math.random() - 0.5) * 0.001
      }));
    }, 50);
    return () => clearInterval(interval);
  }, []);
 
  return (
    <div className="bg-black border border-purple-500 rounded-lg p-6 font-mono">
      <h3 className="text-purple-400 text-lg mb-4 animate-pulse">⚛️ QUANTUM HYPERCORE STATUS</h3>
      <div className="grid grid-cols-2 gap-6 text-sm">
        <div className="space-y-1">
          <div className="flex justify-between items-center gap-2">
            <span className="text-cyan-400 whitespace-nowrap">Quantum Flux:</span>
            <motion.span 
              className="text-green-400 text-right"
              animate={{ textShadow: ['0 0 5px #00FF41', '0 0 15px #00FF41', '0 0 5px #00FF41'] }}
              transition={{ duration: 1, repeat: Infinity }}
            >{metrics.quantumFlux.toFixed(4)}%</motion.span>
          </div>
          <div className="flex justify-between items-center gap-2">
            <span className="text-cyan-400 whitespace-nowrap">Tensor Fields:</span>
            <span className="text-yellow-400 text-right">{metrics.tensorFields.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center gap-2">
            <span className="text-cyan-400 whitespace-nowrap">Eigenvalues:</span>
            <span className="text-purple-400 text-right">{metrics.eigenValues.toFixed(6)}</span>
          </div>
          <div className="flex justify-between items-center gap-2">
            <span className="text-cyan-400 whitespace-nowrap">Hyperdimensions:</span>
            <span className="text-orange-400 text-right">{metrics.hyperDimensions}.D</span>
          </div>
          <div className="flex justify-between items-center gap-2">
            <span className="text-cyan-400 whitespace-nowrap">Consciousness:</span>
            <motion.span 
              className="text-green-400 text-right"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >{metrics.consciousnessLevel.toFixed(1)}%</motion.span>
          </div>
          <div className="flex justify-between items-center gap-2">
            <span className="text-cyan-400 whitespace-nowrap">Reality Integrity:</span>
            <span className="text-red-400 text-right">{metrics.realityIntegrity.toFixed(2)}%</span>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between items-center gap-2">
            <span className="text-cyan-400 whitespace-nowrap">Neural Pathways:</span>
            <span className="text-pink-400 text-right">{metrics.neuralPathways.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center gap-2">
            <span className="text-cyan-400 whitespace-nowrap">Entanglement:</span>
            <span className="text-green-400 text-right">{metrics.quantumEntanglement.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between items-center gap-2">
            <span className="text-cyan-400 whitespace-nowrap">Wave Collapse:</span>
            <span className="text-blue-400 text-right">{metrics.waveCollapse.toFixed(5)}μs</span>
          </div>
          <div className="flex justify-between items-center gap-2">
            <span className="text-cyan-400 whitespace-nowrap">Dark Matter:</span>
            <span className="text-purple-400 text-right">{metrics.darkMatter.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between items-center gap-2">
            <span className="text-cyan-400 whitespace-nowrap">String Theory:</span>
            <span className="text-yellow-400 text-right">{metrics.stringTheory.toFixed(3)}</span>
          </div>
          <div className="flex justify-between items-center gap-2">
            <span className="text-cyan-400 whitespace-nowrap">Multiverse:</span>
            <motion.span 
              className="text-green-400 text-right"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              ◉ {metrics.multiverse}
            </motion.span>
          </div>
        </div>
      </div>
      {/* Extra verbose quantum telemetry with multilingual characters and math-like strings */}
      <div className="mt-4 p-3 rounded border border-purple-700 bg-zinc-950">
        <h4 className="text-purple-300 text-sm mb-2">Σ Quantum Telemetry Stream · 多言語 · Многоязычный · متعدد اللغات</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs leading-relaxed">
          <motion.div animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 2, repeat: Infinity }}>
            λ≈{metrics.quantumFlux.toFixed(6)} · ϕ(t)={'e^{iπ}'} + ∑ᵢ ψᵢ · ℏ={Math.PI.toFixed(3)} · Δx·Δp ≥ ℏ/2
          </motion.div>
          <motion.div animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 2.2, repeat: Infinity }}>
            連結度: {metrics.quantumEntanglement.toFixed(2)}% · 行列値 λᵢ≈{metrics.eigenValues.toFixed(3)} · π≈3.14159 · τ≈6.28318
          </motion.div>
          <motion.div animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 2.4, repeat: Infinity }}>
            матрица Ξ[{metrics.hyperDimensions}D]: det(A)≈{(metrics.eigenValues*1.0001).toFixed(4)} · Σχ²≈{(metrics.tensorFields%997).toFixed(2)}
          </motion.div>
          <motion.div animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 2.6, repeat: Infinity }}>
            موجة انهيار: {metrics.waveCollapse.toFixed(5)} μs · 𝔻={metrics.darkMatter.toFixed(2)}% · reality(t)≈{metrics.realityIntegrity.toFixed(2)}%
          </motion.div>
          <motion.div animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 2.8, repeat: Infinity }}>
            ᚠᚢᚦ ᛗᚨᛏᚺ σ⊗τ · 字形: Σ形態 · Συνείδηση={metrics.consciousnessLevel.toFixed(1)}% · 🧬 paths={metrics.neuralPathways.toLocaleString()}
          </motion.div>
          <motion.div animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 3.0, repeat: Infinity }}>
            String(Μ): {metrics.stringTheory.toFixed(3)} · Multiverse: {metrics.multiverse} · ∮ E·dl = − dΦᴮ/dt
          </motion.div>
        </div>
      </div>
    </div>
  );
};

// Floating Particles Effect
interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
}

const FloatingParticles: React.FC = () => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const newParticles: Particle[] = Array(50).fill(null).map((_, i) => ({
      id: i,
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      color: Object.values(neonColors)[Math.floor(Math.random() * Object.values(neonColors).length)],
      size: Math.random() * 4 + 2
    }));
    setParticles(newParticles);

    const interval = setInterval(() => {
      setParticles((prevParticles: Particle[]) => 
        prevParticles.map(p => ({
          ...p,
          x: (p.x + p.vx + window.innerWidth) % window.innerWidth,
          y: (p.y + p.vy + window.innerHeight) % window.innerHeight
        }))
      );
    }, 50);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      {particles.map(particle => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full opacity-30"
          style={{
            x: particle.x,
            y: particle.y,
            width: particle.size,
            height: particle.size,
            backgroundColor: particle.color,
            boxShadow: `0 0 10px ${particle.color}`
          }}
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.3, 0.7, 0.3]
          }}
          transition={{ duration: 2 + Math.random() * 2, repeat: Infinity }}
        />
      ))}
    </div>
  );
};


// Main ARC-AGI Component
export default function ArcAgiPage() {
  const [systemStatus] = useState({
    coreTemp: -273.15,
    quantumCores: '∞/∞',
    realityEngine: 'ACTIVE',
    timeFlow: 'SYNCHRONIZED',
    spaceTime: 'STABLE',
    probability: 99.99999
  });

  // Generate fake impressive data
  const generateData = () => Array(8).fill(null).map(() => Math.random() * 100);

  return (
    <div className="min-h-screen bg-black text-white font-mono relative overflow-hidden">
      {/* Background Effects */}
      <MatrixRain />
      <FloatingParticles />
      
      {/* Scanline Effect */}
      <div className="fixed inset-0 pointer-events-none z-10">
        <motion.div 
          className="absolute w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-30"
          animate={{ y: [0, window.innerHeight, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />
      </div>

      {/* Header */}
      <header className="relative z-20 bg-black bg-opacity-90 border-b border-cyan-400 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <motion.div 
              className="w-12 h-12 bg-gradient-to-r from-cyan-400 to-pink-500 rounded-lg flex items-center justify-center"
              animate={{ 
                boxShadow: [
                  '0 0 20px #00FFFF',
                  '0 0 30px #FF0080',
                  '0 0 20px #00FFFF'
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <span className="text-2xl">⚛️</span>
            </motion.div>
            <div>
              <motion.h1 
                className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-pink-500 to-yellow-400 bg-clip-text text-transparent"
                animate={{ 
                  backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                HYPERDIMENSIONAL COMPUTING AGI NEURAL INTERFACE
              </motion.h1>
              <p className="text-sm text-gray-400">
                Advanced Reality Manipulation System v∞.∞.∞ | Hyperdimensional Interface
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-6">
            <div className="text-right">
              <div className="text-sm text-gray-400">SYSTEM STATUS</div>
              <motion.div 
                className="text-green-400 font-bold"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                ◉ TRANSCENDENT
              </motion.div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400">REALITY LEVEL</div>
              <div className="text-red-400 font-bold animate-pulse">MAXIMUM</div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Dashboard Content */}
      <div className="relative z-20 p-6 space-y-6">
        {/* Top Row - Quantum Metrics */}
        <QuantumMetrics />
        {/* Three-column: left small components, center PromptInterface, right BioCard */}
        <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left sidebar: smaller components */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            <ArcGrid color="#00FFFF" title="ARC GRID (mini)" gridSize={10} className="w-full" />
            <ChessBoard color="#FF0080" title="Neural Chess (mini)" sizePx={220} />
          </div>
          {/* Center: main prompt interface */}
          <div className="lg:col-span-6">
            <PromptInterface />
          </div>
          {/* Right: Bio */}
          <div className="lg:col-span-3">
            <BioCard />
          </div>
        </div>

        {/* ARC-AGI Pattern Grid Wall (compact 1x4) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <ArcGrid color="#00FFFF" title="ARC-AGI" gridSize={10} patternId="#001" className="w-full" />
          <ArcGrid color="#FF0080" title="ARC-AGI" gridSize={10} patternId="#002" className="w-full" />
          <ArcGrid color="#00FF41" title="ARC-AGI" gridSize={10} patternId="#003" className="w-full" />
          <ArcGrid color="#8000FF" title="ARC-AGI" gridSize={10} patternId="#004" className="w-full" />
        </div>

        {/* Neural Network */}
        <NeuralNetwork />

        {/* Live Counters */}
        <div className="bg-black border border-yellow-500 rounded-lg p-6">
          <h3 className="text-yellow-400 text-lg mb-4 animate-pulse">🚀 LIVE COMPUTATION METRICS</h3>
          <div className="grid grid-cols-4 gap-6">
            <LiveCounter
              label="Neural Ops/sec"
              value={847329847}
              increment={() => Math.floor(Math.random() * 10000) + 1000}
              color="text-cyan-400"
            />
            <LiveCounter
              label="Quantum States"
              value={999999999}
              suffix=" qbits"
              increment={() => Math.floor(Math.random() * 100000) + 10000}
              color="text-green-400"
            />
            <LiveCounter
              label="Reality Patches"
              value={2847329}
              increment={() => Math.floor(Math.random() * 1000) + 100}
              color="text-pink-400"
            />
            <LiveCounter
              label="Consciousness Units"
              value={99999999}
              increment={() => Math.floor(Math.random() * 50000) + 5000}
              color="text-purple-400"
            />
          </div>
        </div>

        {/* Prompt Interface moved above, removing inline block to prevent duplication */}

        {/* System Status Footer */}
        <div className="bg-black border border-red-500 rounded-lg p-4">
          <div className="grid grid-cols-4 gap-4 text-sm font-mono">
            <div>
              <span className="text-red-400">⚠️ CORE TEMP:</span> 
              <span className="text-cyan-400 ml-2">-273.15°K</span>
            </div>
            <div>
              <span className="text-red-400">⚛️ Q-CORES:</span> 
              <span className="text-green-400 ml-2">∞/∞</span>
            </div>
            <div>
              <span className="text-red-400">🌌 REALITY:</span> 
              <motion.span 
                className="text-yellow-400 ml-2"
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >STABLE</motion.span>
            </div>
            <div>
              <span className="text-red-400">⏰ SPACETIME:</span> 
              <span className="text-purple-400 ml-2">LOCKED</span>
            </div>
          </div>
          <motion.div 
            className="mt-2 text-xs text-orange-400 animate-pulse"
            animate={{ color: ['#FF4000', '#FFFF00', '#FF4000'] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            ⚠️ WARNING: Reality buffer overflow detected. Consciousness leak in sector 7G.
          </motion.div>
        </div>
      </div>

      {/* Warning Messages */}
      <motion.div 
        className="fixed bottom-4 right-4 bg-red-900 border border-red-500 rounded p-3 max-w-sm"
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="text-red-400 text-xs font-mono">
          ⚠️ WARNING: Reality buffer overflow detected<br/>
          🔄 Auto-patching spacetime continuum...<br/>
          📡 Quantum entanglement at 847.2% capacity
        </div>
      </motion.div>
    </div>
  );
}
