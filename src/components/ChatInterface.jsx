import React, { useRef, memo, useMemo } from 'react'; // Added memo
import 'katex/dist/katex.min.css';

const LazyMarkdown = React.lazy(() => import('react-markdown'));
const remarkGfm = import('remark-gfm');
const remarkMath = import('remark-math');
const rehypeKatex = import('rehype-katex');

import CodeBlock from './CodeBlock';
import AutoResizeTextarea from './AutoResizeTextarea';
import ResizeHandle from './ResizeHandle';
import MeetingRecorder from './MeetingRecorder';
import { SendIcon, CameraIcon, XIcon, BrainIcon, CodeIcon, NinjaIcon, CheckIcon } from './Icons';
import { WORKING_MODES } from '../modes';
import { useState } from 'react';

// Markdown components definition - Memoized outside component or useMemo
const MARKDOWN_COMPONENTS = {
    code: CodeBlock,
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

// Extracted MessageItem
const MessageItem = memo(({ msg }) => {
    // Resolve plugins as they are promises in this lazy setup
    const [plugins, setPlugins] = React.useState({ remark: [], rehype: [] });

    React.useEffect(() => {
        Promise.all([remarkGfm, remarkMath, rehypeKatex]).then(([gfm, math, katex]) => {
            setPlugins({
                remark: [gfm.default, math.default],
                rehype: [katex.default]
            });
        });
    }, []);

    return (
        <div className={`text-sm flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`px-3 py-2 rounded-lg max-w-[90%] min-w-0 break-words overflow-hidden ${msg.role === 'user' ? 'bg-emerald-500/30' : 'bg-neutral-700/40'}`}>
                {msg.images && msg.images.map((img, i) => (
                    <img key={i} src={img} alt={`Attachment ${i}`} className="max-w-xs max-h-48 rounded mb-2 border border-neutral-600/50 block" />
                ))}
                {msg.image && !msg.images && (
                    <img src={msg.image} alt="Attachment" className="max-w-xs max-h-48 rounded mb-2 border border-neutral-600/50 block" />
                )}
                {msg.role === 'ai' ? (
                    <React.Suspense fallback={<div className="animate-pulse text-xs text-neutral-500 italic">Processing response...</div>}>
                        {msg.isStreaming && !msg.text ? (
                            <div className="animate-pulse text-xs text-neutral-400 italic">Thinking...</div>
                        ) : (
                            <div className="relative">
                                <LazyMarkdown 
                                    remarkPlugins={plugins.remark}
                                    rehypePlugins={plugins.rehype}
                                    components={MARKDOWN_COMPONENTS}
                                >
                                    {msg.text}
                                </LazyMarkdown>
                                {msg.isStreaming && (
                                    <span className="inline-block w-2 h-4 ml-1 bg-emerald-500 animate-pulse align-middle"></span>
                                )}
                            </div>
                        )}
                    </React.Suspense>
                ) : (
                    <span>{msg.text}</span>
                )}
            </div>
        </div>
    );
}, (prevProps, nextProps) => {
    // Custom comparison to ensure strict equality check isn't missed on deep objects if needed
    // But usually shallow comparison of 'msg' object is fine if immutable updates are used
    return prevProps.msg === nextProps.msg; 
});

// Extracted MessageList
const MessageList = memo(({ messages }) => {
    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-3 pt-12">
            {messages.map((msg, idx) => (
                <MessageItem key={idx} msg={msg} />
            ))}
        </div>
    );
});

const ChatInterface = ({
    messages,
    setMessages,
    inputValue,
    setInputValue,
    attachments,
    setAttachments,
    handleSend,
    handleCapture,
    handleSendAudio,
    inputRef,
    selectedModel,
    workingMode,
    setWorkingMode,
    isCapturing
}) => {
    const [showModeMenu, setShowModeMenu] = useState(false);

    const currentMode = WORKING_MODES.find(m => m.id === workingMode) || WORKING_MODES[0];

    const getModeIcon = (modeId) => {
        switch (modeId) {
            case 'code': return <CodeIcon />;
            case 'competitive': return <NinjaIcon />;
            case 'quiz': return <CheckIcon />;
            default: return <BrainIcon />;
        }
    };
    
    return (
        <div className="flex-1 flex flex-col w-full relative overflow-hidden min-h-0">
            {/* Memoized Message List */}
            <MessageList messages={messages} />

            <form onSubmit={handleSend} className="w-full p-3 relative py-2 bg-neutral-800/50 flex flex-col items-end ">
                <div className="flex-1 min-w-full relative">
                    <AutoResizeTextarea
                        ref={inputRef}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onEnterPress={handleSend}
                        placeholder="Ask ZNinja..."
                    />
                </div>
                {attachments.length > 0 && (
                    <div className="absolute bottom-14 left-4 z-10 flex gap-2 overflow-x-auto max-w-[calc(100%-6rem)] p-1 scrollbar-thin scrollbar-thumb-neutral-600">
                        {attachments.map((img, idx) => (
                            <div key={idx} className="relative w-24 h-16 border border-neutral-600 bg-black rounded overflow-hidden shadow-lg group shrink-0">
                                <img src={img} className="w-full h-full object-cover opacity-70" alt={`Attachment ${idx}`} />
                                <button 
                                    type="button"
                                    onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                                    className="absolute top-0 right-0 p-0.5 bg-red-600 text-white opacity-0 group-hover:opacity-100 hover:bg-red-500 transition-all duration-200"
                                    >
                                    <XIcon />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Mode Selector */}
                <div className="absolute left-4 bottom-[2.3rem] z-30">
                    <button
                        type="button"
                        onClick={() => setShowModeMenu(!showModeMenu)}
                        className="flex items-center translate-x-1 gap-1.5 px-2 py-1 bg-neutral-700/50 hover:bg-neutral-700 text-[10px] text-neutral-300 rounded border border-neutral-600 transition-all duration-200"
                    >
                        {getModeIcon(workingMode)}
                        <span className="font-bold uppercase tracking-widest hidden sm:inline">{currentMode.label}</span>
                    </button>

                    {showModeMenu && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowModeMenu(false)} />
                            <div className="absolute bottom-full left-0 mb-2 py-1 bg-neutral-800 border border-neutral-700 rounded-lg shadow-2xl z-50 min-w-[160px]">
                                <div className="px-3 py-2 text-[10px] text-neutral-500 font-bold uppercase tracking-wider border-b border-neutral-700/50 mb-1">
                                    Working Mode
                                </div>
                                {WORKING_MODES.map(mode => (
                                    <button
                                        key={mode.id}
                                        type="button"
                                        onClick={() => {
                                            setWorkingMode(mode.id);
                                            setShowModeMenu(false);
                                        }}
                                        className={`w-full text-left px-3 py-2 text-[11px] hover:bg-neutral-700 flex flex-col gap-0.5 transition-colors ${workingMode === mode.id ? 'text-emerald-400 bg-emerald-500/10' : 'text-neutral-400'}`}
                                    >
                                        <div className="flex items-center gap-2 font-bold uppercase tracking-wide">
                                            {getModeIcon(mode.id)}
                                            {mode.label}
                                        </div>
                                        <div className="text-[9px] text-neutral-500 leading-tight">
                                            {mode.description}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                 {/* Audio Recorder */}
                <div className="absolute right-20 bottom-[2.29rem] z-20">
                    <MeetingRecorder onRecordingComplete={handleSendAudio} />
                </div>

                <button
                    type="submit"
                    id="send-button"
                    className="absolute right-12 bottom-[2.3rem] p-1 hover:bg-neutral-400/30 rounded-md text-neutral-200 transition-colors duration-200"
                >
                    <SendIcon />
                </button>
                
               
                <button
                    type="button"
                    disabled={isCapturing}
                    className={`absolute right-5 bottom-[2.3rem] p-1 rounded-md transition-colors duration-200 z-10 ${isCapturing ? 'text-emerald-500 animate-pulse' : 'text-neutral-400 hover:text-white hover:bg-neutral-400/30'}`}
                    onClick={handleCapture}
                >
                    {isCapturing ? (
                        <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <CameraIcon />
                    )}
                </button>
                <span className='text-xs w-full flex justify-center items-center '>powered by CInfinite, developed by <a href="https://github.com/gajju44" target="_blank" rel="noopener noreferrer">&nbsp;gajju44</a></span>
                <button
                    id="instant-ai-trigger"
                    type="button"
                    className="hidden"
                    onClick={async () => {
                        if (!window.electron) return;
                        const result = await window.electron.captureScreen();
                        if (result.success) {
                            // Directly trigger Gemini with the captured image and current input
                            if (window.electron && window.electron.streamGemini) {
                                const userPrompt = inputValue || "give answer";
                                setMessages(prev => [...prev, { role: 'user', text: userPrompt, images: [result.image] }]);
                                setInputValue('');
                                setMessages(prev => [...prev, { role: 'ai', text: '', isStreaming: true }]);
                                
                                // Context-aware Instant AI
                                const history = messages
                                    .filter(m => !m.isTemp && !m.isStreaming && m.role !== 'system')
                                    .map(m => ({
                                        role: m.role === 'ai' ? 'model' : 'user',
                                        parts: [{ text: m.text }]
                                    }));

                                window.electron.streamGemini({ 
                                    prompt: userPrompt, 
                                    modelName: selectedModel, 
                                    images: [result.image],
                                    history: history,
                                    workingMode: workingMode
                                });
                            }
                        }
                    }}
                />
            </form>
            <ResizeHandle />
        </div>
    );
};

export default ChatInterface;
