import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Icons
const ClockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
);
const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
);
const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
);
const XIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
);

function App() {
  // ... existing state ...
  const [isStealth, setIsStealth] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([{ role: 'system', text: 'ZNinja is Ready.' }]);
  const [inputValue, setInputValue] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  
  // Dynamic model state
  const [availableModels, setAvailableModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('gemini-1.5-flash-latest');

  // ... (useEffect for models and history - unchanged) ...
  useEffect(() => {
    if (window.electron && window.electron.listModels) {
      window.electron.listModels().then(result => {
        if (result.success && result.models.length > 0) {
          setAvailableModels(result.models);
          const flashModel = result.models.find(m => m.includes('flash'));
          setSelectedModel(flashModel || result.models[0]);
        }
      });
    }
    loadSessions();
  }, []);

  const loadSessions = async () => {
    if (window.electron?.getSessions) {
      const savedSessions = await window.electron.getSessions();
      setSessions(savedSessions);
    }
  };

  const createNewSession = () => {
    setCurrentSessionId(Date.now().toString());
    setMessages([{ role: 'system', text: 'ZNinja Ready.' }]);
    setShowHistory(false); 
  };

  const openSession = (session) => {
    setCurrentSessionId(session.id);
    setMessages(session.messages);
    setShowHistory(false);
  };

  const deleteSession = async (e, sessionId) => {
    e.stopPropagation();
    if (window.electron?.deleteSession) {
      await window.electron.deleteSession(sessionId);
      await loadSessions();
      if (currentSessionId === sessionId) {
        createNewSession();
      }
    }
  };

  // ... (useEffect for saving session - unchanged) ...
  useEffect(() => {
    if (!currentSessionId && messages.length > 1) {
       setCurrentSessionId(Date.now().toString());
    }

    if (currentSessionId && window.electron?.saveSession && messages.length > 0) {
        const firstUserMsg = messages.find(m => m.role === 'user');
        const title = firstUserMsg ? firstUserMsg.text.slice(0, 30) : 'New Chat';

        const sessionData = {
            id: currentSessionId,
            title: title || 'New Chat',
            timestamp: Date.now(),
            messages: messages
        };
        
        window.electron.saveSession(sessionData).then(() => {
             loadSessions(); 
        });
    }
  }, [messages, currentSessionId]);


  const toggleStealth = async () => {
    if (window.electron && window.electron.toggleStealth) {
      const result = await window.electron.toggleStealth(!isStealth);
      if (result !== undefined) setIsStealth(!isStealth); 
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    
    if (!currentSessionId) setCurrentSessionId(Date.now().toString());

    const userPrompt = inputValue;
    setMessages(prev => [...prev, { role: 'user', text: userPrompt }]);
    setInputValue('');
    
    if (window.electron && window.electron.askGemini) {
      setMessages(prev => [...prev, { role: 'ai', text: 'Thinking...', isTemp: true }]);
      
      window.electron.askGemini({ prompt: userPrompt, modelName: selectedModel }).then(result => {
        setMessages(prev => {
          const filtered = prev.filter(m => !m.isTemp);
          return result.success 
            ? [...filtered, { role: 'ai', text: result.text }]
            : [...filtered, { role: 'ai', text: `Error: ${result.error}` }];
        });
      });
    }
  };

  // ... (components definition - unchanged) ...
  // Keeping existing component definitions for markdown renderer...
  const components = {
    code({node, inline, className, children, ...props}) {
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <SyntaxHighlighter
          style={vscDarkPlus}
          language={match[1]}
          PreTag="div"
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code className={`${className} bg-neutral-800 rounded px-1 py-0.5 font-mono text-sm`} {...props}>
          {children}
        </code>
      );
    },
    p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
    ul: ({children}) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
    ol: ({children}) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
    li: ({children}) => <li>{children}</li>,
    h1: ({children}) => <h1 className="text-xl font-bold mb-2 mt-4 border-b border-neutral-600 pb-1">{children}</h1>,
    h2: ({children}) => <h2 className="text-lg font-bold mb-2 mt-3">{children}</h2>,
    h3: ({children}) => <h3 className="text-md font-bold mb-2 mt-2">{children}</h3>,
    blockquote: ({children}) => <blockquote className="border-l-4 border-neutral-500 pl-3 italic mb-2 text-neutral-300">{children}</blockquote>,
    a: ({href, children}) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{children}</a>,
    table: ({children}) => <div className="overflow-x-auto mb-3"><table className="min-w-full divide-y divide-neutral-700 text-sm">{children}</table></div>,
    thead: ({children}) => <thead className="bg-neutral-800">{children}</thead>,
    tbody: ({children}) => <tbody className="divide-y divide-neutral-700">{children}</tbody>,
    tr: ({children}) => <tr>{children}</tr>,
    th: ({children}) => <th className="px-3 py-2 text-left text-xs font-medium text-neutral-300 uppercase tracking-wider border-b border-neutral-600">{children}</th>,
    td: ({children}) => <td className="px-3 py-2 whitespace-nowrap text-neutral-300">{children}</td>,
  };

  return (
    <div className="flex h-screen bg-neutral-900/90 text-white rounded-lg border border-neutral-700 shadow-2xl overflow-hidden backdrop-blur-sm relative">
      
      {/* Sidebar (History) */}
      <div className={`absolute inset-y-0 left-0 top-10 w-64 bg-neutral-800 transform transition-transform duration-300 z-50 ${showHistory ? 'translate-x-0' : '-translate-x-full'} border-r border-neutral-700 flex flex-col`} style={{ WebkitAppRegion: 'no-drag' }}>
          <div className="p-4 border-b border-neutral-700 flex justify-between items-center">
              <span className="font-bold">History</span>
              <button onClick={() => setShowHistory(false)} className="text-neutral-400 z-50 hover:text-white"><XIcon /></button>
          </div>
          <div className="flex-1 overflow-y-auto">
              {sessions.map(session => (
                  <div 
                    key={session.id} 
                    className={`p-3 border-b border-neutral-700 flex justify-between items-center group ${currentSessionId === session.id ? 'bg-neutral-700' : 'hover:bg-neutral-700'}`}
                  >
                      <div 
                        onClick={() => openSession(session)}
                        className="truncate text-sm pr-2 cursor-pointer flex-1"
                      >
                        {session.title || 'New Chat'}
                      </div>
                      <button 
                        onClick={(e) => deleteSession(e, session.id)}
                        className="opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-red-400 px-2 py-1 z-10 transition-opacity"
                        title="Delete Chat"
                      >
                          <TrashIcon />
                      </button>
                  </div>
              ))}
              {sessions.length === 0 && <div className="p-4 text-neutral-500 text-sm text-center">No history yet</div>}
          </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col w-full relative">
          
          {/* Header */}
          <div className="h-10 bg-neutral-800 flex items-center justify-between px-4 cursor-move" style={{ WebkitAppRegion: 'drag' }}>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isStealth ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
              
              {/* Toggle History Button */}
              <button onClick={() => setShowHistory(!showHistory)} className="no-drag text-neutral-400 hover:text-white" style={{ WebkitAppRegion: 'no-drag' }}>
                  <ClockIcon />
              </button>

              {/* New Chat Button */}
              <button onClick={createNewSession} className="no-drag text-neutral-400 hover:text-white" style={{ WebkitAppRegion: 'no-drag' }} title="New Chat">
                  <PlusIcon />
              </button>

              <select 
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="bg-transparent text-xs text-neutral-400 font-mono focus:outline-none cursor-pointer no-drag w-24 sm:w-auto"
                style={{ WebkitAppRegion: 'no-drag' }}
              >
                {availableModels.map(m => <option key={m} value={m} className="bg-neutral-800">{m}</option>)}
                {availableModels.length === 0 && <option>{selectedModel}</option>}
              </select>
            </div>
            
            <div className="flex items-center gap-2 no-drag" style={{ WebkitAppRegion: 'no-drag' }}>
                <button onClick={toggleStealth} className="text-xs px-2 py-1 rounded bg-neutral-700 hover:bg-neutral-600">
                    {isStealth ? 'Stealth ON' : 'Stealth OFF'}
                </button>
                <button onClick={() => window.electron?.closeApp()} className="text-neutral-400 hover:text-red-400 p-1"><XIcon /></button>
            </div>
          </div>

          {/* Chat & Input */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, idx) => (
              <div key={idx} className={`text-sm flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`inline-block px-3 py-2 rounded-lg max-w-[90%] ${msg.role === 'user' ? 'bg-emerald-700' : 'bg-neutral-700'}`}>
                  {msg.role === 'ai' ? (
                     <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={components}
                     >
                        {msg.text}
                     </ReactMarkdown>
                  ) : (
                    <span>{msg.text}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleSend} className="p-3 bg-neutral-800/50">
            <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask Gemini..."
                className="w-full bg-neutral-900 border border-neutral-600 rounded px-3 py-2 text-sm focus:outline-none"
            />
          </form>
      </div>
    </div>
  );
}

export default App;
