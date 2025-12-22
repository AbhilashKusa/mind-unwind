import { GoogleGenAI, Type } from "@google/genai";
import { GeneratedTaskData, Task, Subtask, AICommandResponse } from "../types";

// --- Configuration ---
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || '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';

// --- Types & Preferences ---
export type AIModelPreference = 'auto' | 'gemini' | 'deepseek';

export const setPreferredModel = (model: AIModelPreference) => {
  localStorage.setItem('ai_model_preference', model);
};

export const getPreferredModel = (): AIModelPreference => {
  return (localStorage.getItem('ai_model_preference') as AIModelPreference) || 'auto';
};

export const isAIAvailable = (): boolean => {
  return !!(GEMINI_API_KEY || OPENROUTER_API_KEY);
};

export const getAIError = (): string | null => {
  if (!GEMINI_API_KEY && !OPENROUTER_API_KEY) return "No AI API Keys configured.";
  return null;
};

// --- Helpers ---
const cleanJson = (text: string) => {
  if (!text) return "";
  return text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/\s*```$/, "").trim();
};

let geminiInstance: GoogleGenAI | null = null;
const getGemini = (): GoogleGenAI => {
  if (!geminiInstance) {
    if (!GEMINI_API_KEY) throw new Error("Gemini API Key missing");
    geminiInstance = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  }
  return geminiInstance;
};

// --- Providers ---

// 1. Google Gemini Provider
const callGemini = async (model: string, prompt: string, schema?: any, systemPrompt?: string): Promise<string> => {
  try {
    const ai = getGemini();
    const config: any = { responseMimeType: "application/json" };
    if (schema) config.responseSchema = schema;
    if (systemPrompt) config.systemInstruction = systemPrompt;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: config
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from Gemini");
    return text;
  } catch (e: any) {
    console.warn("Gemini Call Failed:", e.message);
    throw e;
  }
};

// 2. OpenRouter (DeepSeek) Provider
const callOpenRouter = async (messages: Array<{ role: string; content: string }>): Promise<string> => {
  if (!OPENROUTER_API_KEY) throw new Error("Missing OpenRouter Key");

  // Using DeepSeek V3 via OpenRouter
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": window.location.origin,
      "X-Title": "Mind Unwind"
    },
    body: JSON.stringify({
      model: "deepseek/deepseek-chat",
      messages: messages
    })
  });

  if (!response.ok) throw new Error(`OpenRouter Error: ${response.status}`);
  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
};

// --- Unified Call Strategy ---
const executeHybridAI = async (
  geminiConfig: { model: string, prompt: string, schema?: any, systemPrompt?: string },
  openRouterConfig: { messages: Array<{ role: string; content: string }> }
): Promise<string> => {

  const preference = getPreferredModel();
  console.log(`Executing AI with preference: ${preference}`);

  // Mode: DeepSeek Forced
  if (preference === 'deepseek') {
    try {
      return await callOpenRouter(openRouterConfig.messages);
    } catch (e) {
      console.warn("DeepSeek Forced Mode Failed (401/500). Falling back to Gemini.", e);
      if (GEMINI_API_KEY) {
        return await callGemini(geminiConfig.model, geminiConfig.prompt, geminiConfig.schema, geminiConfig.systemPrompt);
      }
      throw e; // Rethrow if no fallback
    }
  }

  // Mode: Gemini Forced
  if (preference === 'gemini') {
    return await callGemini(geminiConfig.model, geminiConfig.prompt, geminiConfig.schema, geminiConfig.systemPrompt);
  }

  // Mode: Auto (Gemini -> DeepSeek)
  if (GEMINI_API_KEY) {
    try {
      return await callGemini(geminiConfig.model, geminiConfig.prompt, geminiConfig.schema, geminiConfig.systemPrompt);
    } catch (e) {
      console.log("⚠️ Switching to DeepSeek (Fallback)...");
    }
  }

  if (OPENROUTER_API_KEY) {
    return await callOpenRouter(openRouterConfig.messages);
  }

  throw new Error("All AI Providers failed or are missing keys.");
};


// --- Core Features ---

export interface CommandContext {
  viewMode: string;
  isFocusMode: boolean;
  timeOfDay: string;
}

interface CommandHistoryEntry {
  command: string;
  result: { added: number; updated: number; deleted: number };
  timestamp: number;
}
const commandHistory: CommandHistoryEntry[] = [];
export const addToCommandHistory = (command: string, a: number, u: number, d: number) => {
  commandHistory.unshift({ command, result: { added: a, updated: u, deleted: d }, timestamp: Date.now() });
  if (commandHistory.length > 5) commandHistory.pop();
};

const SYSTEM_INSTRUCTION_COMMAND = `
You are an elite AI Task Orchestrator.
Your goal is to manage the user's task list based on natural language input.
Return ONLY valid JSON.

## OUTPUT FORMAT
{
  "added": [{ "title": "...", "priority": "High|Medium|Low", "category": "...", "dueDate": "YYYY-MM-DD", "workspace": "office|personal|startup" }],
  "updated": [{ "id": "...", "updates": { ... } }],
  "deletedIds": ["..."],
  "aiResponse": "Brief confirmation text"
}
`;

export const processUserCommand = async (userInput: string, currentTasks: Task[], context?: CommandContext): Promise<AICommandResponse> => {
  const simplifiedTasks = currentTasks.map(t => ({ id: t.id, title: t.title, priority: t.priority, category: t.category, isCompleted: t.isCompleted, dueDate: t.dueDate }));
  const systemPrompt = SYSTEM_INSTRUCTION_COMMAND;

  const prompt = `
      Context:
      - Date: ${new Date().toISOString().split('T')[0]}
      - Tasks: ${JSON.stringify(simplifiedTasks)}
      - History: ${JSON.stringify(commandHistory.map(h => h.command))}
      - User Input: "${userInput}"
  
      Generate the JSON response to modify tasks.
    `;

  // 1. Gemini Config
  const geminiConf = {
    model: "gemini-2.0-flash-exp",
    prompt: prompt,
    systemPrompt: systemPrompt,
    schema: {
      type: Type.OBJECT,
      properties: {
        added: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, priority: { type: Type.STRING }, category: { type: Type.STRING }, dueDate: { type: Type.STRING }, workspace: { type: Type.STRING } } } },
        updated: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, updates: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, isCompleted: { type: Type.BOOLEAN }, priority: { type: Type.STRING }, dueDate: { type: Type.STRING } } } } } },
        deletedIds: { type: Type.ARRAY, items: { type: Type.STRING } },
        aiResponse: { type: Type.STRING }
      }
    }
  };

  // 2. OpenRouter Config
  const openRouterConf = {
    messages: [{ role: "system", content: systemPrompt }, { role: "user", content: prompt }]
  };

  try {
    const jsonStr = await executeHybridAI(geminiConf, openRouterConf);
    const result = JSON.parse(cleanJson(jsonStr));

    // Sanitize response to prevent "undefined" errors
    return {
      added: Array.isArray(result.added) ? result.added : [],
      updated: Array.isArray(result.updated) ? result.updated : [],
      deletedIds: Array.isArray(result.deletedIds) ? result.deletedIds : [],
      aiResponse: result.aiResponse || "Processed."
    };
  } catch (e) {
    console.error("AI Processing Error:", e);
    // Return safe default to prevent crash
    return { added: [], updated: [], deletedIds: [], aiResponse: "I encountered an error processing that request." };
  }
};

export const generateSubtasks = async (taskTitle: string): Promise<Subtask[]> => {
  const prompt = `Break down "${taskTitle}" into 3-5 actionable subtasks. Return JSON: [{"title": "...", "isCompleted": false}]`;

  try {
    const jsonStr = await executeHybridAI(
      { model: "gemini-2.0-flash-exp", prompt, schema: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, isCompleted: { type: Type.BOOLEAN } } } } },
      { messages: [{ role: "user", content: prompt }] }
    );
    const parsed = JSON.parse(cleanJson(jsonStr));
    return Array.isArray(parsed) ? parsed.map((t: any) => ({
      id: Math.random().toString(36).substr(2, 9),
      title: t.title || t,
      isCompleted: false,
      comments: []
    })) : [];
  } catch (e) { return []; }
};

export const updateTaskWithAI = async (currentTask: Task, instruction: string): Promise<Task> => {
  const prompt = `
      Task: ${JSON.stringify(currentTask)}
      Instruction: "${instruction}"
      
      Update the task JSON. Return the FULL updated JSON object.
    `;

  try {
    const jsonStr = await executeHybridAI(
      { model: "gemini-2.0-flash-exp", prompt },
      { messages: [{ role: "user", content: prompt }] }
    );
    const updated = JSON.parse(cleanJson(jsonStr));
    return { ...updated, id: currentTask.id };
  } catch (e) { return currentTask; }
};

export const brainstormIdeas = async (goal: string): Promise<GeneratedTaskData[]> => {
  const prompt = `
      Goal: "${goal}"
      Generate 5 tasks. Return JSON: [{"title": "...", "description": "...", "priority": "Medium", "category": "General"}]
    `;

  try {
    const jsonStr = await executeHybridAI(
      { model: "gemini-2.0-flash-exp", prompt, schema: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, description: { type: Type.STRING }, priority: { type: Type.STRING }, category: { type: Type.STRING } } } } },
      { messages: [{ role: "user", content: prompt }] }
    );
    const res = JSON.parse(cleanJson(jsonStr));
    return Array.isArray(res) ? res : [];
  } catch (e) { return []; }
};

export const optimizeSchedule = async (tasks: Task[]): Promise<Task[]> => {
  const prompt = `Current Date: ${new Date().toISOString().split('T')[0]}. Tasks: ${JSON.stringify(tasks.map(t => ({ id: t.id, title: t.title, priority: t.priority, dueDate: t.dueDate })))}. Assign due dates. JSON Updates Array: [{"id": "...", "dueDate": "...", "priority": "..."}]`;

  try {
    const jsonStr = await executeHybridAI(
      { model: "gemini-2.0-flash-exp", prompt, schema: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, dueDate: { type: Type.STRING }, priority: { type: Type.STRING } } } } },
      { messages: [{ role: "user", content: prompt }] }
    );
    const updates = JSON.parse(cleanJson(jsonStr));
    if (!Array.isArray(updates)) return tasks;
    return tasks.map(t => {
      const u = updates.find((up: any) => up.id === t.id);
      return u ? { ...t, ...u } : t;
    });
  } catch (e) { return tasks; }
};

export const generateProactiveSuggestions = async (tasks: Task[]): Promise<any[]> => {
  const prompt = `Analyze tasks: ${JSON.stringify(tasks.slice(0, 10).map(t => ({ title: t.title, due: t.dueDate })))}. Generate 3 suggestions. JSON: [{"text": "...", "action": "...", "type": "productivity"}]`;

  try {
    const jsonStr = await executeHybridAI(
      { model: "gemini-2.0-flash-exp", prompt, schema: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { text: { type: Type.STRING }, action: { type: Type.STRING }, type: { type: Type.STRING } } } } },
      { messages: [{ role: "user", content: prompt }] }
    );
    const res = JSON.parse(cleanJson(jsonStr));
    return Array.isArray(res) ? res.slice(0, 3) : [];
  } catch (e) { return []; }
};

export const parseSlashCommand = (input: string) => {
  if (!input.startsWith('/')) return null;
  const parts = input.slice(1).split(' ');
  return { type: parts[0].toLowerCase(), args: parts.slice(1).join(' ') };
};
