
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Message, GroundingSource } from "../types";

export class GeminiService {
  private getAI() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }
  
  private modelName: string = 'gemini-3-pro-preview';

  async *sendMessageStream(
    message: string, 
    history: Message[], 
    isTechnicalMode: boolean
  ): AsyncGenerator<{ text: string; sources?: GroundingSource[] }> {
    const ai = this.getAI();
    
    const systemInstruction = isTechnicalMode
      ? "Você é um assistente técnico especialista. Forneça respostas detalhadas e focadas em arquitetura e código limpo. Use o Google Search para verificar documentações recentes se necessário."
      : "Você é um assistente multifuncional amigável. Ajude com estudos, ideias e textos. Use o Google Search para fatos atuais.";

    const contents = [
      ...history.map(m => ({
        role: m.role === 'user' ? 'user' as const : 'model' as const,
        parts: [{ text: m.content }]
      })),
      { role: 'user' as const, parts: [{ text: message }] }
    ];

    try {
      const result = await ai.models.generateContentStream({
        model: this.modelName,
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          tools: [{ googleSearch: {} }],
          temperature: isTechnicalMode ? 0.2 : 0.7,
        }
      });

      let fullText = "";
      let sources: GroundingSource[] = [];

      for await (const chunk of result) {
        const textChunk = chunk.text;
        if (textChunk) {
          fullText += textChunk;
          
          // Tentar extrair metadados de grounding se disponíveis no chunk
          const chunks = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
          if (chunks) {
            chunks.forEach((c: any) => {
              if (c.web?.uri && c.web?.title) {
                if (!sources.find(s => s.uri === c.web.uri)) {
                  sources.push({ title: c.web.title, uri: c.web.uri });
                }
              }
            });
          }
          
          yield { text: fullText, sources: sources.length > 0 ? sources : undefined };
        }
      }
    } catch (error: any) {
      console.error("Gemini Stream Error:", error);
      throw new Error(error.message || "Erro na comunicação com a IA.");
    }
  }
}

export const geminiService = new GeminiService();
