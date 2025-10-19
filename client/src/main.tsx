/*
 * Author: gpt-5-codex
 * Date: 2025-10-19 01:35 UTC
 * PURPOSE: Bootstrap the React app while safeguarding MutationObserver usage from third-party extensions.
 * SRP/DRY check: Pass - Handles application root mounting and global MutationObserver guard only.
 */

import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

if (typeof window !== "undefined" && typeof window.MutationObserver === "function") {
  type WindowWithGuard = typeof window & {
    __modelCompareSafeMutationObserver?: boolean;
  };

  const guardedWindow = window as WindowWithGuard;

  if (!guardedWindow.__modelCompareSafeMutationObserver) {
    const nativeMutationObserver = guardedWindow.MutationObserver;

    class SafeMutationObserver extends nativeMutationObserver {
      observe(target: Node, options?: MutationObserverInit): void {
        const isNodeLike = Boolean(target) && typeof (target as any).nodeType === "number";
        if (!isNodeLike) {
          console.warn("[ModelCompare] Skipping MutationObserver.observe for non-node target", target);
          return;
        }

        if (!options) {
          console.warn("[ModelCompare] MutationObserver.observe missing options; skipping", target);
          return;
        }

        try {
          super.observe(target, options);
        } catch (error) {
          console.warn("[ModelCompare] MutationObserver.observe failed; suppressed to avoid crashes", error);
        }
      }
    }

    guardedWindow.__modelCompareSafeMutationObserver = true;
    guardedWindow.MutationObserver = SafeMutationObserver as typeof MutationObserver;
  }
}

createRoot(document.getElementById("root")!).render(<App />);
