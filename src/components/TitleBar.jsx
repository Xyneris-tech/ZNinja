import React, { useState } from 'react';
import { 
    ClockIcon, PlusIcon, MinusIcon, XIcon, GhostIcon, 
    NinjaIcon, ResetIcon, ClipboardIcon, BrainIcon, KeyboardIcon 
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
    isSmartMode,
    setIsSmartMode,
    toggleFocusLock,
    isClipboardSync,
    setIsClipboardSync,
    toggleGhostTyping,
    isGhostTyping
}) => {
    const [showModelMenu, setShowModelMenu] = useState(false);

    return (
        <div 
            className="absolute top-0 left-0 right-0 h-11 bg-neutral-900/80 backdrop-blur-xl flex items-center justify-between px-4 z-[100] border-b border-white/5" 
            style={{ WebkitAppRegion: 'drag' }}
        >
            {/* Left Section */}
            <div className="flex items-center gap-3">
                {/* Status Dot */}
                <div className={`w-2 h-2 rounded-full ${isStealth ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-yellow-500 glow-yellow'}`} />
                
                <div className="flex items-center gap-1.5 no-drag">
                    <button 
                        onClick={() => setShowHistory(!showHistory)} 
                       
                        className="text-neutral-400 hover:text-white hover:bg-white/10 rounded-md p-1.5 transition-all duration-200"
                    >
                        <ClockIcon />
                    </button>

                    <button 
                        onClick={createNewSession} 
                       
                        className="text-neutral-400 hover:text-white hover:bg-white/10 rounded-md p-1.5 transition-all duration-200"
                    >
                        <PlusIcon />
                    </button>

                    <button 
                        onClick={handleClearKey} 
                        
                        className="text-neutral-400 hover:text-white hover:bg-white/10 rounded-md p-1.5 transition-all duration-200"
                    >
                        <ResetIcon />
                    </button>

                    {/* Model Dropdown */}
                    <div className="relative ml-1">
                        <button 
                            onClick={() => setShowModelMenu(!showModelMenu)}
                            className="bg-neutral-800/60 hover:bg-neutral-700/80 text-[11px] text-neutral-300 px-2.5 py-1 rounded-md border border-white/5 flex items-center gap-1.5 transition-all duration-200 font-mono"
                        >
                            <span>{selectedModel.split('/').pop()}</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-300 ${showModelMenu ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </button>
                        
                        {showModelMenu && (
                            <>
                                <div className="fixed inset-0 z-[60]" onClick={() => setShowModelMenu(false)} />
                                <div className="absolute top-full left-0 mt-2 py-1 bg-neutral-900/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl z-[70] min-w-[220px] max-h-64 overflow-y-auto">
                                    {availableModels.map(m => (
                                        <button
                                            key={m}
                                            onClick={() => {
                                                setSelectedModel(m);
                                                setShowModelMenu(false);
                                            }}
                                            className={`w-full text-left px-4 py-2 text-[11px] hover:bg-white/5 transition-colors font-mono ${selectedModel === m ? 'text-emerald-400 bg-emerald-400/5' : 'text-neutral-400'}`}
                                        >
                                            {m}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Center Area (Empty for Dragging) */}
            <div className="flex-1 h-full" />

            {/* Right Section */}
            <div className="flex items-center gap-2 no-drag">
                {/* Unified Toggle Group */}
                <div className="flex items-center gap-1 bg-white/5 rounded-full px-1 py-[2px] mx-2">
                    {/* Smart Mode Button */}
                    <button 
                        onClick={() => setIsSmartMode(!isSmartMode)} 
                        
                        className={`p-1.5 rounded-full transition-all duration-300 ${isSmartMode ? 'text-fuchsia-500  ' : 'text-neutral-400 hover:text-neutral-300 hover:bg-white/5'}`}
                    >
                        <BrainIcon />
                    </button>

                    <button 
                        onClick={toggleFocusLock} 
                       
                        className={`p-1.5 rounded-full transition-all duration-200 ${isFocusLocked ? 'text-indigo-400' : 'text-neutral-400 hover:text-neutral-300 hover:bg-white/5'}`}
                    >
                        <GhostIcon  />
                    </button>

                    {isFocusLocked && (
                        <button 
                            onClick={toggleGhostTyping} 
                           
                            className={`p-1.5 rounded-full transition-all duration-200 ${isGhostTyping ? 'text-amber-400' : 'text-neutral-400 hover:text-neutral-300 hover:bg-white/5'}`}
                        >
                            <KeyboardIcon />
                        </button>
                    )}
                    
                    <button 
                        onClick={() => setIsClipboardSync(!isClipboardSync)} 
                       
                        className={`p-1.5 rounded-full transition-all duration-200 ${isClipboardSync ? 'text-blue-400' : 'text-neutral-400 hover:text-neutral-300 hover:bg-white/5'}`}
                    >
                        <ClipboardIcon  />
                    </button>

                    <button 
                        onClick={toggleStealth} 
                        
                        className={`p-1.5 rounded-full transition-all duration-200 ${isStealth ? 'text-emerald-400' : 'text-neutral-400 hover:text-neutral-300 hover:bg-white/5'}`}
                    >
                        <NinjaIcon  />
                    </button>
                </div>

                {/* Window Controls */}
                <div className="flex items-center ml-2 border-l border-white/10 pl-2">
                    <button 
                        onClick={() => window.electron?.minimize()} 
                        className="text-neutral-500 hover:text-emerald-400 rounded-md p-1.5 transition-colors"
                    >
                        <MinusIcon />
                    </button>
                    <button 
                        onClick={() => window.electron?.closeApp()} 
                        className="text-neutral-500 hover:text-red-400 rounded-md p-1.5 transition-colors"
                    >
                        <XIcon />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TitleBar;
