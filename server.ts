import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Lazy GoogleGenAI client initialization
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// AI Generate UML Diagram
app.post('/api/ai/generate', async (req, res) => {
  try {
    const { prompt, diagramType } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const type = (diagramType || 'CLASS').toUpperCase();
    const ai = getGeminiClient();

    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API key is not configured. Please set the GEMINI_API_KEY environment variable in your project settings.',
        fallbackAvailable: true,
      });
    }

    const systemInstruction = `You are a Principal Software Architect and UML 2.5 Modeling Expert for UML Master Studio.
Your mission is to generate comprehensive, production-grade, multi-entity UML diagrams matching the requested diagram type (${type}).

CRITICAL ARCHITECTURAL REQUIREMENTS:
1. ENTITY COUNT & COMPLETENESS:
   - For ANY system requirement, generate a comprehensive, realistic architecture containing at least 5 to 9 distinct entities/classes/components/actors.
   - NEVER generate only 1 or 2 trivial entities unless the user explicitly requests a 2-entity diagram.
   - For CLASS diagrams: include domain models, controllers/services, interfaces (stereotype: "<<interface>>"), and enums. Each class must have 3 to 6 typed attributes (e.g. "- id: UUID", "+ email: String", "- status: OrderStatus") and 2 to 4 domain methods with parameters and return types (e.g. "+ processOrder(cart: Cart): Invoice", "+ cancel(): Boolean").
   - For USE_CASE diagrams: include 2 to 3 distinct Actors (e.g., Customer, Admin, Payment Gateway) and 5 to 8 Use Cases inside a system boundary, connected by ASSOCIATION, INCLUDE, and EXTEND.
   - For ACTIVITY diagrams: include Initial Node, 5 to 8 Action nodes, Decision/Merge nodes, and Final Node connected by CONTROL_FLOW.
   - For SEQUENCE diagrams: include 4 to 6 Lifelines (e.g., Client, ApiGateway, OrderService, PaymentProcessor, InventoryDb) with 6 to 10 sequential MESSAGE and RETURN_MESSAGE relations.
   - For STATE_MACHINE diagrams: include Initial State, 4 to 7 States (e.g., Draft, Processing, Approved, Shipped, Cancelled), and Final State.

2. RELATIONSHIPS & ASSOCIATIONS:
   - Deeply interconnect the entities with at least 5 to 10 realistic relationships.
   - Use standard UML types: "INHERITANCE", "REALIZATION", "COMPOSITION", "AGGREGATION", "ASSOCIATION", "DIRECTED_ASSOCIATION", "DEPENDENCY", "INCLUDE", "EXTEND", "CONTROL_FLOW", "MESSAGE", "RETURN_MESSAGE".
   - Each relationship MUST have:
     * id: unique string (e.g. "rel_1")
     * type: standard UML type
     * sourceId: valid id of source element
     * targetId: valid id of target element
     * label: descriptive verb/phrase (e.g. "manages", "contains", "verifies", "notifies")
     * sourceMultiplicity: multiplicity string (e.g. "1", "0..*")
     * targetMultiplicity: multiplicity string (e.g. "1..*", "*")

3. NON-OVERLAPPING 2D CANVAS LAYOUT:
   - Arrange elements cleanly in an organized multi-column, multi-row grid so NO elements overlap.
   - Horizontal spacing: Column 1 (x: 80-120), Column 2 (x: 420-460), Column 3 (x: 760-800), Column 4 (x: 1100-1140).
   - Vertical spacing: Row 1 (y: 80-120), Row 2 (y: 380-420), Row 3 (y: 680-720).
   - Dimensions:
     * Classes/Interfaces: width 220 to 280, height 170 to 240
     * Use Cases: width 170 to 210, height 70 to 90
     * Actors: width 70, height 100
     * Actions: width 170 to 210, height 70 to 90
     * Lifelines: width 150, height 260
     * States: width 160, height 90

4. VISUAL TASTE & PALETTE:
   - Provide clean fillColor and borderColor:
     * Entities/Models: fillColor "#F0F9FF", borderColor "#0284C7"
     * Services/Processing: fillColor "#FEFCE8", borderColor "#CA8A04"
     * Storage/Data: fillColor "#ECFDF5", borderColor "#059669"
     * Security/Auth: fillColor "#F5F3FF", borderColor "#7C3AED"
     * Exceptions/Alerts: fillColor "#FEF2F2", borderColor "#DC2626"`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Design an enterprise-grade, comprehensive UML ${type} diagram for this specification:
"${prompt}"

Requirement: Generate at least 5 to 9 interconnected entities/classes with rich attributes and methods, detailed relationships with multiplicities, and non-overlapping 2D grid coordinates.`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            diagramType: { type: Type.STRING },
            title: { type: Type.STRING },
            elements: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  type: { type: Type.STRING },
                  name: { type: Type.STRING },
                  x: { type: Type.NUMBER },
                  y: { type: Type.NUMBER },
                  width: { type: Type.NUMBER },
                  height: { type: Type.NUMBER },
                  stereotype: { type: Type.STRING },
                  attributes: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  methods: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  fillColor: { type: Type.STRING },
                  borderColor: { type: Type.STRING },
                  textColor: { type: Type.STRING },
                },
                required: ['id', 'type', 'name', 'x', 'y'],
              },
            },
            relationships: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  type: { type: Type.STRING },
                  sourceId: { type: Type.STRING },
                  targetId: { type: Type.STRING },
                  label: { type: Type.STRING },
                  sourceMultiplicity: { type: Type.STRING },
                  targetMultiplicity: { type: Type.STRING },
                  sourceRole: { type: Type.STRING },
                  targetRole: { type: Type.STRING },
                },
                required: ['id', 'type', 'sourceId', 'targetId'],
              },
            },
          },
          required: ['elements', 'relationships'],
        },
      },
    });

    const text = response.text?.trim() || '{}';
    const parsed = JSON.parse(text);
    return res.json(parsed);
  } catch (err: any) {
    console.error('Gemini Generate Error:', err);
    return res.status(500).json({
      error: err.message || 'Failed to generate diagram with AI',
    });
  }
});

// AI Modify Existing Diagram
app.post('/api/ai/modify', async (req, res) => {
  try {
    const { prompt, diagram } = req.body;

    if (!prompt || !diagram) {
      return res.status(400).json({ error: 'Prompt and existing diagram are required' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API key is not configured. Please set the GEMINI_API_KEY environment variable in your project settings.',
        fallbackAvailable: true,
      });
    }

    const systemInstruction = `You are a Principal Software Architect and UML 2.5 Modeling Expert for UML Master Studio.
Your mission is to intelligently modify, expand, or refine an existing UML diagram based on user instructions.

CRITICAL MODIFICATION RULES:
1. PRESERVE & EXPAND:
   - Preserve existing elements and relationships that are not being explicitly deleted.
   - When the user asks to add or expand an aspect (e.g. "add payment handling", "add audit logging", "add auth system"), generate complete, production-grade entities with realistic attributes, methods, and relationships connecting them to existing entities.
   - If user asks to add a subsystem, create all necessary interconnected classes/interfaces (typically 2 to 4 rich entities), not just a single placeholder.
2. ATTRIBUTES & METHODS:
   - New or updated entities must have complete, typed attributes and methods with parameters.
3. NON-OVERLAPPING COORDINATES:
   - Position new elements in vacant canvas space (x: 80 to 1200, y: 80 to 800) without overlapping existing elements.
4. RETURN COMPLETE GRAPH:
   - Return the full updated elements and relationships arrays containing BOTH preserved and new elements.`;

    const promptText = `Modify the following UML diagram according to the user request.
Current elements (${diagram.elements?.length || 0}):
${JSON.stringify(diagram.elements, null, 2)}

Current relationships (${diagram.relationships?.length || 0}):
${JSON.stringify(diagram.relationships, null, 2)}

User request: "${prompt}"

Return the complete updated diagram with all preserved and newly generated elements/relationships.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: promptText,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            elements: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  type: { type: Type.STRING },
                  name: { type: Type.STRING },
                  x: { type: Type.NUMBER },
                  y: { type: Type.NUMBER },
                  width: { type: Type.NUMBER },
                  height: { type: Type.NUMBER },
                  stereotype: { type: Type.STRING },
                  attributes: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  methods: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  fillColor: { type: Type.STRING },
                  borderColor: { type: Type.STRING },
                  textColor: { type: Type.STRING },
                },
                required: ['id', 'type', 'name', 'x', 'y'],
              },
            },
            relationships: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  type: { type: Type.STRING },
                  sourceId: { type: Type.STRING },
                  targetId: { type: Type.STRING },
                  label: { type: Type.STRING },
                  sourceMultiplicity: { type: Type.STRING },
                  targetMultiplicity: { type: Type.STRING },
                  sourceRole: { type: Type.STRING },
                  targetRole: { type: Type.STRING },
                },
                required: ['id', 'type', 'sourceId', 'targetId'],
              },
            },
          },
          required: ['elements', 'relationships'],
        },
      },
    });

    const text = response.text?.trim() || '{}';
    const parsed = JSON.parse(text);
    return res.json(parsed);
  } catch (err: any) {
    console.error('Gemini Modify Error:', err);
    return res.status(500).json({
      error: err.message || 'Failed to modify diagram with AI',
    });
  }
});

// Vite middleware & Static Serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`UML Master Studio server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
