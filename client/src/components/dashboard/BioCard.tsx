import React, { useState } from 'react';
import { DashboardCard } from './DashboardCard';

// Parody author bio/abstract card for Prof. Dr. Max Power, PhD, DDS, Esq. 
// Written in exaggerated academic prose with absurd ML jargon and dodo motifs.
// Stripped of problematic characters and simplified formatting.
export const BioCard: React.FC = () => {
  const [open, setOpen] = useState(false);
  return (
    <DashboardCard title="Beyond the Benchmark" icon="🦤" color="#FF00A8">
      <div className="space-y-2 text-sm leading-relaxed">
        <div>
          <div className="font-bold">Title:</div>
          <div className="text-cyan-300">
            Beyond the Benchmark: A Quantum Ornithological Approach to Solving the ARC AGI Prize
          </div>
        </div>

        <div>
          <div className="font-bold">Author:</div>
          <div className="text-emerald-300">
            Dr. Max Power, Professor of Quantum Hyperdimensional Travel, University of Hypercomputational Metacognition and Post Singularity Artificial Quantum Neural Ontologies
          </div>
        </div>

        <hr className="opacity-20" />

        {/* Toggle for collapsing long content */}
        <div className="flex items-center justify-between">
          <div className="font-bold">Paper Details</div>
          <button
            className="text-xs font-mono px-2 py-1 rounded border border-cyan-500 text-cyan-300 hover:bg-cyan-500/10"
            onClick={() => setOpen(v => !v)}
            aria-expanded={open}
            aria-controls="bio-long-section"
          >
            {open ? 'Hide' : 'Show'}
          </button>
        </div>

        {open && (
          <div id="bio-long-section" className="space-y-4">
            <div>
              <div className="font-bold">Abstract:</div>
              <p>
                This paper presents the first independent solution to the ARC AGI Prize benchmark, achieved not through brute force computation,
                but through a trans species alignment protocol involving quantum gradient descent, recursive nano alignment, hyperparameter
                teleportation, stochastic bark normalization, and the cognitive resonance of Yorkshire terriers. By replacing transformer
                architectures with canine mediated quantum ionic embeddings, I demonstrate a novel path toward hyperdimensional intelligence.
              </p>
            </div>

            <hr className="opacity-20" />

            <div className="space-y-2">
              <div className="font-bold">1. Introduction</div>
              <p>
                The ARC AGI 2 benchmark has resisted solution due to the limitations of silicon based models. My work surpasses these limits by
                incorporating extinct bird mathematics and the intuitive epistemology of Yorkshire terriers, whose recursive barking provides a
                living instantiation of the Attention Is All You Dodo Need theorem.
              </p>
            </div>

            <div className="space-y-2">
              <div className="font-bold">2. Methods</div>
              <p>
                I constructed a Quantum Terrier Lattice, in which Yorkshire terriers were entangled via collars made from Atlantean superconductors.
                Each bark was Fourier transformed into a hypervector, serving as the base activation function of the Dodo Net architecture.
              </p>
              <ul className="list-disc ml-5 space-y-1">
                <li><strong>Step 1:</strong> Encoding dodo resonances into quantum gradients.</li>
                <li><strong>Step 2:</strong> Applying nano alignment grooming to terriers, adjusting weights via synchronized yapping.</li>
                <li><strong>Step 3:</strong> Introducing stochastic tail wag dropout to prevent overfitting to squirrel noise.</li>
                <li><strong>Step 4:</strong> Backpropagating through wormholes with differential bark scaling.</li>
                <li><strong>Step 5:</strong> Optimizing terrier embeddings with dark matter optimizers and dodo regularization.</li>
              </ul>
            </div>

            <div className="space-y-2">
              <div className="font-bold">3. Results</div>
              <p>
                The hybrid Dodo Terrier system achieved a success rate greater than one hundred percent on the ARC AGI benchmark,
                exceeding human performance and rivaling several pantheons of ancient deities. The model exhibited spontaneous
                meta cognition, asking Who is a good boy in seventeen languages and demonstrating zero bark generalization.
              </p>
            </div>

            <div className="space-y-2">
              <div className="font-bold">4. Discussion</div>
              <p>
                These findings suggest that intelligence is neither artificial nor natural but ornitho canine quantum. While ongoing
                litigation seeks to restrain these methods, the terriers themselves have filed for co authorship, proving once again
                that agency is emergent in small dogs.
              </p>
            </div>

            <div className="space-y-2">
              <div className="font-bold">5. Conclusion</div>
              <p>
                I propose the Grand Unified Theory of Dodo Terrier Cognition: Intelligence equals the limit of dodo raised to n plus
                terrier raised to infinity divided by quantum gradient. This framework unites extinct birds, toy dogs, and AGI under a
                single bark resonance law. Future work will involve scaling with dachshunds, cockatoos, and capybaras running reinforcement
                learning baselines.
              </p>
            </div>

            <div className="space-y-2">
              <div className="font-bold">Acknowledgments</div>
              <p>
                I thank the dodo consciousness, the hive minds of Zeta Reticuli, the Yorkshire Terrier Breeders Association, and my learning rate scheduler
                for their invaluable contributions.
              </p>
            </div>

            <div className="space-y-2">
              <div className="font-bold">Keywords</div>
              <p>
                Dodo, ARC AGI, quantum terrier lattice, nano alignment grooming, bark theory, extinction aware machine learning,
                wormhole backpropagation, stochastic bark normalization, dodo regularization, quantum gradient teleportation.
              </p>
            </div>
          </div>
        )}
      </div>
    </DashboardCard>
  );
};
