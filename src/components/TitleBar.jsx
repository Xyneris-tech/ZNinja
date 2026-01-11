import React, { useState } from 'react';
import { 
    ClockIcon, PlusIcon, MinusIcon, XIcon, GhostIcon, 
    NinjaIcon, KeyboardIcon, ResetIcon, ClipboardIcon, BrainIcon 
} from './Icons';

const TitleBar = ({
    isStealth,
    toggleStealth,
    showHistory,
    setShowHistory,
    createNewSession,
    handleClearKey,
    availableModels,
    selectedModel,
    setSelectedModel,
    isFocusLocked,
    toggleGhostTyping,
    isGhostTyping,
    isSmartMode,
    setIsSmartMode,
    toggleFocusLock,
    isClipboardSync,
    setIsClipboardSync
}) => {
    const [showModelMenu, setShowModelMenu] = useState(false);

    return (
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
                    onClick={() => setIsSmartMode(!isSmartMode)} 
                    className={`flex items-center gap-1.5 text-[10px] px-2 py-1 rounded transition-all duration-200 ${isSmartMode ? 'bg-fuchsia-600 text-white shadow-[0_0_10px_rgba(192,38,211,0.4)]' : 'bg-neutral-700 text-neutral-400 hover:bg-neutral-600'}`}
                    title="Smart Auto-Model"
                >
                    <BrainIcon />
                    <span className="hidden sm:inline font-bold uppercase tracking-wider">{isSmartMode ? 'Smart select ON' : 'Smart select OFF'}</span>
                </button>

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
    );
};

export default TitleBar;
