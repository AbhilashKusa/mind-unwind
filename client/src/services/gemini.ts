import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { GeneratedTaskData, Task, Subtask, AICommandResponse } from "../types";

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
      console.log("Gemini AI initialized successfully.");
    } catch (e: any) {
      aiInitializationError = `Failed to initialize Gemini AI: ${e.message}`;
      console.error(aiInitializationError);
      throw new Error(aiInitializationError);
    }
  }

  return aiInstance;
};

const cleanJson = (text: string) => {
  if (!text) return "";
  let clean = text.trim();
  // Remove markdown code blocks if present
  clean = clean.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/\s*```$/, "").trim();
  return clean;
};

// Helper to retry AI calls on network/timeout errors
// Explicitly removed generic T to enforce GenerateContentResponse for simplicity and type safety in this context
const callAIWithRetry = async (operation: () => Promise<GenerateContentResponse>, retries = 3, delay = 1000): Promise<GenerateContentResponse> => {
  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      const isLastAttempt = i === retries - 1;
      console.warn(`AI Attempt ${i + 1} failed:`, error);

      if (isLastAttempt) throw error;

      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
  throw new Error("AI Operation failed after retries");
};

// System instruction for the Context-Aware Command Center
const SYSTEM_INSTRUCTION_COMMAND = `
  You are an advanced AI Task Orchestrator.
  Your goal is to manage the user's task list based on their natural language input.
  
  You will receive:
  1. The User's Input.
  2. A simplified list of Current Tasks.
  3. The Current Date.

  You must identify if the user wants to:
  - ADD new tasks.
  - UPDATE existing tasks (fuzzy match titles).
  - DELETE tasks.
  
  Strict JSON output.
`;

export const processUserCommand = async (
  userInput: string,
  currentTasks: Task[]
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

    const prompt = `
      Current Date: ${new Date().toISOString().split('T')[0]}
      Current Tasks State: ${JSON.stringify(simplifiedTasks)}
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

    const response = await callAIWithRetry(makeRequest);
    const text = cleanJson(response.text || "");
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

    const response = await callAIWithRetry(makeRequest);
    const text = cleanJson(response.text || "");
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

    const response = await callAIWithRetry(makeRequest);
    const text = cleanJson(response.text || "");

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

    const response = await callAIWithRetry(makeRequest);
    const text = cleanJson(response.text || "");
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

    const response = await callAIWithRetry(makeRequest);
    const text = cleanJson(response.text || "");
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