import React from 'react';
import { AlertTriangle, AlertCircle, Info, CheckCircle2 } from 'lucide-react';
import { ValidationIssue } from '../../types/uml';

interface ValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  issues: ValidationIssue[];
  onSelectElement: (elementId: string) => void;
  onSelectRelationship: (relationshipId: string) => void;
}

export const ValidationModal: React.FC<ValidationModalProps> = ({
  isOpen,
  onClose,
  issues,
  onSelectElement,
  onSelectRelationship,
}) => {
  if (!isOpen) return null;

  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');
  const infos = issues.filter((i) => i.severity === 'info');

  const handleIssueClick = (issue: ValidationIssue) => {
    if (issue.elementId) {
      onSelectElement(issue.elementId);
      onClose();
    } else if (issue.relationshipId) {
      onSelectRelationship(issue.relationshipId);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden transition-colors">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 dark:border-amber-500/30">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                UML Architecture Diagnostics
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Rule-based syntax, multiplicity, connectivity, and layout diagnostics
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

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1">
          {/* Summary Badges */}
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800 text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/20 dark:border-red-500/30 font-semibold">
              {errors.length} {errors.length === 1 ? 'Error' : 'Errors'}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 dark:border-amber-500/30 font-semibold">
              {warnings.length} {warnings.length === 1 ? 'Warning' : 'Warnings'}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 dark:border-blue-500/30 font-semibold">
              {infos.length} Info
            </span>
          </div>

          {issues.length === 0 ? (
            <div className="py-12 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 dark:text-emerald-400 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-200">
                Diagram is Structurally Sound
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto mt-1">
                No syntax violations, disconnected elements, or illegal multiplicity definitions
                found in the active UML canvas.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {issues.map((issue) => {
                let badgeColor = 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20 dark:border-blue-500/30';
                let Icon = Info;
                if (issue.severity === 'error') {
                  badgeColor = 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20 dark:border-red-500/30';
                  Icon = AlertCircle;
                } else if (issue.severity === 'warning') {
                  badgeColor = 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20 dark:border-amber-500/30';
                  Icon = AlertTriangle;
                }

                return (
                  <div
                    key={issue.id}
                    onClick={() => handleIssueClick(issue)}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer flex items-start gap-3"
                  >
                    <div className={`p-1.5 rounded-lg border shrink-0 mt-0.5 ${badgeColor}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-200 capitalize">
                          {issue.severity}
                        </span>
                        <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">
                          {issue.rule}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{issue.message}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
