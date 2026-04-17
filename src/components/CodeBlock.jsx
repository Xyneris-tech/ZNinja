import React, { useState } from 'react';
import { CheckIcon, ClipboardIcon } from './Icons';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const SyntaxHighlighter = React.lazy(() => 
    import('react-syntax-highlighter').then(module => ({ default: module.Prism }))
);

const CodeBlock = ({ inline, className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || '');
    const [isCopied, setIsCopied] = useState(false);
  
    const handleCopy = () => {
      navigator.clipboard.writeText(String(children));
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    };
  
    if (inline) {
        return (
            <code className={`${className} bg-black/60 rounded px-1 py-0.5 font-mono text-xs`} {...props}>
                {children}
            </code>
        );
    }

    return (
      <div className="relative group w-full">
        <button 
          onClick={handleCopy}
          className="absolute top-2 right-2 p-1.5 rounded-md bg-neutral-700/50 hover:bg-neutral-600 text-neutral-400 hover:text-white opacity-0 group-hover:opacity-100 transition-all duration-200 z-10"
        >
          {isCopied ? <CheckIcon /> : <ClipboardIcon />}
        </button>
        <React.Suspense fallback={<pre className="bg-black/50 p-4 rounded-lg animate-pulse text-xs text-neutral-500">Loading highlighter...</pre>}>
            <HighlighterContent match={match} props={props}>{children}</HighlighterContent>
        </React.Suspense>
      </div>
    );
};

const HighlighterContent = ({ match, children, props }) => {
    // We need to import the style dynamically too or just use a static one if we can't easily lazy load the style object
    // For now, let's keep it simple and just lazy load the component itself.
    // To also lazy load the style, we'd need to pass it in.
    
    return (
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
    );
}

export default CodeBlock;
