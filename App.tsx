import React, { useState, useEffect } from 'react';
import { GmailService } from './services/gmailService';
import { batchAnalyzeSentiment } from './services/geminiService';
import { EmailList } from './components/EmailList';
import { EmailDetail } from './components/EmailDetail';
import { ComposeModal } from './components/ComposeModal';
import { FilterModal } from './components/FilterModal';
import { EmailMessage, Label } from './types';
import { Inbox, Send, ShieldAlert, LogOut, RefreshCw, Search, Tag, Plus, Trash2, Brain, Filter, ChevronDown } from 'lucide-react';

const CLIENT_ID = '237295841929-qs689nt201ajlrcagtnlsj5im28gsknc.apps.googleusercontent.com';
const REDIRECT_URI = 'http://localhost:3000/oauth/callback';
// Scopes required for the application features
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify', // For labels and trash
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.settings.basic' // For creating filters
].join(' ');

const App: React.FC = () => {
  const [token, setToken] = useState<string | null>(null);
  const [gmailService, setGmailService] = useState<GmailService | null>(null);
  
  // Data State
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
  const [selectedEmailIds, setSelectedEmailIds] = useState<string[]>([]);
  
  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<EmailMessage | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Feature Toggles/Inputs
  const [inputToken, setInputToken] = useState('');
  const [showSentiment, setShowSentiment] = useState(false);
  const [isAnalyzingSentiment, setIsAnalyzingSentiment] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [isCreatingLabel, setIsCreatingLabel] = useState(false);
  const [showManualLogin, setShowManualLogin] = useState(false);

  // Handle OAuth Callback
  useEffect(() => {
    const handleCallback = () => {
      // Check if we are on the callback route
      if (window.location.pathname === '/oauth/callback' || window.location.pathname === '/oauth/callback/') {
        const hash = window.location.hash;
        if (hash) {
          const params = new URLSearchParams(hash.substring(1)); // remove #
          const accessToken = params.get('access_token');
          if (accessToken) {
            setToken(accessToken);
            setGmailService(new GmailService(accessToken));
            // Clean URL and redirect to root to avoid state issues
            window.history.replaceState({}, document.title, '/');
          }
        }
      }
    };
    
    handleCallback();
  }, []);

  const handleOAuthLogin = () => {
    // Implicit flow: response_type=token
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=token&scope=${encodeURIComponent(SCOPES)}&prompt=consent`;
    window.location.href = authUrl;
  };

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputToken) {
      setToken(inputToken);
      setGmailService(new GmailService(inputToken));
    }
  };

  const loadData = async (query = 'in:inbox') => {
    if (!gmailService) return;
    setIsLoading(true);
    try {
      const [msgs, lbls] = await Promise.all([
        gmailService.listMessages(15, query),
        gmailService.listLabels()
      ]);
      setEmails(msgs);
      setLabels(lbls);
    } catch (error) {
      console.error(error);
      alert('Failed to fetch data. Token might be invalid.');
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (gmailService) {
      loadData();
    }
  }, [gmailService]);

  // --- Search ---
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadData(searchQuery || 'in:inbox');
  };

  // --- Sentiment ---
  const handleAnalyzeSentiment = async () => {
    if (!showSentiment) {
      setShowSentiment(true);
      if (emails.length > 0) {
        setIsAnalyzingSentiment(true);
        const snippets = emails.map(e => ({ id: e.id, snippet: e.snippet }));
        const sentiments = await batchAnalyzeSentiment(snippets);
        
        setEmails(prev => prev.map(email => ({
          ...email,
          sentiment: sentiments[email.id]
        })));
        setIsAnalyzingSentiment(false);
      }
    } else {
      setShowSentiment(false);
    }
  };

  // --- Labels ---
  const handleCreateLabel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabelName || !gmailService) return;
    try {
      const label = await gmailService.createLabel(newLabelName);
      setLabels([...labels, label]);
      setNewLabelName('');
      setIsCreatingLabel(false);
    } catch (e) {
      console.error(e);
      alert('Failed to create label');
    }
  };

  const handleDeleteLabel = async (id: string) => {
    if (!gmailService || !confirm('Delete this label?')) return;
    try {
      await gmailService.deleteLabel(id);
      setLabels(labels.filter(l => l.id !== id));
    } catch (e) {
      console.error(e);
      alert('Failed to delete label');
    }
  };

  const handleApplyLabel = async (emailId: string, labelId: string) => {
    if (!gmailService) return;
    try {
      await gmailService.modifyMessage(emailId, [labelId], []);
      // Optimistic update
      updateEmailLabels(emailId, [labelId], []);
    } catch (e) {
      console.error(e);
      alert('Failed to apply label');
    }
  };

  const handleRemoveLabel = async (emailId: string, labelId: string) => {
    if (!gmailService) return;
    try {
      await gmailService.modifyMessage(emailId, [], [labelId]);
      updateEmailLabels(emailId, [], [labelId]);
    } catch (e) {
      console.error(e);
      alert('Failed to remove label');
    }
  };

  const updateEmailLabels = (emailId: string, add: string[], remove: string[]) => {
    setEmails(prev => prev.map(e => {
      if (e.id !== emailId) return e;
      const newLabels = new Set(e.labelIds || []);
      add.forEach(id => newLabels.add(id));
      remove.forEach(id => newLabels.delete(id));
      return { ...e, labelIds: Array.from(newLabels) };
    }));
    
    if (selectedEmail && selectedEmail.id === emailId) {
       setSelectedEmail(prev => {
           if (!prev) return null;
           const newLabels = new Set(prev.labelIds || []);
           add.forEach(id => newLabels.add(id));
           remove.forEach(id => newLabels.delete(id));
           return { ...prev, labelIds: Array.from(newLabels) };
       });
    }
  };

  // --- Bulk Actions ---
  const toggleSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEmailIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkApplyLabel = async (labelId: string) => {
    if (!gmailService || selectedEmailIds.length === 0) return;
    try {
        await gmailService.batchModifyMessages(selectedEmailIds, [labelId], []);
        // Refresh to show changes or optimistically update all
        loadData(searchQuery || 'in:inbox');
        setSelectedEmailIds([]);
    } catch (e) {
        console.error(e);
        alert('Failed to apply labels in bulk');
    }
  };

  // --- Filters ---
  const handleCreateFilter = async (criteria: any, labelId: string) => {
      if (!gmailService) return;
      try {
          await gmailService.createFilter(criteria, [labelId]);
          alert('Filter created successfully!');
      } catch (e) {
          console.error(e);
          alert('Failed to create filter');
      }
  };

  // --- Email Sending ---
  const handleSendEmail = async (content: string, to: string, subject: string) => {
    if (!gmailService) return;
    const emailLines = [
        `To: ${to}`,
        `Subject: ${subject}`,
        'Content-Type: text/plain; charset="UTF-8"',
        'MIME-Version: 1.0',
        '',
        content
    ];
    const email = emailLines.join('\r\n');
    const base64EncodedEmail = btoa(unescape(encodeURIComponent(email)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    try {
      await gmailService.sendEmail(base64EncodedEmail);
      alert('Email sent successfully!');
      loadData(); 
    } catch (error) {
      console.error(error);
      alert('Failed to send email.');
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
          <div className="flex items-center justify-center mb-6 text-blue-600">
            <Inbox className="w-12 h-12" />
          </div>
          <h1 className="text-2xl font-bold text-center mb-2 text-gray-900">SmartInbox AI</h1>
          <p className="text-center text-gray-500 mb-8 text-sm">
            Experience an intelligent email client powered by Gemini.
          </p>
          
          <div className="space-y-4">
             <button 
                onClick={handleOAuthLogin}
                className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 py-3 rounded-lg font-medium transition-all shadow-sm group"
             >
                <img 
                    src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
                    alt="Google" 
                    className="w-5 h-5" 
                />
                Sign in with Google
             </button>

             <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                    <span className="px-2 bg-white text-gray-500">or</span>
                </div>
             </div>
             
             <button 
                onClick={() => setShowManualLogin(!showManualLogin)}
                className="w-full text-sm text-gray-500 hover:text-gray-700 font-medium flex items-center justify-center gap-1"
             >
                {showManualLogin ? 'Hide Manual Token Input' : 'Enter Access Token Manually'}
                <ChevronDown className={`w-3 h-3 transition-transform ${showManualLogin ? 'rotate-180' : ''}`} />
             </button>

             {showManualLogin && (
                <form onSubmit={handleManualLogin} className="space-y-3 animate-in fade-in slide-in-from-top-2">
                    <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Developer Access Token</label>
                    <input 
                        type="password" 
                        value={inputToken}
                        onChange={(e) => setInputToken(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                        placeholder="ya29.a0..."
                    />
                    </div>
                    <button 
                    type="submit"
                    className="w-full bg-gray-800 text-white py-2 rounded-lg font-medium hover:bg-gray-900 transition-colors shadow-sm text-sm"
                    >
                    Connect
                    </button>
                </form>
             )}
          </div>
          
          <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-100 flex gap-3 items-start">
             <ShieldAlert className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
             <p className="text-xs text-blue-800 leading-relaxed">
                This is a client-side demo. 
                Authenticating will redirect you to Google to securely obtain an access token.
                No data is stored on our servers.
             </p>
          </div>
        </div>
      </div>
    );
  }

  const userLabels = labels.filter(l => l.type === 'user');

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 text-gray-300 flex flex-col shrink-0">
        <div className="p-6 flex items-center gap-3 text-white font-bold text-lg">
          <div className="bg-blue-600 p-1.5 rounded-lg">
            <Inbox className="w-5 h-5" />
          </div>
          SmartInbox
        </div>
        
        <div className="px-4 py-2">
            <button 
                onClick={() => { setReplyTo(null); setIsComposeOpen(true); }}
                className="w-full bg-white text-gray-900 py-3 rounded-xl font-semibold shadow hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
                <div className="text-2xl font-light leading-none mb-1">+</div> Compose
            </button>
        </div>

        <nav className="px-2 py-4 space-y-1 overflow-y-auto flex-1">
          <div 
             onClick={() => { setSearchQuery(''); loadData('in:inbox'); }}
             className="flex items-center gap-3 px-4 py-2.5 bg-gray-800 text-white rounded-lg cursor-pointer"
          >
            <Inbox className="w-4 h-4" /> Inbox
          </div>
          <div 
             onClick={() => { setSearchQuery(''); loadData('in:sent'); }}
             className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-800 rounded-lg cursor-pointer transition-colors"
          >
            <Send className="w-4 h-4" /> Sent
          </div>
          
          {/* Labels Section */}
          <div className="mt-6 px-4">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                <span>Labels</span>
                <button onClick={() => setIsCreatingLabel(!isCreatingLabel)} className="hover:text-white">
                    <Plus className="w-3 h-3" />
                </button>
            </div>
            
            {isCreatingLabel && (
                <form onSubmit={handleCreateLabel} className="mb-2">
                    <input
                        autoFocus
                        type="text"
                        value={newLabelName}
                        onChange={e => setNewLabelName(e.target.value)}
                        placeholder="New Label..."
                        className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white focus:outline-none focus:border-blue-500"
                        onBlur={() => !newLabelName && setIsCreatingLabel(false)}
                    />
                </form>
            )}

            <div className="space-y-0.5">
                {userLabels.map(label => (
                    <div key={label.id} className="group flex items-center justify-between px-2 py-1.5 hover:bg-gray-800 rounded cursor-pointer text-sm">
                        <div className="flex items-center gap-2 truncate" onClick={() => loadData(`label:${label.name}`)}>
                            <Tag className="w-3 h-3 text-gray-500" />
                            {label.name}
                        </div>
                        <button onClick={() => handleDeleteLabel(label.id)} className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400">
                            <Trash2 className="w-3 h-3" />
                        </button>
                    </div>
                ))}
            </div>
          </div>
        </nav>

        <div className="p-4 border-t border-gray-800">
            <button 
                onClick={() => setToken(null)}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
                <LogOut className="w-4 h-4" /> Disconnect
            </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header Bar */}
        <div className="h-16 bg-white border-b border-gray-200 flex items-center px-4 justify-between shrink-0">
            {/* Search */}
            <form onSubmit={handleSearch} className="flex-1 max-w-2xl relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search mail..."
                    className="w-full pl-10 pr-4 py-2 bg-gray-100 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-lg transition-all outline-none"
                />
            </form>

            <div className="flex items-center gap-3 ml-4">
                 {/* Sentiment Toggle */}
                 <button 
                    onClick={handleAnalyzeSentiment}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                        showSentiment 
                        ? 'bg-purple-100 text-purple-700 border-purple-200' 
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                >
                    <Brain className={`w-4 h-4 ${isAnalyzingSentiment ? 'animate-pulse' : ''}`} />
                    {isAnalyzingSentiment ? 'Analyzing...' : 'AI Sentiment'}
                </button>
                
                {/* Filter Button */}
                <button 
                    onClick={() => setIsFilterModalOpen(true)}
                    className="p-2 text-gray-500 hover:bg-gray-100 rounded-full"
                    title="Create Filter"
                >
                    <Filter className="w-5 h-5" />
                </button>
            </div>
        </div>
        
        {/* Workspace */}
        <div className="flex-1 flex overflow-hidden">
            {/* Email List Column */}
            <div className="w-1/3 min-w-[350px] border-r border-gray-200 bg-white flex flex-col">
                <div className="p-3 border-b border-gray-200 flex justify-between items-center bg-gray-50 text-sm">
                    {selectedEmailIds.length > 0 ? (
                        <div className="flex items-center gap-2 w-full animate-in fade-in slide-in-from-top-2">
                            <span className="font-medium text-blue-700">{selectedEmailIds.length} selected</span>
                            <div className="h-4 w-px bg-gray-300 mx-2"></div>
                            <select 
                                className="bg-white border border-gray-300 text-gray-700 text-xs rounded px-2 py-1"
                                onChange={(e) => {
                                    if(e.target.value) handleBulkApplyLabel(e.target.value);
                                }}
                                value=""
                            >
                                <option value="">Apply Label...</option>
                                {userLabels.map(l => (
                                    <option key={l.id} value={l.id}>{l.name}</option>
                                ))}
                            </select>
                            <button onClick={() => setSelectedEmailIds([])} className="ml-auto text-gray-500 hover:text-gray-700">
                                Cancel
                            </button>
                        </div>
                    ) : (
                        <>
                            <h2 className="font-semibold text-gray-700">Messages</h2>
                            <button onClick={() => loadData(searchQuery)} className="p-1.5 hover:bg-gray-200 rounded-full text-gray-500" title="Refresh">
                                <RefreshCw className="w-4 h-4" />
                            </button>
                        </>
                    )}
                </div>
                <div className="flex-1 overflow-hidden relative">
                    <EmailList 
                        emails={emails} 
                        selectedId={selectedEmail?.id} 
                        onSelect={setSelectedEmail}
                        isLoading={isLoading}
                        selectedIds={selectedEmailIds}
                        onToggleSelect={toggleSelection}
                        showSentiment={showSentiment}
                    />
                </div>
            </div>

            {/* Email Detail Column */}
            <div className="flex-1 bg-white overflow-hidden relative">
                <EmailDetail 
                    email={selectedEmail} 
                    onReply={() => { setReplyTo(selectedEmail); setIsComposeOpen(true); }}
                    availableLabels={labels}
                    onApplyLabel={handleApplyLabel}
                    onRemoveLabel={handleRemoveLabel}
                />
            </div>
        </div>
      </div>

      <ComposeModal 
        isOpen={isComposeOpen} 
        onClose={() => setIsComposeOpen(false)}
        replyTo={replyTo}
        onSend={handleSendEmail}
      />
      
      <FilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        labels={labels}
        onCreateFilter={handleCreateFilter}
      />
    </div>
  );
};

export default App;