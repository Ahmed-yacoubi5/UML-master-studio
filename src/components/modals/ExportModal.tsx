import React, { useState } from 'react';
import { Download, Image, FileText, FolderArchive, Check, Loader2, AlertCircle } from 'lucide-react';
import { Diagram, Project } from '../../types/uml';
import { exportDiagramToPng, exportDiagramToPdf, exportProjectToPdf } from '../../services/exportService';
import { exportProjectToFile } from '../../services/storage';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDiagram: Diagram;
  currentProject: Project;
  selectedElementIds: Set<string>;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  currentDiagram,
  currentProject,
  selectedElementIds,
}) => {
  const [tab, setTab] = useState<'pdf' | 'png' | 'project'>('pdf');

  // PNG settings
  const [pngScale, setPngScale] = useState<1 | 2 | 3>(2);
  const [pngBg, setPngBg] = useState<'#FFFFFF' | 'transparent' | '#0F172A'>('#FFFFFF');
  const [exportSelectedOnly, setExportSelectedOnly] = useState(false);

  // PDF settings
  const [pdfScope, setPdfScope] = useState<'diagram' | 'project'>('diagram');
  const [pdfPageSize, setPdfPageSize] = useState<'a4' | 'a3' | 'letter'>('a4');
  const [pdfOrientation, setPdfOrientation] = useState<'landscape' | 'portrait'>('landscape');

  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExportPng = async () => {
    setIsExporting(true);
    setErrorMessage(null);
    try {
      await exportDiagramToPng(currentDiagram, {
        scale: pngScale,
        backgroundColor: pngBg,
        selectedElementIds: exportSelectedOnly && selectedElementIds.size > 0 ? selectedElementIds : undefined,
      });
      setTimeout(() => onClose(), 200);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Error exporting PNG image');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPdf = async () => {
    setIsExporting(true);
    setErrorMessage(null);
    try {
      if (pdfScope === 'diagram') {
        await exportDiagramToPdf(currentDiagram, {
          pageSize: pdfPageSize,
          orientation: pdfOrientation,
        });
      } else {
        await exportProjectToPdf(currentProject, {
          pageSize: pdfPageSize,
          orientation: pdfOrientation,
        });
      }
      setTimeout(() => onClose(), 200);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Error exporting PDF document');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportUmlStudio = () => {
    exportProjectToFile(currentProject);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden transition-colors">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20 dark:border-blue-500/30">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Export & Publishing</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Vector PDF, High-Resolution PNG, or Portable .umlstudio project file
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 text-sm"
          >
            ✕
          </button>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Export Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-5 pt-3 bg-slate-50 dark:bg-slate-900/50">
          <button
            onClick={() => setTab('pdf')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              tab === 'pdf'
                ? 'border-rose-500 text-rose-600 dark:text-rose-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>PDF Document</span>
          </button>

          <button
            onClick={() => setTab('png')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              tab === 'png'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Image className="w-4 h-4" />
            <span>PNG Image</span>
          </button>

          <button
            onClick={() => setTab('project')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              tab === 'project'
                ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FolderArchive className="w-4 h-4" />
            <span>Project Package</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 space-y-4">
          {tab === 'pdf' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Export Scope
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPdfScope('diagram')}
                    className={`p-3 rounded-xl border text-left text-xs transition-colors ${
                      pdfScope === 'diagram'
                        ? 'border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-300'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="font-bold">Current Diagram</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{currentDiagram.name}</div>
                  </button>

                  <button
                    onClick={() => setPdfScope('project')}
                    className={`p-3 rounded-xl border text-left text-xs transition-colors ${
                      pdfScope === 'project'
                        ? 'border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-300'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="font-bold">Full Project Book</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      All {currentProject.diagrams.length} diagrams
                    </div>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Page Size
                  </label>
                  <select
                    value={pdfPageSize}
                    onChange={(e) => setPdfPageSize(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-rose-500"
                  >
                    <option value="a4">A4 (210 × 297 mm)</option>
                    <option value="a3">A3 (297 × 420 mm)</option>
                    <option value="letter">US Letter (8.5 × 11 in)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Orientation
                  </label>
                  <select
                    value={pdfOrientation}
                    onChange={(e) => setPdfOrientation(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-rose-500"
                  >
                    <option value="landscape">Landscape (Recommended)</option>
                    <option value="portrait">Portrait</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button
                  disabled={isExporting}
                  onClick={handleExportPdf}
                  className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Generating PDF...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>
                        Download {pdfScope === 'diagram' ? 'Diagram PDF' : 'Complete Project PDF'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {tab === 'png' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Resolution Scale
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { scale: 1, label: 'Standard (1x)', desc: 'Web & screen' },
                    { scale: 2, label: 'High-Res (2x)', desc: 'Retina / HD' },
                    { scale: 3, label: 'Print (3x)', desc: 'Ultra HD' },
                  ].map((s) => (
                    <button
                      key={s.scale}
                      onClick={() => setPngScale(s.scale as any)}
                      className={`p-2.5 rounded-xl border text-left text-xs transition-colors ${
                        pngScale === s.scale
                          ? 'border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-300'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="font-bold">{s.label}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{s.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Background
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { bg: '#FFFFFF', label: 'Solid White' },
                    { bg: 'transparent', label: 'Transparent' },
                    { bg: '#0F172A', label: 'Dark Canvas' },
                  ].map((b) => (
                    <button
                      key={b.bg}
                      onClick={() => setPngBg(b.bg as any)}
                      className={`p-2 rounded-xl border text-xs font-medium text-center transition-colors ${
                        pngBg === b.bg
                          ? 'border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-300'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>

              {selectedElementIds.size > 0 && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="selectedOnly"
                    checked={exportSelectedOnly}
                    onChange={(e) => setExportSelectedOnly(e.target.checked)}
                    className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="selectedOnly" className="text-xs text-slate-600 dark:text-slate-300">
                    Export only {selectedElementIds.size} selected elements
                  </label>
                </div>
              )}

              <div className="pt-2">
                <button
                  disabled={isExporting}
                  onClick={handleExportPng}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Exporting PNG...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Download PNG Image</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {tab === 'project' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/50 text-xs text-purple-800 dark:text-purple-300 space-y-1">
                <div className="font-bold text-sm">Offline Project Package (.umlstudio)</div>
                <p className="text-slate-600 dark:text-slate-400">
                  Export the entire project with all {currentProject.diagrams.length} diagrams, elements, and
                  relationships into an offline JSON bundle. You can re-import this file anytime.
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleExportUmlStudio}
                  className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-500/20 flex items-center justify-center gap-2 transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Download .umlstudio Package</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
