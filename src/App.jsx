import React, { useState, useEffect, useRef, useCallback } from 'react';
import SetupScreen from './components/SetupScreen';
import TitleBar from './components/TitleBar';
import ChatHistorySidebar from './components/ChatHistorySidebar';
import ChatInterface from './components/ChatInterface';
import { CanvasContext } from './components/CanvasContext';
import Canvas from './components/Canvas';
// import { DEFAULT_PERSONA } from './constants';
// import { WORKING_MODES } from './modes';

function cleanResearchSteps(text) {
    if (!text || typeof text !== 'string') return text;
    const regex = /^(?:\*\s*\*|)\s*\[Step\s*\d+\]\s*(?:Initializing deep research interaction|Research agent is scanning sources and analyzing data)[\s\S]*?(?:\*(?:\n|$)|(?:\n|$))/gm;
    return text.replace(regex, '').trim();
}

function App() {
  // Canvas State & Handlers
  const [activeArtifact, setActiveArtifact] = useState(null);
  const [canvasOpen, setCanvasOpen] = useState(false);
  const [canvasWidth, setCanvasWidth] = useState(45); // width percentage
  const [isResizing, setIsResizing] = useState(false);
  const [canvasMode, setCanvasMode] = useState('split'); // 'split' | 'cover'

  const openInCanvas = useCallback((artifact) => {
      setActiveArtifact(artifact);
      setCanvasOpen(true);
  }, []);

  const closeCanvas = useCallback(() => {
      setCanvasOpen(false);
      setCanvasMode('split');
  }, []);

  const startResize = useCallback((e) => {
      e.preventDefault();
      setIsResizing(true);
  }, []);

  useEffect(() => {
      if (!isResizing) return;

      const handleMouseMove = (e) => {
          const containerWidth = window.innerWidth;
          const newWidthPx = containerWidth - e.clientX;
          const newPercentage = Math.max(25, Math.min(75, (newWidthPx / containerWidth) * 100));
          setCanvasWidth(newPercentage);
      };

      const handleMouseUp = () => {
          setIsResizing(false);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);

      return () => {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
      };
  }, [isResizing]);

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
  
  // Update state
  const [updateInfo, setUpdateInfo] = useState(null);
  const [updateStatus, setUpdateStatus] = useState('idle'); // idle, checking, available, downloading, ready, error
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [updateError, setUpdateError] = useState(null);
  
  const inputRef = useRef(null); // Ref for textarea control
  const saveTimeoutRef = useRef(null); // Ref for session save debounce

  // Dynamic model state
  const [availableModels, setAvailableModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('gemini-1.5-flash-latest');
  const [showModelMenu, setShowModelMenu] = useState(false);
  
  const [isSetup, setIsSetup] = useState(false);
  const [checkingKey, setCheckingKey] = useState(true);
  const [setupKeys, setSetupKeys] = useState(['']);
  const [setupError, setSetupError] = useState('');
  const [apiErrorType, setApiErrorType] = useState(null);
  const [workingMode, setWorkingMode] = useState('general');
  const [isEncrypted, setIsEncrypted] = useState(true); // Default to encrypted
  const [invalidSlots, setInvalidSlots] = useState([]);
  const [isValidating, setIsValidating] = useState(false);

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
            setApiErrorType(result.apiErrorType || null);
            
            // If currently selected model is NOT in the available list, reset it
            if (!result.models.includes(selectedModel)) {
                const flashModel = result.models.find(m => m.includes('1.5-flash'));
                setSelectedModel(flashModel || result.models[0]);
            }
          } else {
             // Fallback if API returns empty list
             console.warn("API returned no allowed models, using defaults.");
             const fallbacks = ['gemini-2.5-flash', 'gemini-1.5-pro', 'gemini-3.1-pro'];
             setAvailableModels(fallbacks); 
             setApiErrorType('invalid_key'); // default assumption on full fail
             if (!fallbacks.includes(selectedModel)) setSelectedModel(fallbacks[0]);
          }
        })
        .catch(err => {
            console.error("Failed to fetch models:", err);
             // Fallback on error
             const fallbacks = ['gemini-1.5-flash', 'gemini-1.5-pro'];
             setAvailableModels(fallbacks);
             if (!fallbacks.includes(selectedModel)) setSelectedModel(fallbacks[0]);
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
    
    setIsValidating(true);
    try {
        if (window.electron && window.electron.saveApiKey) {
            const result = await window.electron.saveApiKey({ 
                keys: filteredKeys,
                encrypted: isEncrypted
            });
            if (result && result.success) {
                const validation = result.validation;
                if (validation && validation.invalidIndices && validation.invalidIndices.length > 0) {
                    setInvalidSlots(validation.invalidIndices);
                    if (validation.invalidIndices.length === filteredKeys.length) {
                        setSetupError('All provided API keys are invalid.');
                    } else {
                        setSetupError('Some API keys are invalid. Please fix or remove them.');
                    }
                    return; // Stay on SetupScreen so they can see which ones are invalid
                }
                
                setInvalidSlots([]);
                setIsSetup(true);
                fetchModels();
            } else {
                setSetupError('Failed to save API Keys');
            }
        }
    } finally {
        setIsValidating(false);
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

        if (window.electron.onGeminiChunk) {
            unsubs.push(window.electron.onGeminiChunk((data) => {
                setMessages(prev => {
                    const lastMsg = prev[prev.length - 1];
                    if (lastMsg && lastMsg.isStreaming) {
                        let updatedMsg;
                        if (data && typeof data === 'object') {
                            if ('thought' in data) {
                                updatedMsg = {
                                    ...lastMsg,
                                    thought: (lastMsg.thought || '') + data.thought
                                };
                            } else if ('text' in data) {
                                updatedMsg = {
                                    ...lastMsg,
                                    text: data.replace ? data.text : (lastMsg.text || '') + data.text
                                };
                            } else {
                                const { chunk, replace } = data;
                                updatedMsg = {
                                    ...lastMsg,
                                    text: replace ? chunk : (lastMsg.text || '') + chunk
                                };
                            }
                        } else {
                            updatedMsg = {
                                ...lastMsg,
                                text: (lastMsg.text || '') + data
                            };
                        }
                        return [...prev.slice(0, -1), updatedMsg];
                    }
                    return prev;
                });
            }));
        }

        if (window.electron.onGeminiDone) {
            unsubs.push(window.electron.onGeminiDone(({ usedModel, finalText }) => {
                setMessages(prev => {
                    const lastMsg = prev[prev.length - 1];
                    if (lastMsg && (lastMsg.isStreaming || lastMsg.role === 'ai')) {
                        const rawText = (finalText !== undefined && finalText !== null) ? finalText : lastMsg.text;
                        const updatedMsg = { 
                            ...lastMsg, 
                            isStreaming: false, 
                            usedModel,
                            text: cleanResearchSteps(rawText)
                        };
                        return [...prev.slice(0, -1), updatedMsg];
                    }
                    return prev;
                });
            }));
        }

        if (window.electron.onGeminiError) {
            unsubs.push(window.electron.onGeminiError(({ error }) => {
                setMessages(prev => {
                    const lastMsg = prev[prev.length - 1];
                    if (lastMsg && lastMsg.isStreaming) {
                        const updatedMsg = { ...lastMsg, isStreaming: false, text: lastMsg.text + `\n\nError: ${error}` };
                        return [...prev.slice(0, -1), updatedMsg];
                    }
                    return prev;
                });
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

        // Auto-update listeners
        if (window.electron.onUpdateAvailable) {
            unsubs.push(window.electron.onUpdateAvailable((info) => {
                setUpdateInfo(info);
                setUpdateStatus('available');
            }));
        }
        if (window.electron.onUpdateProgress) {
            unsubs.push(window.electron.onUpdateProgress((progress) => {
                setUpdateStatus('downloading');
                setDownloadProgress(Math.round(progress.percent));
            }));
        }
        if (window.electron.onUpdateReady) {
            unsubs.push(window.electron.onUpdateReady((info) => {
                setUpdateInfo(info);
                setUpdateStatus('ready');
            }));
        }
        if (window.electron.onUpdateMessage) {
            unsubs.push(window.electron.onUpdateMessage((msg) => {
                console.log('Update Message:', msg);
                // We can use this to show status in the banner if needed
            }));
        }
        if (window.electron.onUpdateNotAvailable) {
            unsubs.push(window.electron.onUpdateNotAvailable(() => {
                setUpdateStatus('up-to-date');
                setTimeout(() => {
                    setUpdateStatus('idle');
                }, 3000);
            }));
        }
        if (window.electron.onUpdateError) {
            unsubs.push(window.electron.onUpdateError((err) => {
                console.error('Update error:', err);
                setUpdateError(err);
                setUpdateStatus('error');
                setTimeout(() => {
                    setUpdateStatus('idle');
                    setUpdateError(null);
                }, 5000);
            }));
        }
    }

    return () => {
        unsubs.forEach(unsub => {
            if (typeof unsub === 'function') unsub();
        });
    };
  }, [isClipboardSync]);

  const checkForUpdates = async () => {
    if (window.electron && window.electron.checkForUpdate) {
        setUpdateStatus('checking');
        await window.electron.checkForUpdate();
    }
  };

  const downloadUpdate = async () => {
    if (window.electron && window.electron.downloadUpdate) {
        setUpdateStatus('downloading');
        await window.electron.downloadUpdate();
    }
  };

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
    setActiveArtifact(null);
    setCanvasOpen(false);
  };

  const openSession = (session) => {
    setCurrentSessionId(session.id);
    const cleanedMessages = session.messages ? session.messages.map(m => ({
        ...m,
        text: cleanResearchSteps(m.text)
    })) : [];
    setMessages(cleanedMessages);
    setShowHistory(false);
    setActiveArtifact(null);
    setCanvasOpen(false);
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
        // Skip saving if the last message is temporary or streaming
        const lastMsg = messages[messages.length - 1];
        if (lastMsg && (lastMsg.isTemp || lastMsg.isStreaming)) return;

        const firstUserMsg = messages.find(m => m.role === 'user');
        const title = firstUserMsg ? firstUserMsg.text.slice(0, 30) : 'New Chat';

        const sessionData = {
            id: currentSessionId,
            title: title || 'New Chat',
            timestamp: Date.now(),
            messages: messages
        };
        
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
            window.electron.saveSession(sessionData).then(() => {
                 loadSessions(); 
            });
        }, 600);
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
    let shouldClear = false;
    if (window.electron && window.electron.showConfirm) {
        shouldClear = await window.electron.showConfirm('Are you sure you want to reset the API Key?');
    } else {
        shouldClear = confirm('Are you sure you want to reset the API Key?');
    }

    if (shouldClear) {
        if (window.electron && window.electron.clearApiKey) {
            await window.electron.clearApiKey();
            setIsSetup(false);
            setAvailableModels([]);
            setSetupKeys(['']);
            if (window.electron.focusWindow) {
                await window.electron.focusWindow();
            } else {
                window.focus();
            }
        }
    }
  };

  const handleCapture = useCallback(async () => {
      if (window.electron && window.electron.captureScreen) {
          setIsCapturing(true);
          try {
              const result = await window.electron.captureScreen();
              if (result.success) {
                  const compressDataURL = (dataUrl, maxWidth = 900, quality = 0.90) => {
                    return new Promise((resolve) => {
                      const img = new Image();
                      img.onload = () => {
                        let width = img.width;
                        let height = img.height;
                        if (width > maxWidth) {
                          height = Math.round((height * maxWidth) / width);
                          width = maxWidth;
                        }
                        const canvas = document.createElement('canvas');
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);
                        resolve(canvas.toDataURL('image/jpeg', quality));
                      };
                      img.src = dataUrl;
                    });
                  };
                  const compressed = await compressDataURL(result.image);
                  setAttachments(prev => [...prev, compressed]);
              } else {
                  console.error(result.error);
                  setMessages(prev => [...prev, { role: 'ai', text: `Screen Capture Failed: ${result.error}` }]);
              }
          } finally {
              setIsCapturing(false);
          }
      }
  }, []);




  const handleSend = useCallback((e, customText) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    const activeText = (typeof customText === 'string') ? customText : inputValue;
    if (!activeText.trim() && attachments.length === 0) return;
    
    if (!currentSessionId) setCurrentSessionId(Date.now().toString());

    const userPrompt = activeText;
    const currentAttachments = attachments; // Capture current attachments
    
    setMessages(prev => [...prev, { role: 'user', text: userPrompt, images: currentAttachments }]);
    setInputValue('');
    setAttachments([]);
    
    if (window.electron && window.electron.streamGemini) {
      setMessages(prev => [...prev, { role: 'ai', text: '', isStreaming: true }]);
      
      const history = messages
        .filter(m => !m.isTemp && !m.isStreaming && m.role !== 'system')
        .map(m => ({
            role: m.role === 'ai' ? 'model' : 'user',
            parts: [{ text: m.text }]
        }));

      const actualModel = isSmartMode ? 'zninja-auto-smart' : selectedModel;

      setTimeout(() => {
        window.electron.streamGemini({ 
            prompt: userPrompt, 
            modelName: actualModel, 
            images: currentAttachments,
            history: history, 
            workingMode: workingMode
        });
      }, 0);
    }
  }, [inputValue, currentSessionId, attachments, messages, isSmartMode, selectedModel, workingMode]);

  const handleStopGeneration = useCallback(() => {
    if (window.electron && window.electron.stopGemini) {
      window.electron.stopGemini();
    }
    setMessages(prev => {
      const lastMsg = prev[prev.length - 1];
      if (lastMsg && lastMsg.isStreaming) {
        return [...prev.slice(0, -1), { ...lastMsg, isStreaming: false }];
      }
      return prev;
    });
  }, []);


  const handleSendAudio = useCallback((audioBase64) => {
      if (window.electron && window.electron.askGemini) {
          if (!currentSessionId) setCurrentSessionId(Date.now().toString());
          
          setMessages(prev => [...prev, { 
              role: 'user', 
              text: '[Audio Recording]', 
              audio: true // Marker for UI if needed
          }]);

          setMessages(prev => [...prev, { role: 'ai', text: 'Listening and Transcribing...', isTemp: true }]);

          const history = messages
            .filter(m => !m.isTemp && !m.isStreaming && m.role !== 'system')
            .map(m => ({
                role: m.role === 'ai' ? 'model' : 'user',
                parts: [{ text: m.text }]
            }));
            
          const actualModel = isSmartMode ? 'zninja-auto-smart' : selectedModel;

          setTimeout(() => {
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
          }, 0);
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
            invalidSlots={invalidSlots}
            isValidating={isValidating}
        />
      );
  }

  return (
    <CanvasContext.Provider value={{ activeArtifact, canvasOpen, openInCanvas, closeCanvas, canvasMode, setCanvasMode }}>
      {isResizing && (
        <div className="fixed inset-0 z-[9999] cursor-col-resize pointer-events-auto bg-transparent" />
      )}
      <div className="flex h-screen bg-neutral-900/50 text-white rounded-lg border border-neutral-700 shadow-2xl overflow-hidden backdrop-blur-sm relative">
        
        {/* Update Notification - Micro Pill Design */}
        {updateStatus !== 'idle' && (
          <div className="absolute top-[52px] left-1/2 z-[110] animate-slide-down-pill pointer-events-auto">
              <div className="glass-morphism rounded-full px-2.5 py-1 shadow-[0_10px_25px_rgba(0,0,0,0.6)] ring-1 ring-white/20 flex items-center gap-2.5 overflow-hidden">
                  {/* Micro Progress Bar */}
                  {(updateStatus === 'checking' || updateStatus === 'downloading') && (
                      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-white/5 overflow-hidden">
                          <div className={`h-full ${updateStatus === 'checking' ? 'bg-blue-400 animate-loading w-1/4' : 'bg-emerald-400 transition-all duration-300'}`} 
                               style={updateStatus === 'downloading' ? { width: `${downloadProgress}%` } : {}} />
                      </div>
                  )}

                  {/* Status Dot with Glow */}
                  <div className={`w-1.5 h-1.5 rounded-full relative ${
                      updateStatus === 'checking' ? 'bg-blue-500 animate-pulse' :
                      updateStatus === 'available' ? 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]' :
                      updateStatus === 'downloading' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                      updateStatus === 'ready' ? 'bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.5)] animate-pulse' :
                      updateStatus === 'up-to-date' ? 'bg-emerald-400' :
                      'bg-red-400'
                  }`}>
                      {(updateStatus === 'available' || updateStatus === 'ready') && (
                          <div className="absolute inset-0 rounded-full animate-ping opacity-20 bg-current" />
                      )}
                  </div>

                  {/* Status Text (Micro) */}
                  <span className="text-[10px] font-bold text-white/80  tracking-widest whitespace-nowrap">
                      {updateStatus === 'checking' && "Checking Updates..."}
                      {updateStatus === 'available' && "Update Found"}
                      {updateStatus === 'downloading' && `Downloading ${downloadProgress}%`}
                      {updateStatus === 'ready' && "Restart Ready"}
                      {updateStatus === 'up-to-date' && "ZNinja is All Updated!"}
                      {updateStatus === 'error' && "Failed"}
                  </span>

                  {/* Contextual Action Button */}
                  <div className="flex items-center gap-2 border-l border-white/10 pl-2">
                      {updateStatus === 'available' && (
                          <button 
                              onClick={downloadUpdate}
                              className="text-emerald-400 hover:text-emerald-300 text-[10px] font-black uppercase tracking-tighter transition-colors active:scale-90"
                          >
                              Get
                          </button>
                      )}
                      {updateStatus === 'ready' && (
                          <button 
                              onClick={() => window.electron.installUpdate()}
                              className="text-blue-400 hover:text-blue-300 text-[10px] font-black uppercase tracking-tighter transition-colors active:scale-90"
                          >
                              Now
                          </button>
                      )}
                      <button 
                          onClick={() => setUpdateStatus('idle')}
                          className="text-white/30 hover:text-white transition-colors"
                      >
                          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      </button>
                  </div>
              </div>
          </div>
        )}

        {/* Sidebar (History) */}
        <ChatHistorySidebar 
          sessions={sessions}
          currentSessionId={currentSessionId}
          showHistory={showHistory}
          setShowHistory={setShowHistory}
          openSession={openSession}
          deleteSession={deleteSession}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col w-full relative overflow-hidden min-h-0">
            {/* Header */}
            <TitleBar 
              isStealth={isStealth}
              toggleStealth={toggleStealth}
              showHistory={showHistory}
              setShowHistory={setShowHistory}
              createNewSession={createNewSession}
              handleClearKey={handleClearKey}
              isFocusLocked={isFocusLocked}
              toggleGhostTyping={toggleGhostTyping}
              isGhostTyping={isGhostTyping}
              isSmartMode={isSmartMode}
              setIsSmartMode={setIsSmartMode}
              toggleFocusLock={toggleFocusLock}
              isClipboardSync={isClipboardSync}
              setIsClipboardSync={setIsClipboardSync}
              checkForUpdates={checkForUpdates}
              updateStatus={updateStatus}
            />

            {/* Split Screen Container */}
            <div className="flex-1 flex flex-row w-full relative overflow-hidden min-h-0 pt-11">
                <div 
                    className={`flex flex-col h-full overflow-hidden ${isResizing ? '' : 'transition-all duration-300'} ${canvasOpen && canvasMode === 'cover' ? 'hidden' : ''}`}
                    style={{ width: canvasOpen ? (canvasMode === 'cover' ? '0%' : `${100 - canvasWidth}%`) : '100%' }}
                >
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
                        availableModels={availableModels}
                        setSelectedModel={setSelectedModel}
                        workingMode={workingMode}
                        setWorkingMode={setWorkingMode}
                        isCapturing={isCapturing}
                        onStop={handleStopGeneration}
                        apiErrorType={apiErrorType}
                    />
                </div>

                {canvasOpen && (
                    <>
                        {/* Resizer Handle */}
                        {canvasMode !== 'cover' && (
                            <div 
                                onMouseDown={startResize}
                                className="w-[3px] hover:w-[5px] hover:bg-emerald-500/80 bg-neutral-800 cursor-col-resize transition-all duration-150 relative z-50 group active:bg-emerald-500"
                            >
                                <div className="absolute inset-y-0 -left-1.5 -right-1.5 cursor-col-resize" />
                            </div>
                        )}

                        {/* Right side canvas panel */}
                        <div 
                            className={`h-full overflow-hidden border-l border-neutral-800/80 ${isResizing ? '' : 'transition-all duration-300'}`}
                            style={{ width: canvasMode === 'cover' ? '100%' : `${canvasWidth}%` }}
                        >
                            <Canvas 
                                artifact={activeArtifact} 
                                onClose={closeCanvas}
                                setInputValue={setInputValue}
                                handleSend={handleSend}
                            />
                        </div>
                    </>
                )}
            </div>
        </div>
      </div>
    </CanvasContext.Provider>
  );
}

export default App;
