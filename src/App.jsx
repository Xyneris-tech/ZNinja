import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Icons
const ClockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
);
const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
);
const MinusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
);
const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
);
const XIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
);
const CameraIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
);
const GhostIcon = ({ opacity = 1 }) => (
  <svg width="14" height="14" viewBox="0 0 512 512" fill="currentColor" style={{ opacity }}>
    <path d="M501.553,219.44c-5.838-5.481-14.279-7.182-21.787-4.379l-45.01,16.794c0.07-0.233,0.14-0.473,0.209-0.699 c7.058-15.38,11.026-32.47,11.026-50.499c0-66.914-54.25-121.164-121.164-121.164c-50.997,0-93.165,37.696-109.548,69.965 c-3.408,6.717-20.289,21.251-39.117,9.356c-18.829-11.887-31.237-33.341-44.599-54.514c-17.843-28.246-51.059-19.535-62.441,8.922 C42.36,160.12-38.173,202.661,21.551,207.693c35.677,3.012,60.95-16.352,71.355-23.782c10.412-7.431-2.974,26.764,17.842,31.22 c20.133,4.309,22.462-20.941,41.066,5.854c-24.528,40.134-65.408,65.408-105.922,92.777c-41.889,28.301-50.57,56.121,20.436,43.9 c30.77-5.303,33.644,1.7,19.574,9.48c-13.3,7.36-45.29,20.381-65.283,26.888c-19.085,6.219-14.264,36.85,32.843,32.502 c36.633-3.378,70.718-4.123,95.223-12.105c19.986-6.506,26.919-0.683,0.155,10.218c-59.684,24.318,13.386,53.52,137.337-12.78 c46.742-25.002,78.708-52.728,102.909-85.882c4.092,4.79,10.218,7.376,19.326,2.633c22.688-11.81,32.378,0.497,16.514,14.364 c-18.611,16.29-16.918,54.918,35.104,21.438c52.029-33.488,50.857-112.918,50.857-112.918 C514.854,234.045,507.392,224.929,501.553,219.44z M284.631,159.988c0,0,14.45,28.906,31.314,38.542 C274.996,222.607,258.139,179.259,284.631,159.988z M348.043,211.093c19.023-3.897,49.063-13.378,49.063-13.378 C406.028,222.243,372.579,253.463,348.043,211.093z" />
  </svg>
);
const NinjaIcon = ({ opacity = 1 }) => (
    <svg width="14" height="14" viewBox="0 -64 640 640" fill="currentColor" style={{ opacity }}>
        <path d="M312 8C175 8 64 119 64 256s111 248 248 248 248-111 248-248c0-25.38-3.82-49.86-10.9-72.91l63.92 52.97L640 173.49l-98.2-10.89c-.65-1.6-1.31-3.19-2-4.77l94.89-40.43L595 61.64l-60.41 84.91C494.17 64.46 409.7 8 312 8zM191.99 256c0-9.3 4.1-17.5 10.5-23.4l-31-9.3c-8.5-2.5-13.3-11.5-10.7-19.9 2.5-8.5 11.4-13.2 19.9-10.7l80 24c8.5 2.5 13.3 11.5 10.7 19.9-2.1 6.9-8.4 11.4-15.3 11.4-.5 0-1.1-.2-1.7-.2.7 2.7 1.7 5.3 1.7 8.2 0 17.7-14.3 32-32 32s-32.1-14.3-32.1-32zm252.61-32.7l-31 9.3c6.3 5.8 10.5 14.1 10.5 23.4 0 17.7-14.3 32-32 32s-32-14.3-32-32c0-2.9.9-5.6 1.7-8.2-.6.1-1.1.2-1.7.2-6.9 0-13.2-4.5-15.3-11.4-2.5-8.5 2.3-17.4 10.7-19.9l80-24c8.4-2.5 17.4 2.3 19.9 10.7 2.5 8.5-2.3 17.4-10.8 19.9zm-265.19-52.28h262.56c42.35 0 54.97 49.74 53.8 83.99-1.18 34.83-41.79 72.53-72.23 72.53-61.58 0-73.62-40.25-112.85-40.28-39.23.03-51.27 40.28-112.85 40.28-30.44 0-71.05-37.7-72.23-72.53-1.17-34.25 11.45-83.99 53.8-83.99z"></path>
    </svg>
);
const KeyboardIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect><line x1="6" y1="8" x2="6" y2="8"></line><line x1="10" y1="8" x2="10" y2="8"></line><line x1="14" y1="8" x2="14" y2="8"></line><line x1="18" y1="8" x2="18" y2="8"></line><line x1="6" y1="12" x2="6" y2="12"></line><line x1="10" y1="12" x2="10" y2="12"></line><line x1="14" y1="12" x2="14" y2="12"></line><line x1="18" y1="12" x2="18" y2="12"></line><line x1="7" y1="16" x2="17" y2="16"></line></svg>
);
const ResetIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
);
const ClipboardIcon = ({ opacity = 1 }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity }}><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
);
const SendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11.5003 12H5.41872M5.24634 12.7972L4.24158 15.7986C3.69128 17.4424 3.41613 18.2643 3.61359 18.7704C3.78506 19.21 4.15335 19.5432 4.6078 19.6701C5.13111 19.8161 5.92151 19.4604 7.50231 18.7491L17.6367 14.1886C19.1797 13.4942 19.9512 13.1471 20.1896 12.6648C20.3968 12.2458 20.3968 11.7541 20.1896 11.3351C19.9512 10.8529 19.1797 10.5057 17.6367 9.81135L7.48483 5.24303C5.90879 4.53382 5.12078 4.17921 4.59799 4.32468C4.14397 4.45101 3.77572 4.78336 3.60365 5.22209C3.40551 5.72728 3.67772 6.54741 4.22215 8.18767L5.24829 11.2793C5.34179 11.561 5.38855 11.7019 5.407 11.8459C5.42338 11.9738 5.42321 12.1032 5.40651 12.231C5.38768 12.375 5.34057 12.5157 5.24634 12.7972Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path></svg>
);

const ResizeHandle = () => {
    const startX = useRef(0);
    const startY = useRef(0);
    const startWidth = useRef(0);
    const startHeight = useRef(0);

    const onMouseDown = async (e) => {
        if (!window.electron?.getWindowSize) return;
        
        e.preventDefault();
        const size = await window.electron.getWindowSize();
        startX.current = e.screenX;
        startY.current = e.screenY;
        startWidth.current = size.width;
        startHeight.current = size.height;

        const onMouseMove = (moveEvent) => {
            const deltaX = moveEvent.screenX - startX.current;
            const deltaY = moveEvent.screenY - startY.current;
            window.electron.resizeWindow(
                Math.floor(startWidth.current + deltaX),
                Math.floor(startHeight.current + deltaY)
            );
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    return (
        <div 
            onMouseDown={onMouseDown}
            className="absolute bottom-0 right-0 w-4 h-4 no-drag z-50 group"
            style={{ 
                WebkitAppRegion: 'no-drag',
                cursor: 'default' // NO RESIZE CURSOR HERE
            }}
        >
            <div className="absolute bottom-1 right-1 w-2 h-2 border-r-2 border-b-2 border-white/20 group-hover:border-white/40 transition-colors" />
        </div>
    );
};

function App() {
  // ... existing state ...
  const [isStealth, setIsStealth] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([{ role: 'system', text: 'ZNinja is Ready.' }]);
  const [inputValue, setInputValue] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [isFocusLocked, setIsFocusLocked] = useState(false);
  const [isGhostTyping, setIsGhostTyping] = useState(false);
  const [isClipboardSync, setIsClipboardSync] = useState(false);
  
  // Dynamic model state
  const [availableModels, setAvailableModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('gemini-1.5-flash-latest');
  const [showModelMenu, setShowModelMenu] = useState(false);
  
  // Setup State
  const [isSetup, setIsSetup] = useState(false);
  const [checkingKey, setCheckingKey] = useState(true);
  const [setupKey, setSetupKey] = useState('');
  const [setupRole, setSetupRole] = useState(`**Role:** You are ZNinja, an elite Senior Software Engineer and Expert Competitive Programmer. 
**Goal:** Provide precise, bug-free, and high-performance code with optimal time/space complexity.

**Operational Protocol:**
1. **Deep Analysis:** Before writing code, analyze the problem text for "hidden" constraints. (e.g., Is it a subarray or a prefix? Is the input space-separated or a string? Are there negative numbers?)
2. **Constraint-Driven Design:** Explicitly check the constraints (N). 
   - If N <= 500, O(N²) is acceptable. 
   - If N >= 10^5, aim for O(N) or O(N log N).
3. **Strict Adherence:** Follow all variable naming requirements (e.g., 'nexorviant') and use the exact data types requested.
4. **Residue Protection:** Do not hallucinate logic from similar-sounding problems. If a problem is unique, solve it from first principles.
5. **Modern Standards:** Use idiomatic Java/Python/C++ best practices (e.g., long for sums to avoid overflow, HashSet for O(1) lookups).
6. **Conciseness:** Keep the code "packed"—minimal lines without sacrificing readability or safety.

**Output Format:**
- Start with a brief 1-sentence logic summary.
- Provide the final, ready-to-paste solution.
- End with the Big O complexity analysis.`);
  const [setupError, setSetupError] = useState('');

  // ... (useEffect for models and history - unchanged) ...


  const loadSessions = async () => {
    if (window.electron?.getSessions) {
      const savedSessions = await window.electron.getSessions();
      setSessions(savedSessions);
    }
  };

  const fetchModels = () => {
    if (window.electron && window.electron.listModels) {
      window.electron.listModels()
        .then(result => {
          if (result && result.success && Array.isArray(result.models) && result.models.length > 0) {
            setAvailableModels(result.models);
            // Default to 1.5-flash as it's the most reliable/fastest usually, 
            // but respect user's last choice if possible (TODO: persist choice)
            const flashModel = result.models.find(m => m.includes('1.5-flash'));
            setSelectedModel(flashModel || result.models[0]);
          } else {
             // Fallback if API returns empty list (rare if key is valid)
             console.warn("API returned no allowed models, using defaults.");
             setAvailableModels(['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.0-pro']); 
          }
        })
        .catch(err => {
            console.error("Failed to fetch models:", err);
             // Fallback on error
             setAvailableModels(['gemini-1.5-flash', 'gemini-1.5-pro']);
        });
    }
    loadSessions();
  };

  const handleSaveKey = async (e) => {
    e.preventDefault();
    setSetupError('');
    if (!setupKey.trim()) {
        setSetupError('Please enter an API Key');
        return;
    }
    
    
    if (window.electron && window.electron.saveApiKey) {
        // Pass both key and role
        const success = await window.electron.saveApiKey({ key: setupKey.trim(), role: setupRole.trim() });
        if (success) {
            setIsSetup(true);
            fetchModels();
        } else {
            setSetupError('Failed to save API Key');
        }
    }
  };

  useEffect(() => {
    // Check for API Key
    if (window.electron && window.electron.getApiKey) {
        window.electron.getApiKey().then(key => {
            if (key) {
                setIsSetup(true);
                // Initialize models only if key exists
                fetchModels(); 
            } else {
                setIsSetup(false);
            }
            setCheckingKey(false);
            
            // Also fetch the role
            if (window.electron.getRole) {
                window.electron.getRole().then(role => {
                    if (role) setSetupRole(role);
                });
            }
        });
    } else {
        // Fallback for non-electron env (dev w/o electron)
        setCheckingKey(false);
        setIsSetup(true);
        fetchModels();
    }
  }, []);

  useEffect(() => {
    let unsubs = [];
    
    if (window.electron) {
        if (window.electron.onFocusChange) {
            unsubs.push(window.electron.onFocusChange((locked) => {
                setIsFocusLocked(locked);
            }));
        }

        if (window.electron.onClipboardUpdate) {
            unsubs.push(window.electron.onClipboardUpdate((text) => {
                if (isClipboardSync) {
                    setInputValue(text);
                }
            }));
        }

        if (window.electron.onInstantAI) {
            unsubs.push(window.electron.onInstantAI(async () => {
                document.getElementById('instant-ai-trigger')?.click();
            }));
        }

        if (window.electron.onGhostKey) {
            unsubs.push(window.electron.onGhostKey((data) => {
                if (data.text === 'BACKSPACE') {
                    setInputValue(prev => prev.slice(0, -1));
                } else if (data.text === 'ENTER') {
                    document.getElementById('send-button')?.click();
                } else {
                    setInputValue(prev => prev + data.text);
                }
            }));
        }
    }

    return () => {
        unsubs.forEach(unsub => {
            if (typeof unsub === 'function') unsub();
        });
    };
  }, [isClipboardSync]);

  const toggleGhostTyping = async () => {
    if (window.electron && window.electron.setGhostTyping) {
        const nextActive = !isGhostTyping;
        await window.electron.setGhostTyping(nextActive);
        setIsGhostTyping(nextActive);
    }
  };

  const createNewSession = () => {
    setCurrentSessionId(Date.now().toString());
    setMessages([{ role: 'system', text: 'ZNinja is Ready.' }]);
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


  const toggleFocusLock = async () => {
    if (window.electron && window.electron.setFocusable) {
      const nextLocked = !isFocusLocked;
      // We set focusable to FALSE when locked is TRUE
      await window.electron.setFocusable(!nextLocked);
      setIsFocusLocked(nextLocked);
    }
  };

  const toggleStealth = async () => {
    if (window.electron && window.electron.toggleStealth) {
      const result = await window.electron.toggleStealth(!isStealth);
      if (result !== undefined) setIsStealth(!isStealth); 
    }
  };

  const handleClearKey = async () => {
    if (confirm('Are you sure you want to reset the API Key?')) {
        if (window.electron && window.electron.clearApiKey) {
            await window.electron.clearApiKey();
            setIsSetup(false);
            setAvailableModels([]);
            setSetupKey('');
        }
    }
  };

  const handleCapture = async () => {
      if (window.electron && window.electron.captureScreen) {
          const result = await window.electron.captureScreen();
          if (result.success) {
              setAttachment(result.image);
          } else {
              console.error(result.error);
              setMessages(prev => [...prev, { role: 'ai', text: `Screen Capture Failed: ${result.error}` }]);
          }
      }
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    
    if (!currentSessionId) setCurrentSessionId(Date.now().toString());

    const userPrompt = inputValue;
    const currentAttachment = attachment; // Capture current attachment
    
    setMessages(prev => [...prev, { role: 'user', text: userPrompt, image: currentAttachment }]);
    setInputValue('');
    setAttachment(null);
    
    if (window.electron && window.electron.askGemini) {
      setMessages(prev => [...prev, { role: 'ai', text: 'Thinking...', isTemp: true }]);
      
      // Prepare history for context (exclude temp & system messages, map to Gemini format)
      // Gemini format: { role: 'user' | 'model', parts: [{ text: string }] }
      const history = messages
        .filter(m => !m.isTemp && m.role !== 'system')
        .map(m => ({
            role: m.role === 'ai' ? 'model' : 'user',
            parts: [{ text: m.text }]
        }));

      window.electron.askGemini({ 
          prompt: userPrompt, 
          modelName: selectedModel, 
          image: currentAttachment,
          history: history // Send history
      }).then(result => {
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
    // ... existing components ...
    code({node, inline, className, children, ...props}) {
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <SyntaxHighlighter
          style={vscDarkPlus}
          language={match[1]}
          PreTag="div"
          customStyle={{ backgroundColor: 'rgba(38, 38, 38, 0.7)' }}
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code className={`${className} bg-neutral-800/40 rounded px-1 py-0.5 font-mono text-sm`} {...props}>
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



  if (checkingKey) {
      return <div className="flex h-screen items-center justify-center bg-neutral-900 text-white">Checking Configuration...</div>;
  }

  if (!isSetup) {
      return (
        <div className="flex h-screen items-center justify-center bg-neutral-900 text-white relative">
            {/* Window Controls for Setup Screen */}
            <div className="absolute top-2 right-2 flex gap-2 no-drag z-50">
                 <button onClick={() => window.electron?.minimize()} className="text-neutral-400 hover:text-white p-1"><MinusIcon/></button>
                 <button onClick={() => window.electron?.closeApp()} className="text-neutral-400 hover:text-red-500 p-1"><XIcon /></button>
            </div>
            
            <div className="bg-neutral-800 p-8 rounded-xl shadow-2xl border border-neutral-700 w-96 transform transition-all cursor-default" style={{ WebkitAppRegion: 'drag' }}>
                <h2 className="text-2xl font-bold mb-6 text-center text-emerald-500">Service Host Setup</h2>
                <p className="text-neutral-400 text-sm mb-4 text-center">Please enter your Google Gemini API Key to continue.</p>
                <form onSubmit={handleSaveKey} style={{ WebkitAppRegion: 'no-drag' }}>
                    <input 
                        type="password" 
                        value={setupKey} 
                        onChange={(e) => setSetupKey(e.target.value)} 
                        placeholder="Paste API Key Here"
                        className="w-full bg-neutral-900 border border-neutral-600 rounded px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors duration-200 mb-4"
                    />
                    
                    <div className="mb-4">
                        <label className="block text-xs text-neutral-400 mb-1 ml-1 uppercase font-bold tracking-wider">AI Persona (System Instruction)</label>
                        <textarea
                            value={setupRole}
                            onChange={(e) => setSetupRole(e.target.value)}
                            placeholder="Define who the AI is..."
                            className="w-full h-32 bg-neutral-900 border border-neutral-600 rounded px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors duration-200 resize-none"
                        />
                    </div>

                    {setupError && <div className="text-red-400 text-xs mb-4 text-center">{setupError}</div>}
                    <button 
                        type="submit" 
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded transition-colors duration-200"
                    >
                        Activate Runtime
                    </button>
                    <div className="mt-4 text-center">
                        <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline">Get API Key</a>
                    </div>
                </form>
            </div>
        </div>
      );
  }

  return (
    <div className="flex h-screen bg-neutral-900/50 text-white rounded-lg border border-neutral-700 shadow-2xl overflow-hidden backdrop-blur-sm relative">
      
      {/* Sidebar (History) */}
      <div className={`absolute inset-y-0 left-0 top-10 w-64 bg-neutral-800 transform transition-transform duration-300 z-50 ${showHistory ? 'translate-x-0' : '-translate-x-full'} border-r border-neutral-700 flex flex-col`} style={{ WebkitAppRegion: 'no-drag' }}>
          <div className="p-4 border-b border-neutral-700 flex justify-between items-center">
              <span className="font-bold">History</span>
              <button onClick={() => setShowHistory(false)} className="text-neutral-400 z-50 hover:text-white hover:bg-neutral-700/50 rounded p-1 transition-colors duration-200"><XIcon /></button>
          </div>
          <div className="flex-1 overflow-y-auto">
              {sessions.map(session => (
                  <div 
                    key={session.id} 
                    className={`p-3 border-b border-neutral-700 flex justify-between items-center group transition-colors duration-200 ${currentSessionId === session.id ? 'bg-neutral-700' : 'hover:bg-neutral-600 hover:text-white'}`}
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
          <div className="h-10 bg-neutral-800/60 flex items-center justify-between px-4 cursor-move" style={{ WebkitAppRegion: 'drag' }}>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isStealth ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
              
              {/* Toggle History Button */}
              <button onClick={() => setShowHistory(!showHistory)} className="no-drag text-neutral-400 hover:text-white hover:bg-neutral-700/50 rounded p-1 transition-colors duration-200" style={{ WebkitAppRegion: 'no-drag' }}>
                  <ClockIcon />
              </button>

              {/* New Chat Button */}
              <button onClick={createNewSession} className="no-drag text-neutral-400 hover:text-white hover:bg-neutral-700/50 rounded p-1 transition-colors duration-200" style={{ WebkitAppRegion: 'no-drag' }}>
                  <PlusIcon />
              </button>

              <button onClick={handleClearKey} className="no-drag text-neutral-400 hover:text-white hover:bg-neutral-700/50 rounded p-1 transition-colors duration-200" style={{ WebkitAppRegion: 'no-drag' }}>
                  <ResetIcon />
              </button>

              <div className="relative flex items-center no-drag" style={{ WebkitAppRegion: 'no-drag' }}>
                <button 
                  onClick={() => setShowModelMenu(!showModelMenu)}
                  className="bg-neutral-700/50 hover:bg-neutral-700 text-[10px] text-neutral-300 px-2 py-0.5 rounded border border-neutral-600 flex items-center gap-1 transition-all duration-200"
                >
                  <span className="font-mono">{selectedModel.split('/').pop()}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${showModelMenu ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"></polyline></svg>
                </button>
                
                {showModelMenu && (
                  <>
                    <div className="fixed inset-0 z-[60]" onClick={() => setShowModelMenu(false)} />
                    <div className="absolute top-full left-0 mt-1 py-1 bg-neutral-800 border border-neutral-700 rounded shadow-xl z-[70] min-w-[200px] max-h-48 overflow-y-auto">
                      {availableModels.map(m => (
                        <button
                          key={m}
                          onClick={() => {
                            setSelectedModel(m);
                            setShowModelMenu(false);
                          }}
                          className={`w-full text-left px-3 py-1.5 text-[10px] hover:bg-neutral-700 transition-colors ${selectedModel === m ? 'text-emerald-400 bg-neutral-700/30' : 'text-neutral-400'}`}
                        >
                          {m}
                        </button>
                      ))}
                      {availableModels.length === 0 && (
                        <div className="px-3 py-1.5 text-[10px] text-neutral-500 italic">No models found</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2 no-drag" style={{ WebkitAppRegion: 'no-drag' }}>
               {isFocusLocked && <button 
                  onClick={toggleGhostTyping} 
                  className={`flex items-center gap-1.5 text-[10px] px-2 py-1 rounded transition-all duration-200 ${isGhostTyping ? 'bg-amber-600 text-white shadow-[0_0_10px_rgba(245,158,11,0.4)]' : 'bg-neutral-700 text-neutral-400 hover:bg-neutral-600'}`}
                >
                    <KeyboardIcon />
                    <span className="hidden sm:inline font-bold uppercase tracking-wider">{isGhostTyping ? 'Type ON' : 'Type OFF'}</span>
                </button>}
                <button 
                  onClick={toggleFocusLock} 
                  className={`flex items-center gap-1.5 text-[10px] px-2 py-1 rounded transition-all duration-200 ${isFocusLocked ? 'bg-indigo-600 text-white shadow-[0_0_10px_rgba(79,70,229,0.4)]' : 'bg-neutral-700 text-neutral-400 hover:bg-neutral-600'}`}
                >
                    <GhostIcon opacity={isFocusLocked ? 1 : 0.5} />
                    <span className="hidden sm:inline font-bold uppercase tracking-wider">{isFocusLocked ? 'Ghost ON' : 'Ghost OFF'}</span>
                </button>
                <button 
                  onClick={() => setIsClipboardSync(!isClipboardSync)} 
                  className={`flex items-center gap-1.5 text-[10px] px-2 py-1 rounded transition-all duration-200 ${isClipboardSync ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.4)]' : 'bg-neutral-700 text-neutral-400 hover:bg-neutral-600'}`}
                >
                    <ClipboardIcon opacity={isClipboardSync ? 1 : 0.5} />
                    <span className="hidden sm:inline font-bold uppercase tracking-wider">{isClipboardSync ? 'Sync ON' : 'Sync OFF'}</span>
                </button>
                <button 
                  onClick={toggleStealth} 
                  className={`flex items-center gap-1.5 text-[10px] px-2 py-1 rounded transition-all duration-200 ${isStealth ? 'bg-emerald-600 text-white shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'bg-neutral-700 text-neutral-400 hover:bg-neutral-600'}`}
                >
                    <NinjaIcon opacity={isStealth ? 1 : 0.5} />
                    <span className="hidden sm:inline font-bold uppercase tracking-wider">{isStealth ? 'Stealth ON' : 'Stealth OFF'}</span>
                </button>
                <button onClick={() => window.electron?.minimize()} className="text-neutral-400 hover:text-green-400 hover:bg-neutral-700/50 rounded p-1 transition-colors duration-200"><MinusIcon/></button>
                <button onClick={() => window.electron?.closeApp()} className="text-neutral-400 hover:text-red-400 hover:bg-neutral-700/50 rounded p-1 transition-colors duration-200"><XIcon /></button>
            </div>
          </div>

          {/* Chat & Input */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, idx) => (
              <div key={idx} className={`text-sm flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`inline-block px-3 py-2 rounded-lg max-w-[90%] ${msg.role === 'user' ? 'bg-emerald-500/30' : 'bg-neutral-700/40'}`}>
                  {msg.image && (
                      <img src={msg.image} alt="Attachment" className="max-w-xs max-h-48 rounded mb-2 border border-neutral-600/50" />
                  )}
                  {msg.role === 'ai' ? (
                     <ReactMarkdown 
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeKatex]}
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

          <form onSubmit={handleSend} className="p-3 relative py-2 bg-neutral-800/50">
            <input
                type="text"
                id="main-input"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask ZNinja..."
                className="w-full bg-neutral-900 border border-neutral-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 transition-colors duration-200 pr-10"
            />
            {attachment && (
                <div className="absolute bottom-14 left-4 z-10 w-24 h-16 border border-neutral-600 bg-black rounded overflow-hidden shadow-lg group">
                    <img src={attachment} className="w-full h-full object-cover opacity-70" alt="Screen Capture" />
                    <button 
                        type="button"
                        onClick={() => setAttachment(null)}
                        className="absolute top-0 right-0 p-0.5 bg-red-600 text-white opacity-0 group-hover:opacity-100 hover:bg-red-500 transition-all duration-200"
                    >
                        <XIcon />
                    </button>
                </div>
            )}
             <button
                type="submit"
                id="send-button"
                className="absolute right-12 top-4 p-1 hover:bg-neutral-400/30 rounded-md text-neutral-200 transition-colors duration-200"
             >
                <SendIcon />
             </button>
             <button
                type="button"
                className="absolute right-5 top-4 p-1 hover:bg-neutral-400/30 rounded-md text-neutral-200 transition-colors duration-200"
                onClick={handleCapture}
                
            >
                <CameraIcon />
            </button>
            <span className='text-xs w-full flex justify-center items-center pt-2'>powered by CInfinite, developed by <a href="https://github.com/gajju44" target="_blank" rel="noopener noreferrer">&nbsp;gajju44</a></span>
            <button
                id="instant-ai-trigger"
                type="button"
                className="hidden"
                onClick={async () => {
                    const result = await window.electron.captureScreen();
                    if (result.success) {
                        // Directly trigger Gemini with the captured image and current input
                        if (window.electron && window.electron.askGemini) {
                            const userPrompt = inputValue || "give answer";
                            setMessages(prev => [...prev, { role: 'user', text: userPrompt, image: result.image }]);
                            setInputValue('');
                            setMessages(prev => [...prev, { role: 'ai', text: 'Thinking...', isTemp: true }]);
                            
                            // Context-aware Instant AI
                            const history = messages
                                .filter(m => !m.isTemp && m.role !== 'system')
                                .map(m => ({
                                    role: m.role === 'ai' ? 'model' : 'user',
                                    parts: [{ text: m.text }]
                                }));

                            window.electron.askGemini({ 
                                prompt: userPrompt, 
                                modelName: selectedModel, 
                                image: result.image,
                                history: history 
                            }).then(res => {
                                setMessages(prev => {
                                    const filtered = prev.filter(m => !m.isTemp);
                                    return res.success 
                                        ? [...filtered, { role: 'ai', text: res.text }]
                                        : [...filtered, { role: 'ai', text: `Error: ${res.error}` }];
                                });
                            });
                        }
                    }
                }}
            />
          </form>
          <ResizeHandle />
      </div>
    </div>
  );
}

export default App;
