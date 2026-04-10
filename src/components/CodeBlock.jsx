import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { CheckIcon, ClipboardIcon } from './Icons';

const CodeBlock = ({ inline, className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || '');
    const [isCopied, setIsCopied] = useState(false);
  
    const handleCopy = () => {
      navigator.clipboard.writeText(String(children));
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    };
  
    return !inline ? (
      <div className="relative group w-full">
        <button 
          onClick={handleCopy}
          className="absolute top-2 right-2 p-1.5 rounded-md bg-neutral-700/50 hover:bg-neutral-600 text-neutral-400 hover:text-white opacity-0 group-hover:opacity-100 transition-all duration-200 z-10"
        >
          {isCopied ? <CheckIcon /> : <ClipboardIcon />}
        </button>
        <SyntaxHighlighter
          style={vscDarkPlus}
          language={match ? match[1] : 'text'}
          PreTag="div"
          wrapLongLines={true}
          codeTagProps={{
            style: {
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              maxWidth: '100%',
              display: 'inline-block'
            }
          }}
          customStyle={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.5)', 
            margin: 0, 
            borderRadius: '0.5rem',
            width: '100%',
            maxWidth: '100%',
            display: 'grid',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            overflowWrap: 'anywhere',
            overflowX: 'auto',
            fontSize: '0.85rem'
          }}
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      </div>
    ) : (
      <code className={`${className} bg-black/60 rounded px-1 py-0.5 font-mono text-xs`} {...props}>
        {children}
      </code>
    );
};

export default CodeBlock;
