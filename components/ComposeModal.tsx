import React, { useState, useEffect } from 'react';
import { X, Sparkles, Send, Wand2, RefreshCw } from 'lucide-react';
import { EmailMessage, EmailTone, DraftConfig } from '../types';
import { generateDraft } from '../services/geminiService';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  replyTo?: EmailMessage | null;
  onSend: (content: string, to: string, subject: string) => Promise<void>;
}

export const ComposeModal: React.FC<ComposeModalProps> = ({ isOpen, onClose, replyTo, onSend }) => {
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [intent, setIntent] = useState('');
  const [tone, setTone] = useState<EmailTone>(EmailTone.PROFESSIONAL);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showAiControls, setShowAiControls] = useState(true);

  useEffect(() => {
    if (replyTo) {
      const fromEmail = replyTo.from?.match(/<([^>]+)>/)?.[1] || replyTo.from || '';
      setRecipient(fromEmail);
      setSubject(replyTo.subject?.startsWith('Re:') ? replyTo.subject : `Re: ${replyTo.subject}`);
      // Initial intent suggestion
      setIntent('Acknowledge receipt and thank them.');
    } else {
      setRecipient('');
      setSubject('');
      setIntent('');
      setContent('');
    }
  }, [replyTo, isOpen]);

  const handleGenerate = async () => {
    if (!intent) return;
    setIsGenerating(true);
    
    const config: DraftConfig = {
      intent,
      tone,
      recipient,
      subject,
      originalEmailContent: replyTo?.body
    };

    const draft = await generateDraft(config);
    setContent(draft);
    setIsGenerating(false);
    setShowAiControls(false); // Hide controls after generation to focus on editing
  };

  const handleSend = async () => {
    if (!recipient || !content) return;
    setIsSending(true);
    await onSend(content, recipient, subject);
    setIsSending(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            {replyTo ? 'Reply with AI' : 'New Message'}
            {isGenerating && <span className="text-xs font-normal text-indigo-600 animate-pulse">Drafting...</span>}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          
          {/* Main Compose Area */}
          <div className="flex-1 flex flex-col p-6 overflow-y-auto">
             <div className="space-y-4 mb-4">
                <input
                    type="text"
                    placeholder="To"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    className="w-full border-b border-gray-200 py-2 px-1 focus:outline-none focus:border-blue-500 bg-transparent"
                />
                <input
                    type="text"
                    placeholder="Subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full border-b border-gray-200 py-2 px-1 focus:outline-none focus:border-blue-500 font-medium bg-transparent"
                />
             </div>

             <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your email here..."
                className="flex-1 w-full resize-none focus:outline-none text-gray-800 leading-relaxed min-h-[300px]"
             />
          </div>

          {/* AI Controls Sidebar */}
          <div className={`w-80 bg-gray-50 border-l border-gray-200 p-6 flex flex-col gap-6 transition-all duration-300 ${showAiControls ? 'translate-x-0' : 'hidden'}`}>
             <div>
                <div className="flex items-center gap-2 text-indigo-700 font-semibold mb-1">
                    <Wand2 className="w-4 h-4" />
                    AI Assistant
                </div>
                <p className="text-xs text-gray-500">Describe what you want to say, and I'll draft it for you.</p>
             </div>

             <div className="space-y-4">
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Your Intent</label>
                    <textarea
                        value={intent}
                        onChange={(e) => setIntent(e.target.value)}
                        placeholder="e.g. Agree to the meeting but ask for 2pm instead..."
                        className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm h-32 resize-none"
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Tone</label>
                    <div className="grid grid-cols-2 gap-2">
                        {Object.values(EmailTone).map((t) => (
                            <button
                                key={t}
                                onClick={() => setTone(t)}
                                className={`px-3 py-2 rounded-md text-xs font-medium border transition-colors ${
                                    tone === t 
                                    ? 'bg-indigo-100 border-indigo-200 text-indigo-800' 
                                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                                }`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

                <button
                    onClick={handleGenerate}
                    disabled={!intent || isGenerating}
                    className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-medium shadow-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
                >
                    {isGenerating ? (
                        <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Drafting...
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-4 h-4" />
                            Generate Draft
                        </>
                    )}
                </button>
             </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
            <button 
                onClick={() => setShowAiControls(!showAiControls)}
                className="text-sm text-indigo-600 font-medium hover:text-indigo-800"
            >
                {showAiControls ? 'Hide AI Assistant' : 'Show AI Assistant'}
            </button>

            <div className="flex gap-3">
                <button 
                    onClick={onClose}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                >
                    Discard
                </button>
                <button 
                    onClick={handleSend}
                    disabled={isSending || !content}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                >
                    {isSending ? 'Sending...' : 'Send'}
                    <Send className="w-4 h-4" />
                </button>
            </div>
        </div>

      </div>
    </div>
  );
};
