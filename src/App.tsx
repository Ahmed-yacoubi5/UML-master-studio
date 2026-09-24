import React, { useState, useEffect } from 'react';
import { Header } from './components/common/Header';
import { ProjectDashboard } from './components/home/ProjectDashboard';
import { ProjectDetailView } from './components/project/ProjectDetailView';
import { DiagramEditor } from './components/editor/DiagramEditor';
import { AiAssistantModal } from './components/modals/AiAssistantModal';
import { ValidationModal } from './components/modals/ValidationModal';
import { ExportModal } from './components/modals/ExportModal';
import { IntroAnimation } from './components/common/IntroAnimation';
import {
  Project,
  Diagram,
  DiagramType,
  DiagramElement,
  Relationship,
  ValidationIssue,
} from './types/uml';
import {
  getStoredProjects,
  saveProject,
  deleteProject,
  duplicateProject,
  createNewProject,
  createDefaultDiagram,
} from './services/storage';

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeDiagramId, setActiveDiagramId] = useState<string | null>(null);

  const [currentView, setCurrentView] = useState<'home' | 'project' | 'editor'>('home');
  const [showIntro, setShowIntro] = useState<boolean>(true);

  // Dark/Light Theme with persistent state and document root sync
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('uml_theme_dark');
    if (saved !== null) {
      return saved === 'true';
    }
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Modals state
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isValidationModalOpen, setIsValidationModalOpen] = useState(false);
  const [currentValidationIssues, setCurrentValidationIssues] = useState<ValidationIssue[]>([]);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Sync theme with document classList
  useEffect(() => {
    localStorage.setItem('uml_theme_dark', String(isDarkMode));
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Load projects from storage on initial mount
  useEffect(() => {
    const loaded = getStoredProjects();
    setProjects(loaded);
  }, []);

  const activeProject = projects.find((p) => p.id === activeProjectId) || null;
  const activeDiagram = activeProject?.diagrams.find((d) => d.id === activeDiagramId) || null;

  // Navigation handlers
  const handleNavigateHome = () => {
    setCurrentView('home');
    setActiveProjectId(null);
    setActiveDiagramId(null);
  };

  const handleSelectProject = (projectId: string) => {
    setActiveProjectId(projectId);
    setActiveDiagramId(null);
    setCurrentView('project');
  };

  const handleOpenDiagram = (diagramId: string) => {
    setActiveDiagramId(diagramId);
    setCurrentView('editor');
  };

  const handleBackToProject = () => {
    setActiveDiagramId(null);
    setCurrentView('project');
  };

  // Project CRUD operations
  const handleCreateProject = (name: string, description: string) => {
    const newProj = createNewProject(name, description);
    setProjects(getStoredProjects());
    handleSelectProject(newProj.id);
  };

  const handleDuplicateProject = (projectId: string) => {
    const dup = duplicateProject(projectId);
    if (dup) {
      setProjects(getStoredProjects());
    }
  };

  const handleDeleteProject = (projectId: string) => {
    const updated = deleteProject(projectId);
    setProjects(updated);
    if (activeProjectId === projectId) {
      handleNavigateHome();
    }
  };

  const handleRenameProject = (projectId: string, newName: string, newDesc: string) => {
    const target = projects.find((p) => p.id === projectId);
    if (!target) return;
    const updated: Project = {
      ...target,
      name: newName,
      description: newDesc,
      updatedAt: new Date().toISOString(),
    };
    saveProject(updated);
    setProjects(getStoredProjects());
  };

  const handleProjectImported = (imported: Project) => {
    setProjects(getStoredProjects());
    handleSelectProject(imported.id);
  };

  // Diagram CRUD operations
  const handleCreateDiagram = (name: string, type: DiagramType) => {
    if (!activeProject) return;
    const newDiagram = createDefaultDiagram(activeProject.id, name, type);
    const updated: Project = {
      ...activeProject,
      diagrams: [...activeProject.diagrams, newDiagram],
      updatedAt: new Date().toISOString(),
    };
    saveProject(updated);
    setProjects(getStoredProjects());
    handleOpenDiagram(newDiagram.id);
  };

  const handleDuplicateDiagram = (diagramId: string) => {
    if (!activeProject) return;
    const source = activeProject.diagrams.find((d) => d.id === diagramId);
    if (!source) return;

    const newId = 'diag_' + Math.random().toString(36).substring(2, 9);
    const duplicated: Diagram = {
      ...JSON.parse(JSON.stringify(source)),
      id: newId,
      name: `${source.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated: Project = {
      ...activeProject,
      diagrams: [...activeProject.diagrams, duplicated],
      updatedAt: new Date().toISOString(),
    };
    saveProject(updated);
    setProjects(getStoredProjects());
  };

  const handleDeleteDiagram = (diagramId: string) => {
    if (!activeProject) return;
    const updated: Project = {
      ...activeProject,
      diagrams: activeProject.diagrams.filter((d) => d.id !== diagramId),
      updatedAt: new Date().toISOString(),
    };
    saveProject(updated);
    setProjects(getStoredProjects());
    if (activeDiagramId === diagramId) {
      handleBackToProject();
    }
  };

  const handleRenameDiagram = (diagramId: string, newName: string) => {
    if (!activeProject) return;
    const updated: Project = {
      ...activeProject,
      diagrams: activeProject.diagrams.map((d) =>
        d.id === diagramId
          ? { ...d, name: newName, updatedAt: new Date().toISOString() }
          : d
      ),
      updatedAt: new Date().toISOString(),
    };
    saveProject(updated);
    setProjects(getStoredProjects());
  };

  const handleChangeDiagramType = (diagramId: string, newType: DiagramType) => {
    if (!activeProject) return;
    const updated: Project = {
      ...activeProject,
      diagrams: activeProject.diagrams.map((d) =>
        d.id === diagramId
          ? { ...d, type: newType, updatedAt: new Date().toISOString() }
          : d
      ),
      updatedAt: new Date().toISOString(),
    };
    saveProject(updated);
    setProjects(getStoredProjects());
  };

  const handleReorderDiagrams = (reordered: Diagram[]) => {
    if (!activeProject) return;
    const updated: Project = {
      ...activeProject,
      diagrams: reordered,
      updatedAt: new Date().toISOString(),
    };
    saveProject(updated);
    setProjects(getStoredProjects());
  };

  const handleSaveDiagram = (updatedDiagram: Diagram) => {
    if (!activeProject) return;
    const updatedProject: Project = {
      ...activeProject,
      diagrams: activeProject.diagrams.map((d) =>
        d.id === updatedDiagram.id ? updatedDiagram : d
      ),
      updatedAt: new Date().toISOString(),
    };
    saveProject(updatedProject);
    setProjects(getStoredProjects());
  };

  // AI Generated Apply
  const handleApplyAi = (elements: DiagramElement[], relationships: Relationship[]) => {
    if (!activeDiagram || !activeProject) {
      // If called from dashboard, create a new project with this diagram!
      const newProj = createNewProject('AI Generated Architecture');
      newProj.diagrams[0].elements = elements;
      newProj.diagrams[0].relationships = relationships;
      saveProject(newProj);
      setProjects(getStoredProjects());
      handleSelectProject(newProj.id);
      handleOpenDiagram(newProj.diagrams[0].id);
      return;
    }

    const updatedDiagram: Diagram = {
      ...activeDiagram,
      elements,
      relationships,
      updatedAt: new Date().toISOString(),
    };
    handleSaveDiagram(updatedDiagram);
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950 font-sans transition-colors">
      {/* Top Header */}
      <Header
        currentView={currentView}
        projectName={activeProject?.name}
        diagramName={activeDiagram?.name}
        onNavigateHome={handleNavigateHome}
        onNavigateProject={activeProject ? () => setCurrentView('project') : undefined}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        onOpenAiGenerator={() => setIsAiModalOpen(true)}
        onReplayIntro={() => setShowIntro(true)}
      />

      {/* Main Workspace: Automatically fluid & responsive on all device screen sizes */}
      <main className="flex-1 flex flex-col overflow-hidden w-full h-full bg-slate-50 dark:bg-slate-950 transition-colors">
        {currentView === 'home' && (
          <ProjectDashboard
            projects={projects}
            onSelectProject={handleSelectProject}
            onCreateProject={handleCreateProject}
            onDuplicateProject={handleDuplicateProject}
            onDeleteProject={handleDeleteProject}
            onRenameProject={handleRenameProject}
            onProjectImported={handleProjectImported}
            onOpenAiGenerator={() => setIsAiModalOpen(true)}
          />
        )}

        {currentView === 'project' && activeProject && (
          <ProjectDetailView
            project={activeProject}
            onBack={handleNavigateHome}
            onOpenDiagram={handleOpenDiagram}
            onCreateDiagram={handleCreateDiagram}
            onDuplicateDiagram={handleDuplicateDiagram}
            onDeleteDiagram={handleDeleteDiagram}
            onRenameDiagram={handleRenameDiagram}
            onChangeDiagramType={handleChangeDiagramType}
            onReorderDiagrams={handleReorderDiagrams}
            onOpenAiGenerator={() => setIsAiModalOpen(true)}
          />
        )}

        {currentView === 'editor' && activeDiagram && activeProject && (
          <DiagramEditor
            diagram={activeDiagram}
            project={activeProject}
            onSaveDiagram={handleSaveDiagram}
            onBack={handleBackToProject}
            onOpenAiAssistant={() => setIsAiModalOpen(true)}
            onOpenExportModal={() => setIsExportModalOpen(true)}
            onOpenValidationModal={(issues) => {
              setCurrentValidationIssues(issues);
              setIsValidationModalOpen(true);
            }}
            isDarkMode={isDarkMode}
          />
        )}
      </main>

      {/* AI Assistant Modal */}
      {isAiModalOpen && (
        <AiAssistantModal
          isOpen={isAiModalOpen}
          onClose={() => setIsAiModalOpen(false)}
          currentDiagram={
            activeDiagram ||
            createDefaultDiagram('temp', 'New Architecture Diagram', 'CLASS')
          }
          onApplyChanges={handleApplyAi}
        />
      )}

      {/* Validation Diagnostics Modal */}
      {isValidationModalOpen && (
        <ValidationModal
          isOpen={isValidationModalOpen}
          onClose={() => setIsValidationModalOpen(false)}
          issues={currentValidationIssues}
          onSelectElement={() => {}}
          onSelectRelationship={() => {}}
        />
      )}

      {/* Export Modal */}
      {isExportModalOpen && activeDiagram && activeProject && (
        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          currentDiagram={activeDiagram}
          currentProject={activeProject}
          selectedElementIds={new Set()}
        />
      )}

      {/* App Launch Intro Animation */}
      {showIntro && (
        <IntroAnimation
          onComplete={() => setShowIntro(false)}
          isDarkMode={isDarkMode}
        />
      )}
    </div>
  );
}
