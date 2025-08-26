import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { DashboardCard } from './DashboardCard';

export const PromptInterface: React.FC = () => {
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
    <DashboardCard
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
            />
            <motion.div
              className="absolute bottom-2 right-2 text-xs text-gray-500 font-mono"
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              QUANTUM_READY
            </motion.div>
          </motion.div>

          {/* Right: Animated math + geometry */}
          <div className="relative bg-black/40 border border-cyan-600 rounded-lg overflow-hidden">
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

            {/* Math glyphs */}
            <div className="absolute inset-0 pointer-events-none text-[11px] leading-4 p-2 font-mono text-cyan-300 opacity-70">
              <div>∮ E·dl = − dΦB/dt</div>
              <div>∇·E = ρ/ε₀ &nbsp; ∇×B = μ₀J + μ₀ε₀ ∂E/∂t</div>
              <div>ψ(x,t) = e^{iπ} · Σᵢ aᵢ φᵢ(x)</div>
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
    </DashboardCard>
  );
};
