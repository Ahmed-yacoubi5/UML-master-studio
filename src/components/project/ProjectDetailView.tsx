import React, { useState } from 'react';
import {
  ArrowLeft,
  Plus,
  Copy,
  Trash2,
  Edit3,
  ExternalLink,
  Download,
  Layers,
  Sparkles,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  FileDown,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { Project, Diagram, DiagramType } from '../../types/uml';
import { exportProjectToPdf, exportDiagramToPng, exportDiagramToPdf } from '../../services/exportService';

interface ProjectDetailViewProps {
  project: Project;
  onBack: () => void;
  onOpenDiagram: (diagramId: string) => void;
  onCreateDiagram: (name: string, type: DiagramType) => void;
  onDuplicateDiagram: (diagramId: string) => void;
  onDeleteDiagram: (diagramId: string) => void;
  onRenameDiagram: (diagramId: string, newName: string) => void;
  onChangeDiagramType: (diagramId: string, newType: DiagramType) => void;
  onReorderDiagrams: (reordered: Diagram[]) => void;
  onOpenAiGenerator: (diagramType: DiagramType) => void;
}

export const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({
  project,
  onBack,
  onOpenDiagram,
  onCreateDiagram,
  onDuplicateDiagram,
  onDeleteDiagram,
  onRenameDiagram,
  onChangeDiagramType,
  onReorderDiagrams,
  onOpenAiGenerator,
}) => {
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newDiagramName, setNewDiagramName] = useState('');
  const [newDiagramType, setNewDiagramType] = useState<DiagramType>('CLASS');

  const [renamingDiagramId, setRenamingDiagramId] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState('');

  const [changingTypeId, setChangingTypeId] = useState<string | null>(null);
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);

  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportNotification, setExportNotification] = useState<string | null>(null);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDiagramName.trim()) return;
    onCreateDiagram(newDiagramName.trim(), newDiagramType);
    setNewDiagramName('');
    setIsNewModalOpen(false);
  };

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renamingDiagramId || !renameInput.trim()) return;
    onRenameDiagram(renamingDiagramId, renameInput.trim());
    setRenamingDiagramId(null);
  };

  const handleMoveDiagram = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= project.diagrams.length) return;

    const list = [...project.diagrams];
    const [moved] = list.splice(index, 1);
    list.splice(targetIndex, 0, moved);
    onReorderDiagrams(list);
  };

  const handleExportFullProjectPdf = async () => {
    setIsExportingPdf(true);
    setExportNotification(null);
    try {
      await exportProjectToPdf(project);
      setExportNotification('Project PDF downloaded successfully!');
      setTimeout(() => setExportNotification(null), 3000);
    } catch (err: any) {
      setExportNotification('Failed to generate PDF: ' + (err.message || 'unknown error'));
      setTimeout(() => setExportNotification(null), 4000);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleExportSingleDiagramPng = async (diag: Diagram) => {
    try {
      await exportDiagramToPng(diag, { scale: 2 });
      setExportNotification(`PNG for "${diag.name}" downloaded!`);
      setTimeout(() => setExportNotification(null), 3000);
    } catch (err: any) {
      setExportNotification('PNG export failed: ' + err.message);
      setTimeout(() => setExportNotification(null), 4000);
    }
  };

  const handleExportSingleDiagramPdf = async (diag: Diagram) => {
    try {
      await exportDiagramToPdf(diag);
      setExportNotification(`PDF for "${diag.name}" downloaded!`);
      setTimeout(() => setExportNotification(null), 3000);
    } catch (err: any) {
      setExportNotification('PDF export failed: ' + err.message);
      setTimeout(() => setExportNotification(null), 4000);
    }
  };

  const getDiagramBadge = (type: DiagramType) => {
    switch (type) {
      case 'CLASS':
        return { label: 'Class Diagram', color: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20 dark:border-blue-500/30' };
      case 'USE_CASE':
        return { label: 'Use Case', color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 dark:border-emerald-500/30' };
      case 'ACTIVITY':
        return { label: 'Activity Flow', color: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20 dark:border-amber-500/30' };
      case 'SEQUENCE':
        return { label: 'Sequence', color: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20 dark:border-purple-500/30' };
      case 'STATE_MACHINE':
        return { label: 'State Machine', color: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20 dark:border-rose-500/30' };
      case 'COMPONENT':
        return { label: 'Component', color: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20 dark:border-cyan-500/30' };
      case 'DEPLOYMENT':
        return { label: 'Deployment', color: 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20 dark:border-teal-500/30' };
      case 'PACKAGE':
        return { label: 'Package', color: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20 dark:border-indigo-500/30' };
      case 'OBJECT':
        return { label: 'Object', color: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20 dark:border-sky-500/30' };
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-3 sm:p-6 lg:p-8 transition-colors">
      <div className="max-w-7xl mx-auto space-y-5 sm:space-y-6">
        {/* Toast / Feedback Banner */}
        {exportNotification && (
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-blue-700 dark:text-blue-300 text-xs sm:text-sm flex items-center gap-2 shadow-sm animate-fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{exportNotification}</span>
          </div>
        )}

        {/* Navigation & Project Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900/90 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl transition-colors">
          <div className="flex items-start gap-3">
            <button
              onClick={onBack}
              className="p-2 mt-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
              title="Back to Projects"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {project.name}
                </h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {project.diagrams.length} {project.diagrams.length === 1 ? 'diagram' : 'diagrams'}
                </span>
              </div>
              {project.description && (
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
                  {project.description}
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <button
              disabled={isExportingPdf}
              onClick={handleExportFullProjectPdf}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-medium transition-colors disabled:opacity-50"
              title="Export all project diagrams into a unified multi-page PDF"
            >
              {isExportingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                  <span>Export Project PDF</span>
                </>
              )}
            </button>

            <button
              onClick={() => onOpenAiGenerator('CLASS')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 border border-purple-200 dark:border-purple-800/60 text-purple-700 dark:text-purple-300 text-xs sm:text-sm font-semibold transition-colors"
            >
              <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-300" />
              <span>AI Architect</span>
            </button>

            <button
              onClick={() => setIsNewModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold shadow-md shadow-blue-500/20 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>New Diagram</span>
            </button>
          </div>
        </div>

        {/* Diagrams Grid */}
        {project.diagrams.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl bg-white/50 dark:bg-slate-900/30">
            <Layers className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-300">No diagrams in this project</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              Add your first UML Class, Use Case, Sequence, or Activity diagram to begin visual modeling.
            </p>
            <button
              onClick={() => setIsNewModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-500/20"
            >
              Create Diagram
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {project.diagrams.map((diag, idx) => {
              const badge = getDiagramBadge(diag.type);
              return (
                <div
                  key={diag.id}
                  className="group bg-white dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-slate-700 rounded-2xl p-5 shadow-sm hover:shadow-md flex flex-col justify-between transition-all"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <span
                          className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${badge.color} mb-1.5`}
                        >
                          {badge.label}
                        </span>
                        <h3
                          onClick={() => onOpenDiagram(diag.id)}
                          className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors cursor-pointer line-clamp-1"
                        >
                          {diag.name}
                        </h3>
                      </div>

                      {/* Reorder Buttons */}
                      <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100">
                        <button
                          disabled={idx === 0}
                          onClick={() => handleMoveDiagram(idx, 'up')}
                          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20"
                          title="Move Diagram Up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          disabled={idx === project.diagrams.length - 1}
                          onClick={() => handleMoveDiagram(idx, 'down')}
                          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20"
                          title="Move Diagram Down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Stats & Meta */}
                    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 py-2 border-y border-slate-100 dark:border-slate-800/80 my-3">
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{diag.elements.length}</span>{' '}
                        elements
                      </div>
                      <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {diag.relationships.length}
                        </span>{' '}
                        connectors
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setRenamingDiagramId(diag.id);
                          setRenameInput(diag.name);
                        }}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                        title="Rename Diagram"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setChangingTypeId(diag.id)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                        title="Change Diagram Type"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onDuplicateDiagram(diag.id)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                        title="Duplicate Diagram"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleExportSingleDiagramPng(diag)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        title="Export PNG (2x)"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleExportSingleDiagramPdf(diag)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                        title="Export PDF"
                      >
                        <FileDown className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setDeleteConfirmationId(diag.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/20 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        title="Delete Diagram"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      onClick={() => onOpenDiagram(diag.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-600/15 hover:bg-blue-100 dark:hover:bg-blue-600/25 border border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-300 text-xs font-semibold transition-colors"
                    >
                      <span>Editor</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal (Safe in-app modal instead of window.confirm) */}
      {deleteConfirmationId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/50 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Diagram</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Are you sure you want to delete this diagram? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmationId(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteDiagram(deleteConfirmationId);
                  setDeleteConfirmationId(null);
                }}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-md shadow-red-500/20"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Diagram Modal */}
      {isNewModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                Add New UML Diagram
              </h3>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Diagram Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Order Fulfillment Workflow"
                  value={newDiagramName}
                  onChange={(e) => setNewDiagramName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  UML Diagram Type *
                </label>
                <select
                  value={newDiagramType}
                  onChange={(e) => setNewDiagramType(e.target.value as DiagramType)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                >
                  <optgroup label="Structural Diagrams">
                    <option value="CLASS">Class Diagram</option>
                    <option value="OBJECT">Object Diagram</option>
                    <option value="COMPONENT">Component Diagram</option>
                    <option value="DEPLOYMENT">Deployment Diagram</option>
                    <option value="PACKAGE">Package Diagram</option>
                  </optgroup>
                  <optgroup label="Behavioral Diagrams">
                    <option value="USE_CASE">Use Case Diagram</option>
                    <option value="ACTIVITY">Activity Diagram</option>
                    <option value="SEQUENCE">Sequence Diagram</option>
                    <option value="STATE_MACHINE">State Machine Diagram</option>
                  </optgroup>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-500/20"
                >
                  Create Diagram
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {renamingDiagramId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-blue-500 dark:text-blue-400" />
              Rename Diagram
            </h3>

            <form onSubmit={handleRenameSubmit} className="space-y-4">
              <input
                type="text"
                required
                value={renameInput}
                onChange={(e) => setRenameInput(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRenamingDiagramId(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Diagram Type Modal */}
      {changingTypeId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-blue-500 dark:text-blue-400" />
              Change Diagram Type
            </h3>

            <div className="space-y-2">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Switching UML type updates the active tool palette and symbol set.
              </p>
              <select
                onChange={(e) => {
                  onChangeDiagramType(changingTypeId, e.target.value as DiagramType);
                  setChangingTypeId(null);
                }}
                defaultValue={project.diagrams.find((d) => d.id === changingTypeId)?.type}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
              >
                <option value="CLASS">Class Diagram</option>
                <option value="USE_CASE">Use Case Diagram</option>
                <option value="ACTIVITY">Activity Diagram</option>
                <option value="SEQUENCE">Sequence Diagram</option>
                <option value="STATE_MACHINE">State Machine Diagram</option>
                <option value="COMPONENT">Component Diagram</option>
                <option value="DEPLOYMENT">Deployment Diagram</option>
                <option value="PACKAGE">Package Diagram</option>
                <option value="OBJECT">Object Diagram</option>
              </select>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setChangingTypeId(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
