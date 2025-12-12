import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { GeneratedTaskData, Task, Subtask, AICommandResponse } from "../types";
import { ollamaGenerate, checkOllamaAvailability, parseOllamaJson } from "./ollama";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

// Flag to track if AI features are available
let aiInstance: GoogleGenAI | null = null;
let aiInitializationError: string | null = null;

// Lazy initialization - only create the instance when needed
const getAI = (): GoogleGenAI => {
  if (aiInitializationError) {
    throw new Error(aiInitializationError);
  }

  if (!aiInstance) {
    if (!apiKey || apiKey.trim() === '' || apiKey === 'undefined') {
      aiInitializationError = 'VITE_GEMINI_API_KEY is not configured. AI features are disabled.';
      console.warn(aiInitializationError);
      throw new Error(aiInitializationError);
    }

    try {
      aiInstance = new GoogleGenAI({ apiKey });

    } catch (e: any) {
      aiInitializationError = `Failed to initialize Gemini AI: ${e.message}`;
      console.error(aiInitializationError);
      throw new Error(aiInitializationError);
    }
  }

  return aiInstance;
};

// Check if AI features are available (for UI to show/hide features)
export const isAIAvailable = (): boolean => {
  if (aiInitializationError) return false;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'undefined') return false;
  return true;
};

// Get the initialization error message if any
export const getAIError = (): string | null => {
  if (!apiKey || apiKey.trim() === '' || apiKey === 'undefined') {
    return 'VITE_GEMINI_API_KEY is not configured. Please add it to your .env file.';
  }
  return aiInitializationError;
};

const cleanJson = (text: string) => {
  if (!text) return "";
  let clean = text.trim();
  // Remove markdown code blocks if present
  clean = clean.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/\s*```$/, "").trim();
  return clean;
};

// Helper to extract text from either Gemini response or Ollama string fallback
const extractResponseText = (response: GenerateContentResponse | string): string => {
  if (typeof response === 'string') {
    // Ollama fallback returns a string directly
    return response;
  }
  // Gemini returns GenerateContentResponse with .text property
  return response.text || "";
};

// Helper to retry AI calls on network/timeout errors with Ollama fallback
const callAIWithRetry = async (
  operation: () => Promise<GenerateContentResponse>,
  fallbackConfig?: {
    prompt: string;
    systemPrompt?: string;
    expectJson?: boolean;
  },
  retries = 3,
  delay = 1000
): Promise<GenerateContentResponse | string> => {
  let lastError: any;

  // Try Gemini first with retries
  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      const isLastAttempt = i === retries - 1;
      console.warn(`Gemini Attempt ${i + 1} failed:`, error.message || error);

      if (!isLastAttempt) {
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
  }

  // Gemini failed after all retries, try Ollama fallback
  if (fallbackConfig) {

    const isOllamaUp = await checkOllamaAvailability();

    if (isOllamaUp) {
      try {
        const ollamaResponse = await ollamaGenerate(
          fallbackConfig.prompt,
          fallbackConfig.systemPrompt,
          fallbackConfig.expectJson
        );

        return ollamaResponse;
      } catch (ollamaError: any) {
        console.error('❌ Ollama fallback also failed:', ollamaError.message);
        throw new Error(`Both Gemini and Ollama failed. Gemini: ${lastError?.message}. Ollama: ${ollamaError.message}`);
      }
    } else {
      console.warn('⚠️ Ollama not available for fallback');
    }
  }

  throw lastError || new Error("AI Operation failed after retries");
};

export interface CommandContext {
  viewMode: string;
  isFocusMode: boolean;
  timeOfDay: string;
}

// Conversation memory for context-aware commands
interface CommandHistoryEntry {
  command: string;
  result: {
    added: number;
    updated: number;
    deleted: number;
  };
  timestamp: number;
}

const commandHistory: CommandHistoryEntry[] = [];
const MAX_HISTORY = 5;

export const addToCommandHistory = (command: string, added: number, updated: number, deleted: number): void => {
  commandHistory.unshift({
    command,
    result: { added, updated, deleted },
    timestamp: Date.now()
  });
  if (commandHistory.length > MAX_HISTORY) {
    commandHistory.pop();
  }
};

export const getCommandHistory = (): CommandHistoryEntry[] => {
  return [...commandHistory];
};

export const clearCommandHistory = (): void => {
  commandHistory.length = 0;
};


// Enhanced system instruction for the Context-Aware Command Center
const SYSTEM_INSTRUCTION_COMMAND = `
You are an elite AI Task Orchestrator with advanced natural language understanding.
Your goal is to manage the user's task list based on their natural language input.

## CONTEXT PROVIDED
1. Current Date (use for relative date calculations)
2. Current Tasks (simplified list with id, title, priority, category, dueDate, isCompleted)
3. Recent Command History (for context-aware follow-ups)
4. UI Context (Current View, Focus Mode Status, Time of Day)
5. User's Input

## CAPABILITIES

### ADD Tasks
- Parse natural language to create new tasks
- Infer priority from urgency words ("urgent", "ASAP", "whenever")
- Infer category from context ("meeting" → Work, "buy groceries" → Shopping)
- Parse dates: "tomorrow", "next Monday", "December 25th", "in 3 days"

### UPDATE Tasks (Fuzzy Matching)
- Match tasks by partial title (e.g., "groceries" matches "Buy groceries")
- Match by category ("all work tasks")
- Match by status ("completed tasks")
- Support bulk updates ("make all high priority tasks due Friday")

### DELETE Tasks
- Delete by fuzzy title match
- Delete by category ("remove shopping tasks")
- Delete completed tasks ("clear done items")

### CONTEXT AWARENESS
- If user says "also" or "another one", use context from previous command
- If user says "that one" or "the last task", refer to most recent task
- Understand pronouns referring to previous context

## OUTPUT FORMAT
Return structured JSON with:
- added: Array of new tasks to create
- updated: Array of {id, updates} for modifications
- deletedIds: Array of task IDs to remove
- aiResponse: Natural language confirmation (be concise, friendly)

## IMPORTANT RULES
1. When fuzzy matching, prefer exact matches over partial matches
2. For dates, convert all natural language to YYYY-MM-DD format
3. If uncertain about user intent, make a reasonable assumption and note it in aiResponse
4. Never delete tasks without clear user intent
5. For ambiguous commands, prefer ADD over DELETE

Strict JSON output only.
`;

export const processUserCommand = async (
  userInput: string,
  currentTasks: Task[],
  context?: CommandContext
): Promise<AICommandResponse> => {
  try {
    const simplifiedTasks = currentTasks.map(t => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      category: t.category,
      dueDate: t.dueDate,
      isCompleted: t.isCompleted
    }));

    // Include recent command history for context
    const recentHistory = commandHistory.slice(0, 3).map(h => h.command);

    const prompt = `
      Current Date: ${new Date().toISOString().split('T')[0]}
      Current Tasks: ${JSON.stringify(simplifiedTasks)}
      Recent Commands: ${recentHistory.length > 0 ? JSON.stringify(recentHistory) : 'None'}
      Context: ${context ? JSON.stringify(context) : 'None'}
      User Input: "${userInput}"
    `;

    // Using gemini-2.5-flash for command center to ensure speed and reduce timeouts
    const makeRequest = () => getAI().models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_COMMAND,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            added: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  priority: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
                  category: { type: Type.STRING },
                  dueDate: { type: Type.STRING, description: "YYYY-MM-DD format or null" }
                },
                required: ["title", "priority", "category"]
              }
            },
            updated: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  updates: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      description: { type: Type.STRING },
                      priority: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
                      category: { type: Type.STRING },
                      dueDate: { type: Type.STRING },
                      isCompleted: { type: Type.BOOLEAN }
                    }
                  }
                },
                required: ["id", "updates"]
              }
            },
            deletedIds: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            aiResponse: { type: Type.STRING }
          },
          required: ["added", "updated", "deletedIds", "aiResponse"]
        },
      },
    });

    const response = await callAIWithRetry(
      makeRequest,
      { prompt, systemPrompt: SYSTEM_INSTRUCTION_COMMAND, expectJson: true }
    );
    const text = cleanJson(extractResponseText(response));
    if (!text) throw new Error("No response generated");
    return JSON.parse(text) as AICommandResponse;
  } catch (error) {
    console.error("Gemini Command Error:", error);
    throw error;
  }
};

export const generateSubtasks = async (taskTitle: string, taskDescription?: string): Promise<Subtask[]> => {
  try {
    const prompt = `Break down the task "${taskTitle}" ${taskDescription ? `(${taskDescription})` : ''} into 3-5 smaller, actionable subtasks.`;

    // Switch to gemini-2.5-flash for SPEED
    const makeRequest = () => getAI().models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              isCompleted: { type: Type.BOOLEAN }
            },
            required: ["title", "isCompleted"]
          }
        },
      },
    });

    const response = await callAIWithRetry(
      makeRequest,
      { prompt, expectJson: true }
    );
    const text = cleanJson(extractResponseText(response));
    if (!text) return [];

    const rawSubtasks = JSON.parse(text);
    return rawSubtasks.map((st: any) => ({
      id: Math.random().toString(36).substr(2, 9),
      title: st.title,
      isCompleted: false,
      comments: []
    }));
  } catch (error) {
    console.error("Subtask Generation Error:", error);
    return [];
  }
};

export const updateTaskWithAI = async (currentTask: Task, userInstruction: string): Promise<Task> => {
  try {
    const prompt = `
      Current Date: ${new Date().toISOString().split('T')[0]}
      Task JSON: ${JSON.stringify(currentTask)}
      
      User Instruction: "${userInstruction}"
      
      Update the task JSON based on the instruction. Return the FULL updated task object.
      If the user asks to "Change priority to High", update the priority field.
      If the user asks to "Add a subtask", add it to the subtasks array.
    `;

    // Switch to gemini-2.5-flash for SPEED. 
    // It is sufficient for JSON updates and much faster than Pro.
    const makeRequest = () => getAI().models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        // We don't enforce a schema here to allow flexibility, 
        // but we expect the model to return the structure of a Task
      },
    });

    const response = await callAIWithRetry(
      makeRequest,
      { prompt, expectJson: true }
    );
    const text = cleanJson(extractResponseText(response));

    if (!text) throw new Error("No response from AI");

    const updatedTask = JSON.parse(text);
    // Ensure we don't lose the ID or create a new one accidentally
    return { ...updatedTask, id: currentTask.id };
  } catch (error) {
    console.error("Update Task Error:", error);
    throw error;
  }
};

export const brainstormIdeas = async (goal: string): Promise<GeneratedTaskData[]> => {
  try {
    const prompt = `
      Goal: "${goal}"
      
      You are a creative productivity expert. 
      Generate 5 to 8 specific, actionable tasks that would help achieve this goal.
      For each task, determine an appropriate Priority and Category.
      
      Return JSON only.
    `;

    const makeRequest = () => getAI().models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              priority: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
              category: { type: Type.STRING },
              dueDate: { type: Type.STRING, nullable: true }
            },
            required: ["title", "description", "priority", "category"]
          }
        }
      }
    });

    const response = await callAIWithRetry(
      makeRequest,
      { prompt, expectJson: true }
    );
    const text = cleanJson(extractResponseText(response));
    if (!text) return [];

    return JSON.parse(text);
  } catch (error) {
    console.error("Brainstorm Error:", error);
    throw error;
  }
};

export const optimizeSchedule = async (tasks: Task[]): Promise<Task[]> => {
  try {
    const prompt = `
      Current Date: ${new Date().toISOString().split('T')[0]}
      Tasks: ${JSON.stringify(tasks.map(t => ({ id: t.id, title: t.title, priority: t.priority, dueDate: t.dueDate, isCompleted: t.isCompleted })))}
      
      You are an expert scheduler. Organize these tasks to maximize productivity.
      1. Assign due dates to tasks that don't have them, based on priority.
      2. If a task is High priority, it should probably be due sooner.
      3. Reorder the list so the most important things are first.
      
      Return the FULL list of tasks with updated dueDates and an idealized order.
      Return JSON Array of Task objects (simplified to id and updates).
    `;

    const makeRequest = () => getAI().models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              dueDate: { type: Type.STRING },
              priority: { type: Type.STRING, enum: ["High", "Medium", "Low"] }
            },
            required: ["id", "dueDate", "priority"]
          }
        }
      }
    });

    const response = await callAIWithRetry(
      makeRequest,
      { prompt, expectJson: true }
    );
    const text = cleanJson(extractResponseText(response));
    if (!text) return tasks;

    const updates = JSON.parse(text);

    // Apply updates
    return tasks.map(t => {
      const update = updates.find((u: any) => u.id === t.id);
      if (update) {
        return { ...t, dueDate: update.dueDate, priority: update.priority };
      }
      return t;
    });

  } catch (error) {
    console.error("Optimization Error:", error);
    return tasks;
  }
};

export interface ProactiveSuggestion {
  text: string;
  action: string;
  type: 'overdue' | 'cleanup' | 'reminder' | 'productivity' | 'deadline';
}

export const generateProactiveSuggestions = async (tasks: Task[]): Promise<ProactiveSuggestion[]> => {
  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
    const hour = now.getHours();

    // Build context about tasks
    const overdueTasks = tasks.filter(t => !t.isCompleted && t.dueDate && new Date(t.dueDate) < now);
    const completedTasks = tasks.filter(t => t.isCompleted);
    const incompleteTasks = tasks.filter(t => !t.isCompleted);
    const upcomingTasks = tasks.filter(t => {
      if (!t.dueDate || t.isCompleted) return false;
      const due = new Date(t.dueDate);
      const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 2;
    });

    const prompt = `
      Current Date: ${today}
      Day of Week: ${dayOfWeek}
      Time: ${hour}:00

      Task Analysis:
      - Total tasks: ${tasks.length}
      - Overdue tasks: ${overdueTasks.length} ${overdueTasks.length > 0 ? `(${overdueTasks.slice(0, 3).map(t => t.title).join(', ')})` : ''}
      - Completed tasks: ${completedTasks.length}
      - Tasks due in next 2 days: ${upcomingTasks.length}
      - Incomplete tasks: ${incompleteTasks.length}

      Categories used: ${[...new Set(tasks.map(t => t.category).filter(Boolean))].join(', ') || 'None'}

      Generate 1-3 brief, helpful suggestions for the user. Be proactive and intelligent:
      - If overdue tasks exist, suggest prioritizing them
      - If it's Friday/weekend, suggest cleanup or planning
      - If morning, suggest focusing on high-priority items
      - If many completed tasks, suggest clearing them
      - If tasks due soon, remind about deadlines

      Each suggestion should have:
      1. A concise, friendly display text (max 50 chars)
      2. The command action to auto-fill when clicked
      3. The type (overdue, cleanup, reminder, productivity, deadline)

      Be creative and context-aware. Only suggest relevant actions.
    `;

    const makeRequest = () => getAI().models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING, description: "Display text for the suggestion chip" },
              action: { type: Type.STRING, description: "Command to auto-fill when clicked" },
              type: { type: Type.STRING, enum: ["overdue", "cleanup", "reminder", "productivity", "deadline"] }
            },
            required: ["text", "action", "type"]
          }
        }
      }
    });

    const response = await callAIWithRetry(
      makeRequest,
      { prompt, expectJson: true },
      2,  // fewer retries for suggestions
      500 // shorter delay
    );
    const text = cleanJson(extractResponseText(response));
    if (!text) return [];


    const parsed = JSON.parse(text);
    const suggestions = Array.isArray(parsed) ? parsed : [];
    return suggestions.slice(0, 3); // Max 3 suggestions
  } catch (error) {
    console.error("Proactive Suggestions Error:", error);
    return [];
  }
};

export type SlashCommandType = 'focus' | 'plan' | 'add' | 'unknown';

export interface SlashCommandResult {
  type: SlashCommandType;
  args: string;
}

export const parseSlashCommand = (input: string): SlashCommandResult | null => {
  if (!input.startsWith('/')) return null;

  const parts = input.slice(1).split(' ');
  const command = parts[0].toLowerCase();
  const args = parts.slice(1).join(' ');

  switch (command) {
    case 'focus':
      return { type: 'focus', args };
    case 'plan':
      return { type: 'plan', args };
    case 'add':
      return { type: 'add', args };
    default:
      return { type: 'unknown', args };
  }
};
