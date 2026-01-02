
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Message } from "../types";

export class GeminiService {
  private ai: GoogleGenAI;
  private modelName: string = 'gemini-3-flash-preview';

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  async sendMessage(
    message: string, 
    history: Message[], 
    isTechnicalMode: boolean
  ): Promise<string> {
    try {
      const systemInstruction = isTechnicalMode
        ? "Você é um assistente técnico especialista. Forneça respostas detalhadas, precisas e focadas em arquitetura, eficiência e boas práticas. Quando solicitado código, escreva código otimizado e documentado. Explique erros de forma estruturada (causa, diagnóstico, solução)."
        : "Você é um assistente útil e amigável. Ajude com perguntas gerais, estudos, resumos e geração de ideias. Seja claro e conciso.";

      const contents = [
        ...history.map(m => ({
          role: m.role === 'user' ? 'user' as const : 'model' as const,
          parts: [{ text: m.content }]
        })),
        { role: 'user' as const, parts: [{ text: message }] }
      ];

      const response: GenerateContentResponse = await this.ai.models.generateContent({
        model: this.modelName,
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          temperature: isTechnicalMode ? 0.3 : 0.7,
        }
      });

      const text = response.text;
      if (!text) throw new Error("A IA retornou uma resposta vazia.");
      
      return text;
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      if (error.message?.includes("API key not valid")) {
        throw new Error("Chave de API inválida. Por favor, verifique as configurações.");
      }
      throw new Error(error.message || "Ocorreu um erro ao processar sua solicitação.");
    }
  }
}

export const geminiService = new GeminiService();
