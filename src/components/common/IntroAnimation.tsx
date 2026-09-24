import React, { useState, useEffect } from 'react';
import { Layers, Sparkles, ArrowRight, Code2, Cpu, CheckCircle2 } from 'lucide-react';

interface IntroAnimationProps {
  onComplete: () => void;
  isDarkMode: boolean;
}

export const IntroAnimation: React.FC<IntroAnimationProps> = ({ onComplete, isDarkMode }) => {
  const [progress, setProgress] = useState(0);
  const [stageText, setStageText] = useState('Initializing UML Engine...');
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Stage updates over 2.4 seconds
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        const next = prev + 2;
        if (next < 30) {
          setStageText('Loading UML 2.5 Metamodels & Schemas...');
        } else if (next < 65) {
          setStageText('Synthesizing Interactive Vector Canvas...');
        } else if (next < 90) {
          setStageText('Optimizing Hardware Touch & Multi-Touch Gestures...');
        } else {
          setStageText('Studio Ready. Launching workspace...');
        }
        return next;
      });
    }, 45);

    return () => clearInterval(interval);
  }, []);

  // When progress reaches 100%, trigger exit animation then complete
  useEffect(() => {
    if (progress >= 100 && !isExiting) {
      const exitTimer = setTimeout(() => {
        handleFinish();
      }, 400);
      return () => clearTimeout(exitTimer);
    }
  }, [progress, isExiting]);

  const handleFinish = () => {
    setIsExiting(true);
    setTimeout(() => {
      onComplete();
    }, 500);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden transition-all duration-500 ${
        isExiting ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      } ${
        isDarkMode
          ? 'bg-slate-950 text-white'
          : 'bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white'
      }`}
    >
      {/* Blueprint Grid Background */}
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(99, 102, 241, 0.25) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(99, 102, 241, 0.25) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Radial Ambient Glows */}
      <div className="absolute w-[600px] h-[600px] bg-indigo-500/20 rounded-full blur-3xl -top-40 -left-40 pointer-events-none animate-pulse" />
      <div className="absolute w-[600px] h-[600px] bg-blue-500/20 rounded-full blur-3xl -bottom-40 -right-40 pointer-events-none animate-pulse" style={{ animationDelay: '1s' }} />

      {/* Top Bar with Skip Button */}
      <div className="absolute top-6 right-6 z-20">
        <button
          onClick={handleFinish}
          className="px-4 py-1.5 text-xs font-medium text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 rounded-full transition-all flex items-center gap-1.5 backdrop-blur cursor-pointer shadow-sm group"
        >
          <span>Skip Intro</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Central Interactive Animation Container */}
      <div className="relative z-10 flex flex-col items-center max-w-lg px-6 w-full text-center">
        {/* Animated Vector Diagram Illustration */}
        <div className="relative w-72 h-44 mb-8 flex items-center justify-center">
          <svg className="w-full h-full drop-shadow-2xl" viewBox="0 0 280 160" fill="none">
            {/* Animated Connector 1: Class A to Class B (Generalization Arrow) */}
            <path
              d="M 85 55 L 140 55 L 140 100"
              stroke="#6366f1"
              strokeWidth="2"
              strokeDasharray="160"
              strokeDashoffset={Math.max(0, 160 - (progress / 100) * 200)}
              strokeLinecap="round"
              className="transition-all duration-75"
            />
            {/* Generalization Triangle Hollow Arrowhead */}
            {progress > 55 && (
              <polygon
                points="140,105 134,95 146,95"
                fill="#1e1b4b"
                stroke="#818cf8"
                strokeWidth="2"
                className="animate-in fade-in zoom-in duration-300"
              />
            )}

            {/* Animated Connector 2: Class B to Class C (Composition Diamond) */}
            <path
              d="M 195 55 L 140 55"
              stroke="#38bdf8"
              strokeWidth="2"
              strokeDasharray="100"
              strokeDashoffset={Math.max(0, 100 - (progress / 100) * 140)}
              strokeLinecap="round"
              className="transition-all duration-75"
            />
            {/* Composition Diamond */}
            {progress > 65 && (
              <polygon
                points="188,55 195,50 202,55 195,60"
                fill="#38bdf8"
                stroke="#38bdf8"
                strokeWidth="1.5"
                className="animate-in fade-in zoom-in duration-300"
              />
            )}

            {/* Node 1: Left Class Card (e.g. Model) */}
            <g
              className="transition-all duration-500"
              style={{
                opacity: progress > 15 ? 1 : 0,
                transform: `scale(${progress > 15 ? 1 : 0.8})`,
                transformOrigin: '50px 55px',
              }}
            >
              <rect
                x="15"
                y="30"
                width="70"
                height="50"
                rx="6"
                fill="#0f172a"
                stroke="#6366f1"
                strokeWidth="1.5"
              />
              <line x1="15" y1="46" x2="85" y2="46" stroke="#312e81" strokeWidth="1" />
              <rect x="23" y="36" width="34" height="4" rx="2" fill="#818cf8" />
              <rect x="23" y="52" width="46" height="3" rx="1.5" fill="#64748b" />
              <rect x="23" y="60" width="38" height="3" rx="1.5" fill="#64748b" />
              <rect x="23" y="68" width="50" height="3" rx="1.5" fill="#475569" />
            </g>

            {/* Node 2: Right Class Card (e.g. Controller) */}
            <g
              className="transition-all duration-500"
              style={{
                opacity: progress > 30 ? 1 : 0,
                transform: `scale(${progress > 30 ? 1 : 0.8})`,
                transformOrigin: '230px 55px',
              }}
            >
              <rect
                x="195"
                y="30"
                width="70"
                height="50"
                rx="6"
                fill="#0f172a"
                stroke="#38bdf8"
                strokeWidth="1.5"
              />
              <line x1="195" y1="46" x2="265" y2="46" stroke="#0369a1" strokeWidth="1" />
              <rect x="203" y="36" width="40" height="4" rx="2" fill="#38bdf8" />
              <rect x="203" y="52" width="50" height="3" rx="1.5" fill="#64748b" />
              <rect x="203" y="60" width="42" height="3" rx="1.5" fill="#64748b" />
              <rect x="203" y="68" width="36" height="3" rx="1.5" fill="#475569" />
            </g>

            {/* Node 3: Bottom System Component */}
            <g
              className="transition-all duration-500"
              style={{
                opacity: progress > 45 ? 1 : 0,
                transform: `scale(${progress > 45 ? 1 : 0.8})`,
                transformOrigin: '140px 125px',
              }}
            >
              <rect
                x="95"
                y="105"
                width="90"
                height="46"
                rx="6"
                fill="#0f172a"
                stroke="#a855f7"
                strokeWidth="1.5"
              />
              <line x1="95" y1="120" x2="185" y2="120" stroke="#581c87" strokeWidth="1" />
              <rect x="105" y="111" width="50" height="4" rx="2" fill="#c084fc" />
              <rect x="105" y="126" width="65" height="3" rx="1.5" fill="#64748b" />
              <rect x="105" y="134" width="45" height="3" rx="1.5" fill="#475569" />
            </g>

            {/* Glowing Connection Nodes */}
            {progress > 50 && (
              <circle cx="85" cy="55" r="3.5" fill="#818cf8" className="animate-ping" />
            )}
            {progress > 60 && (
              <circle cx="140" cy="55" r="3.5" fill="#38bdf8" />
            )}
            {progress > 75 && (
              <circle cx="140" cy="105" r="3.5" fill="#c084fc" className="animate-ping" />
            )}
          </svg>

          {/* Central Logo Overlay */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-sky-400 p-[2px] shadow-xl shadow-indigo-500/30">
            <div className="w-full h-full bg-slate-950/90 rounded-[14px] flex items-center justify-center backdrop-blur">
              <Layers className="w-8 h-8 text-sky-400 drop-shadow" />
            </div>
          </div>
        </div>

        {/* Brand Name with Gradient Glow */}
        <div className="space-y-2 mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold tracking-wider uppercase mb-1">
            <Sparkles className="w-3 h-3 text-indigo-400" />
            <span>Architecture & Modeling Studio</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-200 to-sky-400">
            UML Master Studio
          </h1>

          <p className="text-sm text-slate-400 font-normal max-w-sm mx-auto">
            Interactive visual UML modeling, multi-diagram architecture projects & offline-first canvas.
          </p>
        </div>

        {/* Loading Progress Bar */}
        <div className="w-full max-w-xs space-y-2.5">
          <div className="w-full h-1.5 bg-slate-800/80 rounded-full overflow-hidden p-[1px] border border-slate-700/40">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-400 rounded-full transition-all duration-100 ease-out shadow-lg shadow-indigo-500/50"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span className="truncate max-w-[220px] text-left">{stageText}</span>
            <span className="font-semibold text-slate-300">{progress}%</span>
          </div>
        </div>

        {/* Bottom Feature Badges */}
        <div className="mt-8 flex items-center justify-center gap-4 text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            14 UML Diagram Types
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Cpu className="w-3.5 h-3.5 text-sky-400" />
            Vector Touch Canvas
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Code2 className="w-3.5 h-3.5 text-indigo-400" />
            Offline-First
          </span>
        </div>
      </div>
    </div>
  );
};
