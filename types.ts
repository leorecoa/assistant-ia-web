
export type Role = 'user' | 'assistant';

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  sources?: GroundingSource[];
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}

export interface AssistantSettings {
  isTechnicalMode: boolean;
  theme: 'light' | 'dark';
}
