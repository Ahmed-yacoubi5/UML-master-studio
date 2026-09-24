import { DiagramElement, Relationship, DiagramType } from '../types/uml';

export interface GenerateDiagramResult {
  diagramType: string;
  title: string;
  elements: DiagramElement[];
  relationships: Relationship[];
}

export async function generateDiagramWithAi(
  prompt: string,
  diagramType: DiagramType
): Promise<GenerateDiagramResult> {
  try {
    const res = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, diagramType }),
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.elements) && data.elements.length > 0) {
        return normalizeAiGeneratedData(data, diagramType);
      }
    }
  } catch (err) {
    console.warn('Backend AI call failed, using intelligent offline generator fallback:', err);
  }

  // High quality offline fallback generator based on keywords
  return generateOfflineSmartTemplate(prompt, diagramType);
}

export async function modifyDiagramWithAi(
  prompt: string,
  currentElements: DiagramElement[],
  currentRelationships: Relationship[]
): Promise<{ elements: DiagramElement[]; relationships: Relationship[] }> {
  try {
    const res = await fetch('/api/ai/modify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        diagram: { elements: currentElements, relationships: currentRelationships },
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.elements)) {
        return {
          elements: normalizeElements(data.elements),
          relationships: data.relationships || [],
        };
      }
    }
  } catch (err) {
    console.warn('Backend AI modify failed, using intelligent local modifier:', err);
  }

  // Local intelligent modifier fallback
  return applyLocalModification(prompt, currentElements, currentRelationships);
}

function normalizeElements(rawList: any[]): DiagramElement[] {
  return rawList.map((item, idx) => {
    return {
      id: item.id || `elem_${Date.now()}_${idx}`,
      type: item.type || 'CLASS',
      name: item.name || 'UmlElement',
      x: typeof item.x === 'number' ? item.x : 100 + (idx % 3) * 260,
      y: typeof item.y === 'number' ? item.y : 100 + Math.floor(idx / 3) * 200,
      width: item.width || 220,
      height: item.height || 160,
      stereotype: item.stereotype,
      attributes: Array.isArray(item.attributes) ? item.attributes : [],
      methods: Array.isArray(item.methods) ? item.methods : [],
      notes: item.notes,
      style: {
        fillColor: item.fillColor || item.style?.fillColor || '#F0F9FF',
        borderColor: item.borderColor || item.style?.borderColor || '#0284C7',
        textColor: item.textColor || item.style?.textColor || '#0F172A',
        borderWidth: 2,
        borderStyle: 'solid',
        opacity: 1,
        fontSize: 13,
        fontWeight: 'normal',
        fontStyle: 'normal',
        textAlign: 'left',
      },
    };
  });
}

function normalizeAiGeneratedData(data: any, diagramType: DiagramType): GenerateDiagramResult {
  const elements = normalizeElements(data.elements);
  const validIds = new Set(elements.map((e) => e.id));

  const relationships: Relationship[] = (data.relationships || [])
    .filter((rel: any) => validIds.has(rel.sourceId) && validIds.has(rel.targetId))
    .map((rel: any, idx: number) => ({
      id: rel.id || `rel_${Date.now()}_${idx}`,
      type: rel.type || 'ASSOCIATION',
      sourceId: rel.sourceId,
      targetId: rel.targetId,
      label: rel.label || '',
      sourceMultiplicity: rel.sourceMultiplicity,
      targetMultiplicity: rel.targetMultiplicity,
      sourceRole: rel.sourceRole,
      targetRole: rel.targetRole,
      routing: 'straight',
    }));

  return {
    diagramType,
    title: data.title || `${diagramType} Model`,
    elements,
    relationships,
  };
}

function generateOfflineSmartTemplate(prompt: string, type: DiagramType): GenerateDiagramResult {
  const p = prompt.toLowerCase();

  if (type === 'CLASS') {
    if (p.includes('ecommerce') || p.includes('shop') || p.includes('order')) {
      return {
        diagramType: 'CLASS',
        title: 'E-Commerce Order System',
        elements: [
          {
            id: 'c_customer',
            type: 'CLASS',
            name: 'Customer',
            x: 100,
            y: 100,
            width: 230,
            height: 180,
            attributes: ['- customerId: UUID', '- email: String', '- address: ShippingAddress'],
            methods: ['+ placeOrder(cart: Cart): Order', '+ viewOrderHistory(): List<Order>'],
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
              textAlign: 'left',
            },
          },
          {
            id: 'c_order',
            type: 'CLASS',
            name: 'Order',
            x: 440,
            y: 100,
            width: 230,
            height: 190,
            attributes: ['- orderNumber: String', '- orderDate: Instant', '- totalAmount: BigDecimal', '- status: OrderStatus'],
            methods: ['+ calculateTaxes(): BigDecimal', '+ cancel(): Boolean', '+ dispatch(): void'],
            style: {
              fillColor: '#FEFCE8',
              borderColor: '#CA8A04',
              textColor: '#0F172A',
              borderWidth: 2,
              borderStyle: 'solid',
              opacity: 1,
              fontSize: 13,
              fontWeight: 'normal',
              fontStyle: 'normal',
              textAlign: 'left',
            },
          },
          {
            id: 'c_lineitem',
            type: 'CLASS',
            name: 'OrderItem',
            x: 440,
            y: 380,
            width: 220,
            height: 160,
            attributes: ['- quantity: Int', '- unitPrice: BigDecimal', '- discount: Double'],
            methods: ['+ subtotal(): BigDecimal'],
            style: {
              fillColor: '#ECFDF5',
              borderColor: '#059669',
              textColor: '#0F172A',
              borderWidth: 2,
              borderStyle: 'solid',
              opacity: 1,
              fontSize: 13,
              fontWeight: 'normal',
              fontStyle: 'normal',
              textAlign: 'left',
            },
          },
          {
            id: 'c_product',
            type: 'CLASS',
            name: 'Product',
            x: 770,
            y: 380,
            width: 220,
            height: 170,
            attributes: ['- sku: String', '- title: String', '- stockCount: Int', '- price: BigDecimal'],
            methods: ['+ isAvailable(): Boolean', '+ reserveStock(qty: Int)'],
            style: {
              fillColor: '#F5F3FF',
              borderColor: '#7C3AED',
              textColor: '#0F172A',
              borderWidth: 2,
              borderStyle: 'solid',
              opacity: 1,
              fontSize: 13,
              fontWeight: 'normal',
              fontStyle: 'normal',
              textAlign: 'left',
            },
          },
        ],
        relationships: [
          {
            id: 'r_cust_order',
            type: 'ASSOCIATION',
            sourceId: 'c_customer',
            targetId: 'c_order',
            label: 'places',
            sourceMultiplicity: '1',
            targetMultiplicity: '0..*',
            routing: 'straight',
          },
          {
            id: 'r_order_items',
            type: 'COMPOSITION',
            sourceId: 'c_order',
            targetId: 'c_lineitem',
            label: 'contains',
            sourceMultiplicity: '1',
            targetMultiplicity: '1..*',
            routing: 'straight',
          },
          {
            id: 'r_item_prod',
            type: 'ASSOCIATION',
            sourceId: 'c_lineitem',
            targetId: 'c_product',
            label: 'references',
            sourceMultiplicity: '*',
            targetMultiplicity: '1',
            routing: 'straight',
          },
        ],
      };
    }

    // Default general Class diagram
    return {
      diagramType: 'CLASS',
      title: 'Domain Model Architecture',
      elements: [
        {
          id: 'c_user',
          type: 'CLASS',
          name: 'UserAccount',
          x: 120,
          y: 120,
          width: 230,
          height: 180,
          attributes: ['- id: String', '- username: String', '- verified: Boolean'],
          methods: ['+ authenticate(): Boolean', '+ updateProfile(info: Data)'],
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
            textAlign: 'left',
          },
        },
        {
          id: 'c_session',
          type: 'CLASS',
          name: 'AuthSession',
          x: 460,
          y: 120,
          width: 220,
          height: 170,
          attributes: ['- token: String', '- expiresAt: DateTime', '- ipAddress: String'],
          methods: ['+ isValid(): Boolean', '+ terminate(): void'],
          style: {
            fillColor: '#ECFDF5',
            borderColor: '#059669',
            textColor: '#0F172A',
            borderWidth: 2,
            borderStyle: 'solid',
            opacity: 1,
            fontSize: 13,
            fontWeight: 'normal',
            fontStyle: 'normal',
            textAlign: 'left',
          },
        },
      ],
      relationships: [
        {
          id: 'r_usr_sess',
          type: 'COMPOSITION',
          sourceId: 'c_user',
          targetId: 'c_session',
          label: 'owns',
          sourceMultiplicity: '1',
          targetMultiplicity: '0..*',
          routing: 'straight',
        },
      ],
    };
  }

  // General fallback for other types
  return {
    diagramType: type,
    title: `${type} Diagram`,
    elements: [
      {
        id: 'node_1',
        type: type === 'USE_CASE' ? 'ACTOR' : type === 'ACTIVITY' ? 'ACTION' : 'CLASS',
        name: type === 'USE_CASE' ? 'Primary User' : 'Execute Step 1',
        x: 140,
        y: 140,
        width: type === 'USE_CASE' ? 80 : 200,
        height: type === 'USE_CASE' ? 100 : 120,
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
      },
      {
        id: 'node_2',
        type: type === 'USE_CASE' ? 'USE_CASE' : type === 'ACTIVITY' ? 'ACTION' : 'CLASS',
        name: type === 'USE_CASE' ? 'Perform Key Task' : 'Execute Step 2',
        x: 440,
        y: 140,
        width: 200,
        height: 80,
        style: {
          fillColor: '#ECFDF5',
          borderColor: '#059669',
          textColor: '#0F172A',
          borderWidth: 2,
          borderStyle: 'solid',
          opacity: 1,
          fontSize: 13,
          fontWeight: 'normal',
          fontStyle: 'normal',
          textAlign: 'center',
        },
      },
    ],
    relationships: [
      {
        id: 'r_1_2',
        type: 'ASSOCIATION',
        sourceId: 'node_1',
        targetId: 'node_2',
        routing: 'straight',
      },
    ],
  };
}

function applyLocalModification(
  prompt: string,
  elements: DiagramElement[],
  relationships: Relationship[]
): { elements: DiagramElement[]; relationships: Relationship[] } {
  const p = prompt.toLowerCase();
  const nextElements = [...elements];
  const nextRelationships = [...relationships];

  // Check if adding an element
  if (p.includes('add') || p.includes('create')) {
    const match = prompt.match(/(?:add|create)\s+(?:a\s+|an\s+)?([a-zA-Z0-9_\s]+)/i);
    const rawName = match ? match[1].replace(/\s+(class|actor|use case|state|action).*/i, '').trim() : 'NewElement';
    const cleanName = rawName.charAt(0).toUpperCase() + rawName.slice(1);

    const newId = `elem_${Date.now()}`;
    nextElements.push({
      id: newId,
      type: p.includes('actor') ? 'ACTOR' : p.includes('use case') ? 'USE_CASE' : 'CLASS',
      name: cleanName,
      x: 300 + Math.random() * 200,
      y: 200 + Math.random() * 150,
      width: 220,
      height: 160,
      attributes: ['- id: Long'],
      methods: ['+ execute(): void'],
      style: {
        fillColor: '#FFFBEB',
        borderColor: '#D97706',
        textColor: '#0F172A',
        borderWidth: 2,
        borderStyle: 'solid',
        opacity: 1,
        fontSize: 13,
        fontWeight: 'normal',
        fontStyle: 'normal',
        textAlign: 'left',
      },
    });
  }

  // Color modification
  if (p.includes('orange') || p.includes('blue') || p.includes('green') || p.includes('purple')) {
    const colorMap: Record<string, { fill: string; border: string }> = {
      orange: { fill: '#FFFBEB', border: '#D97706' },
      blue: { fill: '#F0F9FF', border: '#0284C7' },
      green: { fill: '#ECFDF5', border: '#059669' },
      purple: { fill: '#F5F3FF', border: '#7C3AED' },
    };
    const targetColor = Object.keys(colorMap).find((c) => p.includes(c));
    if (targetColor) {
      nextElements.forEach((el) => {
        el.style.fillColor = colorMap[targetColor].fill;
        el.style.borderColor = colorMap[targetColor].border;
      });
    }
  }

  return {
    elements: nextElements,
    relationships: nextRelationships,
  };
}
