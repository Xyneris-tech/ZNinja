import React, { useEffect, useRef } from 'react';

const AutoResizeTextarea = React.forwardRef(({ value, onChange, onEnterPress, placeholder }, ref) => {
    const internalRef = useRef(null);
    const textareaRef = ref || internalRef;
    const isManuallyResized = useRef(false);
  
    useEffect(() => {
      const textarea = textareaRef.current;
      if (textarea && !isManuallyResized.current) {
        textarea.style.height = 'auto';
        textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
      }
    }, [value]);

    const handleMouseDown = (e) => {
        // Prevent default to avoid selection issues
        e.preventDefault();
        const textarea = textareaRef.current;
        if (!textarea) return;

        const startY = e.clientY;
        const startHeight = textarea.offsetHeight;
        isManuallyResized.current = true;

        const onMouseMove = (moveEvent) => {
            const deltaY = moveEvent.clientY - startY;
            const newHeight = Math.max(38, startHeight + deltaY); // Min height 38px
            textarea.style.height = `${newHeight}px`;
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };
  
    const handleKeyDown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        // Reset manual resize on send
        isManuallyResized.current = false;
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
        onEnterPress(e);
      }
    };
  
    return (
      <div className="relative w-full group/textarea">
        <textarea
            ref={textareaRef}
            value={value}
            onChange={onChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 transition-colors duration-200 resize-none overflow-hidden hover:overflow-y-auto"
            style={{ minHeight: '38px', maxHeight: isManuallyResized.current ? 'none' : '200px' }} 
        />
        {/* Custom Resize Handle */}
        <div 
            onMouseDown={handleMouseDown}
            className="absolute bottom-[6px] -left-0  flex justify-center items-center  transition-opacity duration-200 group rounded"
            
        >
            <svg className='rotate-90 group-hover:opacity-100 opacity-60 transition-all duration-400 w-6 h-6 ' width="64px" height="64px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M10 20L20 20L20 10" stroke="#ffffff"></path> <path d="M12 17L17 17L17 12" stroke="#ffffff"></path> </g></svg>
        </div>
      </div>
    );
});
AutoResizeTextarea.displayName = 'AutoResizeTextarea';

export default AutoResizeTextarea;
