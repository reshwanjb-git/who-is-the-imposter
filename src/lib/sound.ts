/**
 * Geluidseffecten via de Web Audio API — geen audiobestanden nodig.
 * Drie geluiden: een tik (antwoord indienen), een oplopende toon
 * (onthulling), en een korte bevestiging (stemmen). Mute-knop, standaard
 * aan (dus muted=false, geluid staat standaard AAN — zie MuteButton).
 */

import { loadMuted, saveMuted } from './storage';

let ctx: AudioContext | null = null;
let muted = loadMuted();

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext || (window as any).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function tone(freq: number, startTime: number, duration: number, gainValue = 0.08, type: OscillatorType = 'sine') {
  const audio = getCtx();
  if (!audio || muted) return;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audio.currentTime + startTime);
  gain.gain.setValueAtTime(0, audio.currentTime + startTime);
  gain.gain.linearRampToValueAtTime(gainValue, audio.currentTime + startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + startTime + duration);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start(audio.currentTime + startTime);
  osc.stop(audio.currentTime + startTime + duration + 0.02);
}

export const sound = {
  submit(): void {
    tone(720, 0, 0.09, 0.07, 'square');
  },
  vote(): void {
    tone(500, 0, 0.06, 0.06, 'sine');
    tone(760, 0.05, 0.08, 0.05, 'sine');
  },
  reveal(): void {
    // Oplopende, spanningsopbouwende toon.
    const audio = getCtx();
    if (!audio || muted) return;
    const steps = [220, 260, 310, 370, 440, 540];
    steps.forEach((f, i) => tone(f, i * 0.09, 0.14, 0.05, 'triangle'));
  },
  isMuted(): boolean {
    return muted;
  },
  setMuted(value: boolean): void {
    muted = value;
    saveMuted(value);
  },
  toggleMuted(): boolean {
    sound.setMuted(!muted);
    return muted;
  },
};
