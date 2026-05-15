import { useCallback, useEffect, useRef } from "react";

const cn = (...classes) => classes.filter(Boolean).join(" ");

export const DotLoader = ({
    frames,
    isPlaying = true,
    duration = 100,
    dotClassName,
    className,
    repeatCount = -1,
    onComplete,
    ...props
}) => {
    const gridRef = useRef(null);
    const currentIndex = useRef(0);
    const repeats = useRef(0);
    const interval = useRef(null);

    const applyFrameToDots = useCallback(
        (dots, frameIndex) => {
            const frame = frames[frameIndex];
            if (!frame) return;

            dots.forEach((dot, index) => {
                dot.classList.toggle("active", frame.includes(index));
            });
        },
        [frames],
    );

    useEffect(() => {
        currentIndex.current = 0;
        repeats.current = 0;
    }, [frames]);

    useEffect(() => {
        if (isPlaying) {
            if (currentIndex.current >= frames.length) {
                currentIndex.current = 0;
            }
            const dotElements = gridRef.current?.children;
            if (!dotElements) return;
            const dots = Array.from(dotElements);
            interval.current = setInterval(() => {
                applyFrameToDots(dots, currentIndex.current);
                if (currentIndex.current + 1 >= frames.length) {
                    if (repeatCount !== -1 && repeats.current + 1 >= repeatCount) {
                        clearInterval(interval.current);
                        onComplete?.();
                    }
                    repeats.current++;
                }
                currentIndex.current = (currentIndex.current + 1) % frames.length;
            }, duration);
        } else {
            if (interval.current) clearInterval(interval.current);
        }

        return () => {
            if (interval.current) clearInterval(interval.current);
        };
    }, [frames, isPlaying, applyFrameToDots, duration, repeatCount, onComplete]);

    return (
        <div {...props} ref={gridRef} className={cn("grid w-fit grid-cols-4 gap-0.5", className)}>
            {Array.from({ length: 16 }).map((_, i) => (
                <div key={i} className={cn("h-[2px] w-[2px]", dotClassName)} />
            ))}
        </div>
    );
};
