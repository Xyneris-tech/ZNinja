import React, { useState, useEffect, useRef, useCallback } from 'react';
import SetupScreen from './components/SetupScreen';
import TitleBar from './components/TitleBar';
import ChatHistorySidebar from './components/ChatHistorySidebar';
import ChatInterface from './components/ChatInterface';
// import { DEFAULT_PERSONA } from './constants';
// import { WORKING_MODES } from './modes';


function App() {
  // ... existing state ...
  const [isStealth, setIsStealth] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([{ role: 'system', text: 'ZNinja is Ready.' }]);
  const [inputValue, setInputValue] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isFocusLocked, setIsFocusLocked] = useState(false);
  const [isGhostTyping, setIsGhostTyping] = useState(false);
  const [isClipboardSync, setIsClipboardSync] = useState(false);
  const [isSmartMode, setIsSmartMode] = useState(true); // Default to Smart Mode ON
  const [isCapturing, setIsCapturing] = useState(false);
  
  const inputRef = useRef(null); // Ref for textarea control

  // Dynamic model state
  const [availableModels, setAvailableModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('gemini-1.5-flash-latest');
  const [showModelMenu, setShowModelMenu] = useState(false);
  
  const [isSetup, setIsSetup] = useState(false);
  const [checkingKey, setCheckingKey] = useState(true);
  const [setupKeys, setSetupKeys] = useState(['']);
  const [setupError, setSetupError] = useState('');
  const [workingMode, setWorkingMode] = useState('general');
  const [isEncrypted, setIsEncrypted] = useState(true); // Default to encrypted

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
    if (e) e.preventDefault();
    setSetupError('');
    
    const filteredKeys = setupKeys.filter(k => k && k.trim());
    if (filteredKeys.length === 0) {
        setSetupError('Please enter at least one API Key');
        return;
    }
    
    if (window.electron && window.electron.saveApiKey) {
        const success = await window.electron.saveApiKey({ 
            keys: filteredKeys,
            encrypted: isEncrypted
        });
        if (success) {
            setIsSetup(true);
            fetchModels();
        } else {
            setSetupError('Failed to save API Keys');
        }
    }
  };

  useEffect(() => {
    // Check for API Keys
    if (window.electron && window.electron.getApiKeys) {
        window.electron.getApiKeys().then(keys => {
            if (keys && keys.length > 0) {
                setSetupKeys(keys);
                setIsSetup(true);
                fetchModels(); 
            }
            setCheckingKey(false);
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
                if (!locked) {
                    // Auto-disable ghost typing when exiting ghost mode
                    setIsGhostTyping(false);
                    if (window.electron.setGhostTyping) {
                        window.electron.setGhostTyping(false);
                    }
                }
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
                const textarea = inputRef.current;
                
                // Get current selection/cursor position
                // Note: In Ghost Mode, window might not be focused, but if user clicked, 
                // selectionStart/End property on the DOM element usually persists.
                const start = textarea ? textarea.selectionStart : inputValue.length;
                const end = textarea ? textarea.selectionEnd : inputValue.length;
                const currentVal = textarea ? textarea.value : inputValue;
                
                let nextVal = currentVal;
                let nextCursorPos = start;

                if (data.text === 'BACKSPACE') {
                    if (start !== end) {
                        // Delete Selection
                        nextVal = currentVal.slice(0, start) + currentVal.slice(end);
                        nextCursorPos = start;
                    } else if (start > 0) {
                        // Standard Backspace
                        nextVal = currentVal.slice(0, start - 1) + currentVal.slice(end);
                        nextCursorPos = start - 1;
                    }
                } else if (data.text === 'ENTER') {
                    document.getElementById('send-button')?.click();
                    return; // Don't update input
                } else {
                    // Insert Character
                     nextVal = currentVal.slice(0, start) + data.text + currentVal.slice(end);
                     nextCursorPos = start + data.text.length;
                }

                setInputValue(nextVal);

                // Restore Cursor Position (Requires timeout for React render cycle)
                // Since this runs in an event handler, we might need to manually set it 
                if (textarea) {
                    // We need a slight delay to allow React to update the value first
                    requestAnimationFrame(() => {
                        textarea.selectionStart = nextCursorPos;
                        textarea.selectionEnd = nextCursorPos;
                        // Also auto-scroll to cursor
                        textarea.blur();
                        textarea.focus(); 
                        textarea.blur(); // Quick blur/focus hack? Or just setting selection works?
                        // On non-focused windows, setting selectionStart works but visual cursor might not show.
                    });
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
          const focusable = !nextLocked;
          await window.electron.setFocusable(focusable);
          setIsFocusLocked(nextLocked);
          
          if (!nextLocked) {
              // Auto-disable ghost typing when manually unlocking
              setIsGhostTyping(false);
              await window.electron.setGhostTyping(false);
          }
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
            setSetupKeys(['']);
        }
    }
  };

  const handleCapture = useCallback(async () => {
      if (window.electron && window.electron.captureScreen) {
          setIsCapturing(true);
          try {
              const result = await window.electron.captureScreen();
              if (result.success) {
                  setAttachments(prev => [...prev, result.image]);
              } else {
                  console.error(result.error);
                  setMessages(prev => [...prev, { role: 'ai', text: `Screen Capture Failed: ${result.error}` }]);
              }
          } finally {
              setIsCapturing(false);
          }
      }
  }, []);

  const handleSend = useCallback((e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    
    if (!currentSessionId) setCurrentSessionId(Date.now().toString());

    const userPrompt = inputValue;
    const currentAttachments = attachments; // Capture current attachments
    
    setMessages(prev => [...prev, { role: 'user', text: userPrompt, images: currentAttachments }]);
    setInputValue('');
    setAttachments([]);
    
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

      // If Smart Mode is on, we override the selected model with the 'smart' flag
      // effectively passing 'zninja-auto-smart' as the modelName (or specific implementation choice)
      const actualModel = isSmartMode ? 'zninja-auto-smart' : selectedModel;

      window.electron.askGemini({ 
          prompt: userPrompt, 
          modelName: actualModel, 
          images: currentAttachments,
          history: history, // Send history
          workingMode: workingMode
      }).then(result => {
        setMessages(prev => {
          const filtered = prev.filter(m => !m.isTemp);
          return result.success 
            ? [...filtered, { role: 'ai', text: result.text }]
            : [...filtered, { role: 'ai', text: `Error: ${result.error}` }];
        });
      });
    }
  }, [inputValue, currentSessionId, attachments, messages, isSmartMode, selectedModel, workingMode]);

  const handleSendAudio = useCallback((audioBase64) => {
      if (window.electron && window.electron.askGemini) {
          if (!currentSessionId) setCurrentSessionId(Date.now().toString());
          
          setMessages(prev => [...prev, { 
              role: 'user', 
              text: '🎤 [Audio Recording]', 
              audio: true // Marker for UI if needed
          }]);

          setMessages(prev => [...prev, { role: 'ai', text: '🎧 Listening and Transcribing...', isTemp: true }]);

          const history = messages
            .filter(m => !m.isTemp && m.role !== 'system')
            .map(m => ({
                role: m.role === 'ai' ? 'model' : 'user',
                parts: [{ text: m.text }]
            }));
            
          const actualModel = isSmartMode ? 'zninja-auto-smart' : selectedModel;

          window.electron.askGemini({
              prompt: '', // Backend provides default prompt for audio
              modelName: actualModel,
              audioData: audioBase64,
              history: history,
              workingMode: workingMode
          }).then(result => {
              setMessages(prev => {
                  const filtered = prev.filter(m => !m.isTemp);
                  return result.success 
                    ? [...filtered, { role: 'ai', text: result.text }]
                    : [...filtered, { role: 'ai', text: `Error: ${result.error}` }];
              });
          });
      }
  }, [currentSessionId, messages, isSmartMode, selectedModel, workingMode]);





  if (checkingKey) {
      return <div className="flex h-screen items-center justify-center bg-neutral-900 text-white">Checking Configuration...</div>;
  }

  if (!isSetup) {
      return (
        <SetupScreen 
            setupKeys={setupKeys} 
            setSetupKeys={setSetupKeys} 
            setupError={setupError} 
            onSave={handleSaveKey} 
            isEncrypted={isEncrypted}
            setIsEncrypted={setIsEncrypted}
        />
      );
  }

  return (
    <div className="flex h-screen bg-neutral-900/50 text-white rounded-lg border border-neutral-700 shadow-2xl overflow-hidden backdrop-blur-sm relative">
      
      {/* Sidebar (History) */}
      <ChatHistorySidebar 
        sessions={sessions}
        currentSessionId={currentSessionId}
        showHistory={showHistory}
        setShowHistory={setShowHistory}
        openSession={openSession}
        deleteSession={deleteSession}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col w-full relative">
          
          {/* Header */}
          {/* Header */}
          <TitleBar 
            isStealth={isStealth}
            toggleStealth={toggleStealth}
            showHistory={showHistory}
            setShowHistory={setShowHistory}
            createNewSession={createNewSession}
            handleClearKey={handleClearKey}
            availableModels={availableModels}
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
            isFocusLocked={isFocusLocked}
            toggleGhostTyping={toggleGhostTyping}
            isGhostTyping={isGhostTyping}
            isSmartMode={isSmartMode}
            setIsSmartMode={setIsSmartMode}
            toggleFocusLock={toggleFocusLock}
            isClipboardSync={isClipboardSync}
            setIsClipboardSync={setIsClipboardSync}
          />

          <ChatInterface
              messages={messages}
              setMessages={setMessages}
              inputValue={inputValue}
              setInputValue={setInputValue}
              attachments={attachments}
              setAttachments={setAttachments}
              handleSend={handleSend}
              handleCapture={handleCapture}
              handleSendAudio={handleSendAudio}
              inputRef={inputRef}
              selectedModel={selectedModel}
              workingMode={workingMode}
              setWorkingMode={setWorkingMode}
              isCapturing={isCapturing}
          />
      </div>
    </div>
  );
}

export default App;
