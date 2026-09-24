import { Diagram, ValidationIssue, DiagramElement } from '../types/uml';

const MULTIPLICITY_REGEX = /^(\*|\d+(\.\.(\d+|\*))?)$/;

export function validateUmlDiagram(diagram: Diagram): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const elementMap = new Map<string, DiagramElement>();
  diagram.elements.forEach((el) => elementMap.set(el.id, el));

  const connectedElementIds = new Set<string>();

  // 1. Validate Relationships
  diagram.relationships.forEach((rel) => {
    // Missing source or target
    if (!rel.sourceId || !elementMap.has(rel.sourceId)) {
      issues.push({
        id: `issue_rel_src_${rel.id}`,
        severity: 'error',
        message: `Relationship "${rel.label || rel.type}" has an invalid or missing source element.`,
        relationshipId: rel.id,
      });
    } else {
      connectedElementIds.add(rel.sourceId);
    }

    if (!rel.targetId || !elementMap.has(rel.targetId)) {
      issues.push({
        id: `issue_rel_tgt_${rel.id}`,
        severity: 'error',
        message: `Relationship "${rel.label || rel.type}" has an invalid or missing target element.`,
        relationshipId: rel.id,
      });
    } else {
      connectedElementIds.add(rel.targetId);
    }

    // Check multiplicity syntax
    if (rel.sourceMultiplicity && !MULTIPLICITY_REGEX.test(rel.sourceMultiplicity.trim())) {
      issues.push({
        id: `issue_mult_src_${rel.id}`,
        severity: 'warning',
        message: `Source multiplicity "${rel.sourceMultiplicity}" does not conform to UML syntax (e.g., "1", "0..1", "1..*", "*").`,
        relationshipId: rel.id,
      });
    }

    if (rel.targetMultiplicity && !MULTIPLICITY_REGEX.test(rel.targetMultiplicity.trim())) {
      issues.push({
        id: `issue_mult_tgt_${rel.id}`,
        severity: 'warning',
        message: `Target multiplicity "${rel.targetMultiplicity}" does not conform to UML syntax (e.g., "1", "0..1", "1..*", "*").`,
        relationshipId: rel.id,
      });
    }

    // Semantic checks based on diagram type
    const srcEl = elementMap.get(rel.sourceId);
    const tgtEl = elementMap.get(rel.targetId);
    if (srcEl && tgtEl) {
      if (rel.type === 'INCLUDE' || rel.type === 'EXTEND') {
        if (srcEl.type !== 'USE_CASE' || tgtEl.type !== 'USE_CASE') {
          issues.push({
            id: `issue_semantic_inc_${rel.id}`,
            severity: 'warning',
            message: `<<${rel.type.toLowerCase()}>> relationships must connect two Use Cases.`,
            relationshipId: rel.id,
          });
        }
      }
    }
  });

  // 2. Validate Elements
  diagram.elements.forEach((el) => {
    // Missing element name
    if (!el.name || !el.name.trim()) {
      issues.push({
        id: `issue_name_${el.id}`,
        severity: 'error',
        message: `An element of type ${el.type} has an empty name.`,
        elementId: el.id,
      });
    }

    // Disconnected element warning (except for System Boundary or Lifelines)
    if (
      el.type !== 'SYSTEM_BOUNDARY' &&
      el.type !== 'SWIMLANE' &&
      el.type !== 'NOTE' &&
      diagram.elements.length > 1 &&
      !connectedElementIds.has(el.id)
    ) {
      issues.push({
        id: `issue_disconn_${el.id}`,
        severity: 'info',
        message: `Element "${el.name}" is isolated with no relationships attached.`,
        elementId: el.id,
      });
    }

    // For classes, check method syntax
    if (el.type === 'CLASS' || el.type === 'INTERFACE') {
      el.methods?.forEach((method) => {
        if (!method.includes('(') || !method.includes(')')) {
          issues.push({
            id: `issue_method_${el.id}_${method}`,
            severity: 'warning',
            message: `Method "${method}" in Class "${el.name}" is missing parentheses (e.g., + login(): Boolean).`,
            elementId: el.id,
          });
        }
      });
    }
  });

  // 3. Overlapping Elements Detection
  for (let i = 0; i < diagram.elements.length; i++) {
    for (let j = i + 1; j < diagram.elements.length; j++) {
      const a = diagram.elements[i];
      const b = diagram.elements[j];
      // Exclude boundary and swimlanes from overlap warnings
      if (
        a.type === 'SYSTEM_BOUNDARY' ||
        b.type === 'SYSTEM_BOUNDARY' ||
        a.type === 'SWIMLANE' ||
        b.type === 'SWIMLANE'
      ) {
        continue;
      }

      const overlap = !(
        a.x + a.width <= b.x ||
        b.x + b.width <= a.x ||
        a.y + a.height <= b.y ||
        b.y + b.height <= a.y
      );

      if (overlap) {
        issues.push({
          id: `issue_overlap_${a.id}_${b.id}`,
          severity: 'info',
          message: `Elements "${a.name}" and "${b.name}" overlap. Repositioning may improve readability.`,
          elementId: a.id,
        });
      }
    }
  }

  return issues;
}
