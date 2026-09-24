import React from 'react';
import {
  Layers,
  Moon,
  Sun,
  FolderKanban,
  Sparkles,
  Film,
} from 'lucide-react';

interface HeaderProps {
  currentView: 'home' | 'project' | 'editor';
  projectName?: string;
  diagramName?: string;
  onNavigateHome: () => void;
  onNavigateProject?: () => void;
  isDarkMode: boolean;
  setIsDarkMode: (dark: boolean) => void;
  onOpenAiGenerator?: () => void;
  onReplayIntro?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  projectName,
  diagramName,
  onNavigateHome,
  onNavigateProject,
  isDarkMode,
  setIsDarkMode,
  onOpenAiGenerator,
  onReplayIntro,
}) => {
  return (
    <header className="h-14 border-b border-slate-200 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur px-3 sm:px-5 flex items-center justify-between select-none z-30 shrink-0 transition-colors">
      {/* Left: Logo & Breadcrumbs */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={onNavigateHome}
          className="flex items-center gap-2 sm:gap-2.5 px-2 py-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left group shrink-0"
          title="UML Master Studio Home"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Layers className="w-4 h-4 text-white" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">
                UML Studio
              </span>
              <span className="hidden xs:inline-block text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 border border-blue-500/20 dark:border-blue-500/30">
                PRO
              </span>
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium hidden sm:inline">
              Visual UML Architecture
            </span>
          </div>
        </button>

        {/* Navigation Breadcrumbs (Adapts automatically to screen size) */}
        {projectName && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 pl-2 sm:pl-3 border-l border-slate-200 dark:border-slate-800 min-w-0">
            <button
              onClick={onNavigateProject || onNavigateHome}
              className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors flex items-center gap-1 max-w-[110px] sm:max-w-[160px] truncate"
              title={projectName}
            >
              <FolderKanban className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
              <span className="truncate font-medium">{projectName}</span>
            </button>
            {diagramName && (
              <>
                <span className="text-slate-400 dark:text-slate-600 shrink-0">/</span>
                <span
                  className="text-slate-900 dark:text-slate-200 font-semibold max-w-[120px] sm:max-w-[180px] truncate"
                  title={diagramName}
                >
                  {diagramName}
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {onReplayIntro && (
          <button
            onClick={onReplayIntro}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 text-xs font-medium transition-all"
            title="Play Intro Animation"
            aria-label="Play Intro Animation"
          >
            <Film className="w-3.5 h-3.5 text-indigo-500" />
            <span className="hidden md:inline text-[11px]">Intro</span>
          </button>
        )}

        {onOpenAiGenerator && (
          <button
            onClick={onOpenAiGenerator}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 border border-purple-200 dark:border-purple-800/60 text-purple-700 dark:text-purple-300 text-xs font-semibold transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-300" />
            <span>AI Assistant</span>
          </button>
        )}

        {/* Light / Dark Mode Switch */}
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 text-xs font-medium transition-all"
          title={isDarkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          aria-label={isDarkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        >
          {isDarkMode ? (
            <>
              <Sun className="w-4 h-4 text-amber-400" />
              <span className="hidden md:inline text-[11px]">Light</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-indigo-600" />
              <span className="hidden md:inline text-[11px]">Dark</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
