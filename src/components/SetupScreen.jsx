import React from 'react';
import { MinusIcon, XIcon, PlusIcon, TrashIcon } from './Icons';
import ResizeHandle from './ResizeHandle';

const SetupScreen = ({ 
    setupKeys = [''], 
    setSetupKeys, 
    setupError, 
    onSave,
    isEncrypted,
    setIsEncrypted
}) => {
    const handleAddKey = () => {
        setSetupKeys([...setupKeys, '']);
    };

    const handleRemoveKey = (index) => {
        const newKeys = setupKeys.filter((_, i) => i !== index);
        setSetupKeys(newKeys.length ? newKeys : ['']);
    };

    const handleKeyChange = (index, value) => {
        const newKeys = [...setupKeys];
        newKeys[index] = value;
        setSetupKeys(newKeys);
    };

    return (
        <div className="flex h-screen select-none items-center justify-center bg-neutral-900 text-white relative">
            {/* Glassmorphic Header */}
            <div 
                className="absolute top-0 left-0 right-0 h-11 bg-neutral-900/40 backdrop-blur-md flex items-center justify-between px-4 z-[100] border-b border-white/5" 
                style={{ WebkitAppRegion: 'drag', cursor: 'move' }}
            >
                {/* Left: Status Dot & Label */}
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-yellow-500 glow-yellow" />
                    <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-[0.2em] font-medium">System Configuration</span>
                </div>

                {/* Right: Window Controls */}
                <div className="flex items-center no-drag" style={{ WebkitAppRegion: 'no-drag' }}>
                    <div className="flex items-center border-l border-white/10 pl-2">
                        <button 
                            onClick={() => window.electron?.minimize()} 
                            className="text-neutral-500 hover:text-emerald-400 p-1.5 transition-all duration-200 rounded-md"
                        >
                            <MinusIcon />
                        </button>
                        <button 
                            onClick={() => window.electron?.closeApp()} 
                            className="text-neutral-500 hover:text-red-400 p-1.5 transition-all duration-200 rounded-md"
                        >
                            <XIcon />
                        </button>
                    </div>
                </div>
            </div>

            
            <div className="bg-neutral-800 p-8 py-2 mt-8 rounded-xl shadow-2xl border border-neutral-700 w-[24rem] transform transition-all relative z-10">
                <h2 className="text-2xl font-bold mb-1 text-center bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">Zninja Setup</h2>

                <div className="h-0.5 w-12 bg-emerald-500 mx-auto mb-3 rounded-full opacity-50" />
                <p className="text-neutral-400 text-xs mb-4 text-center leading-relaxed">Enter your Google Gemini API Keys. System will automatically rotate keys if quota is exceeded.</p>

                
                <form onSubmit={onSave} style={{ WebkitAppRegion: 'no-drag' }} className="space-y-4">
                    <div className="max-h-[200px] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                        {setupKeys.map((key, index) => (
                            <div key={index} className="flex gap-2 group">
                                <div className="flex-1 relative">
                                    <input 
                                        type="password" 
                                        value={key} 
                                        onChange={(e) => handleKeyChange(index, e.target.value)} 
                                        placeholder={`API Key #${index + 1}`}
                                        className="w-full bg-neutral-900 border border-neutral-600 rounded px-4 py-2.5 text-xs focus:outline-none focus:border-emerald-500 transition-colors duration-200"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleRemoveKey(index)}
                                    className="p-2 text-neutral-500 hover:text-red-400 transition-colors"
                                >
                                    <TrashIcon />
                                </button>
                            </div>
                        ))}
                    </div>

                    <button 
                        type="button"
                        onClick={handleAddKey}
                        className="w-full py-2 border border-dashed border-neutral-600 rounded text-xs text-neutral-400 hover:text-emerald-400 hover:border-emerald-500/50 transition-all flex items-center justify-center gap-2 mt-2"
                    >
                        <PlusIcon size={12} /> Add Alternative Key
                    </button>

                    {/* Encryption Toggle */}
                    <div className="pt-4 pb-2 border-t border-neutral-700 mt-4">
                        <div className="flex items-center justify-between mb-2">
                             <span className="text-xs font-medium text-neutral-300">Secure Encryption</span>
                             <button 
                                type="button"
                                onClick={() => setIsEncrypted(!isEncrypted)}
                                className={`w-10 h-5 rounded-full relative transition-colors duration-200 ${isEncrypted ? 'bg-emerald-600' : 'bg-neutral-600'}`}
                             >
                                 <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all duration-200 ${isEncrypted ? 'left-6' : 'left-1'}`} />
                             </button>
                        </div>
                        <p className="text-[9px] text-neutral-500 leading-tight">
                            Encrypts keys using OS-level security (DPAPI/Keychain). 
                            <span className="text-amber-500/80"> Note: This may slightly affect startup performance.</span>
                        </p>
                    </div>
                    
                    {setupError && <div className="text-red-400 text-[10px] text-center">{setupError}</div>}
                    
                    <button 
                        type="submit" 
                        className="w-full bg-gradient-to-r from-emerald-600 via-emerald-900 to-emerald-600 bg-[length:200%_100%] hover:bg-right transition-all duration-500 text-white font-medium py-3 px-4 rounded text-sm  mt-4 shadow-lg shadow-emerald-900/20"
                    >
                        Activate Runtime
                    </button>
                    
                    <div className="text-center pt-2">
                        <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-400 hover:underline hover:text-blue-300 opacity-70">Get Free API Key here &rarr;</a>
                    </div>
                </form>
            </div>
            <ResizeHandle />
        </div>
    );
};

export default SetupScreen;
