import React, { useMemo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArcAgiCard } from './DashboardCard';

// Mini neural network builder that progressively adds nodes/edges
const NeuralBuilder: React.FC<{ active: boolean }> = ({ active }) => {
  const [progress, setProgress] = useState(0); // 0..1 build progress
  const [nodes, setNodes] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const [edges, setEdges] = useState<Array<[number, number]>>([]);

  // Seed fixed positions for a pleasant layout (grid + jitter)
  const layout = useMemo(() => {
    const pts: Array<{ id: number; x: number; y: number }> = [];
    const cols = 10, rows = 6;
    let id = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const jitterX = (Math.random() - 0.5) * 8;
        const jitterY = (Math.random() - 0.5) * 8;
        pts.push({
          id: id++,
          x: 20 + c * (160 / (cols - 1)) + jitterX,
          y: 20 + r * (120 / (rows - 1)) + jitterY,
        });
      }
    }
    return pts;
  }, []);

  useEffect(() => {
    if (!active) {
      setProgress(0);
      setNodes([]);
      setEdges([]);
      return;
    }
    // Build animation
    const start = Date.now();
    const duration = 4000; // ms
    const id = setInterval(() => {
      const t = Math.min(1, (Date.now() - start) / duration);
      setProgress(t);
      // Reveal nodes progressively
      const revealCount = Math.floor(layout.length * t);
      setNodes(layout.slice(0, revealCount));
      // Connect edges within a sliding window for visual cohesion
      const e: Array<[number, number]> = [];
      for (let i = 0; i < revealCount; i++) {
        // connect to 1-3 previous nodes
        for (let k = 1; k <= 3; k++) {
          const j = i - k * (1 + (i % 3));
          if (j >= 0) e.push([j, i]);
        }
      }
      setEdges(e);
      if (t >= 1) clearInterval(id);
    }, 50);
    return () => clearInterval(id);
  }, [active, layout]);

  return (
    <div className="relative bg-black/40 border border-cyan-600 rounded-lg overflow-hidden">
      <motion.svg viewBox="0 0 200 150" className="w-full h-[220px]">
        {/* Edges */}
        {edges.map(([a, b], idx) => {
          const A = layout[a];
          const B = layout[b];
          if (!A || !B) return null;
          return (
            <motion.line
              key={`e-${idx}`}
              x1={A.x} y1={A.y} x2={B.x} y2={B.y}
              stroke="#00FFFF" strokeWidth="0.8" opacity={0.35}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.6 }}
              transition={{ duration: 0.4, delay: idx * 0.01 }}
            />
          );
        })}
        {/* Nodes */}
        {nodes.map((n, i) => (
          <motion.circle
            key={`n-${n.id}`}
            cx={n.x} cy={n.y} r={2.6}
            fill="#00FF41"
            initial={{ r: 0, opacity: 0 }}
            animate={{ r: 3.5, opacity: 1 }}
            transition={{ duration: 0.2, delay: i * 0.01 }}
          />
        ))}
        {/* Energy pulse sweeping */}
        <motion.rect
          x={-200} y={0} width={200} height={150}
          fill="url(#gradientPulse)" opacity={0.25}
          animate={{ x: [ -200, 200 ] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />
        <defs>
          <linearGradient id="gradientPulse" x1="0" x2="1">
            <stop offset="0%" stopColor="#00FFFF" stopOpacity="0" />
            <stop offset="50%" stopColor="#FF00A8" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#00FFFF" stopOpacity="0" />
          </linearGradient>
        </defs>
      </motion.svg>
      <div className="absolute bottom-1 right-2 text-[10px] text-cyan-300 font-mono">
        BUILD: {(progress*100).toFixed(0)}%
      </div>
    </div>
  );
};

export const PromptInterface: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [building, setBuilding] = useState(false);
  // Precompute some fun math/geometry shapes for the right panel
  const lissajousPath = useMemo(() => {
    // x = sin(a t + δ), y = sin(b t)
    const a = 3, b = 2, δ = Math.PI / 2;
    const N = 400;
    const pts: string[] = [];
    for (let i = 0; i <= N; i++) {
      const t = (i / N) * Math.PI * 2;
      const x = Math.sin(a * t + δ);
      const y = Math.sin(b * t);
      // map to viewBox 0..200
      const X = 100 + x * 80;
      const Y = 100 + y * 80;
      pts.push(`${X},${Y}`);
    }
    return `M ${pts[0]} L ${pts.slice(1).join(' ')}`;
  }, []);

  const spiralPoints = useMemo(() => {
    // Simple Archimedean spiral r = k * θ
    const k = 6;
    const turns = 5;
    const step = 0.2;
    const pts: string[] = [];
    for (let θ = 0; θ <= Math.PI * 2 * turns; θ += step) {
      const r = k * θ;
      const x = r * Math.cos(θ);
      const y = r * Math.sin(θ);
      const X = 100 + x * 0.6; // scale down to fit
      const Y = 100 + y * 0.6;
      pts.push(`${X},${Y}`);
    }
    return `M ${pts[0]} L ${pts.slice(1).join(' ')}`;
  }, []);

  const polygonPoints = useMemo(() => {
    // Regular heptagon
    const n = 7;
    const R = 60;
    const pts: string[] = [];
    for (let i = 0; i < n; i++) {
      const θ = (i / n) * Math.PI * 2 - Math.PI / 2;
      const X = 100 + R * Math.cos(θ);
      const Y = 100 + R * Math.sin(θ);
      pts.push(`${X},${Y}`);
    }
    return pts.join(' ');
  }, []);

  return (
    <ArcAgiCard
      title="NEURAL COMMAND INTERFACE"
      icon="🧠"
      color="#00FF41"
    >
      <div className="space-y-3">
        {/* Creator credit */}
        <div className="text-center text-xs text-cyan-300 font-mono">
          Created by <span className="text-green-400">Prof. Dr. Max Power IV, PhD, DDS, LLM, Esq.</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
          {/* Left: textarea */}
          <motion.div 
            className="relative"
            animate={{ 
              boxShadow: ['0 0 5px #00FF41', '0 0 15px #00FF41', '0 0 5px #00FF41']
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <textarea
              className="w-full h-[180px] bg-gray-900 border border-green-500 rounded-lg p-4 text-green-400 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
              placeholder=">> ENTER HYPERDIMENSIONAL QUERY FOR AGI NEURAL PROCESSING..."
              rows={6}
              style={{
                background: 'linear-gradient(135deg, #001100, #000500)',
                textShadow: '0 0 5px #00FF41'
              }}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <motion.div
              className="absolute bottom-2 right-2 text-xs text-gray-500 font-mono"
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              QUANTUM_READY
            </motion.div>
          </motion.div>

          {/* Right: Animated panel (geometry idle; neural builder after submit) */}
          <div className="relative bg-black/40 border border-cyan-600 rounded-lg overflow-hidden">
            {!building && (
            <motion.svg
              viewBox="0 0 200 200"
              className="w-full h-[180px]"
              initial={{ rotate: 0 }}
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
            >
              {/* Lissajous curve */}
              <motion.path d={lissajousPath} fill="none" stroke="#00FFFF" strokeWidth="1.5" opacity="0.6"
                animate={{ pathLength: [0.2, 1, 0.2] }} transition={{ duration: 4, repeat: Infinity }} />

              {/* Archimedean spiral */}
              <motion.path d={spiralPoints} fill="none" stroke="#FF0080" strokeWidth="1" opacity="0.5"
                animate={{ opacity: [0.3, 0.8, 0.3] }} transition={{ duration: 3, repeat: Infinity }} />

              {/* Rotating polygon */}
              <motion.polygon points={polygonPoints} fill="none" stroke="#00FF41" strokeWidth="1.5"
                animate={{ rotate: [0, 360] }} transform="translate(100,100) translate(-100,-100)"
                transition={{ duration: 10, repeat: Infinity, ease: 'linear' }} />
            </motion.svg>
            )}
            {building && (
              <NeuralBuilder active={building} />
            )}

            {/* Math glyphs */}
            <div className="absolute inset-0 pointer-events-none text-[11px] leading-4 p-2 font-mono text-cyan-300 opacity-70">
              <div>∮ E·dl = − dΦB/dt</div>
              <div>∇·E = ρ/ε₀ &nbsp; ∇×B = μ₀J + μ₀ε₀ ∂E/∂t</div>
              <div>ψ(x,t) = {'e^{iπ}'} · Σᵢ aᵢ φᵢ(x)</div>
              <div>det(A) ≈ λ₁λ₂…λₙ &nbsp; |ζ(1/2 + it)|</div>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button 
              className="px-6 py-2 bg-gradient-to-r from-green-600 to-cyan-600 text-black font-mono font-bold"
              style={{
                boxShadow: '0 0 10px #00FF41'
              }}
              onClick={() => {
                // Start build sequence if prompt not empty
                if (prompt.trim().length === 0) return;
                setBuilding(false);
                // brief reset then enable builder
                setTimeout(() => setBuilding(true), 50);
              }}
            >
              ⚡ PROCESS NEURAL INPUT
            </Button>
          </motion.div>
          
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
    </ArcAgiCard>
  );
};
