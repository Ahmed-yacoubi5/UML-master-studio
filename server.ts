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
        error: 'Gemini API key is not configured.',
        fallbackAvailable: true,
      });
    }

    const systemInstruction = `You are an expert UML modeling assistant for UML Master Studio.
You must return a valid JSON object matching the requested UML diagram type (${type}).
Rules:
1. Strict schema compliance: output only valid JSON.
2. Every element must have:
   - id: unique string (e.g. "elem_1", "elem_2")
   - type: matching diagram standard element types (e.g. for CLASS: "CLASS", "INTERFACE", "ENUM"; for USE_CASE: "ACTOR", "USE_CASE", "SYSTEM_BOUNDARY"; for ACTIVITY: "INITIAL_NODE", "ACTION", "DECISION", "FINAL_NODE"; for SEQUENCE: "LIFELINE", "ACTIVATION"; for STATE: "INITIAL_STATE", "STATE", "FINAL_STATE")
   - name: clear label/name
   - x: integer position (layout nicely with at least 80px gaps, between 100 and 900)
   - y: integer position (between 80 and 700)
   - width: integer (default 180-240 for classes, 140 for use cases, 60 for actors, 140 for actions)
   - height: integer (120-180 for classes, 70 for use cases, 90 for actors, 60 for actions)
   - attributes: array of string items (e.g. ["- id: Long", "+ name: String"]) for classes/entities
   - methods: array of string items (e.g. ["+ register(): Boolean", "+ getDetails(): String"])
   - stereotype: optional string (e.g. "<<interface>>", "<<entity>>")
3. Every relationship must have:
   - id: unique string (e.g. "rel_1")
   - type: one of "ASSOCIATION", "DIRECTED_ASSOCIATION", "AGGREGATION", "COMPOSITION", "INHERITANCE", "REALIZATION", "DEPENDENCY", "INCLUDE", "EXTEND", "CONTROL_FLOW", "MESSAGE", "RETURN_MESSAGE"
   - sourceId: id of source element
   - targetId: id of target element
   - label: optional string description
   - sourceMultiplicity: optional (e.g. "1", "0..*")
   - targetMultiplicity: optional (e.g. "1..*", "*")
4. Return an object with: diagramType, title, elements, relationships.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Generate a structured UML ${type} diagram based on this request: "${prompt}". Layout elements neatly with clear relationships.`,
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
        error: 'Gemini API key is not configured.',
        fallbackAvailable: true,
      });
    }

    const promptText = `The user wants to modify this existing UML diagram.
Current elements: ${JSON.stringify(diagram.elements)}
Current relationships: ${JSON.stringify(diagram.relationships)}

User instruction: "${prompt}"

Update, add, or refine elements and relationships to satisfy the instruction. Keep existing IDs for unchanged elements. Return the complete updated elements and relationships array.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: promptText,
      config: {
        systemInstruction: 'You are an expert UML modeling assistant. Output strictly valid JSON matching the updated UML schema.',
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
