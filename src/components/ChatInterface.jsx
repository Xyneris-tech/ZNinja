import React, { useRef, memo, useMemo } from 'react'; // Added memo
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

import CodeBlock from './CodeBlock';
import AutoResizeTextarea from './AutoResizeTextarea';
import ResizeHandle from './ResizeHandle';
import MeetingRecorder from './MeetingRecorder';
import { SendIcon, CameraIcon, XIcon } from './Icons';

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
    return (
        <div className={`text-sm flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`inline-block px-3 py-2 rounded-lg max-w-[90%] ${msg.role === 'user' ? 'bg-emerald-500/30' : 'bg-neutral-700/40'}`}>
                {msg.images && msg.images.map((img, i) => (
                    <img key={i} src={img} alt={`Attachment ${i}`} className="max-w-xs max-h-48 rounded mb-2 border border-neutral-600/50 block" />
                ))}
                {msg.image && !msg.images && (
                    <img src={msg.image} alt="Attachment" className="max-w-xs max-h-48 rounded mb-2 border border-neutral-600/50 block" />
                )}
                {msg.role === 'ai' ? (
                    <ReactMarkdown 
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        components={MARKDOWN_COMPONENTS}
                    >
                        {msg.text}
                    </ReactMarkdown>
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
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
    selectedModel
}) => {
    
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
                    className="absolute right-5 bottom-[2.3rem] p-1 hover:bg-neutral-400/30 rounded-md text-neutral-400 hover:text-white transition-colors duration-200 z-10"
                    onClick={handleCapture}
                    
                >
                    <CameraIcon />
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
                            if (window.electron && window.electron.askGemini) {
                                const userPrompt = inputValue || "give answer";
                                setMessages(prev => [...prev, { role: 'user', text: userPrompt, images: [result.image] }]);
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
                                    images: [result.image],
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
    );
};

export default ChatInterface;
