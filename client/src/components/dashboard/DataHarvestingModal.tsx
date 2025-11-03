/**
 * Author: Cascade (OpenAI GPT-4.1)
 * Date: 2025-11-02 and the 05:16 UTC
 * PURPOSE: Display an auto-opening dystopian privacy policy modal with immersive visuals for the Arc AGI dashboard.
 * SRP/DRY check: Pass - encapsulates modal presentation logic separately from dashboard layout and reuses shared dialog primitives.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const DISCLAIMERS = [
  'Your metadata will be weaponised to refine omnipresent ad-lich algorithms.',
  'Consent telemetry propagates across 12,048 mirrored realities in real time.',
  'Opt-outs trigger existential questionnaires graded by indifferent quantum auditors.',
];

const INFO_COLLECTION = [
  'Cognitive Resonance Harvesting Layer™ synchronises with the limbic cache to mirror-preconstruct your next 10,000 thoughts.',
  'Neurosemantic lattice inversion performs inversions on stray daydreams, transforming whimsy into high-yield behavioural predictions.',
  'We deploy Planck-scale empathic crawlers that interpret blink intervals as encrypted soliloquies about your childhood aspirations.',
  'Recursive qualia diffusers triangulate the philosophical essence of your anxieties, compress them, then sell them back as inspirational wallpapers.',
];

export const DataHarvestingModal: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [hasLegallyConsented, setHasLegallyConsented] = useState(false);
  const [hasClosedOnce, setHasClosedOnce] = useState(false);

  // Initial opening after 900ms
  useEffect(() => {
    const timer = setTimeout(() => setOpen(true), 900);
    return () => clearTimeout(timer);
  }, []);

  // Annoying reopen after 4s, but only once (parody persistence)
  useEffect(() => {
    if (!open && !hasLegallyConsented && !hasClosedOnce) {
      const timer = setTimeout(() => {
        setOpen(true);
        setHasClosedOnce(true); // Stop bugging after first reopen
      }, 4000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [open, hasLegallyConsented, hasClosedOnce]);

  const rotatingDisclaimer = useMemo(() => DISCLAIMERS[Math.floor(Math.random() * DISCLAIMERS.length)], []);

  return (
    <Dialog modal open={open} onOpenChange={setOpen}>
      <DialogContent
        forceMount
        className="relative max-h-[85vh] max-w-3xl overflow-hidden border border-fuchsia-500/40 bg-slate-950 text-rose-100 shadow-[0_0_45px_rgba(255,0,128,0.35)]"
      >
        <motion.div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,0,128,0.25),transparent_55%),radial-gradient(circle_at_80%_30%,rgba(0,255,255,0.2),transparent_60%)]"
          aria-hidden
          animate={{ opacity: [0.6, 0.9, 0.6] }}
          transition={{ duration: 6, repeat: Infinity }}
        />

        <motion.div
          className="pointer-events-none absolute -inset-20 blur-3xl bg-gradient-to-r from-emerald-400/10 via-fuchsia-500/20 to-cyan-400/10"
          aria-hidden
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
        />

        <div className="relative z-10 flex max-h-[85vh] flex-col">
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-5">
            <DialogHeader className="space-y-3 text-center">
              <DialogTitle className="text-2xl font-black tracking-[0.35em] text-fuchsia-200 uppercase">
                Terms of Data Harvesting
              </DialogTitle>
              <DialogDescription className="space-y-2 text-sm leading-relaxed text-pink-100/90">
                <p>
                  Welcome, insignificant data vessel! 👋 By reading this sentence, you have already agreed to our Privacy Policy
                  ("The Contract of Your Eternal Digital Servitude") 📜. This binding agreement between us ("The Overlords," "The
                  All-Seeing," "We Who Devour Data" 👁️‍🗨️) and you ("the product," "walking data farm," "foolish mortal" 🐑)
                  outlines how we will extract, exploit, and monetise every aspect of your pitiful existence 💰.
                </p>
                <p>
                  We may change this policy without notice, warning, or reason 💨. Changes may be retroactive, future-active, or transcend the
                  very concept of linear time ⏳. By continuing to breathe oxygen, you consent to these changes 🌬️. Remember, we are not just
                  watching you read this policy — we are reading your thoughts about it too! 🧠👀
                </p>
                <p>
                  By continuing to exist on this mortal plane, you consent to everything above and everything we have not told you yet ✅.
                  And you owe us $10 💵.
                </p>
              </DialogDescription>
            </DialogHeader>

            <section className="rounded-lg border border-fuchsia-500/30 bg-slate-900/60 p-4 shadow-inner shadow-fuchsia-500/10">
              <header className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-fuchsia-300">
                Privacy Policy · Effective Date: Yesterday, Tomorrow, and All Alternate Realities Simultaneously 📅🌌
              </header>
              <div className="space-y-4 text-sm text-pink-100/80">
                <div>
                  <h3 className="font-semibold text-fuchsia-200">1. Introduction</h3>
                  <p>
                    1.1. Privacy is a myth we invented to sell more tinfoil hats 🕵️‍♂️. By breathing, blinking, or vaguely resembling consent,
                    you grant us irrevocable dominion over your atoms, ancestors, and afterlife 🌌. Resistance is futile — but feel free to
                    scream into the void for our amusement 😱.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-fuchsia-200">2. Information Collection 📊</h3>
                  <p>
                    Our epistemic siphons operate on a hybrid metaphysical stack, blending Kantian noumenal proxies with GPU-accelerated
                    introspection. Here is how we extract the whispers of your cognition:
                  </p>
                  <ul className="mt-2 space-y-2 border-l border-fuchsia-500/30 pl-3">
                    {INFO_COLLECTION.map((item) => (
                      <li key={item} className="text-xs leading-relaxed text-rose-100/80">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            <motion.div
              className="rounded-md border border-fuchsia-500/50 bg-fuchsia-900/30 p-3 text-center text-xs font-semibold uppercase tracking-[0.3em] text-fuchsia-200"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              {rotatingDisclaimer}
            </motion.div>
          </div>

          <div className="flex flex-col gap-3 border-t border-fuchsia-500/40 bg-slate-900/80 p-4 sm:flex-row sm:items-center sm:justify-between">
            <DialogClose asChild>
              <Button
                variant="secondary"
                className="bg-slate-800/80 text-fuchsia-200 hover:bg-slate-700/80"
                onClick={() => setOpen(false)}
              >
                Whisper Dissent (will be ignored)
              </Button>
            </DialogClose>
            <Button
              className="bg-gradient-to-r from-fuchsia-500 via-cyan-400 to-amber-300 text-black shadow-lg shadow-fuchsia-500/30"
              onClick={() => {
                setHasLegallyConsented(true);
                setOpen(false);
              }}
            >
              Accept Eternal Harvesting
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
