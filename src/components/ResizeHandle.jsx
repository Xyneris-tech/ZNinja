import React, { useRef } from 'react';

const ResizeHandle = () => {
    const startX = useRef(0);
    const startY = useRef(0);
    const startWidth = useRef(0);
    const startHeight = useRef(0);

    const onMouseDown = async (e) => {
        if (!window.electron?.getWindowSize) return;
        
        e.preventDefault();
        const size = await window.electron.getWindowSize();
        startX.current = e.screenX;
        startY.current = e.screenY;
        startWidth.current = size.width;
        startHeight.current = size.height;

        const onMouseMove = (moveEvent) => {
            const deltaX = moveEvent.screenX - startX.current;
            const deltaY = moveEvent.screenY - startY.current;
            window.electron.resizeWindow(
                Math.floor(startWidth.current + deltaX),
                Math.floor(startHeight.current + deltaY)
            );
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    return (
        <div 
            onMouseDown={onMouseDown}
            className="absolute bottom-0 right-0 w-4 h-4 no-drag z-50 group"
            style={{ 
                WebkitAppRegion: 'no-drag',
                cursor: 'default' // NO RESIZE CURSOR HERE
            }}
        >
            <div className="absolute bottom-1 right-1 w-2 h-2 border-r-2 border-b-2 border-white/40 group-hover:border-white/90 transition-colors" />
        </div>
    );
};

export default ResizeHandle;
