"use client";

import { useEffect, useCallback, useRef, useState } from "react";

// Estado global simple para mantener la preferencia en toda la app sin contexto pesado
let _globalMuted = false;
const listeners = new Set<(muted: boolean) => void>();

const setGlobalMuted = (muted: boolean) => {
  _globalMuted = muted;
  if (typeof window !== "undefined") {
    localStorage.setItem("financia-sounds-muted", muted.toString());
  }
  listeners.forEach((l) => l(muted));
};

export function useGlobalSoundMute() {
  const [muted, setMuted] = useState(_globalMuted);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("financia-sounds-muted");
      if (stored !== null) {
        _globalMuted = stored === "true";
        setMuted(_globalMuted);
      }
    }
    
    const listener = (newMuted: boolean) => setMuted(newMuted);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return { muted, setMuted: setGlobalMuted };
}

export function useUISounds() {
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Inicializar el contexto perezosamente (solo cuando haya interacción de usuario)
  const getContext = useCallback(() => {
    if (_globalMuted) return null;
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const vibrate = useCallback((pattern: number | number[]) => {
    if (_globalMuted) return;
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }, []);

  const playPop = useCallback(() => {
    const ctx = getContext();
    if (!ctx) return;

    vibrate(10); // Haptic light tap

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = "sine";
    // Pitch sweep for a "pop" sound
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.05);

    // Fast decay
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  }, [getContext, vibrate]);

  const playSuccess = useCallback(() => {
    const ctx = getContext();
    if (!ctx) return;

    vibrate([20, 50, 40]); // Double haptic tap

    // Un acorde mayor ascendente estilo campanada
    const frequencies = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    
    frequencies.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.05);

      gainNode.gain.setValueAtTime(0, ctx.currentTime + index * 0.05);
      gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + index * 0.05 + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + index * 0.05 + 0.4);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(ctx.currentTime + index * 0.05);
      osc.stop(ctx.currentTime + index * 0.05 + 0.4);
    });
  }, [getContext, vibrate]);

  const playDelete = useCallback(() => {
    const ctx = getContext();
    if (!ctx) return;

    vibrate(60); // Heavier haptic tap

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = "triangle";
    // Pitch drop for a "delete/error" sound
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.15);

    // Fade out
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  }, [getContext, vibrate]);

  const playLevelUp = useCallback(() => {
    const ctx = getContext();
    if (!ctx) return;

    vibrate([30, 50, 30, 50, 100]); // Victory haptic pattern

    // Arpegio complejo de victoria
    const frequencies = [440, 554.37, 659.25, 880, 1108.73]; // A4, C#5, E5, A5, C#6
    
    frequencies.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = index % 2 === 0 ? "sine" : "triangle";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.1);

      gainNode.gain.setValueAtTime(0, ctx.currentTime + index * 0.1);
      gainNode.gain.linearRampToValueAtTime(0.4, ctx.currentTime + index * 0.1 + 0.03);
      
      // La última nota resuena más tiempo
      const duration = index === frequencies.length - 1 ? 1.0 : 0.3;
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + index * 0.1 + duration);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(ctx.currentTime + index * 0.1);
      osc.stop(ctx.currentTime + index * 0.1 + duration);
    });
  }, [getContext, vibrate]);

  return { playPop, playSuccess, playDelete, playLevelUp };
}
