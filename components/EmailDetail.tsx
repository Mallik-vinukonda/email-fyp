import React, { useState } from 'react';
import { EmailMessage, Label } from '../types';
import { Sparkles, Reply, CornerUpLeft, User, Calendar, Tag, Plus, X } from 'lucide-react';
import { summarizeEmail } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';

interface EmailDetailProps {
  email: EmailMessage | null;
  onReply: () => void;
  availableLabels: Label[];
  onApplyLabel: (emailId: string, labelId: string) => void;
  onRemoveLabel: (emailId: string, labelId: string) => void;
}

export const EmailDetail: React.FC<EmailDetailProps> = ({ 
  email, 
  onReply, 
  availableLabels, 
  onApplyLabel, 
  onRemoveLabel 
}) => {
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isLabelDropdownOpen, setIsLabelDropdownOpen] = useState(false);

  // Reset summary when email changes
  React.useEffect(() => {
    setSummary(null);
    setIsLabelDropdownOpen(false);
  }, [email?.id]);

  const handleSummarize = async () => {
    if (!email || !email.body) return;
    setIsSummarizing(true);
    const result = await summarizeEmail(email.body);
    setSummary(result);
    setIsSummarizing(false);
  };

  if (!email) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 bg-gray-50/50">
        <Sparkles className="w-16 h-16 mb-4 text-gray-200" />
        <p className="text-lg">Select an email to view details</p>
      </div>
    );
  }

  const fromName = email.from ? email.from.split('<')[0].replace(/"/g, '').trim() : 'Unknown';
  const fromEmail = email.from && email.from.includes('<') ? email.from.match(/<([^>]+)>/)?.[1] : '';
  
  // Filter out system labels for display/adding mostly, or keep them if useful (like STARRED)
  const displayLabels = email.labelIds.filter(l => !l.startsWith('CATEGORY_'));
  const userLabels = availableLabels.filter(l => l.type === 'user');

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        
        {/* Top Actions Row */}
        <div className="flex justify-between items-start mb-4">
            <div className="flex-1 mr-4">
                 {/* Labels Row */}
                 <div className="flex flex-wrap gap-2 mb-2">
                    {displayLabels.map(labelId => {
                         const labelName = availableLabels.find(l => l.id === labelId)?.name || labelId;
                         return (
                            <span key={labelId} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                {labelName}
                                <button 
                                    onClick={() => onRemoveLabel(email.id, labelId)}
                                    className="ml-1 text-gray-400 hover:text-red-500"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                         );
                    })}
                    
                    <div className="relative">
                        <button 
                            onClick={() => setIsLabelDropdownOpen(!isLabelDropdownOpen)}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                        >
                            <Plus className="w-3 h-3 mr-1" /> Label
                        </button>
                        
                        {isLabelDropdownOpen && (
                            <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-100 py-1 z-10 max-h-60 overflow-y-auto">
                                <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Apply Label</div>
                                {userLabels.map(label => (
                                    <button
                                        key={label.id}
                                        onClick={() => {
                                            onApplyLabel(email.id, label.id);
                                            setIsLabelDropdownOpen(false);
                                        }}
                                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50"
                                    >
                                        {label.name}
                                    </button>
                                ))}
                                {userLabels.length === 0 && (
                                    <div className="px-4 py-2 text-sm text-gray-400 italic">No custom labels</div>
                                )}
                            </div>
                        )}
                    </div>
                 </div>

                 <h1 className="text-2xl font-bold text-gray-900 leading-tight">{email.subject}</h1>
            </div>

          <div className="flex gap-2 shrink-0">
            <button 
              onClick={handleSummarize}
              disabled={isSummarizing}
              className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${isSummarizing ? 'animate-spin' : ''}`} />
              {isSummarizing ? 'Thinking...' : 'Summarize'}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                    {fromName.charAt(0).toUpperCase()}
                </div>
                <div>
                    <div className="font-semibold text-gray-900 flex items-baseline gap-2">
                        {fromName} <span className="text-xs text-gray-500 font-normal">{fromEmail}</span>
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                        To: me
                    </div>
                </div>
            </div>
            <div className="text-sm text-gray-500 flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(Number(email.internalDate)).toLocaleString()}
            </div>
        </div>
      </div>

      {/* AI Summary Section */}
      {summary && (
        <div className="mx-6 mt-6 p-4 bg-indigo-50 rounded-xl border border-indigo-100 animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center gap-2 mb-2 text-indigo-800 font-semibold">
                <Sparkles className="w-4 h-4" />
                <h3>AI Summary</h3>
            </div>
            <div className="prose prose-sm prose-indigo text-indigo-900 max-w-none">
                <ReactMarkdown>{summary}</ReactMarkdown>
            </div>
        </div>
      )}

      {/* Email Body */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="prose max-w-none text-gray-800 whitespace-pre-wrap font-sans">
            {email.body}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-gray-200 bg-gray-50 flex gap-4 items-center">
        <button 
            onClick={onReply}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-shadow shadow-sm font-medium"
        >
            <Reply className="w-4 h-4" />
            Reply
        </button>
        <button className="flex items-center gap-2 px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium">
            <CornerUpLeft className="w-4 h-4" />
            Forward
        </button>
      </div>
    </div>
  );
};
