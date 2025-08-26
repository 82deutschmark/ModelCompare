import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

// ARC-aligned space emoji palettes (each list is exactly length-10: indices 0..9)
// 0 is the explicit "empty/black" cell to avoid null handling.
export const SPACE_EMOJIS = {
  // Legacy default (backward compatibility with previous single-map implementation)
  legacy_default: ['⬛', '✅', '👽', '👤', '🪐', '🌍', '🛸', '☄️', '♥️', '⚠️'],  
  // Birds - For the hardest tasks (filled to length-10)
  birds: ['🐦', '🦃', '🦆', '🦉', '🐤', '🦅', '🦜', '🦢', '🐓', '🦩'],
} as const;

// Neon color palette for cyberpunk theme
const neonColors = {
  cyan: '#00FFFF',
  pink: '#FF0080', 
  green: '#00FF41',
  purple: '#8000FF',
  yellow: '#FFFF00',
  orange: '#FF4000',
  red: '#FF073A',
  blue: '#1E90FF',
};

// Matrix rain characters - Japanese katakana
const matrixChars = 'ア イ ウ エ オ カ キ ク ケ コ サ シ ス セ ソ タ チ ツ テ ト ナ ニ ヌ ネ ノ ハ ヒ フ ヘ ホ マ ミ ム メ モ ヤ ユ ヨ ラ リ ル レ ロ ワ ヲ ン'.split(' ');

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

// Chess Board Visualization Component
const ChessBoard = ({ color, title }: { color: keyof typeof neonColors; title: string }) => {
  const [board, setBoard] = useState<number[][]>([]);
  
  useEffect(() => {
    // Initialize 8x8 chess board with random states
    const newBoard = Array(8).fill(null).map(() => 
      Array(8).fill(null).map(() => Math.random())
    );
    setBoard(newBoard);
    
    // Rapidly update board state for frantic effect - getting faster over time
    let updateSpeed = 80;
    const interval = setInterval(() => {
      setBoard(prev => prev.map(row => 
        row.map(() => Math.random())
      ));
      // Increase speed over time for escalating effect
      updateSpeed = Math.max(15, updateSpeed - 1);
      clearInterval(interval);
      setTimeout(() => {
        const newInterval = setInterval(() => {
          setBoard(prev => prev.map(row => 
            row.map(() => Math.random())
          ));
        }, updateSpeed);
      }, updateSpeed);
    }, updateSpeed);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-black border rounded-lg p-4" style={{ borderColor: neonColors[color] }}>
      <h3 className="font-mono text-sm mb-3" style={{ color: neonColors[color] }}>
        ♛ {title}
      </h3>
      <div className="relative w-full h-48 flex items-center justify-center">
        <motion.div 
          className="grid grid-cols-8 gap-[1px] w-40 h-40"
          animate={{ 
            rotateY: [0, 360],
            scale: [1, 1.1, 0.95, 1.05, 1],
            rotateZ: [0, 5, -3, 2, 0]
          }}
          transition={{ 
            rotateY: { duration: 1.5, repeat: Infinity, ease: "linear" },
            scale: { duration: 0.3, repeat: Infinity },
            rotateZ: { duration: 0.5, repeat: Infinity }
          }}
        >
          {board.flat().map((intensity, i) => {
            const row = Math.floor(i / 8);
            const col = i % 8;
            const isBlack = (row + col) % 2 === 1;
            
            return (
              <motion.div
                key={i}
                className="aspect-square"
                style={{
                  backgroundColor: isBlack 
                    ? `rgba(${neonColors[color].replace('#', '')
                        .match(/.{2}/g)?.map(x => parseInt(x, 16)).join(',') || '0,0,0'}, ${intensity})`
                    : `rgba(255, 255, 255, ${intensity * 0.3})`,
                  boxShadow: intensity > 0.6 ? `0 0 12px ${neonColors[color]}` : 'none'
                }}
                animate={{
                  opacity: [0.2, 1, 0.4, 0.8, 0.2],
                  scale: intensity > 0.7 ? [1, 1.4, 0.8, 1.2, 1] : [1, 1.1, 0.9, 1.05, 1]
                }}
                transition={{
                  duration: 0.1 + Math.random() * 0.15,
                  repeat: Infinity
                }}
              />
            );
          })}
        </motion.div>
      </div>
    </div>
  );
};

// ARC Grid Visualization Component with Emoji Mapping
const ArcGrid = ({ color, title }: { color: keyof typeof neonColors; title: string }) => {
  const [grid, setGrid] = useState<number[][]>([]);
  const [emojiPalette, setEmojiPalette] = useState<string[]>(SPACE_EMOJIS.legacy_default);
  
  useEffect(() => {
    // Randomly switch between emoji palettes
    const palettes = Object.values(SPACE_EMOJIS);
    const randomPalette = palettes[Math.floor(Math.random() * palettes.length)];
    setEmojiPalette([...randomPalette]);
    
    // Initialize 3x3 ARC-style grid with emoji indices (0-9)
    const newGrid = Array(3).fill(null).map(() => 
      Array(3).fill(null).map(() => Math.floor(Math.random() * 10))
    );
    setGrid(newGrid);
    
    // Rapidly flip grid cells for chaotic effect - accelerating
    let flipSpeed = 60;
    const interval = setInterval(() => {
      setGrid(prev => prev.map(row => 
        row.map(() => Math.floor(Math.random() * 10))
      ));
      // Randomly change emoji palette sometimes
      if (Math.random() < 0.1) {
        const newPalette = palettes[Math.floor(Math.random() * palettes.length)];
        setEmojiPalette(newPalette);
      }
      // Accelerate over time
      flipSpeed = Math.max(8, flipSpeed - 2);
      clearInterval(interval);
      setTimeout(() => {
        const newInterval = setInterval(() => {
          setGrid(prev => prev.map(row => 
            row.map(() => Math.floor(Math.random() * 10))
          ));
        }, flipSpeed);
      }, flipSpeed);
    }, flipSpeed);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-black border rounded-lg p-4" style={{ borderColor: neonColors[color] }}>
      <h3 className="font-mono text-sm mb-3" style={{ color: neonColors[color] }}>
        🎯 {title}
      </h3>
      <div className="relative w-full h-48 flex items-center justify-center">
        <motion.div 
          className="grid grid-cols-3 gap-2 w-32 h-32"
          animate={{ 
            rotateX: [0, 15, -10, 5, 0],
            rotateZ: [0, 8, -5, 3, 0],
            scale: [1, 1.15, 0.9, 1.08, 1]
          }}
          transition={{ 
            duration: 0.4, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          {grid.flat().map((emojiIndex, i) => (
            <motion.div
              key={i}
              className="aspect-square rounded-sm border-2 flex items-center justify-center text-xl"
              style={{
                borderColor: neonColors[color],
                boxShadow: emojiIndex > 0 ? `0 0 20px ${neonColors[color]}` : 'none',
                backgroundColor: emojiIndex === 0 ? '#111' : 'rgba(0, 0, 0, 0.3)'
              }}
              animate={{
                scale: emojiIndex > 0 ? [1, 1.5, 0.7, 1.3, 1] : [1, 0.8, 1.1, 0.9, 1],
                opacity: [0.7, 1, 0.5, 0.9, 0.7],
                rotateZ: [0, 90, 180, 270, 360]
              }}
              transition={{
                scale: { duration: 0.08, repeat: Infinity },
                opacity: { duration: 0.12, repeat: Infinity },
                rotateZ: { duration: 1, repeat: Infinity, ease: "linear" }
              }}
            >
              {emojiPalette[emojiIndex]}
            </motion.div>
          ))}
        </motion.div>
      </div>
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

  return        <div className="bg-black border border-purple-500 rounded-lg p-6 font-mono">
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
            >◉ {metrics.multiverse}</motion.span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Floating Particles Effect
const FloatingParticles = () => {
  const [particles, setParticles] = useState<Array<{
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    size: number;
  }>>([]);

  useEffect(() => {
    const newParticles = Array(50).fill(null).map((_, i) => ({
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
      setParticles(prev => prev.map(p => ({
        ...p,
        x: (p.x + p.vx + window.innerWidth) % window.innerWidth,
        y: (p.y + p.vy + window.innerHeight) % window.innerHeight
      })));
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

// Live Counter Component
const LiveCounter = ({ 
  label, 
  value, 
  suffix = '', 
  color = 'text-white',
  increment
}: {
  label: string;
  value: number;
  suffix?: string;
  color?: string;
  increment: () => number;
}) => {
  const [count, setCount] = useState(value);

  useEffect(() => {
    const interval = setInterval(() => {
      setCount(prev => prev + increment());
    }, 100 + Math.random() * 200);
    return () => clearInterval(interval);
  }, [increment]);

  return (
    <div className="text-center">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <motion.div 
        className={`font-mono text-lg ${color}`}
        animate={{ 
          scale: [1, 1.05, 1],
          textShadow: [`0 0 5px currentColor`, `0 0 15px currentColor`, `0 0 5px currentColor`]
        }}
        transition={{ duration: 0.5, repeat: Infinity }}
      >
        {count.toLocaleString()}{suffix}
      </motion.div>
    </div>
  );
};

// Main Dashboard Component
export default function Dashboard() {
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
        {/* Top Row - Advanced Metrics */}
        <AdvancedMetrics />

        {/* Middle Row - Visualizations */}
        <div className="grid grid-cols-3 gap-6">
          <ChessBoard color="cyan" title="QUANTUM FIELD DENSITY" />
          <ArcGrid color="pink" title="NEURAL PATHWAY FLUX" />
          <ChessBoard color="green" title="SPACETIME CURVATURE" />
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

        {/* Prompt Input Area */}
        <div className="bg-black border border-green-500 rounded-lg p-6">
          <h3 className="text-green-400 text-lg mb-4 animate-pulse font-mono">🧠 NEURAL COMMAND INTERFACE</h3>
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
              <motion.button
                className="px-6 py-2 bg-gradient-to-r from-green-600 to-cyan-600 text-black font-mono font-bold rounded-lg"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                animate={{
                  boxShadow: ['0 0 10px #00FF41', '0 0 20px #00FFFF', '0 0 10px #00FF41']
                }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                ⚡ PROCESS NEURAL INPUT
              </motion.button>
              
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
        </div>

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
