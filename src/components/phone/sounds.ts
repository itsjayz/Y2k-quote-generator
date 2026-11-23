"use client";

/* Monophonic square-wave beeps, synthesised live to mimic an early-2000s
   piezo buzzer. No audio files. */

type Note = [freq: number, dur: number]; // freq 0 = rest

let ctx: AudioContext | null = null;

function audio() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function play(notes: Note[], { delay = 0, volume = 0.05 } = {}) {
  const c = audio();
  if (!c) return;

  const out = c.createGain();
  out.gain.value = volume;
  // thin it out like a tiny speaker
  const hp = c.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 500;
  hp.connect(out).connect(c.destination);

  let t = c.currentTime + 0.01 + delay;
  for (const [f, d] of notes) {
    if (f > 0) {
      const osc = c.createOscillator();
      const env = c.createGain();
      osc.type = "square";
      osc.frequency.value = f;
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(1, t + 0.003);
      env.gain.setValueAtTime(1, t + d - 0.006);
      env.gain.linearRampToValueAtTime(0, t + d);
      osc.connect(env).connect(hp);
      osc.start(t);
      osc.stop(t + d + 0.02);
    }
    t += d;
  }
}

/* Morse "SMS"  ... -- ...  — the classic text-message alert pattern */
const DOT = 0.075;
const DASH = DOT * 3;
const morse = (pattern: string, freq: number): Note[] =>
  pattern.split("").flatMap<Note>((ch) =>
    ch === " " ? [[0, DOT * 2]] : [[freq, ch === "." ? DOT : DASH], [0, DOT]]
  );

export const sfx = {
  /** every keypress */
  key: () => play([[1760, 0.04]], { volume: 0.035 }),
  /** incoming message alert */
  message: () => play(morse("... -- ...", 1976), { delay: 0.25 }),
  /** confirmation tone: saved / selected */
  confirm: () => play([[1568, 0.07], [0, 0.03], [2093, 0.12]], { delay: 0.06 }),
  /** removed from saved */
  remove: () => play([[2093, 0.07], [0, 0.03], [1397, 0.14]], { delay: 0.06 }),
  /** copied / sent */
  done: () => play([[1319, 0.06], [1568, 0.06], [2093, 0.11]], { delay: 0.06 }),
  /** end of a list / nothing to do */
  error: () => play([[392, 0.16]], { delay: 0.04 }),
};
