import React from 'react';
import { XIcon, TrashIcon } from './Icons';

const ChatHistorySidebar = ({
    sessions,
    currentSessionId,
    showHistory,
    setShowHistory,
    openSession,
    deleteSession
}) => {
    return (
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
    );
};

export default ChatHistorySidebar;
