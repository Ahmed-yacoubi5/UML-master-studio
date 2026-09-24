import { Project, Diagram, DiagramType } from '../types/uml';
import { createDefaultUniversityProject } from './sampleProjects';

const STORAGE_KEY = 'uml_master_studio_projects_v1';
const ACTIVE_PROJECT_KEY = 'uml_master_studio_active_project';
const ACTIVE_DIAGRAM_KEY = 'uml_master_studio_active_diagram';

export function getStoredProjects(): Project[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const defaultProj = createDefaultUniversityProject();
      saveAllProjects([defaultProj]);
      return [defaultProj];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    const defaultProj = createDefaultUniversityProject();
    saveAllProjects([defaultProj]);
    return [defaultProj];
  } catch (err) {
    console.error('Error loading stored projects:', err);
    return [createDefaultUniversityProject()];
  }
}

export function saveAllProjects(projects: Project[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch (err) {
    console.error('Failed to save projects to localStorage:', err);
  }
}

export function saveProject(project: Project): void {
  const projects = getStoredProjects();
  const index = projects.findIndex((p) => p.id === project.id);
  const updatedProject = {
    ...project,
    updatedAt: new Date().toISOString(),
  };

  if (index >= 0) {
    projects[index] = updatedProject;
  } else {
    projects.unshift(updatedProject);
  }
  saveAllProjects(projects);
}

export function deleteProject(projectId: string): Project[] {
  const projects = getStoredProjects().filter((p) => p.id !== projectId);
  saveAllProjects(projects);
  return projects;
}

export function duplicateProject(projectId: string): Project | null {
  const projects = getStoredProjects();
  const source = projects.find((p) => p.id === projectId);
  if (!source) return null;

  const newId = 'proj_' + Math.random().toString(36).substring(2, 9);
  const duplicated: Project = {
    ...JSON.parse(JSON.stringify(source)),
    id: newId,
    name: `${source.name} (Copy)`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    diagrams: source.diagrams.map((d) => ({
      ...d,
      id: 'diag_' + Math.random().toString(36).substring(2, 9),
      projectId: newId,
      updatedAt: new Date().toISOString(),
    })),
  };

  projects.unshift(duplicated);
  saveAllProjects(projects);
  return duplicated;
}

export function createNewProject(name: string, description: string = ''): Project {
  const newId = 'proj_' + Math.random().toString(36).substring(2, 9);
  const newProject: Project = {
    id: newId,
    name: name.trim() || 'Untitled Project',
    description: description.trim(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    diagrams: [
      createDefaultDiagram(newId, 'Class Diagram', 'CLASS'),
    ],
  };

  const projects = getStoredProjects();
  projects.unshift(newProject);
  saveAllProjects(projects);
  return newProject;
}

export function createDefaultDiagram(projectId: string, name: string, type: DiagramType): Diagram {
  const id = 'diag_' + Math.random().toString(36).substring(2, 9);
  return {
    id,
    projectId,
    name,
    type,
    elements: [],
    relationships: [],
    canvasSettings: {
      width: 3200,
      height: 2400,
      backgroundColor: '#FFFFFF',
      gridEnabled: true,
      gridSize: 20,
      snapToGrid: true,
      zoom: 1,
      panX: 0,
      panY: 0,
      isDarkCanvas: false,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function exportProjectToFile(project: Project): void {
  const payload = {
    app: 'UML Master Studio',
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    project,
  };
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = project.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  a.href = url;
  a.download = `${safeName || 'project'}.umlstudio`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importProjectFromFile(file: File): Promise<Project> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);
        const projectData: Project = parsed.project || parsed;

        if (!projectData.name || !Array.isArray(projectData.diagrams)) {
          throw new Error('Invalid .umlstudio format: missing project name or diagrams array');
        }

        const newId = 'proj_' + Math.random().toString(36).substring(2, 9);
        const importedProject: Project = {
          ...projectData,
          id: newId,
          name: `${projectData.name} (Imported)`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          diagrams: projectData.diagrams.map((d) => ({
            ...d,
            id: 'diag_' + Math.random().toString(36).substring(2, 9),
            projectId: newId,
            canvasSettings: d.canvasSettings || {
              width: 3200,
              height: 2400,
              backgroundColor: '#FFFFFF',
              gridEnabled: true,
              gridSize: 20,
              snapToGrid: true,
              zoom: 1,
              panX: 0,
              panY: 0,
              isDarkCanvas: false,
            },
          })),
        };

        const projects = getStoredProjects();
        projects.unshift(importedProject);
        saveAllProjects(projects);
        resolve(importedProject);
      } catch (err: any) {
        reject(new Error(err.message || 'Failed to parse project file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
