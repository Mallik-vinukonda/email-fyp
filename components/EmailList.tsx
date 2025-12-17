import React from 'react';
import { EmailMessage } from '../types';
import { Mail, Smile, Frown, Minus, Square, CheckSquare } from 'lucide-react';

interface EmailListProps {
  emails: EmailMessage[];
  selectedId?: string;
  onSelect: (email: EmailMessage) => void;
  isLoading: boolean;
  selectedIds: string[];
  onToggleSelect: (id: string, e: React.MouseEvent) => void;
  showSentiment: boolean;
}

const SentimentIcon = ({ sentiment }: { sentiment?: 'Positive' | 'Negative' | 'Neutral' }) => {
  if (!sentiment) return null;
  switch (sentiment) {
    case 'Positive': return <Smile className="w-4 h-4 text-green-500" />;
    case 'Negative': return <Frown className="w-4 h-4 text-red-500" />;
    case 'Neutral': return <Minus className="w-4 h-4 text-gray-400" />;
    default: return null;
  }
};

export const EmailList: React.FC<EmailListProps> = ({ 
  emails, 
  selectedId, 
  onSelect, 
  isLoading, 
  selectedIds, 
  onToggleSelect,
  showSentiment 
}) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
        <p>Syncing with Gmail...</p>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <Mail className="w-12 h-12 mb-2 opacity-50" />
        <p>No emails found</p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full bg-white divide-y divide-gray-100">
      {emails.map((email) => {
        const isSelected = email.id === selectedId;
        const isChecked = selectedIds.includes(email.id);
        const fromName = email.from ? email.from.split('<')[0].replace(/"/g, '').trim() : 'Unknown';
        
        return (
          <div
            key={email.id}
            onClick={() => onSelect(email)}
            className={`cursor-pointer p-4 transition-colors hover:bg-gray-50 group ${
              isSelected ? 'bg-blue-50 border-l-4 border-blue-600' : 'border-l-4 border-transparent'
            }`}
          >
            <div className="flex items-start gap-3">
              {/* Checkbox (visible on hover or if checked) */}
              <div 
                className={`mt-1 text-gray-400 hover:text-blue-600 ${isChecked ? 'opacity-100 text-blue-600' : 'opacity-0 group-hover:opacity-100'}`}
                onClick={(e) => onToggleSelect(email.id, e)}
              >
                {isChecked ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <h3 className={`text-sm truncate pr-2 ${isSelected ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                    {fromName}
                  </h3>
                  <div className="flex items-center gap-2 shrink-0">
                    {showSentiment && <SentimentIcon sentiment={email.sentiment} />}
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {new Date(Number(email.internalDate)).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
                
                <h4 className={`text-sm mb-1 truncate ${isSelected ? 'text-blue-800 font-medium' : 'text-gray-900'}`}>
                  {email.subject}
                </h4>
                
                <p className="text-xs text-gray-500 line-clamp-2">
                  {email.snippet}
                </p>
                
                {/* Labels (simplified display) */}
                {email.labelIds && email.labelIds.length > 0 && (
                   <div className="flex flex-wrap gap-1 mt-2">
                      {email.labelIds.filter(l => !l.startsWith('CATEGORY_')).map(l => (
                        <span key={l} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded">
                          {l}
                        </span>
                      ))}
                   </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
