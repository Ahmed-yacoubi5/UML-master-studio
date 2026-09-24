import { Diagram, DiagramElement, Relationship } from '../types/uml';

export interface RenderOptions {
  scale?: number;
  backgroundColor?: string | 'transparent';
  selectedElementIds?: Set<string>;
  showHandles?: boolean;
  selectedRelationshipId?: string | null;
  activeConnectionDraft?: {
    sourceId: string;
    currentX: number;
    currentY: number;
  } | null;
}

export function computeDiagramBounds(elements: DiagramElement[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
} {
  if (elements.length === 0) {
    return { minX: 0, minY: 0, maxX: 800, maxY: 600, width: 800, height: 600 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  elements.forEach((el) => {
    minX = Math.min(minX, el.x);
    minY = Math.min(minY, el.y);
    maxX = Math.max(maxX, el.x + el.width);
    const extraH = el.type === 'LIFELINE' ? (el.sequenceLifelineLength || 400) : 0;
    maxY = Math.max(maxY, el.y + el.height + extraH);
  });

  const padding = 60;
  minX = Math.max(0, minX - padding);
  minY = Math.max(0, minY - padding);
  maxX = maxX + padding;
  maxY = maxY + padding;

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(400, maxX - minX),
    height: Math.max(300, maxY - minY),
  };
}

export function renderDiagramToCanvas(
  ctx: CanvasRenderingContext2D,
  diagram: Diagram,
  options: RenderOptions = {}
): void {
  const scale = options.scale || 1;
  const elements = diagram.elements;
  const elementMap = new Map<string, DiagramElement>();
  elements.forEach((el) => elementMap.set(el.id, el));

  ctx.save();
  ctx.scale(scale, scale);

  // Background
  if (options.backgroundColor && options.backgroundColor !== 'transparent') {
    ctx.fillStyle = options.backgroundColor;
    ctx.fillRect(0, 0, ctx.canvas.width / scale, ctx.canvas.height / scale);
  }

  // 1. Draw Relationships first (behind elements)
  diagram.relationships.forEach((rel) => {
    const src = elementMap.get(rel.sourceId);
    const tgt = elementMap.get(rel.targetId);
    if (!src || !tgt) return;

    const isSelected = options.selectedRelationshipId === rel.id;
    drawRelationship(ctx, rel, src, tgt, isSelected);
  });

  // Draw active draft connection
  if (options.activeConnectionDraft) {
    const src = elementMap.get(options.activeConnectionDraft.sourceId);
    if (src) {
      const srcCenter = getElementCenter(src);
      ctx.save();
      ctx.strokeStyle = '#0284C7';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(srcCenter.x, srcCenter.y);
      ctx.lineTo(options.activeConnectionDraft.currentX, options.activeConnectionDraft.currentY);
      ctx.stroke();
      ctx.restore();
    }
  }

  // 2. Draw Elements
  elements.forEach((el) => {
    const isSelected = options.selectedElementIds?.has(el.id) || false;
    drawElement(ctx, el, isSelected, options.showHandles || false);
  });

  ctx.restore();
}

export function getElementCenter(el: DiagramElement): { x: number; y: number } {
  return {
    x: el.x + el.width / 2,
    y: el.y + el.height / 2,
  };
}

// Calculate intersection point of line connecting center to edge of element
export function getAnchorPoint(from: { x: number; y: number }, el: DiagramElement): { x: number; y: number } {
  const cx = el.x + el.width / 2;
  const cy = el.y + el.height / 2;
  const dx = from.x - cx;
  const dy = from.y - cy;

  if (dx === 0 && dy === 0) return { x: cx, y: cy };

  if (el.type === 'USE_CASE') {
    // Ellipse intersection
    const a = el.width / 2;
    const b = el.height / 2;
    const angle = Math.atan2(dy, dx);
    return {
      x: cx + a * Math.cos(angle),
      y: cy + b * Math.sin(angle),
    };
  }

  // Rectangle intersection
  const halfW = el.width / 2;
  const halfH = el.height / 2;
  const tan = Math.abs(dy / (dx || 0.001));
  const rectTan = halfH / halfW;

  let ix = 0;
  let iy = 0;

  if (tan <= rectTan) {
    ix = dx > 0 ? halfW : -halfW;
    iy = dx > 0 ? halfW * (dy / dx) : -halfW * (dy / dx);
  } else {
    iy = dy > 0 ? halfH : -halfH;
    ix = dy > 0 ? halfH * (dx / dy) : -halfH * (dx / dy);
  }

  return { x: cx + ix, y: cy + iy };
}

// Calculate point-to-segment distance
export function distToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}

// Find relationship at given canvas coordinates
export function findRelationshipAt(
  cx: number,
  cy: number,
  diagram: Diagram,
  tolerance: number = 14
): Relationship | null {
  const elementMap = new Map<string, DiagramElement>();
  diagram.elements.forEach((el) => elementMap.set(el.id, el));

  let closestRel: Relationship | null = null;
  let minDistance = Infinity;

  for (let i = diagram.relationships.length - 1; i >= 0; i--) {
    const rel = diagram.relationships[i];
    const src = elementMap.get(rel.sourceId);
    const tgt = elementMap.get(rel.targetId);
    if (!src || !tgt) continue;

    const srcCenter = getElementCenter(src);
    const tgtCenter = getElementCenter(tgt);
    const p1 = getAnchorPoint(tgtCenter, src);
    const p2 = getAnchorPoint(srcCenter, tgt);

    // 1. Line segment distance
    const dist = distToSegment(cx, cy, p1.x, p1.y, p2.x, p2.y);

    // 2. Check label bounding box if label exists
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;
    let isNearLabel = false;
    if (rel.label) {
      const approxW = Math.max(48, rel.label.length * 8 + 18);
      if (
        cx >= midX - approxW / 2 - 4 &&
        cx <= midX + approxW / 2 + 4 &&
        cy >= midY - 26 &&
        cy <= midY + 8
      ) {
        isNearLabel = true;
      }
    }

    if (isNearLabel) {
      return rel;
    }

    if (dist <= tolerance && dist < minDistance) {
      minDistance = dist;
      closestRel = rel;
    }
  }

  return closestRel;
}

// Get relationship coordinates for overlays or toolbars
export function getRelationshipGeometry(
  rel: Relationship,
  diagram: Diagram
): { p1: { x: number; y: number }; p2: { x: number; y: number }; mid: { x: number; y: number } } | null {
  const src = diagram.elements.find((el) => el.id === rel.sourceId);
  const tgt = diagram.elements.find((el) => el.id === rel.targetId);
  if (!src || !tgt) return null;

  const srcCenter = getElementCenter(src);
  const tgtCenter = getElementCenter(tgt);
  const p1 = getAnchorPoint(tgtCenter, src);
  const p2 = getAnchorPoint(srcCenter, tgt);

  return {
    p1,
    p2,
    mid: {
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2,
    },
  };
}

function drawRelationship(
  ctx: CanvasRenderingContext2D,
  rel: Relationship,
  src: DiagramElement,
  tgt: DiagramElement,
  isSelected: boolean
): void {
  const srcCenter = getElementCenter(src);
  const tgtCenter = getElementCenter(tgt);

  const p1 = getAnchorPoint(tgtCenter, src);
  const p2 = getAnchorPoint(srcCenter, tgt);

  const midX = (p1.x + p2.x) / 2;
  const midY = (p1.y + p2.y) / 2;
  const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);

  // Outer glowing halo when selected
  if (isSelected) {
    ctx.save();
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = (rel.style?.strokeWidth || 2) + 8;
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.strokeStyle = isSelected ? '#2563EB' : rel.style?.strokeColor || '#475569';
  ctx.lineWidth = isSelected ? 3 : rel.style?.strokeWidth || 2;

  const isDashed =
    rel.type === 'REALIZATION' ||
    rel.type === 'DEPENDENCY' ||
    rel.type === 'INCLUDE' ||
    rel.type === 'EXTEND' ||
    rel.type === 'RETURN_MESSAGE' ||
    rel.style?.isDashed;

  if (isDashed) {
    ctx.setLineDash([6, 4]);
  } else {
    ctx.setLineDash([]);
  }

  // Draw line
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();

  // Draw Arrowhead at Target
  ctx.setLineDash([]);
  drawArrowHead(ctx, p2.x, p2.y, angle, rel.type, isSelected);

  // Selection interactive handles
  if (isSelected) {
    const drawHandle = (hx: number, hy: number) => {
      ctx.save();
      ctx.fillStyle = '#2563EB';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(hx, hy, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    };
    drawHandle(p1.x, p1.y);
    drawHandle(p2.x, p2.y);
    drawHandle(midX, midY);
  }

  // Draw Label Pill
  if (rel.label) {
    ctx.font = '11px "Plus Jakarta Sans", sans-serif';
    const textWidth = ctx.measureText(rel.label).width;
    const padX = 8;
    const padY = 3;
    const pillH = 18;
    const pillW = Math.max(textWidth + padX * 2, 28);
    const pillX = midX - pillW / 2;
    const pillY = midY - 20;

    ctx.save();
    ctx.fillStyle = isSelected ? '#EFF6FF' : '#FFFFFF';
    ctx.strokeStyle = isSelected ? '#3B82F6' : '#CBD5E1';
    ctx.lineWidth = isSelected ? 1.5 : 1;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
    ctx.shadowBlur = 4;

    ctx.beginPath();
    if (typeof (ctx as any).roundRect === 'function') {
      (ctx as any).roundRect(pillX, pillY, pillW, pillH, 4);
    } else {
      ctx.rect(pillX, pillY, pillW, pillH);
    }
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isSelected ? '#1D4ED8' : '#334155';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(rel.label, midX, pillY + pillH / 2);
    ctx.restore();
  }

  // Multiplicities
  if (rel.sourceMultiplicity) {
    const smX = p1.x + Math.cos(angle) * 24;
    const smY = p1.y + Math.sin(angle) * 24;
    ctx.font = '10px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = isSelected ? '#1D4ED8' : '#475569';
    ctx.fillText(rel.sourceMultiplicity, smX, smY - 6);
  }

  if (rel.targetMultiplicity) {
    const tmX = p2.x - Math.cos(angle) * 32;
    const tmY = p2.y - Math.sin(angle) * 32;
    ctx.font = '10px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = isSelected ? '#1D4ED8' : '#475569';
    ctx.fillText(rel.targetMultiplicity, tmX, tmY - 6);
  }

  ctx.restore();
}

function drawArrowHead(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  type: Relationship['type'],
  isSelected: boolean
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  const arrowSize = 12;
  ctx.lineWidth = 2;
  ctx.strokeStyle = isSelected ? '#3B82F6' : '#475569';

  switch (type) {
    case 'INHERITANCE':
    case 'REALIZATION': {
      // Hollow closed triangle
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-arrowSize, -arrowSize * 0.6);
      ctx.lineTo(-arrowSize, arrowSize * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'COMPOSITION': {
      // Filled diamond
      ctx.fillStyle = isSelected ? '#3B82F6' : '#334155';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-arrowSize * 0.8, -arrowSize * 0.5);
      ctx.lineTo(-arrowSize * 1.6, 0);
      ctx.lineTo(-arrowSize * 0.8, arrowSize * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'AGGREGATION': {
      // Hollow diamond
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-arrowSize * 0.8, -arrowSize * 0.5);
      ctx.lineTo(-arrowSize * 1.6, 0);
      ctx.lineTo(-arrowSize * 0.8, arrowSize * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'DIRECTED_ASSOCIATION':
    case 'DEPENDENCY':
    case 'INCLUDE':
    case 'EXTEND':
    case 'CONTROL_FLOW':
    case 'MESSAGE': {
      // Open arrowhead
      ctx.beginPath();
      ctx.moveTo(-arrowSize, -arrowSize * 0.5);
      ctx.lineTo(0, 0);
      ctx.lineTo(-arrowSize, arrowSize * 0.5);
      ctx.stroke();
      break;
    }
    case 'RETURN_MESSAGE': {
      ctx.beginPath();
      ctx.moveTo(-arrowSize, -arrowSize * 0.5);
      ctx.lineTo(0, 0);
      ctx.lineTo(-arrowSize, arrowSize * 0.5);
      ctx.stroke();
      break;
    }
    default:
      // simple association has no arrow
      break;
  }

  ctx.restore();
}

function drawElement(
  ctx: CanvasRenderingContext2D,
  el: DiagramElement,
  isSelected: boolean,
  showHandles: boolean
): void {
  ctx.save();
  ctx.globalAlpha = el.style.opacity ?? 1;

  // Specific Element Renderers
  switch (el.type) {
    case 'CLASS':
    case 'INTERFACE':
    case 'ABSTRACT_CLASS':
    case 'ENUM':
    case 'OBJECT':
      drawClassBox(ctx, el);
      break;
    case 'USE_CASE':
      drawUseCaseOval(ctx, el);
      break;
    case 'ACTOR':
      drawActorStickFigure(ctx, el);
      break;
    case 'SYSTEM_BOUNDARY':
      drawSystemBoundary(ctx, el);
      break;
    case 'INITIAL_NODE':
    case 'INITIAL_STATE':
      drawInitialNode(ctx, el);
      break;
    case 'FINAL_NODE':
    case 'FINAL_STATE':
      drawFinalNode(ctx, el);
      break;
    case 'ACTION':
      drawActionNode(ctx, el);
      break;
    case 'DECISION':
    case 'MERGE':
      drawDecisionDiamond(ctx, el);
      break;
    case 'FORK':
    case 'JOIN':
      drawForkJoinBar(ctx, el);
      break;
    case 'LIFELINE':
      drawLifeline(ctx, el);
      break;
    case 'STATE':
    case 'COMPOSITE_STATE':
      drawStateBox(ctx, el);
      break;
    default:
      drawGenericBox(ctx, el);
      break;
  }

  // Selection outline & handles
  if (isSelected) {
    ctx.strokeStyle = '#2563EB';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    const p = 4;
    ctx.strokeRect(el.x - p, el.y - p, el.width + p * 2, el.height + p * 2);
    ctx.setLineDash([]);

    if (showHandles) {
      drawResizeHandles(ctx, el);
    }
  }

  ctx.restore();
}

function drawClassBox(ctx: CanvasRenderingContext2D, el: DiagramElement): void {
  const { x, y, width, height, style } = el;
  const isInterface = el.type === 'INTERFACE' || el.stereotype?.includes('interface');

  // Box background
  ctx.fillStyle = style.fillColor || '#FFFFFF';
  ctx.strokeStyle = style.borderColor || '#334155';
  ctx.lineWidth = style.borderWidth || 2;
  if (isInterface) {
    ctx.setLineDash([4, 2]);
  }

  ctx.fillRect(x, y, width, height);
  ctx.strokeRect(x, y, width, height);
  ctx.setLineDash([]);

  // Title section
  let currentY = y + 16;
  ctx.textAlign = 'center';
  ctx.fillStyle = style.textColor || '#0F172A';

  if (el.stereotype) {
    ctx.font = 'italic 11px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(el.stereotype, x + width / 2, currentY);
    currentY += 14;
  } else if (isInterface) {
    ctx.font = 'italic 11px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('<<interface>>', x + width / 2, currentY);
    currentY += 14;
  }

  ctx.font = `bold ${style.fontSize || 13}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillText(el.name, x + width / 2, currentY);
  currentY += 12;

  // Divider 1
  ctx.beginPath();
  ctx.moveTo(x, currentY);
  ctx.lineTo(x + width, currentY);
  ctx.stroke();

  // Attributes
  currentY += 16;
  ctx.textAlign = 'left';
  ctx.font = `${(style.fontSize || 13) - 1}px "Fira Code", monospace`;

  if (el.attributes && el.attributes.length > 0) {
    el.attributes.forEach((attr) => {
      ctx.fillText(attr, x + 10, currentY);
      currentY += 16;
    });
  } else {
    currentY += 4;
  }

  // Divider 2
  ctx.beginPath();
  ctx.moveTo(x, currentY);
  ctx.lineTo(x + width, currentY);
  ctx.stroke();

  // Methods
  currentY += 16;
  if (el.methods && el.methods.length > 0) {
    el.methods.forEach((method) => {
      ctx.fillText(method, x + 10, currentY);
      currentY += 16;
    });
  }
}

function drawUseCaseOval(ctx: CanvasRenderingContext2D, el: DiagramElement): void {
  const { x, y, width, height, style } = el;
  const rx = width / 2;
  const ry = height / 2;
  const cx = x + rx;
  const cy = y + ry;

  ctx.fillStyle = style.fillColor || '#ECFDF5';
  ctx.strokeStyle = style.borderColor || '#059669';
  ctx.lineWidth = style.borderWidth || 2;

  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Center text
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = style.textColor || '#064E3B';
  ctx.font = `500 ${style.fontSize || 13}px "Plus Jakarta Sans", sans-serif`;
  wrapText(ctx, el.name, cx, cy, width - 24, 16);
}

function drawActorStickFigure(ctx: CanvasRenderingContext2D, el: DiagramElement): void {
  const { x, y, width, height, style } = el;
  const cx = x + width / 2;

  ctx.strokeStyle = style.borderColor || '#0284C7';
  ctx.fillStyle = style.fillColor || '#E0F2FE';
  ctx.lineWidth = style.borderWidth || 2;

  // Head
  const headRadius = 14;
  const headY = y + headRadius + 4;
  ctx.beginPath();
  ctx.arc(cx, headY, headRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Spine
  const spineTopY = headY + headRadius;
  const spineBottomY = y + height - 24;
  ctx.beginPath();
  ctx.moveTo(cx, spineTopY);
  ctx.lineTo(cx, spineBottomY);
  ctx.stroke();

  // Arms
  const armY = spineTopY + 12;
  ctx.beginPath();
  ctx.moveTo(cx - 24, armY);
  ctx.lineTo(cx + 24, armY);
  ctx.stroke();

  // Legs
  ctx.beginPath();
  ctx.moveTo(cx, spineBottomY);
  ctx.lineTo(cx - 18, spineBottomY + 20);
  ctx.moveTo(cx, spineBottomY);
  ctx.lineTo(cx + 18, spineBottomY + 20);
  ctx.stroke();

  // Label
  ctx.textAlign = 'center';
  ctx.fillStyle = style.textColor || '#0F172A';
  ctx.font = `600 ${style.fontSize || 12}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillText(el.name, cx, y + height + 14);
}

function drawSystemBoundary(ctx: CanvasRenderingContext2D, el: DiagramElement): void {
  const { x, y, width, height, style } = el;

  ctx.fillStyle = style.fillColor || '#F8FAFC';
  ctx.strokeStyle = style.borderColor || '#94A3B8';
  ctx.lineWidth = style.borderWidth || 2;
  ctx.setLineDash([6, 4]);

  ctx.fillRect(x, y, width, height);
  ctx.strokeRect(x, y, width, height);
  ctx.setLineDash([]);

  // Title on top
  ctx.fillStyle = style.textColor || '#334155';
  ctx.font = `bold ${style.fontSize || 14}px "Plus Jakarta Sans", sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText(el.name, x + 16, y + 24);
}

function drawInitialNode(ctx: CanvasRenderingContext2D, el: DiagramElement): void {
  const { x, y, width, height, style } = el;
  const r = Math.min(width, height) / 2;
  const cx = x + width / 2;
  const cy = y + height / 2;

  ctx.fillStyle = style.fillColor || '#0F172A';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawFinalNode(ctx: CanvasRenderingContext2D, el: DiagramElement): void {
  const { x, y, width, height, style } = el;
  const r = Math.min(width, height) / 2;
  const cx = x + width / 2;
  const cy = y + height / 2;

  // Outer ring
  ctx.strokeStyle = style.borderColor || '#0F172A';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  // Inner solid circle
  ctx.fillStyle = style.fillColor || '#0F172A';
  ctx.beginPath();
  ctx.arc(cx, cy, r - 5, 0, Math.PI * 2);
  ctx.fill();
}

function drawActionNode(ctx: CanvasRenderingContext2D, el: DiagramElement): void {
  const { x, y, width, height, style } = el;
  const radius = 16;

  ctx.fillStyle = style.fillColor || '#F0F9FF';
  ctx.strokeStyle = style.borderColor || '#0284C7';
  ctx.lineWidth = style.borderWidth || 2;

  drawRoundedRect(ctx, x, y, width, height, radius);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = style.textColor || '#0F172A';
  ctx.font = `500 ${style.fontSize || 13}px "Plus Jakarta Sans", sans-serif`;
  wrapText(ctx, el.name, x + width / 2, y + height / 2, width - 20, 16);
}

function drawDecisionDiamond(ctx: CanvasRenderingContext2D, el: DiagramElement): void {
  const { x, y, width, height, style } = el;
  const cx = x + width / 2;
  const cy = y + height / 2;

  ctx.fillStyle = style.fillColor || '#FEF9C3';
  ctx.strokeStyle = style.borderColor || '#CA8A04';
  ctx.lineWidth = style.borderWidth || 2;

  ctx.beginPath();
  ctx.moveTo(cx, y);
  ctx.lineTo(x + width, cy);
  ctx.lineTo(cx, y + height);
  ctx.lineTo(x, cy);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  if (el.name && el.name !== 'Decision') {
    ctx.textAlign = 'center';
    ctx.fillStyle = style.textColor || '#713F12';
    ctx.font = `600 11px "Plus Jakarta Sans", sans-serif`;
    ctx.fillText(el.name, cx, y + height + 14);
  }
}

function drawForkJoinBar(ctx: CanvasRenderingContext2D, el: DiagramElement): void {
  const { x, y, width, height, style } = el;
  ctx.fillStyle = style.fillColor || '#0F172A';
  ctx.fillRect(x, y, width, height);
}

function drawLifeline(ctx: CanvasRenderingContext2D, el: DiagramElement): void {
  const { x, y, width, height, style } = el;
  const lineLength = el.sequenceLifelineLength || 400;
  const cx = x + width / 2;

  // Header Box
  ctx.fillStyle = style.fillColor || '#E0F2FE';
  ctx.strokeStyle = style.borderColor || '#0284C7';
  ctx.lineWidth = style.borderWidth || 2;

  ctx.fillRect(x, y, width, height);
  ctx.strokeRect(x, y, width, height);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = style.textColor || '#0369A1';
  ctx.font = `bold ${style.fontSize || 13}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillText(el.name, cx, y + height / 2);

  // Dashed Lifeline extending downward
  ctx.strokeStyle = '#94A3B8';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(cx, y + height);
  ctx.lineTo(cx, y + height + lineLength);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawStateBox(ctx: CanvasRenderingContext2D, el: DiagramElement): void {
  const { x, y, width, height, style } = el;
  const radius = 12;

  ctx.fillStyle = style.fillColor || '#F0F9FF';
  ctx.strokeStyle = style.borderColor || '#0284C7';
  ctx.lineWidth = style.borderWidth || 2;

  drawRoundedRect(ctx, x, y, width, height, radius);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = style.textColor || '#0369A1';
  ctx.font = `bold ${style.fontSize || 13}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillText(el.name, x + width / 2, y + 24);

  if (el.notes) {
    ctx.beginPath();
    ctx.moveTo(x, y + 34);
    ctx.lineTo(x + width, y + 34);
    ctx.strokeStyle = style.borderColor || '#0284C7';
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.font = `11px "Fira Code", monospace`;
    ctx.fillStyle = '#475569';
    const lines = el.notes.split('\n');
    lines.forEach((l, idx) => {
      ctx.fillText(l, x + 10, y + 50 + idx * 14);
    });
  }
}

function drawGenericBox(ctx: CanvasRenderingContext2D, el: DiagramElement): void {
  const { x, y, width, height, style } = el;
  ctx.fillStyle = style.fillColor || '#F8FAFC';
  ctx.strokeStyle = style.borderColor || '#475569';
  ctx.lineWidth = style.borderWidth || 2;

  ctx.fillRect(x, y, width, height);
  ctx.strokeRect(x, y, width, height);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = style.textColor || '#0F172A';
  ctx.font = `600 ${style.fontSize || 13}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillText(el.name, x + width / 2, y + height / 2);
}

function drawResizeHandles(ctx: CanvasRenderingContext2D, el: DiagramElement): void {
  const handles = [
    { x: el.x, y: el.y },
    { x: el.x + el.width, y: el.y },
    { x: el.x + el.width, y: el.y + el.height },
    { x: el.x, y: el.y + el.height },
  ];

  ctx.fillStyle = '#2563EB';
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.5;

  handles.forEach((h) => {
    ctx.beginPath();
    ctx.rect(h.x - 4, h.y - 4, 8, 8);
    ctx.fill();
    ctx.stroke();
  });
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): void {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = words[0] || '';

  for (let i = 1; i < words.length; i++) {
    const testLine = currentLine + ' ' + words[i];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth) {
      lines.push(currentLine);
      currentLine = words[i];
    } else {
      currentLine = testLine;
    }
  }
  lines.push(currentLine);

  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, index) => {
    ctx.fillText(line, x, startY + index * lineHeight);
  });
}
