import { GoogleGenAI, Type } from '@google/genai';
import { DraftConfig } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// System instruction for summarization
const SUMMARIZE_SYSTEM_INSTRUCTION = `
You are an AI assistant helping users quickly understand emails.
Summarize the email clearly in bullet points.
Highlight any action items or deadlines.
If no action is required, explicitly state so.
Do not invent information.
`;

// System instruction for drafting
const DRAFT_SYSTEM_INSTRUCTION = `
You are an expert email communication assistant.
Your goal is to write concise, professional, and clear emails based on user intent.
Do not add new facts not present in the context.
End with a professional closing.
`;

// System instruction for sentiment
const SENTIMENT_SYSTEM_INSTRUCTION = `
You are an AI that analyzes email sentiment. 
Classify the sentiment of each email snippet provided. 
Return 'Positive', 'Negative', or 'Neutral'.
`;

export const summarizeEmail = async (emailContent: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Please summarize the following email:\n\n${emailContent}`,
      config: {
        systemInstruction: SUMMARIZE_SYSTEM_INSTRUCTION,
        temperature: 0.3, 
      },
    });
    return response.text || 'Failed to generate summary.';
  } catch (error) {
    console.error('Error summarizing email:', error);
    return 'Error generating summary. Please try again.';
  }
};

export const generateDraft = async (config: DraftConfig): Promise<string> => {
  const { intent, tone, originalEmailContent, recipient } = config;

  let prompt = `Write a ${tone.toLowerCase()} email.`;
  
  if (recipient) {
    prompt += ` The email is addressed to: ${recipient}.`;
  }
  
  prompt += `\nUser Intent: "${intent}"`;

  if (originalEmailContent) {
    prompt += `\n\nOriginal Email Context (for reply reference):\n"${originalEmailContent}"`;
    prompt += `\n\nEnsure the reply addresses the points in the original email if relevant, but stay focused on the user intent.`;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        systemInstruction: DRAFT_SYSTEM_INSTRUCTION,
        temperature: 0.7, 
      },
    });
    return response.text || 'Failed to generate draft.';
  } catch (error) {
    console.error('Error generating draft:', error);
    return 'Error generating draft. Please try again.';
  }
};

export const batchAnalyzeSentiment = async (emails: { id: string; snippet: string }[]): Promise<Record<string, 'Positive' | 'Negative' | 'Neutral'>> => {
  if (emails.length === 0) return {};

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Analyze the sentiment for the following emails:\n${JSON.stringify(emails)}`,
      config: {
        systemInstruction: SENTIMENT_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              sentiment: { type: Type.STRING, enum: ['Positive', 'Negative', 'Neutral'] },
            },
            required: ['id', 'sentiment'],
          },
        },
      },
    });

    const results = JSON.parse(response.text || '[]') as { id: string; sentiment: 'Positive' | 'Negative' | 'Neutral' }[];
    
    // Convert array to map for easy lookup
    return results.reduce((acc, curr) => {
      acc[curr.id] = curr.sentiment;
      return acc;
    }, {} as Record<string, 'Positive' | 'Negative' | 'Neutral'>);

  } catch (error) {
    console.error('Error analyzing sentiment:', error);
    return {};
  }
};
