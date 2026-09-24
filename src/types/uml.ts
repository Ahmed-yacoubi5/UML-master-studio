/**
 * UML Master Studio - Domain Types and Enums
 */

export type DiagramType =
  | 'CLASS'
  | 'USE_CASE'
  | 'ACTIVITY'
  | 'SEQUENCE'
  | 'STATE_MACHINE'
  | 'COMPONENT'
  | 'DEPLOYMENT'
  | 'PACKAGE'
  | 'OBJECT';

export type ElementType =
  // Structural (Class & Object)
  | 'CLASS'
  | 'INTERFACE'
  | 'ABSTRACT_CLASS'
  | 'ENUM'
  | 'OBJECT'
  | 'PACKAGE'
  | 'COMPONENT'
  | 'NODE'
  | 'DEVICE'
  | 'ARTIFACT'
  // Behavioral (Use Case)
  | 'ACTOR'
  | 'USE_CASE'
  | 'SYSTEM_BOUNDARY'
  // Behavioral (Activity)
  | 'INITIAL_NODE'
  | 'ACTION'
  | 'DECISION'
  | 'MERGE'
  | 'FORK'
  | 'JOIN'
  | 'FINAL_NODE'
  | 'SWIMLANE'
  // Behavioral (Sequence)
  | 'LIFELINE'
  | 'ACTIVATION'
  | 'COMBINED_FRAGMENT'
  // Behavioral (State Machine)
  | 'INITIAL_STATE'
  | 'STATE'
  | 'COMPOSITE_STATE'
  | 'FINAL_STATE'
  // Generic
  | 'NOTE'
  | 'TEXT_LABEL';

export type RelationshipType =
  | 'ASSOCIATION'
  | 'DIRECTED_ASSOCIATION'
  | 'AGGREGATION'
  | 'COMPOSITION'
  | 'INHERITANCE'
  | 'REALIZATION'
  | 'DEPENDENCY'
  | 'INCLUDE'
  | 'EXTEND'
  | 'CONTROL_FLOW'
  | 'MESSAGE'
  | 'RETURN_MESSAGE'
  | 'SELF_MESSAGE'
  | 'COMMUNICATION_LINK';

export type LineRouting = 'straight' | 'orthogonal' | 'curved';

export interface ElementStyle {
  fillColor: string;
  borderColor: string;
  textColor: string;
  borderWidth: number;
  borderStyle: 'solid' | 'dashed' | 'dotted';
  opacity: number;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textAlign: 'left' | 'center' | 'right';
}

export interface DiagramElement {
  id: string;
  type: ElementType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  stereotype?: string;
  attributes?: string[];
  methods?: string[];
  notes?: string;
  style: ElementStyle;
  // Specific properties
  sequenceLifelineLength?: number;
  decisionCondition?: string;
  guardText?: string;
  isAbstract?: boolean;
  isStatic?: boolean;
}

export interface Relationship {
  id: string;
  type: RelationshipType;
  sourceId: string;
  targetId: string;
  sourceHandle?: 'top' | 'right' | 'bottom' | 'left';
  targetHandle?: 'top' | 'right' | 'bottom' | 'left';
  label?: string;
  sourceMultiplicity?: string;
  targetMultiplicity?: string;
  sourceRole?: string;
  targetRole?: string;
  routing?: LineRouting;
  style?: {
    strokeColor?: string;
    strokeWidth?: number;
    isDashed?: boolean;
  };
}

export interface CanvasSettings {
  width: number;
  height: number;
  backgroundColor: string;
  gridEnabled: boolean;
  gridSize: number;
  snapToGrid: boolean;
  zoom: number;
  panX: number;
  panY: number;
  isDarkCanvas: boolean;
}

export interface Diagram {
  id: string;
  projectId: string;
  name: string;
  type: DiagramType;
  elements: DiagramElement[];
  relationships: Relationship[];
  canvasSettings: CanvasSettings;
  createdAt: string;
  updatedAt: string;
  thumbnail?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  diagrams: Diagram[];
  thumbnail?: string;
}

export interface ColorPalettePreset {
  id: string;
  name: string;
  fill: string;
  border: string;
  text: string;
}

export const COLOR_PALETTES: ColorPalettePreset[] = [
  {
    id: 'default-uml',
    name: 'Default UML Classic',
    fill: '#FEFCE8', // soft parchment yellow
    border: '#CA8A04',
    text: '#1E293B',
  },
  {
    id: 'professional-blue',
    name: 'Executive Navy',
    fill: '#F0F9FF',
    border: '#0284C7',
    text: '#0F172A',
  },
  {
    id: 'emerald-clean',
    name: 'Emerald Modern',
    fill: '#ECFDF5',
    border: '#059669',
    text: '#064E3B',
  },
  {
    id: 'lavender-tech',
    name: 'Violet Architect',
    fill: '#F5F3FF',
    border: '#7C3AED',
    text: '#2E1065',
  },
  {
    id: 'slate-minimal',
    name: 'Monochrome Slate',
    fill: '#F8FAFC',
    border: '#475569',
    text: '#0F172A',
  },
  {
    id: 'dark-canvas-box',
    name: 'Dark Contrast Box',
    fill: '#1E293B',
    border: '#38BDF8',
    text: '#F8FAFC',
  },
  {
    id: 'sunset-amber',
    name: 'Amber System',
    fill: '#FFFBEB',
    border: '#D97706',
    text: '#451A03',
  },
];

export interface ValidationIssue {
  id: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  elementId?: string;
  relationshipId?: string;
}
