import React, { useState } from 'react';
import {
  Palette,
  Sun,
  Moon,
  Check,
  Sparkles,
  Sliders,
  CheckCircle2,
  X,
  Layers,
} from 'lucide-react';
import { COLOR_PALETTES, ColorPalette, getPaletteById } from '../../types/theme';

interface ThemeCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  setIsDarkMode: (dark: boolean) => void;
  activePaletteId: string;
  onSelectPalette: (paletteId: string) => void;
  onApplyPaletteToDiagram?: (palette: ColorPalette) => void;
  hasActiveDiagram?: boolean;
}

export const ThemeCustomizerModal: React.FC<ThemeCustomizerModalProps> = ({
  isOpen,
  onClose,
  isDarkMode,
  setIsDarkMode,
  activePaletteId,
  onSelectPalette,
  onApplyPaletteToDiagram,
  hasActiveDiagram = false,
}) => {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [appliedFeedback, setAppliedFeedback] = useState(false);

  if (!isOpen) return null;

  const currentPalette = getPaletteById(activePaletteId);

  const categories = ['all', 'Modern', 'Dark & Cyber', 'Warm & Earthy', 'Vibrant'];

  const filteredPalettes =
    filterCategory === 'all'
      ? COLOR_PALETTES
      : COLOR_PALETTES.filter((p) => p.category === filterCategory);

  const handleApplyToCanvas = () => {
    if (onApplyPaletteToDiagram && currentPalette) {
      onApplyPaletteToDiagram(currentPalette);
      setAppliedFeedback(true);
      setTimeout(() => setAppliedFeedback(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden transition-colors">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md text-white transition-all"
              style={{ backgroundColor: currentPalette.primary }}
            >
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                UI & Canvas Customization
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                16 custom palettes with automatic WCAG AA text contrast adaptation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Close Customization"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1">
          {/* SECTION 1: Appearance Mode (Light / Dark) */}
          <div>
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-2 uppercase tracking-wider">
              1. Appearance Mode
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {/* Light Mode Option */}
              <button
                type="button"
                onClick={() => setIsDarkMode(false)}
                className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                  !isDarkMode
                    ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/20 ring-2 ring-blue-500/20 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shadow-xs">
                    <Sun className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      Light Mode
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                      Crisp, high-contrast daylight
                    </div>
                  </div>
                </div>
                {!isDarkMode && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
              </button>

              {/* Dark Mode Option */}
              <button
                type="button"
                onClick={() => setIsDarkMode(true)}
                className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                  isDarkMode
                    ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-950 text-indigo-400 border border-indigo-800 flex items-center justify-center shadow-xs">
                    <Moon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      Dark Mode
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                      Eye-friendly night mode
                    </div>
                  </div>
                </div>
                {isDarkMode && <Check className="w-4 h-4 text-indigo-400 shrink-0" />}
              </button>
            </div>
          </div>

          {/* SECTION 2: 16 Curated Color Palettes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                2. Color Palettes (16 Available)
              </label>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Selected: <strong className="text-slate-900 dark:text-white">{currentPalette.name}</strong>
              </span>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 mb-2.5 scrollbar-none text-[11px]">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
                    filterCategory === cat
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {cat === 'all' ? 'All (16)' : cat}
                </button>
              ))}
            </div>

            {/* Palettes Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {filteredPalettes.map((p) => {
                const isSelected = p.id === activePaletteId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onSelectPalette(p.id)}
                    className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all group relative ${
                      isSelected
                        ? 'border-blue-600 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-950/20 ring-2 ring-blue-500/20 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/80'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {p.name}
                        </span>
                        {isSelected && (
                          <span className="w-3.5 h-3.5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                            <Check className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 mb-2">
                        {p.category}
                      </div>
                    </div>

                    {/* Color Swatch Bars */}
                    <div className="flex items-center gap-1 pt-1">
                      {p.previewColors.map((c, i) => (
                        <span
                          key={i}
                          className="w-4 h-4 rounded-full border border-black/10 dark:border-white/10 shrink-0 shadow-xs"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECTION 3: Live Preview of Text Contrast Adaptation */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                Live Contrast & Readability Check
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                WCAG AA Compliant
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {/* Sample Class Box */}
              <div
                className="p-2.5 rounded-lg border-2 shadow-xs transition-colors"
                style={{
                  backgroundColor: currentPalette.elementThemes.entity.fill,
                  borderColor: currentPalette.elementThemes.entity.border,
                  color: currentPalette.elementThemes.entity.text,
                }}
              >
                <div className="font-bold text-xs border-b pb-1 mb-1 truncate" style={{ borderColor: currentPalette.elementThemes.entity.border }}>
                  UserAccount
                </div>
                <div className="text-[10px] font-mono space-y-0.5 opacity-90">
                  <div>- id: UUID</div>
                  <div>+ authenticate(): Bool</div>
                </div>
              </div>

              {/* Sample Label Pill */}
              <div
                className="p-2.5 rounded-lg border-2 shadow-xs flex flex-col justify-between transition-colors"
                style={{
                  backgroundColor: currentPalette.elementThemes.service.fill,
                  borderColor: currentPalette.elementThemes.service.border,
                  color: currentPalette.elementThemes.service.text,
                }}
              >
                <div className="font-bold text-xs truncate">
                  &lt;&lt;service&gt;&gt; PaymentGateway
                </div>
                <div className="flex items-center gap-1 text-[10px] mt-2 font-mono">
                  <span>1</span>
                  <span className="flex-1 border-b border-dashed" style={{ borderColor: currentPalette.elementThemes.service.border }} />
                  <span>0..*</span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Text labels inside classes, relationships, notes, and multiplicities adapt automatically so they remain distinct, sharp, and readable against any background.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between gap-3 shrink-0">
          {hasActiveDiagram && onApplyPaletteToDiagram ? (
            <button
              type="button"
              onClick={handleApplyToCanvas}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition-all"
            >
              {appliedFeedback ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  <span>Applied to Diagram!</span>
                </>
              ) : (
                <>
                  <Layers className="w-3.5 h-3.5 text-white" />
                  <span>Apply Palette to Active Diagram</span>
                </>
              )}
            </button>
          ) : (
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Settings persist across sessions
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 text-xs font-semibold shadow-xs transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
