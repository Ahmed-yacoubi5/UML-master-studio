import { jsPDF } from 'jspdf';
import { Diagram, Project } from '../types/uml';
import { computeDiagramBounds, renderDiagramToCanvas } from './diagramRenderer';

export interface PngExportOptions {
  scale?: 1 | 2 | 3;
  backgroundColor?: string | 'transparent';
  selectedElementIds?: Set<string>;
  filename?: string;
}

export interface PdfExportOptions {
  pageSize?: 'a4' | 'a3' | 'letter';
  orientation?: 'portrait' | 'landscape';
  filename?: string;
}

/**
 * Triggers a file download using standard Blob and temporary <a> tag
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 250);
}

export async function exportDiagramToPng(
  diagram: Diagram,
  options: PngExportOptions = {}
): Promise<void> {
  const scale = options.scale || 2;
  const elements = options.selectedElementIds && options.selectedElementIds.size > 0
    ? diagram.elements.filter((el) => options.selectedElementIds!.has(el.id))
    : diagram.elements;

  const bounds = computeDiagramBounds(elements);
  const bWidth = Math.max(200, Math.round(bounds.width));
  const bHeight = Math.max(150, Math.round(bounds.height));

  const canvas = document.createElement('canvas');
  canvas.width = bWidth * scale;
  canvas.height = bHeight * scale;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D canvas context');

  // Background
  const bg = options.backgroundColor ?? '#FFFFFF';
  if (bg !== 'transparent') {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Offset diagram by -bounds.minX, -bounds.minY
  const shiftedDiagram: Diagram = {
    ...diagram,
    elements: elements.map((el) => ({
      ...el,
      x: el.x - bounds.minX,
      y: el.y - bounds.minY,
    })),
  };

  const isDarkBg = bg === '#0F172A' || bg === 'black';

  renderDiagramToCanvas(ctx, shiftedDiagram, {
    scale,
    backgroundColor: bg,
    showHandles: false,
    isDarkMode: isDarkBg,
  });

  const safeName = (options.filename || diagram.name || 'diagram')
    .replace(/[^a-z0-9]/gi, '_')
    .toLowerCase();

  canvas.toBlob((blob) => {
    if (blob) {
      downloadBlob(blob, `${safeName}@${scale}x.png`);
    } else {
      // Fallback to dataURL
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.download = `${safeName}@${scale}x.png`;
      a.href = dataUrl;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }, 'image/png');
}

export async function exportDiagramToPdf(
  diagram: Diagram,
  options: PdfExportOptions = {}
): Promise<void> {
  const pageSize = options.pageSize || 'a4';
  const orientation = options.orientation || 'landscape';

  const doc = new jsPDF({
    orientation,
    unit: 'pt',
    format: pageSize,
  });

  await addDiagramPageToPdf(doc, diagram, 1);

  const safeName = (options.filename || diagram.name || 'diagram')
    .replace(/[^a-z0-9]/gi, '_')
    .toLowerCase();

  const pdfBlob = doc.output('blob');
  downloadBlob(pdfBlob, `${safeName}.pdf`);
}

export async function exportProjectToPdf(
  project: Project,
  options: PdfExportOptions = {}
): Promise<void> {
  const pageSize = options.pageSize || 'a4';
  const orientation = options.orientation || 'landscape';

  const doc = new jsPDF({
    orientation,
    unit: 'pt',
    format: pageSize,
  });

  const diagramsToExport = project.diagrams && project.diagrams.length > 0
    ? project.diagrams
    : [{
        id: 'empty',
        projectId: project.id,
        name: 'Empty Diagram',
        type: 'CLASS' as const,
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
      }];

  for (let i = 0; i < diagramsToExport.length; i++) {
    const diag = diagramsToExport[i];
    if (i > 0) {
      doc.addPage(pageSize, orientation);
    }
    await addDiagramPageToPdf(doc, diag, i + 1, project.name);
  }

  const safeName = (project.name || 'project')
    .replace(/[^a-z0-9]/gi, '_')
    .toLowerCase();

  const pdfBlob = doc.output('blob');
  downloadBlob(pdfBlob, `${safeName}_full_project.pdf`);
}

async function addDiagramPageToPdf(
  doc: jsPDF,
  diagram: Diagram,
  pageNumber: number,
  projectName?: string
): Promise<void> {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Header banner
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42);
  doc.text(diagram.name || 'UML Diagram', 40, 38);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  const subtitle = projectName
    ? `Project: ${projectName}  |  Type: UML ${diagram.type}  |  Page ${pageNumber}`
    : `Type: UML ${diagram.type}  |  Page ${pageNumber}`;
  doc.text(subtitle, 40, 52);

  // Render diagram to offscreen canvas
  const bounds = computeDiagramBounds(diagram.elements);
  const bWidth = Math.max(400, Math.round(bounds.width));
  const bHeight = Math.max(300, Math.round(bounds.height));
  const scale = 2;

  const canvas = document.createElement('canvas');
  canvas.width = bWidth * scale;
  canvas.height = bHeight * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Solid white background for PDF clarity
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const shiftedDiagram: Diagram = {
    ...diagram,
    elements: diagram.elements.map((el) => ({
      ...el,
      x: el.x - bounds.minX,
      y: el.y - bounds.minY,
    })),
  };

  renderDiagramToCanvas(ctx, shiftedDiagram, {
    scale,
    backgroundColor: '#FFFFFF',
    showHandles: false,
  });

  const imgData = canvas.toDataURL('image/png');

  // Compute fit inside page bounds preserving aspect ratio
  const marginX = 40;
  const marginTop = 68;
  const marginBottom = 36;
  const maxW = pageWidth - marginX * 2;
  const maxH = pageHeight - marginTop - marginBottom;

  const aspect = Math.max(0.01, bWidth / bHeight);
  let renderW = maxW;
  let renderH = maxW / aspect;

  if (renderH > maxH) {
    renderH = maxH;
    renderW = maxH * aspect;
  }

  const renderX = Math.round(marginX + (maxW - renderW) / 2);
  const renderY = Math.round(marginTop + (maxH - renderH) / 2);

  doc.addImage(imgData, 'PNG', renderX, renderY, renderW, renderH, undefined, 'FAST');

  // Document Footer
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `UML Master Studio Architecture Engine  •  Exported on ${new Date().toLocaleDateString()}`,
    pageWidth / 2,
    pageHeight - 16,
    { align: 'center' }
  );
}
