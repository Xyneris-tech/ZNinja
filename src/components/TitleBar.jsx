import React, { useState, useEffect, useCallback } from 'react';
import { 
    ClockIcon, PlusIcon, MinusIcon, XIcon, GhostIcon, 
    NinjaIcon, ResetIcon, ClipboardIcon, BrainIcon, KeyboardIcon,
    DownloadIcon
} from './Icons';
import Tooltip from './ui/tooltip';


const TitleBar = ({
    isStealth,
    toggleStealth,
    showHistory,
    setShowHistory,
    createNewSession,
    handleClearKey,
    isFocusLocked,
    isSmartMode,
    setIsSmartMode,
    toggleFocusLock,
    isClipboardSync,
    setIsClipboardSync,
    toggleGhostTyping,
    isGhostTyping,
    checkForUpdates,
    updateStatus
}) => {
    const [missingPerms, setMissingPerms] = useState([]);

    const refreshPermissions = useCallback(async () => {
        if (window.electron?.platform !== 'darwin' || !window.electron?.checkPermissions) return;
        try {
            const status = await window.electron.checkPermissions();
            const missing = [];
            if (!status.screen) missing.push('Screen');
            if (!status.microphone) missing.push('Mic');
            if (!status.accessibility) missing.push('Accessibility');
            setMissingPerms(missing);
        } catch (e) {
            // Ignore permission check errors
        }
    }, []);

    useEffect(() => {
        refreshPermissions();
    }, [refreshPermissions]);

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
                    <Tooltip content="Chat History" side="bottom">
                        <button 
                            onClick={() => setShowHistory(!showHistory)} 
                           
                            className="text-neutral-400 hover:text-white hover:bg-white/10 rounded-md p-1.5 transition-all duration-200"
                        >
                            <ClockIcon />
                        </button>
                    </Tooltip>

                    <Tooltip content="New Session" side="bottom">
                        <button 
                            onClick={createNewSession} 
                           
                            className="text-neutral-400 hover:text-white hover:bg-white/10 rounded-md p-1.5 transition-all duration-200"
                        >
                            <PlusIcon />
                        </button>
                    </Tooltip>

                    <Tooltip content="Reset Session" side="bottom">
                        <button 
                            onClick={handleClearKey} 
                            className="text-neutral-400 hover:text-white hover:bg-white/10 rounded-md p-1.5 transition-all duration-200"
                        >
                            <ResetIcon />
                        </button>
                    </Tooltip>

                    <Tooltip content={updateStatus === 'checking' ? 'Checking for Updates' : 'Check for Updates'} side="bottom">
                        <button 
                            onClick={checkForUpdates}
                            disabled={updateStatus === 'checking'}
                            className={`text-neutral-400 hover:text-white hover:bg-white/10 rounded-md p-1.5 transition-all duration-200 ${updateStatus === 'checking' ? 'animate-pulse text-blue-400' : ''}`}
                        >
                            <DownloadIcon />
                        </button>
                    </Tooltip>

                    {missingPerms.length > 0 && (
                        <Tooltip content={`Missing macOS permissions: ${missingPerms.join(', ')} (click to refresh)`} side="bottom">
                            <button
                                onClick={refreshPermissions}
                                className="text-amber-400/90 hover:text-amber-300 hover:bg-white/10 rounded-md px-2 py-1 text-[11px] font-medium transition-colors"
                            >
                                Perms ({missingPerms.length})
                            </button>
                        </Tooltip>
                    )}

                </div>
            </div>
            
            {/* Center Area (Empty for Dragging) */}
            <div className="flex-1 h-full" />

            {/* Right Section */}
            <div className="flex items-center gap-2 no-drag">
                {/* Unified Toggle Group */}
                <div className="flex items-center gap-1 bg-white/5 rounded-full px-1 py-[2px] mx-2">
                    {/* Smart Mode Button */}
                    {/* Smart Mode Button */}
                    <Tooltip content={isSmartMode ? 'Smart Mode: ON' : 'Smart Mode: OFF'} side="bottom">
                        <button 
                            onClick={() => setIsSmartMode(!isSmartMode)} 
                            
                            className={`p-1.5 rounded-full transition-all duration-300 ${isSmartMode ? 'text-fuchsia-500  ' : 'text-neutral-400 hover:text-neutral-300 hover:bg-white/5'}`}
                        >
                            <BrainIcon />
                        </button>
                    </Tooltip>

                    <Tooltip content={isFocusLocked ? 'Ghost Mode: ON' : 'Ghost Mode: OFF'} side="bottom">
                        <button 
                            onClick={toggleFocusLock} 
                           
                            className={`p-1.5 rounded-full transition-all duration-200 ${isFocusLocked ? 'text-indigo-400' : 'text-neutral-400 hover:text-neutral-300 hover:bg-white/5'}`}
                        >
                            <GhostIcon  />
                        </button>
                    </Tooltip>

                    {isFocusLocked && (
                        <Tooltip content={isGhostTyping ? 'Ghost Typing: ON' : 'Ghost Typing: OFF'} side="bottom">
                            <button 
                                onClick={toggleGhostTyping} 
                               
                                className={`p-1.5 rounded-full transition-all duration-200 ${isGhostTyping ? 'text-amber-400' : 'text-neutral-400 hover:text-neutral-300 hover:bg-white/5'}`}
                            >
                                <KeyboardIcon />
                            </button>
                        </Tooltip>
                    )}
                    
                    <Tooltip content={isClipboardSync ? 'Clipboard Sync: ON' : 'Clipboard Sync: OFF'} side="bottom">
                        <button 
                            onClick={() => setIsClipboardSync(!isClipboardSync)} 
                           
                            className={`p-1.5 rounded-full transition-all duration-200 ${isClipboardSync ? 'text-blue-400' : 'text-neutral-400 hover:text-neutral-300 hover:bg-white/5'}`}
                        >
                            <ClipboardIcon  />
                        </button>
                    </Tooltip>

                    <Tooltip content={isStealth ? 'Stealth Mode: ON' : 'Stealth Mode: OFF'} side="bottom">
                        <button 
                            onClick={toggleStealth} 
                            
                            className={`p-1.5 rounded-full transition-all duration-200 ${isStealth ? 'text-emerald-400' : 'text-neutral-400 hover:text-neutral-300 hover:bg-white/5'}`}
                        >
                            <NinjaIcon  />
                        </button>
                    </Tooltip>
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
