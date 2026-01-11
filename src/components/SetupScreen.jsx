import React from 'react';
import { MinusIcon, XIcon } from './Icons';
import ResizeHandle from './ResizeHandle';
import { DEFAULT_PERSONA } from '../constants';

const SetupScreen = ({ 
    setupKey, 
    setSetupKey, 
    setupRole, 
    setSetupRole, 
    setupError, 
    onSave 
}) => {
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
                <form onSubmit={onSave} style={{ WebkitAppRegion: 'no-drag' }}>
                    <input 
                        type="password" 
                        value={setupKey} 
                        onChange={(e) => setSetupKey(e.target.value)} 
                        placeholder="Paste API Key Here"
                        className="w-full bg-neutral-900 border border-neutral-600 rounded px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors duration-200 mb-4"
                    />
                    
                    <div className="mb-4">
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-xs text-neutral-400 uppercase font-bold tracking-wider ml-1">AI Persona (System Instruction)</label>
                            <button 
                                type="button" 
                                onClick={() => setSetupRole(DEFAULT_PERSONA)}
                                className="text-[10px] text-emerald-500 hover:text-emerald-400 underline"
                            >
                                Use Default
                            </button>
                        </div>
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
            <ResizeHandle />
        </div>
    );
};

export default SetupScreen;
