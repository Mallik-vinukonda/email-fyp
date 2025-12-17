import { EmailMessage, Label, FilterCriteria } from '../types';

const BASE_URL = 'https://gmail.googleapis.com/gmail/v1/users/me';

export class GmailService {
  private accessToken: string;

  constructor(token: string) {
    this.accessToken = token;
  }

  private async fetchWithAuth(endpoint: string, options: RequestInit = {}) {
    const headers = {
      ...options.headers,
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized: Invalid or expired access token.');
      }
      throw new Error(`Gmail API Error: ${response.statusText}`);
    }

    // Some endpoints (like delete) might return 204 No Content
    if (response.status === 204) return null;

    return response.json();
  }

  async listMessages(maxResults = 15, query = 'in:inbox'): Promise<EmailMessage[]> {
    const encodedQuery = encodeURIComponent(query);
    const data = await this.fetchWithAuth(`/messages?maxResults=${maxResults}&q=${encodedQuery}`);
    const messages = data.messages || [];
    
    // Batch fetch details
    const detailedMessages = await Promise.all(
      messages.map((msg: { id: string }) => this.getMessage(msg.id))
    );

    return detailedMessages;
  }

  async getMessage(id: string): Promise<EmailMessage> {
    const data = await this.fetchWithAuth(`/messages/${id}?format=full`);
    return this.processEmailData(data);
  }

  async sendEmail(rawBase64: string): Promise<void> {
    await this.fetchWithAuth('/messages/send', {
      method: 'POST',
      body: JSON.stringify({ raw: rawBase64 }),
    });
  }

  // --- Labels ---

  async listLabels(): Promise<Label[]> {
    const data = await this.fetchWithAuth('/labels');
    return data.labels || [];
  }

  async createLabel(name: string): Promise<Label> {
    return this.fetchWithAuth('/labels', {
      method: 'POST',
      body: JSON.stringify({ name, labelListVisibility: 'labelShow', messageListVisibility: 'show' }),
    });
  }

  async deleteLabel(id: string): Promise<void> {
    await this.fetchWithAuth(`/labels/${id}`, { method: 'DELETE' });
  }

  async modifyMessage(id: string, addLabelIds: string[], removeLabelIds: string[]): Promise<void> {
    await this.fetchWithAuth(`/messages/${id}/modify`, {
      method: 'POST',
      body: JSON.stringify({ addLabelIds, removeLabelIds }),
    });
  }

  async batchModifyMessages(ids: string[], addLabelIds: string[], removeLabelIds: string[]): Promise<void> {
    await this.fetchWithAuth('/messages/batchModify', {
      method: 'POST',
      body: JSON.stringify({ ids, addLabelIds, removeLabelIds }),
    });
  }

  // --- Filters ---

  async createFilter(criteria: FilterCriteria, addLabelIds: string[]): Promise<void> {
    await this.fetchWithAuth('/settings/filters', {
      method: 'POST',
      body: JSON.stringify({
        criteria,
        action: { addLabelIds }
      }),
    });
  }

  private processEmailData(data: any): EmailMessage {
    const headers = data.payload.headers;
    const subject = headers.find((h: any) => h.name === 'Subject')?.value || '(No Subject)';
    const from = headers.find((h: any) => h.name === 'From')?.value || 'Unknown';
    const date = headers.find((h: any) => h.name === 'Date')?.value || '';

    let body = '';
    if (data.payload.parts) {
      const textPart = data.payload.parts.find((p: any) => p.mimeType === 'text/plain');
      if (textPart && textPart.body.data) {
        body = this.decodeBase64(textPart.body.data);
      } else {
        // Fallback to HTML part or body if structure is flat
        const htmlPart = data.payload.parts.find((p: any) => p.mimeType === 'text/html');
        if (htmlPart && htmlPart.body.data) {
           // Strip HTML tags for simple text representation
           const html = this.decodeBase64(htmlPart.body.data);
           body = html.replace(/<[^>]*>?/gm, '');
        }
      }
    } else if (data.payload.body.data) {
      body = this.decodeBase64(data.payload.body.data);
    }

    return {
      ...data,
      subject,
      from,
      date,
      body,
    };
  }

  private decodeBase64(data: string): string {
    return atob(data.replace(/-/g, '+').replace(/_/g, '/'));
  }
}
