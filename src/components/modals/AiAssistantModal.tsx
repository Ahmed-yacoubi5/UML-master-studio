import React, { useState } from 'react';
import { Sparkles, Loader2, CheckCircle2, ArrowRight, Wand2, RefreshCw } from 'lucide-react';
import { Diagram, DiagramType, DiagramElement, Relationship } from '../../types/uml';
import { generateDiagramWithAi, modifyDiagramWithAi } from '../../services/aiService';

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDiagram: Diagram;
  onApplyChanges: (elements: DiagramElement[], relationships: Relationship[]) => void;
}

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({
  isOpen,
  onClose,
  currentDiagram,
  onApplyChanges,
}) => {
  const [mode, setMode] = useState<'generate' | 'modify'>('generate');
  const [prompt, setPrompt] = useState('');
  const [diagramType, setDiagramType] = useState<DiagramType>(currentDiagram.type);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [previewResult, setPreviewResult] = useState<{
    elements: DiagramElement[];
    relationships: Relationship[];
  } | null>(null);

  if (!isOpen) return null;

  const quickPrompts = [
    'E-Commerce order checkout and payment processing domain model',
    'Hospital electronic health records and patient appointment system',
    'Smart Home IoT sensor network and automation hub',
    'Flight reservation and seat allocation microservices',
    'Add an AuditLogger class connected to all entities',
    'Style elements with modern blue and emerald palette',
  ];

  const handleExecute = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    setErrorMsg(null);
    setPreviewResult(null);

    try {
      if (mode === 'generate') {
        const result = await generateDiagramWithAi(prompt.trim(), diagramType);
        setPreviewResult({
          elements: result.elements,
          relationships: result.relationships,
        });
      } else {
        const result = await modifyDiagramWithAi(
          prompt.trim(),
          currentDiagram.elements,
          currentDiagram.relationships
        );
        setPreviewResult(result);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'AI request failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (!previewResult) return;
    onApplyChanges(previewResult.elements, previewResult.relationships);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden transition-colors">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-md shadow-purple-500/20">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                AI UML Assistant
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Server-side Gemini 2.5 Flash intelligence with strict schema validation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Mode Switcher */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700/80">
            <button
              onClick={() => setMode('generate')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                mode === 'generate'
                  ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Generate New Architecture
            </button>
            <button
              onClick={() => setMode('modify')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                mode === 'modify'
                  ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Modify Active Diagram
            </button>
          </div>

          {mode === 'generate' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Target Diagram Type
              </label>
              <select
                value={diagramType}
                onChange={(e) => setDiagramType(e.target.value as DiagramType)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-purple-500"
              >
                <option value="CLASS">Class Diagram (Entities, Attributes, Methods)</option>
                <option value="USE_CASE">Use Case Diagram (Actors, Goals, System Boundaries)</option>
                <option value="ACTIVITY">Activity Diagram (Actions, Decisions, Flows)</option>
                <option value="SEQUENCE">Sequence Diagram (Lifelines, Messages, Replies)</option>
                <option value="STATE_MACHINE">State Machine Diagram (States, Transitions)</option>
              </select>
            </div>
          )}

          {/* Prompt Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {mode === 'generate'
                ? 'Describe the architecture or system requirement'
                : 'Describe the modification (add classes, change relationships, update styles)'}
            </label>
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                mode === 'generate'
                  ? 'e.g. Hospital ICU patient telemetry monitoring and nurse alert system with Doctor, Patient, and VitalsStream classes...'
                  : 'e.g. Add a NotificationService with sendPushNotification method and connect it to OrderProcessor via Dependency'
              }
              className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            />
          </div>

          {/* Quick Prompts */}
          <div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1.5">
              Quick Suggestions
            </span>
            <div className="flex flex-wrap gap-1.5">
              {quickPrompts.map((qp, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPrompt(qp)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700/70 text-slate-700 dark:text-slate-300 text-[11px] transition-colors text-left"
                >
                  {qp}
                </button>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs">
              {errorMsg}
            </div>
          )}

          {/* Preview Result */}
          {previewResult && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-2">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Generated Architecture Ready</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Created <strong>{previewResult.elements.length} UML elements</strong> and{' '}
                <strong>{previewResult.relationships.length} relationships</strong> with valid geometry
                and layout coordinates.
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {previewResult.elements.map((el) => (
                  <span
                    key={el.id}
                    className="px-2 py-0.5 rounded bg-white dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 text-[10px] font-mono"
                  >
                    {el.name} ({el.type})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {!previewResult ? (
              <button
                type="button"
                disabled={isLoading || !prompt.trim()}
                onClick={handleExecute}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-purple-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing & Synthesizing...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    <span>Generate UML</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleApply}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-500/20 flex items-center gap-2 transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Apply to Canvas</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
