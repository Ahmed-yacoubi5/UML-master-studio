import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid,
  Magnet,
  Trash2,
  Copy,
  Download,
  AlertTriangle,
  Sparkles,
  MousePointer,
  Hand,
  Link2,
  Square,
  Circle,
  Diamond,
  User,
  Plus,
  AlignLeft,
  AlignJustify,
  Settings2,
  PanelRightClose,
  PanelRightOpen,
  ArrowLeftRight,
  Edit3,
  X,
  Palette,
} from 'lucide-react';
import {
  Diagram,
  Project,
  DiagramElement,
  Relationship,
  ElementType,
  RelationshipType,
  ValidationIssue,
} from '../../types/uml';
import {
  renderDiagramToCanvas,
  computeDiagramBounds,
  findRelationshipAt,
  getRelationshipGeometry,
} from '../../services/diagramRenderer';
import { validateUmlDiagram } from '../../services/validationService';

interface DiagramEditorProps {
  diagram: Diagram;
  project: Project;
  onSaveDiagram: (updated: Diagram) => void;
  onBack: () => void;
  onOpenAiAssistant: () => void;
  onOpenExportModal: () => void;
  onOpenValidationModal: (issues: ValidationIssue[]) => void;
  isDarkMode?: boolean;
}

type EditorTool = 'select' | 'pan' | 'connect' | 'add_element';

export const DiagramEditor: React.FC<DiagramEditorProps> = ({
  diagram,
  project,
  onSaveDiagram,
  onBack,
  onOpenAiAssistant,
  onOpenExportModal,
  onOpenValidationModal,
  isDarkMode = true,
}) => {
  // Current Diagram State
  const [currentDiagram, setCurrentDiagram] = useState<Diagram>(diagram);
  const [selectedElementIds, setSelectedElementIds] = useState<Set<string>>(new Set());
  const [selectedRelationshipId, setSelectedRelationshipId] = useState<string | null>(null);

  // Active Tool
  const [activeTool, setActiveTool] = useState<EditorTool>('select');
  const [pendingElementType, setPendingElementType] = useState<ElementType | null>(null);
  const [pendingRelType, setPendingRelType] = useState<RelationshipType>('ASSOCIATION');

  // Canvas Viewport transform
  const [zoom, setZoom] = useState(diagram.canvasSettings.zoom || 1);
  const [panX, setPanX] = useState(diagram.canvasSettings.panX || 0);
  const [panY, setPanY] = useState(diagram.canvasSettings.panY || 0);
  const [snapToGrid, setSnapToGrid] = useState(diagram.canvasSettings.snapToGrid ?? true);
  const [showGrid, setShowGrid] = useState(diagram.canvasSettings.gridEnabled ?? true);
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);

  // Undo / Redo Stacks
  const [undoStack, setUndoStack] = useState<Diagram[]>([]);
  const [redoStack, setRedoStack] = useState<Diagram[]>([]);

  // Dragging & Interaction Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const elementDragOffsetsRef = useRef<Map<string, { startX: number; startY: number }>>(new Map());

  // Connection dragging
  const [connectionDraft, setConnectionDraft] = useState<{
    sourceId: string;
    currentX: number;
    currentY: number;
  } | null>(null);

  // Validation diagnostics
  const validationIssues = validateUmlDiagram(currentDiagram);

  // Save changes and record undo
  const updateDiagram = useCallback(
    (updater: (prev: Diagram) => Diagram, recordUndo: boolean = true) => {
      setCurrentDiagram((prev) => {
        if (recordUndo) {
          setUndoStack((u) => [...u.slice(-30), prev]);
          setRedoStack([]);
        }
        const updated = updater(prev);
        onSaveDiagram(updated);
        return updated;
      });
    },
    [onSaveDiagram]
  );

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack((u) => u.slice(0, -1));
    setRedoStack((r) => [...r, currentDiagram]);
    setCurrentDiagram(prev);
    onSaveDiagram(prev);
  }, [undoStack, currentDiagram, onSaveDiagram]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((r) => r.slice(0, -1));
    setUndoStack((u) => [...u, currentDiagram]);
    setCurrentDiagram(next);
    onSaveDiagram(next);
  }, [redoStack, currentDiagram, onSaveDiagram]);

  const deleteSelected = useCallback(() => {
    updateDiagram((prev) => {
      const remainingElements = prev.elements.filter((el) => !selectedElementIds.has(el.id));
      const remainingRelationships = prev.relationships.filter(
        (rel) =>
          rel.id !== selectedRelationshipId &&
          !selectedElementIds.has(rel.sourceId) &&
          !selectedElementIds.has(rel.targetId)
      );
      return {
        ...prev,
        elements: remainingElements,
        relationships: remainingRelationships,
      };
    });
    setSelectedElementIds(new Set());
    setSelectedRelationshipId(null);
  }, [selectedElementIds, selectedRelationshipId, updateDiagram]);

  const duplicateSelected = useCallback(() => {
    if (selectedElementIds.size === 0) return;
    const newIds = new Set<string>();

    updateDiagram((prev) => {
      const duplicatedElements = prev.elements
        .filter((el) => selectedElementIds.has(el.id))
        .map((el) => {
          const newId = `elem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          newIds.add(newId);
          return {
            ...JSON.parse(JSON.stringify(el)),
            id: newId,
            name: `${el.name}Copy`,
            x: el.x + 30,
            y: el.y + 30,
          };
        });
      return {
        ...prev,
        elements: [...prev.elements, ...duplicatedElements],
      };
    });

    setSelectedElementIds(newIds);
  }, [selectedElementIds, updateDiagram]);

  // Swap relationship endpoints
  const handleSwapRelationshipEndpoints = useCallback(
    (relId: string) => {
      updateDiagram((prev) => ({
        ...prev,
        relationships: prev.relationships.map((r) => {
          if (r.id === relId) {
            return {
              ...r,
              sourceId: r.targetId,
              targetId: r.sourceId,
              sourceMultiplicity: r.targetMultiplicity,
              targetMultiplicity: r.sourceMultiplicity,
              sourceRole: r.targetRole,
              targetRole: r.sourceRole,
            };
          }
          return r;
        }),
      }));
    },
    [updateDiagram]
  );

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        e.preventDefault();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        handleRedo();
        e.preventDefault();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedElementIds.size > 0 || selectedRelationshipId) {
          deleteSelected();
          e.preventDefault();
        }
      } else if (e.key === 'Escape') {
        setSelectedElementIds(new Set());
        setSelectedRelationshipId(null);
        setConnectionDraft(null);
        setActiveTool('select');
      } else if (e.key === 'v') {
        setActiveTool('select');
      } else if (e.key === 'h') {
        setActiveTool('pan');
      } else if (e.key === 'c') {
        setActiveTool('connect');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, selectedElementIds, selectedRelationshipId, deleteSelected]);

  // Render Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI display
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    ctx.save();
    ctx.scale(dpr, dpr);

    // Canvas Background (responsive to isDarkMode)
    ctx.fillStyle = isDarkMode ? '#0B0F19' : '#F8FAFC';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Canvas Transform (Pan & Zoom)
    ctx.translate(panX, panY);
    ctx.scale(zoom, zoom);

    // Draw Grid
    if (showGrid) {
      const gridSize = 20;
      ctx.strokeStyle = isDarkMode ? '#1E293B' : '#E2E8F0';
      ctx.lineWidth = 1 / zoom;
      ctx.beginPath();

      const startX = Math.floor(-panX / zoom / gridSize) * gridSize - gridSize;
      const endX = startX + rect.width / zoom + gridSize * 2;
      const startY = Math.floor(-panY / zoom / gridSize) * gridSize - gridSize;
      const endY = startY + rect.height / zoom + gridSize * 2;

      for (let x = startX; x <= endX; x += gridSize) {
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
      }
      for (let y = startY; y <= endY; y += gridSize) {
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
      }
      ctx.stroke();
    }

    // Render UML Elements & Relationships
    renderDiagramToCanvas(ctx, currentDiagram, {
      scale: 1,
      selectedElementIds,
      selectedRelationshipId,
      showHandles: selectedElementIds.size === 1,
      activeConnectionDraft: connectionDraft,
    });

    ctx.restore();
  }, [currentDiagram, zoom, panX, panY, showGrid, isDarkMode, selectedElementIds, selectedRelationshipId, connectionDraft]);

  // Coordinate Conversion
  const screenToCanvas = (screenX: number, screenY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = (screenX - rect.left - panX) / zoom;
    const y = (screenY - rect.top - panY) / zoom;
    return { x, y };
  };

  // Find element under point
  const findElementAt = (cx: number, cy: number): DiagramElement | null => {
    const elements = currentDiagram.elements;
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      if (cx >= el.x && cx <= el.x + el.width && cy >= el.y && cy <= el.y + el.height) {
        return el;
      }
    }
    return null;
  };

  // Pointer / Touch Event Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const { x: cx, y: cy } = screenToCanvas(e.clientX, e.clientY);
    dragStartRef.current = { x: e.clientX, y: e.clientY };

    // 1. Add Element Mode
    if (activeTool === 'add_element' && pendingElementType) {
      addNewElementAt(pendingElementType, cx, cy);
      setActiveTool('select');
      setPendingElementType(null);
      return;
    }

    // 2. Pan Tool or Middle Mouse or Space
    if (activeTool === 'pan' || e.button === 1 || e.buttons === 4) {
      isDraggingRef.current = true;
      return;
    }

    // 3. Connect Tool
    if (activeTool === 'connect') {
      const hit = findElementAt(cx, cy);
      if (hit) {
        setConnectionDraft({
          sourceId: hit.id,
          currentX: cx,
          currentY: cy,
        });
      }
      return;
    }

    // 4. Select / Move Tool: First check if clicked on an element
    const hitElement = findElementAt(cx, cy);
    if (hitElement) {
      setSelectedRelationshipId(null);
      if (e.shiftKey) {
        const next = new Set(selectedElementIds);
        if (next.has(hitElement.id)) next.delete(hitElement.id);
        else next.add(hitElement.id);
        setSelectedElementIds(next);
      } else {
        if (!selectedElementIds.has(hitElement.id)) {
          setSelectedElementIds(new Set([hitElement.id]));
        }
      }

      // Record offsets for moving
      const offsets = new Map<string, { startX: number; startY: number }>();
      const movingIds = selectedElementIds.has(hitElement.id) ? Array.from(selectedElementIds) : [hitElement.id];
      currentDiagram.elements.forEach((el) => {
        if (movingIds.includes(el.id)) {
          offsets.set(el.id, { startX: el.x, startY: el.y });
        }
      });
      elementDragOffsetsRef.current = offsets;
      isDraggingRef.current = true;
      return;
    }

    // Next: Check if user clicked on an existing association / relationship line or label!
    const hitRel = findRelationshipAt(cx, cy, currentDiagram, 16 / zoom);
    if (hitRel) {
      setSelectedElementIds(new Set());
      setSelectedRelationshipId(hitRel.id);
      setIsInspectorOpen(true);
      return;
    }

    // Clicked on empty canvas: deselect
    if (!e.shiftKey) {
      setSelectedElementIds(new Set());
      setSelectedRelationshipId(null);
    }
    isDraggingRef.current = true; // Drag to pan empty canvas
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const { x: cx, y: cy } = screenToCanvas(e.clientX, e.clientY);

    // Active Connection Line
    if (connectionDraft) {
      setConnectionDraft((prev) => (prev ? { ...prev, currentX: cx, currentY: cy } : null));
      return;
    }

    if (!isDraggingRef.current) {
      // Hover Hit Testing for interactive pointer cursor
      if (activeTool === 'select' && canvasRef.current) {
        const hoverEl = findElementAt(cx, cy);
        const hoverRel = !hoverEl ? findRelationshipAt(cx, cy, currentDiagram, 14 / zoom) : null;
        if (hoverEl || hoverRel) {
          canvasRef.current.style.cursor = 'pointer';
        } else {
          canvasRef.current.style.cursor = 'default';
        }
      }
      return;
    }

    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    if (activeTool === 'pan' || selectedElementIds.size === 0) {
      // Pan viewport
      setPanX((px) => px + dx);
      setPanY((py) => py + dy);
      dragStartRef.current = { x: e.clientX, y: e.clientY };
    } else {
      // Move selected elements
      const snap = snapToGrid ? 20 : 1;
      const canvasDx = dx / zoom;
      const canvasDy = dy / zoom;

      updateDiagram((prev) => {
        const updated = prev.elements.map((el) => {
          const initial = elementDragOffsetsRef.current.get(el.id);
          if (initial) {
            let nextX = initial.startX + canvasDx;
            let nextY = initial.startY + canvasDy;
            if (snapToGrid) {
              nextX = Math.round(nextX / snap) * snap;
              nextY = Math.round(nextY / snap) * snap;
            }
            return { ...el, x: Math.max(0, nextX), y: Math.max(0, nextY) };
          }
          return el;
        });
        return { ...prev, elements: updated };
      }, false);
    }
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;

    // Finalize Connection
    if (connectionDraft) {
      const hit = findElementAt(connectionDraft.currentX, connectionDraft.currentY);
      if (hit && hit.id !== connectionDraft.sourceId) {
        createRelationship(connectionDraft.sourceId, hit.id, pendingRelType);
      }
      setConnectionDraft(null);
      setActiveTool('select');
    }
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x: cx, y: cy } = screenToCanvas(e.clientX, e.clientY);
    const hitRel = findRelationshipAt(cx, cy, currentDiagram, 16 / zoom);
    if (hitRel) {
      setSelectedElementIds(new Set());
      setSelectedRelationshipId(hitRel.id);
      setIsInspectorOpen(true);
      setTimeout(() => {
        const input = document.getElementById('association-label-input');
        if (input) {
          (input as HTMLInputElement).focus();
          (input as HTMLInputElement).select();
        }
      }, 50);
    }
  };

  // Wheel Zoom / Pan
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      setZoom((z) => Math.min(3, Math.max(0.2, z * zoomFactor)));
    } else {
      setPanX((px) => px - e.deltaX);
      setPanY((py) => py - e.deltaY);
    }
  };

  // Add Elements
  const addNewElementAt = (type: ElementType, x: number, y: number) => {
    const snap = snapToGrid ? 20 : 1;
    const alignedX = Math.round(x / snap) * snap;
    const alignedY = Math.round(y / snap) * snap;

    const newId = `elem_${Date.now()}`;
    let newElement: DiagramElement;

    switch (type) {
      case 'CLASS':
      case 'INTERFACE':
      case 'ABSTRACT_CLASS':
      case 'ENUM':
        newElement = {
          id: newId,
          type,
          name: type === 'INTERFACE' ? 'OrderHandler' : 'CustomerEntity',
          x: alignedX,
          y: alignedY,
          width: 220,
          height: 160,
          stereotype: type === 'INTERFACE' ? '<<interface>>' : undefined,
          attributes: ['+ id: UUID', '+ name: String'],
          methods: ['+ validate(): Boolean'],
          style: {
            fillColor: '#FFFFFF',
            borderColor: '#334155',
            textColor: '#0F172A',
            borderWidth: 2,
            borderStyle: 'solid',
            opacity: 1,
            fontSize: 13,
            fontWeight: 'normal',
            fontStyle: 'normal',
            textAlign: 'left',
          },
        };
        break;
      case 'USE_CASE':
        newElement = {
          id: newId,
          type: 'USE_CASE',
          name: 'Perform Action',
          x: alignedX,
          y: alignedY,
          width: 180,
          height: 80,
          style: {
            fillColor: '#ECFDF5',
            borderColor: '#059669',
            textColor: '#064E3B',
            borderWidth: 2,
            borderStyle: 'solid',
            opacity: 1,
            fontSize: 13,
            fontWeight: 'normal',
            fontStyle: 'normal',
            textAlign: 'center',
          },
        };
        break;
      case 'ACTOR':
        newElement = {
          id: newId,
          type: 'ACTOR',
          name: 'User',
          x: alignedX,
          y: alignedY,
          width: 70,
          height: 90,
          style: {
            fillColor: '#E0F2FE',
            borderColor: '#0284C7',
            textColor: '#0F172A',
            borderWidth: 2,
            borderStyle: 'solid',
            opacity: 1,
            fontSize: 12,
            fontWeight: 'bold',
            fontStyle: 'normal',
            textAlign: 'center',
          },
        };
        break;
      case 'ACTION':
        newElement = {
          id: newId,
          type: 'ACTION',
          name: 'Process Payment',
          x: alignedX,
          y: alignedY,
          width: 180,
          height: 70,
          style: {
            fillColor: '#F0F9FF',
            borderColor: '#0284C7',
            textColor: '#0F172A',
            borderWidth: 2,
            borderStyle: 'solid',
            opacity: 1,
            fontSize: 13,
            fontWeight: 'normal',
            fontStyle: 'normal',
            textAlign: 'center',
          },
        };
        break;
      case 'DECISION':
        newElement = {
          id: newId,
          type: 'DECISION',
          name: 'Is Valid?',
          x: alignedX,
          y: alignedY,
          width: 110,
          height: 80,
          style: {
            fillColor: '#FEF9C3',
            borderColor: '#CA8A04',
            textColor: '#713F12',
            borderWidth: 2,
            borderStyle: 'solid',
            opacity: 1,
            fontSize: 11,
            fontWeight: 'bold',
            fontStyle: 'normal',
            textAlign: 'center',
          },
        };
        break;
      case 'LIFELINE':
        newElement = {
          id: newId,
          type: 'LIFELINE',
          name: ':Controller',
          x: alignedX,
          y: alignedY,
          width: 140,
          height: 50,
          sequenceLifelineLength: 400,
          style: {
            fillColor: '#E0F2FE',
            borderColor: '#0284C7',
            textColor: '#0369A1',
            borderWidth: 2,
            borderStyle: 'solid',
            opacity: 1,
            fontSize: 13,
            fontWeight: 'bold',
            fontStyle: 'normal',
            textAlign: 'center',
          },
        };
        break;
      case 'STATE':
        newElement = {
          id: newId,
          type: 'STATE',
          name: 'Processing',
          x: alignedX,
          y: alignedY,
          width: 180,
          height: 90,
          notes: 'entry / startTimer()\ndo / verifyHash()',
          style: {
            fillColor: '#F0F9FF',
            borderColor: '#0284C7',
            textColor: '#0369A1',
            borderWidth: 2,
            borderStyle: 'solid',
            opacity: 1,
            fontSize: 13,
            fontWeight: 'bold',
            fontStyle: 'normal',
            textAlign: 'center',
          },
        };
        break;
      default:
        newElement = {
          id: newId,
          type,
          name: 'New Node',
          x: alignedX,
          y: alignedY,
          width: 160,
          height: 90,
          style: {
            fillColor: '#F8FAFC',
            borderColor: '#475569',
            textColor: '#0F172A',
            borderWidth: 2,
            borderStyle: 'solid',
            opacity: 1,
            fontSize: 13,
            fontWeight: 'normal',
            fontStyle: 'normal',
            textAlign: 'center',
          },
        };
        break;
    }

    updateDiagram((prev) => ({
      ...prev,
      elements: [...prev.elements, newElement],
    }));
    setSelectedElementIds(new Set([newId]));
    setSelectedRelationshipId(null);
    setIsInspectorOpen(true);
  };

  const createRelationship = (sourceId: string, targetId: string, type: RelationshipType) => {
    const newRel: Relationship = {
      id: `rel_${Date.now()}`,
      type,
      sourceId,
      targetId,
      label: type === 'INCLUDE' ? '<<include>>' : type === 'EXTEND' ? '<<extend>>' : '',
      routing: 'straight',
    };

    updateDiagram((prev) => ({
      ...prev,
      relationships: [...prev.relationships, newRel],
    }));
    setSelectedRelationshipId(newRel.id);
    setSelectedElementIds(new Set());
    setIsInspectorOpen(true);
  };

  const handleFitToContent = () => {
    if (currentDiagram.elements.length === 0) return;
    const bounds = computeDiagramBounds(currentDiagram.elements);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const availableW = canvas.clientWidth - 100;
    const availableH = canvas.clientHeight - 100;

    const scaleW = availableW / bounds.width;
    const scaleH = availableH / bounds.height;
    const newZoom = Math.min(1.5, Math.max(0.3, Math.min(scaleW, scaleH)));

    setZoom(newZoom);
    setPanX((availableW - bounds.width * newZoom) / 2 - bounds.minX * newZoom + 50);
    setPanY((availableH - bounds.height * newZoom) / 2 - bounds.minY * newZoom + 50);
  };

  // Properties of Single Selected Element
  const selectedElement =
    selectedElementIds.size === 1
      ? currentDiagram.elements.find((el) => selectedElementIds.has(el.id))
      : null;

  // Properties of Selected Relationship
  const selectedRelationship = selectedRelationshipId
    ? currentDiagram.relationships.find((r) => r.id === selectedRelationshipId)
    : null;

  // Connected source and target elements for inspector
  const relSourceElement = selectedRelationship
    ? currentDiagram.elements.find((el) => el.id === selectedRelationship.sourceId)
    : null;
  const relTargetElement = selectedRelationship
    ? currentDiagram.elements.find((el) => el.id === selectedRelationship.targetId)
    : null;

  const hasInspectorContent = Boolean(selectedElement || selectedRelationship || selectedElementIds.size > 1);

  // Common quick label presets
  const commonLabels = [
    'manages',
    'employs',
    'contains',
    'has-a',
    'uses',
    'places',
    'registers',
    '<<include>>',
    '<<extend>>',
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden select-none transition-colors">
      {/* Top Toolbar */}
      <div className="h-13 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 flex items-center justify-between gap-2 shrink-0 z-20 transition-colors">
        {/* Left: Back & Title */}
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
            title="Back to Project Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <input
              type="text"
              value={currentDiagram.name}
              onChange={(e) => {
                const name = e.target.value;
                updateDiagram((prev) => ({ ...prev, name }));
              }}
              className="bg-transparent text-sm font-bold text-slate-900 dark:text-white px-1.5 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800/80 focus:bg-slate-100 dark:focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[140px] sm:max-w-[200px] truncate"
            />
            <span className="hidden xs:inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-300 border border-blue-500/20 dark:border-blue-500/30 shrink-0">
              {currentDiagram.type}
            </span>
          </div>
        </div>

        {/* Center: Undo/Redo & Zoom & Grid */}
        <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-100 dark:bg-slate-800/70 p-1 rounded-xl border border-slate-200 dark:border-slate-700/60 transition-colors">
          <button
            disabled={undoStack.length === 0}
            onClick={handleUndo}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            disabled={redoStack.length === 0}
            onClick={handleRedo}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-0.5" />

          <button
            onClick={() => setZoom((z) => Math.max(0.2, z - 0.1))}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs font-mono text-slate-600 dark:text-slate-300 px-1 min-w-[38px] text-center hidden xs:inline-block">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(3, z + 0.1))}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleFitToContent}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title="Fit to Diagram"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-0.5" />

          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-1.5 rounded-lg transition-colors ${
              showGrid
                ? 'bg-blue-600/15 dark:bg-blue-600/30 text-blue-600 dark:text-blue-300'
                : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
            title="Toggle Grid"
          >
            <Grid className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setSnapToGrid(!snapToGrid)}
            className={`p-1.5 rounded-lg transition-colors ${
              snapToGrid
                ? 'bg-blue-600/15 dark:bg-blue-600/30 text-blue-600 dark:text-blue-300'
                : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
            title="Toggle Snap to Grid (20px)"
          >
            <Magnet className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Validation & AI & Export & Inspector Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Validate Diagram Button */}
          <button
            onClick={() => onOpenValidationModal(validationIssues)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              validationIssues.some((i) => i.severity === 'error')
                ? 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20 dark:border-red-500/30'
                : validationIssues.some((i) => i.severity === 'warning')
                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20 dark:border-amber-500/30'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
            }`}
            title="Validate UML Diagram"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Validate</span>
            {validationIssues.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-500/20 text-[10px] font-bold flex items-center justify-center">
                {validationIssues.length}
              </span>
            )}
          </button>

          {/* AI Assistant */}
          <button
            onClick={onOpenAiAssistant}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-purple-500/20 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-200" />
            <span className="hidden sm:inline">AI Assist</span>
          </button>

          {/* Export */}
          <button
            onClick={onOpenExportModal}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>

          {/* Inspector Panel Toggle for Mobile / Tablets */}
          {hasInspectorContent && (
            <button
              onClick={() => setIsInspectorOpen(!isInspectorOpen)}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={isInspectorOpen ? 'Collapse Inspector' : 'Open Inspector'}
            >
              {isInspectorOpen ? (
                <PanelRightClose className="w-3.5 h-3.5" />
              ) : (
                <PanelRightOpen className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Main Workspace: Left Palette + Canvas + Right Inspector */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left UML Tool Palette (Adapts on small devices) */}
        <div className="w-12 sm:w-16 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col items-center py-3 gap-2 shrink-0 z-10 overflow-y-auto transition-colors">
          {/* Primary Pointer & Pan Tools */}
          <button
            onClick={() => {
              setActiveTool('select');
              setPendingElementType(null);
            }}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all ${
              activeTool === 'select'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Select & Move (V)"
          >
            <MousePointer className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              setActiveTool('pan');
              setPendingElementType(null);
            }}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all ${
              activeTool === 'pan'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Hand / Pan Viewport (H)"
          >
            <Hand className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              setActiveTool('connect');
              setPendingElementType(null);
            }}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all ${
              activeTool === 'connect'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Connector / Relationship (C)"
          >
            <Link2 className="w-4 h-4" />
          </button>

          <div className="w-6 sm:w-8 h-px bg-slate-200 dark:bg-slate-800 my-1" />

          {/* Adaptive UML Elements Palette based on diagram type */}
          {currentDiagram.type === 'CLASS' && (
            <>
              <button
                onClick={() => {
                  setActiveTool('add_element');
                  setPendingElementType('CLASS');
                }}
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex flex-col items-center justify-center gap-0.5 text-[9px] font-bold transition-all ${
                  pendingElementType === 'CLASS'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-blue-600 dark:text-blue-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
                title="Add Class Box"
              >
                <Square className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Class</span>
              </button>
              <button
                onClick={() => {
                  setActiveTool('add_element');
                  setPendingElementType('INTERFACE');
                }}
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex flex-col items-center justify-center gap-0.5 text-[9px] font-bold transition-all ${
                  pendingElementType === 'INTERFACE'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-purple-600 dark:text-purple-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
                title="Add Interface Box"
              >
                <Square className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-dashed" />
                <span className="hidden sm:inline">Interf</span>
              </button>
            </>
          )}

          {currentDiagram.type === 'USE_CASE' && (
            <>
              <button
                onClick={() => {
                  setActiveTool('add_element');
                  setPendingElementType('ACTOR');
                }}
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex flex-col items-center justify-center gap-0.5 text-[9px] font-bold transition-all ${
                  pendingElementType === 'ACTOR'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-sky-600 dark:text-sky-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
                title="Add Actor"
              >
                <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Actor</span>
              </button>
              <button
                onClick={() => {
                  setActiveTool('add_element');
                  setPendingElementType('USE_CASE');
                }}
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex flex-col items-center justify-center gap-0.5 text-[9px] font-bold transition-all ${
                  pendingElementType === 'USE_CASE'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-emerald-600 dark:text-emerald-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
                title="Add Use Case Oval"
              >
                <Circle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Case</span>
              </button>
            </>
          )}

          {currentDiagram.type === 'ACTIVITY' && (
            <>
              <button
                onClick={() => {
                  setActiveTool('add_element');
                  setPendingElementType('ACTION');
                }}
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex flex-col items-center justify-center gap-0.5 text-[9px] font-bold transition-all ${
                  pendingElementType === 'ACTION'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-blue-600 dark:text-blue-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
                title="Add Action Node"
              >
                <Square className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded" />
                <span className="hidden sm:inline">Action</span>
              </button>
              <button
                onClick={() => {
                  setActiveTool('add_element');
                  setPendingElementType('DECISION');
                }}
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex flex-col items-center justify-center gap-0.5 text-[9px] font-bold transition-all ${
                  pendingElementType === 'DECISION'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-amber-600 dark:text-amber-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
                title="Add Decision Diamond"
              >
                <Diamond className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Decision</span>
              </button>
            </>
          )}

          {currentDiagram.type === 'SEQUENCE' && (
            <button
              onClick={() => {
                setActiveTool('add_element');
                setPendingElementType('LIFELINE');
              }}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex flex-col items-center justify-center gap-0.5 text-[9px] font-bold transition-all ${
                pendingElementType === 'LIFELINE'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-sky-600 dark:text-sky-300 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
              title="Add Sequence Lifeline"
            >
              <Square className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Lifeline</span>
            </button>
          )}

          {currentDiagram.type === 'STATE_MACHINE' && (
            <button
              onClick={() => {
                setActiveTool('add_element');
                setPendingElementType('STATE');
              }}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex flex-col items-center justify-center gap-0.5 text-[9px] font-bold transition-all ${
                pendingElementType === 'STATE'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-rose-600 dark:text-rose-300 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
              title="Add State Node"
            >
              <Square className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded" />
              <span className="hidden sm:inline">State</span>
            </button>
          )}

          {/* Quick Actions at bottom */}
          <div className="mt-auto flex flex-col items-center gap-2">
            {(selectedElementIds.size > 0 || selectedRelationshipId) && (
              <>
                {selectedElementIds.size > 0 && (
                  <button
                    onClick={duplicateSelected}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center transition-colors"
                    title="Duplicate Selection"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={deleteSelected}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-red-500/10 dark:bg-red-500/20 hover:bg-red-500/20 dark:hover:bg-red-500/30 text-red-600 dark:text-red-400 flex items-center justify-center transition-colors"
                  title="Delete Selection (Del)"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Center Interactive Canvas */}
        <div
          ref={containerRef}
          className="flex-1 relative overflow-hidden touch-none"
        >
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onDoubleClick={handleDoubleClick}
            onWheel={handleWheel}
            className="w-full h-full block cursor-default"
          />

          {/* On-Canvas Floating Quick Action Pill for Selected Association */}
          {selectedRelationship && (() => {
            const geom = getRelationshipGeometry(selectedRelationship, currentDiagram);
            if (!geom) return null;
            const screenX = geom.mid.x * zoom + panX;
            const screenY = geom.mid.y * zoom + panY;
            return (
              <div
                style={{
                  left: `${screenX}px`,
                  top: `${screenY - 26}px`,
                  transform: 'translate(-50%, -100%)',
                }}
                className="absolute z-30 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-blue-400 dark:border-blue-500 shadow-xl text-xs backdrop-blur animate-fade-in pointer-events-auto"
              >
                <span className="font-bold text-blue-600 dark:text-blue-400 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800">
                  {selectedRelationship.type.replace('_', ' ')}
                </span>
                <input
                  type="text"
                  placeholder="Type label..."
                  value={selectedRelationship.label || ''}
                  onChange={(e) => {
                    const label = e.target.value;
                    updateDiagram((prev) => ({
                      ...prev,
                      relationships: prev.relationships.map((r) =>
                        r.id === selectedRelationship.id ? { ...r, label } : r
                      ),
                    }));
                  }}
                  className="w-28 sm:w-36 px-2 py-0.5 rounded bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-medium"
                />
                <button
                  onClick={() => handleSwapRelationshipEndpoints(selectedRelationship.id)}
                  className="p-1 rounded text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Swap Direction (Reverse Endpoints)"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={deleteSelected}
                  className="p-1 rounded text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                  title="Delete Association (Del)"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setSelectedRelationshipId(null)}
                  className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  title="Deselect"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })()}

          {/* Canvas Mode Floating Badge */}
          <div className="absolute bottom-3 left-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-2 pointer-events-none shadow-sm">
            <span>
              Mode:{' '}
              <strong className="text-blue-600 dark:text-blue-400 uppercase font-semibold">
                {activeTool === 'add_element' ? `Add ${pendingElementType}` : activeTool}
              </strong>
            </span>
            <span>•</span>
            <span>
              {selectedElementIds.size > 0
                ? `${selectedElementIds.size} element(s) selected`
                : selectedRelationshipId
                ? 'Association selected'
                : 'Click element or association to select'}
            </span>
          </div>
        </div>

        {/* Right Inspector & Properties Sidebar (Responsive slide-in or desktop sidebar) */}
        {hasInspectorContent && isInspectorOpen && (
          <div className="w-72 sm:w-80 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 p-4 overflow-y-auto space-y-4 shrink-0 text-xs text-slate-800 dark:text-slate-200 transition-colors z-20 shadow-lg">
            {/* 1. Single Element Selected */}
            {selectedElement && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                  <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Settings2 className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                    Element Properties
                  </h4>
                  <span className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                    {selectedElement.type}
                  </span>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Name</label>
                  <input
                    type="text"
                    value={selectedElement.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      updateDiagram((prev) => ({
                        ...prev,
                        elements: prev.elements.map((el) =>
                          el.id === selectedElement.id ? { ...el, name } : el
                        ),
                      }));
                    }}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Attributes (for Classes) */}
                {(selectedElement.type === 'CLASS' || selectedElement.type === 'INTERFACE') && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-slate-600 dark:text-slate-400 font-semibold">Attributes</label>
                      <button
                        onClick={() => {
                          const updated = [...(selectedElement.attributes || []), '+ newAttr: String'];
                          updateDiagram((prev) => ({
                            ...prev,
                            elements: prev.elements.map((el) =>
                              el.id === selectedElement.id ? { ...el, attributes: updated } : el
                            ),
                          }));
                        }}
                        className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1 text-[11px]"
                      >
                        <Plus className="w-3 h-3" /> Add
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      {selectedElement.attributes?.map((attr, idx) => (
                        <div key={idx} className="flex items-center gap-1">
                          <input
                            type="text"
                            value={attr}
                            onChange={(e) => {
                              const updated = [...selectedElement.attributes!];
                              updated[idx] = e.target.value;
                              updateDiagram((prev) => ({
                                ...prev,
                                elements: prev.elements.map((el) =>
                                  el.id === selectedElement.id ? { ...el, attributes: updated } : el
                                ),
                              }));
                            }}
                            className="flex-1 px-2 py-1 bg-slate-50 dark:bg-slate-800 font-mono text-[11px] border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                          />
                          <button
                            onClick={() => {
                              const updated = selectedElement.attributes!.filter((_, i) => i !== idx);
                              updateDiagram((prev) => ({
                                ...prev,
                                elements: prev.elements.map((el) =>
                                  el.id === selectedElement.id ? { ...el, attributes: updated } : el
                                ),
                              }));
                            }}
                            className="p-1 rounded text-slate-400 hover:text-red-500"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Methods (for Classes) */}
                {(selectedElement.type === 'CLASS' || selectedElement.type === 'INTERFACE') && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-slate-600 dark:text-slate-400 font-semibold">Methods</label>
                      <button
                        onClick={() => {
                          const updated = [...(selectedElement.methods || []), '+ execute(): void'];
                          updateDiagram((prev) => ({
                            ...prev,
                            elements: prev.elements.map((el) =>
                              el.id === selectedElement.id ? { ...el, methods: updated } : el
                            ),
                          }));
                        }}
                        className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1 text-[11px]"
                      >
                        <Plus className="w-3 h-3" /> Add
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      {selectedElement.methods?.map((m, idx) => (
                        <div key={idx} className="flex items-center gap-1">
                          <input
                            type="text"
                            value={m}
                            onChange={(e) => {
                              const updated = [...selectedElement.methods!];
                              updated[idx] = e.target.value;
                              updateDiagram((prev) => ({
                                ...prev,
                                elements: prev.elements.map((el) =>
                                  el.id === selectedElement.id ? { ...el, methods: updated } : el
                                ),
                              }));
                            }}
                            className="flex-1 px-2 py-1 bg-slate-50 dark:bg-slate-800 font-mono text-[11px] border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                          />
                          <button
                            onClick={() => {
                              const updated = selectedElement.methods!.filter((_, i) => i !== idx);
                              updateDiagram((prev) => ({
                                ...prev,
                                elements: prev.elements.map((el) =>
                                  el.id === selectedElement.id ? { ...el, methods: updated } : el
                                ),
                              }));
                            }}
                            className="p-1 rounded text-slate-400 hover:text-red-500"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Color Themes */}
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span className="text-slate-600 dark:text-slate-400 font-semibold block">Palette Theme</span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { fill: '#FFFFFF', border: '#334155', name: 'Classic' },
                      { fill: '#F0F9FF', border: '#0284C7', name: 'Sky' },
                      { fill: '#ECFDF5', border: '#059669', name: 'Emerald' },
                      { fill: '#F5F3FF', border: '#7C3AED', name: 'Violet' },
                      { fill: '#FEFCE8', border: '#CA8A04', name: 'Amber' },
                      { fill: '#FFF1F2', border: '#E11D48', name: 'Rose' },
                      { fill: '#0F172A', border: '#475569', text: '#F8FAFC', name: 'Slate Dark' },
                    ].map((theme, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          updateDiagram((prev) => ({
                            ...prev,
                            elements: prev.elements.map((el) =>
                              el.id === selectedElement.id
                                ? {
                                    ...el,
                                    style: {
                                      ...el.style,
                                      fillColor: theme.fill,
                                      borderColor: theme.border,
                                      textColor: theme.text || '#0F172A',
                                    },
                                  }
                                : el
                            ),
                          }));
                        }}
                        className="h-7 rounded border flex items-center justify-center text-[10px] font-semibold"
                        style={{ backgroundColor: theme.fill, borderColor: theme.border }}
                        title={theme.name}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 2. Relationship / Association Selected */}
            {selectedRelationship && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                  <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                    Association Properties
                  </h4>
                  <button
                    onClick={deleteSelected}
                    className="text-red-500 hover:text-red-600 dark:text-red-400 text-xs font-semibold px-2 py-0.5 rounded hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                    title="Delete this association"
                  >
                    Delete
                  </button>
                </div>

                {/* Connection Endpoints Info */}
                <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="min-w-0">
                      <div className="text-[10px] text-slate-500 uppercase font-semibold">Source</div>
                      <div className="font-bold text-slate-900 dark:text-slate-100 truncate">
                        {relSourceElement?.name || 'Unknown'}
                      </div>
                    </div>

                    <button
                      onClick={() => handleSwapRelationshipEndpoints(selectedRelationship.id)}
                      className="p-1.5 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-600 shadow-sm"
                      title="Swap Source and Target Direction"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                    </button>

                    <div className="text-right min-w-0">
                      <div className="text-[10px] text-slate-500 uppercase font-semibold">Target</div>
                      <div className="font-bold text-slate-900 dark:text-slate-100 truncate">
                        {relTargetElement?.name || 'Unknown'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* UML Relationship Type */}
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                    Relationship Type
                  </label>
                  <select
                    value={selectedRelationship.type}
                    onChange={(e) => {
                      const type = e.target.value as RelationshipType;
                      updateDiagram((prev) => ({
                        ...prev,
                        relationships: prev.relationships.map((r) =>
                          r.id === selectedRelationship.id ? { ...r, type } : r
                        ),
                      }));
                    }}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="ASSOCIATION">Association (—)</option>
                    <option value="DIRECTED_ASSOCIATION">Directed Association (—&gt;)</option>
                    <option value="INHERITANCE">Inheritance / Generalization (—▷)</option>
                    <option value="REALIZATION">Realization (- -▷)</option>
                    <option value="COMPOSITION">Composition (—◆)</option>
                    <option value="AGGREGATION">Aggregation (—◇)</option>
                    <option value="DEPENDENCY">Dependency (- -&gt;)</option>
                    <option value="INCLUDE">&lt;&lt;include&gt;&gt;</option>
                    <option value="EXTEND">&lt;&lt;extend&gt;&gt;</option>
                    <option value="MESSAGE">Message (Sequence —&gt;)</option>
                    <option value="RETURN_MESSAGE">Return Message (Sequence - -&gt;)</option>
                  </select>
                </div>

                {/* Association Label */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-600 dark:text-slate-400 font-semibold">
                      Association Label
                    </label>
                    {selectedRelationship.label && (
                      <button
                        onClick={() => {
                          updateDiagram((prev) => ({
                            ...prev,
                            relationships: prev.relationships.map((r) =>
                              r.id === selectedRelationship.id ? { ...r, label: '' } : r
                            ),
                          }));
                        }}
                        className="text-[10px] text-slate-400 hover:text-red-500"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <input
                    id="association-label-input"
                    type="text"
                    value={selectedRelationship.label || ''}
                    placeholder="e.g. manages, contains, places"
                    onChange={(e) => {
                      const label = e.target.value;
                      updateDiagram((prev) => ({
                        ...prev,
                        relationships: prev.relationships.map((r) =>
                          r.id === selectedRelationship.id ? { ...r, label } : r
                        ),
                      }));
                    }}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                  />

                  {/* Common Label Chips */}
                  <div className="mt-1.5">
                    <span className="text-[10px] text-slate-400 block mb-1">Quick label presets:</span>
                    <div className="flex flex-wrap gap-1">
                      {commonLabels.map((lbl) => (
                        <button
                          key={lbl}
                          onClick={() => {
                            updateDiagram((prev) => ({
                              ...prev,
                              relationships: prev.relationships.map((r) =>
                                r.id === selectedRelationship.id ? { ...r, label: lbl } : r
                              ),
                            }));
                          }}
                          className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                            selectedRelationship.label === lbl
                              ? 'bg-blue-50 dark:bg-blue-900/40 border-blue-400 text-blue-600 dark:text-blue-300 font-bold'
                              : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                          }`}
                        >
                          {lbl}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Multiplicities */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                      Source Mult
                    </label>
                    <input
                      type="text"
                      placeholder="1, 0..1, *"
                      value={selectedRelationship.sourceMultiplicity || ''}
                      onChange={(e) => {
                        const sourceMultiplicity = e.target.value;
                        updateDiagram((prev) => ({
                          ...prev,
                          relationships: prev.relationships.map((r) =>
                            r.id === selectedRelationship.id ? { ...r, sourceMultiplicity } : r
                          ),
                        }));
                      }}
                      className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-200 font-mono text-xs"
                    />
                    <div className="flex gap-1 mt-1">
                      {['1', '0..1', '*', '1..*'].map((m) => (
                        <button
                          key={m}
                          onClick={() => {
                            updateDiagram((prev) => ({
                              ...prev,
                              relationships: prev.relationships.map((r) =>
                                r.id === selectedRelationship.id ? { ...r, sourceMultiplicity: m } : r
                              ),
                            }));
                          }}
                          className="flex-1 text-[9px] py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono"
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                      Target Mult
                    </label>
                    <input
                      type="text"
                      placeholder="1..*, *"
                      value={selectedRelationship.targetMultiplicity || ''}
                      onChange={(e) => {
                        const targetMultiplicity = e.target.value;
                        updateDiagram((prev) => ({
                          ...prev,
                          relationships: prev.relationships.map((r) =>
                            r.id === selectedRelationship.id ? { ...r, targetMultiplicity } : r
                          ),
                        }));
                      }}
                      className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-200 font-mono text-xs"
                    />
                    <div className="flex gap-1 mt-1">
                      {['1', '0..1', '*', '1..*'].map((m) => (
                        <button
                          key={m}
                          onClick={() => {
                            updateDiagram((prev) => ({
                              ...prev,
                              relationships: prev.relationships.map((r) =>
                                r.id === selectedRelationship.id ? { ...r, targetMultiplicity: m } : r
                              ),
                            }));
                          }}
                          className="flex-1 text-[9px] py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono"
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Line Visual Style */}
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span className="text-slate-600 dark:text-slate-400 font-semibold block">
                    Line Styling
                  </span>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">Stroke Color</span>
                    <div className="flex items-center gap-1.5">
                      {[
                        { color: '#475569', label: 'Slate' },
                        { color: '#2563EB', label: 'Blue' },
                        { color: '#059669', label: 'Emerald' },
                        { color: '#7C3AED', label: 'Violet' },
                        { color: '#E11D48', label: 'Rose' },
                        { color: '#D97706', label: 'Amber' },
                      ].map((sw) => (
                        <button
                          key={sw.color}
                          onClick={() => {
                            updateDiagram((prev) => ({
                              ...prev,
                              relationships: prev.relationships.map((r) =>
                                r.id === selectedRelationship.id
                                  ? {
                                      ...r,
                                      style: { ...(r.style || {}), strokeColor: sw.color },
                                    }
                                  : r
                              ),
                            }));
                          }}
                          className={`w-6 h-6 rounded-full border-2 transition-transform ${
                            (selectedRelationship.style?.strokeColor || '#475569') === sw.color
                              ? 'scale-110 border-blue-500 shadow-sm'
                              : 'border-transparent'
                          }`}
                          style={{ backgroundColor: sw.color }}
                          title={sw.label}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">Width</span>
                      <select
                        value={selectedRelationship.style?.strokeWidth || 2}
                        onChange={(e) => {
                          const strokeWidth = Number(e.target.value);
                          updateDiagram((prev) => ({
                            ...prev,
                            relationships: prev.relationships.map((r) =>
                              r.id === selectedRelationship.id
                                ? { ...r, style: { ...(r.style || {}), strokeWidth } }
                                : r
                            ),
                          }));
                        }}
                        className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs"
                      >
                        <option value={1}>1px Fine</option>
                        <option value={2}>2px Regular</option>
                        <option value={3}>3px Bold</option>
                        <option value={4}>4px Heavy</option>
                      </select>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">Pattern</span>
                      <button
                        onClick={() => {
                          const isDashed = !selectedRelationship.style?.isDashed;
                          updateDiagram((prev) => ({
                            ...prev,
                            relationships: prev.relationships.map((r) =>
                              r.id === selectedRelationship.id
                                ? { ...r, style: { ...(r.style || {}), isDashed } }
                                : r
                            ),
                          }));
                        }}
                        className={`w-full py-1 rounded border text-xs font-medium transition-colors ${
                          selectedRelationship.style?.isDashed
                            ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-400 text-blue-600 dark:text-blue-300'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {selectedRelationship.style?.isDashed ? 'Dashed - -' : 'Solid —'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Delete Association Button */}
                <div className="pt-2">
                  <button
                    onClick={deleteSelected}
                    className="w-full py-2 rounded-xl bg-red-500/10 dark:bg-red-500/20 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Association (Del)</span>
                  </button>
                </div>
              </div>
            )}

            {/* 3. Multiple Elements Selected: Batch Align */}
            {selectedElementIds.size > 1 && (
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] pb-2 border-b border-slate-200 dark:border-slate-800">
                  Multiple Selected ({selectedElementIds.size})
                </h4>

                <div className="space-y-1.5">
                  <span className="text-slate-600 dark:text-slate-400 font-semibold block">Align Elements</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => {
                        const minX = Math.min(
                          ...currentDiagram.elements
                            .filter((el) => selectedElementIds.has(el.id))
                            .map((el) => el.x)
                        );
                        updateDiagram((prev) => ({
                          ...prev,
                          elements: prev.elements.map((el) =>
                            selectedElementIds.has(el.id) ? { ...el, x: minX } : el
                          ),
                        }));
                      }}
                      className="p-1.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1"
                      title="Align Left"
                    >
                      <AlignLeft className="w-3.5 h-3.5" /> Left
                    </button>

                    <button
                      onClick={() => {
                        const minY = Math.min(
                          ...currentDiagram.elements
                            .filter((el) => selectedElementIds.has(el.id))
                            .map((el) => el.y)
                        );
                        updateDiagram((prev) => ({
                          ...prev,
                          elements: prev.elements.map((el) =>
                            selectedElementIds.has(el.id) ? { ...el, y: minY } : el
                          ),
                        }));
                      }}
                      className="p-1.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1"
                      title="Align Top"
                    >
                      <AlignJustify className="w-3.5 h-3.5" /> Top
                    </button>

                    <button
                      onClick={duplicateSelected}
                      className="p-1.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 flex items-center justify-center gap-1"
                      title="Duplicate"
                    >
                      <Copy className="w-3.5 h-3.5" /> Clone
                    </button>
                  </div>
                </div>

                <button
                  onClick={deleteSelected}
                  className="w-full py-1.5 rounded bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-500/20 text-xs font-semibold"
                >
                  Delete Selected ({selectedElementIds.size})
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
