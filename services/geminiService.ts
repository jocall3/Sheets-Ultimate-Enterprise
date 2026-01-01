
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function askGemini(task: string, context: string) {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are a spreadsheet expert assistant. 
      Context about the current sheet selection: ${context}
      User request: ${task}
      
      Provide a helpful response. If the user asks for a formula, provide it starting with '='. 
      If the user asks for analysis, be concise and data-driven.`,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error communicating with AI assistant.";
  }
}

export async function generateFormulaSuggestion(description: string) {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate a Google Sheets formula for: ${description}. Output only the formula string.`,
    });
    return response.text?.trim();
  } catch (error) {
      return "#ERROR!";
  }
}
