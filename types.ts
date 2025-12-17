export interface EmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  historyId: string;
  internalDate: string;
  payload: MessagePart;
  // Computed fields for UI
  subject?: string;
  from?: string;
  date?: string;
  body?: string;
  sentiment?: 'Positive' | 'Negative' | 'Neutral';
}

export interface MessagePart {
  partId: string;
  mimeType: string;
  filename: string;
  headers: Header[];
  body: MessageBody;
  parts?: MessagePart[];
}

export interface Header {
  name: string;
  value: string;
}

export interface MessageBody {
  size: number;
  data?: string;
}

export enum EmailTone {
  PROFESSIONAL = 'Professional',
  CASUAL = 'Casual',
  DIRECT = 'Direct',
  EMPATHETIC = 'Empathetic',
}

export interface DraftConfig {
  intent: string;
  tone: EmailTone;
  originalEmailContent?: string;
  recipient?: string;
  subject?: string;
}

export interface AIState {
  isGenerating: boolean;
  error?: string;
  result?: string;
}

export interface Label {
  id: string;
  name: string;
  type: 'system' | 'user';
}

export interface FilterCriteria {
  from?: string;
  subject?: string;
  query?: string;
}
