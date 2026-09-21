import React from "react";
import { createPortal } from "react-dom";
// @ts-ignore
import MeetingRecorder from "../MeetingRecorder";
import Tooltip from "./tooltip";

// Utility function to merge classnames
const cn = (...classes) => classes.filter(Boolean).join(" ");

// Inline SVG components replacing Lucide React icons
const XIcon = ({ className, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

const PaperclipIcon = ({ className, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
  </svg>
);

const CameraIcon = ({ className, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
    <circle cx="12" cy="13" r="3" />
  </svg>
);

const GlobeIcon = ({ className, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
    <path d="M2 12h20" />
  </svg>
);

const BrainCogIcon = ({ className, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="m10.852 14.772-.383.923" />
    <path d="m10.852 9.228-.383-.923" />
    <path d="m13.148 14.772.382.924" />
    <path d="m13.531 8.305-.383.923" />
    <path d="m14.772 10.852.923-.383" />
    <path d="m14.772 13.148.923.383" />
    <path d="M17.598 6.5A3 3 0 1 0 12 5a3 3 0 0 0-5.63-1.446 3 3 0 0 0-.368 1.571 4 4 0 0 0-2.525 5.771" />
    <path d="M17.998 5.125a4 4 0 0 1 2.525 5.771" />
    <path d="M19.505 10.294a4 4 0 0 1-1.5 7.706" />
    <path d="M4.032 17.483A4 4 0 0 0 11.464 20c.18-.311.892-.311 1.072 0a4 4 0 0 0 7.432-2.516" />
    <path d="M4.5 10.291A4 4 0 0 0 6 18" />
    <path d="M6.002 5.125a3 3 0 0 0 .4 1.375" />
    <path d="m9.228 10.852-.923-.383" />
    <path d="m9.228 13.148-.923.383" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const ArrowUpIcon = ({ className, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="m5 12 7-7 7 7" />
    <path d="M12 19V5" />
  </svg>
);

const AudioIcon = ({ className, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
);

const styles = `
  *:focus-visible {
    outline-offset: 0 !important;
    --ring-offset: 0 !important;
  }
  textarea::-webkit-scrollbar {
    width: 6px;
  }
  textarea::-webkit-scrollbar-track {
    background: transparent;
  }
  textarea::-webkit-scrollbar-thumb {
    background-color: #444444;
    border-radius: 3px;
  }
  textarea::-webkit-scrollbar-thumb:hover {
    background-color: #555555;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes scaleIn {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
  .animate-scale-in {
    animation: scaleIn 0.15s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    transform-origin: bottom right;
  }
`;

if (typeof document !== "undefined") {
  const styleSheet = document.createElement("style");
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);
}

const Textarea = React.forwardRef(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        "flex w-full rounded-md border-none bg-transparent px-3 py-2.5 text-base text-gray-100 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px] resize-none scrollbar-thin scrollbar-thumb-[#444444] scrollbar-track-transparent hover:scrollbar-thumb-[#555555]",
        className
      )}
      ref={ref}
      rows={1}
      {...props}
    />
  )
);

Textarea.displayName = "Textarea";

// Radix primitives removed in favor of lightweight custom components

// Button component
const Button = React.forwardRef(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const variantClasses = {
      default: "bg-white hover:bg-white/80 text-black",
      outline: "border border-[#444444] bg-transparent hover:bg-[#3A3A40]",
      ghost: "bg-transparent hover:bg-[#3A3A40]",
    };

    const sizeClasses = {
      default: "h-10 px-4 py-2",
      sm: "h-8 px-3 text-sm",
      lg: "h-12 px-6",
      icon: "h-8 w-8 rounded-full aspect-[1/1]",
    };

    return (
      <button
        className={cn(
          "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

// Voice Recorder Component
const VoiceRecorder = ({
  isRecording,
  onStartRecording,
  onStopRecording,
  visualizerBars = 32,
}) => {
  const [time, setTime] = React.useState(0);
  const timerRef = React.useRef(null);

  React.useEffect(() => {
    if (isRecording) {
      onStartRecording();

      timerRef.current = setInterval(() => {
        setTime((t) => t + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      onStopRecording(time);
      setTime(0);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center w-full transition-all duration-300 py-3",
        isRecording ? "opacity-100" : "opacity-0 h-0"
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
        <span className="font-mono text-sm text-white/80">
          {formatTime(time)}
        </span>
      </div>

      <div className="w-full h-10 flex items-center justify-center gap-0.5 px-4">
        {[...Array(visualizerBars)].map((_, i) => (
          <div
            key={i}
            className="w-0.5 rounded-full bg-white/50 animate-pulse"
            style={{
              height: `${Math.max(15, Math.random() * 100)}%`,
              animationDelay: `${i * 0.05}s`,
              animationDuration: `${0.5 + Math.random() * 0.5}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

// Image View Dialog for Attachment Previews with Screen Capture Protection
const ImageViewDialog = ({ imageUrl, onClose, isCapturing = false }) => {
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (imageUrl && !isCapturing) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [imageUrl, isCapturing, onClose]);

  if (!imageUrl || isCapturing) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out] cursor-zoom-out"
        onClick={onClose}
      />

      {/* Content wrapper */}
      <div
        className="relative z-10 w-full max-w-[90vw] md:max-w-[800px] border border-[#333333] bg-[#1F2023] p-0 shadow-2xl rounded-2xl overflow-hidden animate-[scaleIn_0.25s_cubic-bezier(0.16,1,0.3,1)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          <img
            src={imageUrl}
            alt="Full preview"
            className="w-full max-h-[80vh] object-contain rounded-2xl"
          />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 z-20 rounded-full bg-[#2E3033]/80 p-2 hover:bg-[#2E3033] hover:scale-105 active:scale-95 transition-all text-gray-200 hover:text-white"
          >
            <XIcon className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

const PromptInputContext = React.createContext({
  isLoading: false,
  value: "",
  setValue: () => { },
  maxHeight: 240,
  onSubmit: undefined,
  disabled: false,
  isCapturing: false,
});

function usePromptInput() {
  return React.useContext(PromptInputContext);
}

// PromptInput container component
const PromptInput = React.forwardRef(
  (
    {
      className,
      isLoading = false,
      maxHeight = 240,
      value,
      onValueChange,
      onSubmit,
      children,
      disabled = false,
      onDragOver,
      onDragLeave,
      onDrop,
      inputRef,
      isCapturing = false,
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = React.useState(value || "");

    const handleChange = (newValue) => {
      setInternalValue(newValue);
      onValueChange?.(newValue);
    };

    return (
      <PromptInputContext.Provider
        value={{
          isLoading,
          value: value ?? internalValue,
          setValue: onValueChange ?? handleChange,
          maxHeight,
          onSubmit,
          disabled,
          inputRef,
          isCapturing,
        }}
      >
        <div
          ref={ref}
          className={cn(
            "rounded-[24px] border border-[#444444] bg-[#1F2023] p-2 shadow-[0_8px_30px_rgba(0,0,0,0.24)] transition-all duration-300",
            isLoading && "border-emerald-500/70",
            className
          )}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          {children}
        </div>
      </PromptInputContext.Provider>
    );
  }
);

PromptInput.displayName = "PromptInput";

// PromptInputTextarea component
const PromptInputTextarea = React.forwardRef((
  {
    className,
    onKeyDown,
    disableAutosize = false,
    placeholder,
    ...props
  },
  forwardedRef
) => {
  const { value, setValue, maxHeight, onSubmit, disabled, inputRef } =
    usePromptInput();

  const internalTextareaRef = React.useRef(null);

  const handleRef = React.useCallback(
    (node) => {
      internalTextareaRef.current = node;

      if (forwardedRef) {
        if (typeof forwardedRef === "function") {
          forwardedRef(node);
        } else {
          forwardedRef.current = node;
        }
      }

      if (inputRef) {
        if (typeof inputRef === "function") {
          inputRef(node);
        } else {
          inputRef.current = node;
        }
      }
    },
    [forwardedRef, inputRef]
  );

  React.useEffect(() => {
    if (disableAutosize || !internalTextareaRef.current) return;

    internalTextareaRef.current.style.height = "auto";

    const scrollHeight = internalTextareaRef.current.scrollHeight;
    internalTextareaRef.current.style.height =
      typeof maxHeight === "number"
        ? `${Math.min(scrollHeight, maxHeight)}px`
        : `min(${scrollHeight}px, ${maxHeight})`;
  }, [value, maxHeight, disableAutosize]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit?.();
    }

    onKeyDown?.(e);
  };

  return (
    <Textarea
      ref={handleRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      className={cn("text-base w-full", className)}
      disabled={disabled}
      placeholder={placeholder}
      {...props}
    />
  );
});

PromptInputTextarea.displayName = "PromptInputTextarea";

const PromptInputActions = ({ children, className, ...props }) => (
  <div className={cn("flex items-center gap-1 sm:gap-2", className)} {...props}>
    {children}
  </div>
);

const PromptInputAction = ({
  tooltip,
  children,
  className,
  side = "top",
  ...props
}) => {
  const { disabled, isCapturing } = usePromptInput();

  if (isCapturing) {
    return children;
  }

  return (
    <Tooltip content={tooltip} disabled={disabled} className={className} {...props}>
      {children}
    </Tooltip>
  );
};

// Premium divider line
const CustomDivider = () => (
  <div className="relative h-5 w-[1.5px] mx-1">
    <div
      className="absolute inset-0 bg-gradient-to-t from-transparent via-[#9b87f5]/70 to-transparent rounded-full"
      style={{
        clipPath:
          "polygon(0% 0%, 100% 0%, 100% 40%, 140% 50%, 100% 60%, 100% 100%, 0% 100%, 0% 60%, -40% 50%, 0% 40%)",
      }}
    />
  </div>
);

// Beautiful model name formatting helper
const formatModelName = (modelName) => {
  if (!modelName) return "Select Model";
  const base = modelName.split('/').pop();

  if (base.toLowerCase().includes("gemini")) {
    let formatted = base
      .replace(/-/g, ' ')
      .replace(/\b(gemini)\b/gi, 'Gemini')
      .replace(/\b(flash)\b/gi, 'Flash')
      .replace(/\b(pro)\b/gi, 'Pro')
      .replace(/\b(latest)\b/gi, '')
      .replace(/\b(exp)\b/gi, '(Exp)')
      .trim();
    return formatted;
  }
  return base;
};

// Main Prompt Input Box component
export const PromptInputBox = React.forwardRef((props, ref) => {
  const {
    value = "",
    onValueChange = () => { },
    attachments = [],
    setAttachments = () => { },
    onSend = () => { },
    isLoading = false,
    placeholder = "Type your message here...",
    className,
    workingMode,
    setWorkingMode,
    handleSendAudio,
    handleCapture,
    isCapturing = false,
    inputRef,
    availableModels = [],
    selectedModel = "",
    setSelectedModel = () => { },
    onStop = () => { },
    disabled = false,
  } = props;

  const [selectedImage, setSelectedImage] = React.useState(null);
  const [showSearch, setShowSearch] = React.useState(false);
  const [showThink, setShowThink] = React.useState(workingMode === "research");
  const [showModelMenu, setShowModelMenu] = React.useState(false);

  const uploadInputRef = React.useRef(null);
  const promptBoxRef = React.useRef(null);

  // Sync mode triggers with external workingMode state if they change
  React.useEffect(() => {
    setShowThink(workingMode === "research");
  }, [workingMode]);

  const handleToggleChange = (value) => {
    if (value === "search") {
      setShowSearch((prev) => !prev);
      setShowThink(false);
      // Reset mode to general when search toggled (if active in thinking)
      if (setWorkingMode) setWorkingMode("general");
    } else if (value === "think") {
      const nextThink = !showThink;
      setShowThink(nextThink);
      setShowSearch(false);
      if (setWorkingMode) {
        setWorkingMode(nextThink ? "research" : "general");
      }
    }
  };

  const processFile = (file) => {
    const isImage = file.type.startsWith("image/");
    const audioExtensions = [".mp3", ".wav", ".webm", ".ogg", ".m4a", ".flac", ".aac", ".opus", ".oga"];
    const fileExtension = file.name ? file.name.substring(file.name.lastIndexOf(".")).toLowerCase() : "";
    const isAudio = file.type.startsWith("audio/") || audioExtensions.includes(fileExtension);

    if (!isImage && !isAudio) {
      console.log("Only image and audio files are allowed");
      return;
    }

    if (file.size > (isAudio ? 100 * 1024 * 1024 : 10 * 1024 * 1024)) {
      console.log(`File too large (max ${isAudio ? "100MB" : "10MB"})`);
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      if (e.target?.result) {
        let result = e.target.result;
        // Rewrite dynamic base64 MIME header if detected as audio but resolves to application/octet-stream
        if (isAudio) {
          if (result.startsWith("data:application/octet-stream;")) {
            const extension = fileExtension ? fileExtension.substring(1) : "mp3";
            result = result.replace("data:application/octet-stream;", `data:audio/${extension};`);
          } else if (result.startsWith("data:video/")) {
            result = result.replace("data:video/", "data:audio/");
          }
        }
        setAttachments((prev) => [...prev, result]);
      }
    };

    reader.readAsDataURL(file);
  };

  const handleDragOver = React.useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragLeave = React.useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = React.useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();

    const droppedFiles = Array.from(e.dataTransfer.files);
    const audioExtensions = [".mp3", ".wav", ".webm", ".ogg", ".m4a", ".flac", ".aac", ".opus", ".oga"];
    const validFiles = droppedFiles.filter((file) => {
      const fileExtension = file.name ? file.name.substring(file.name.lastIndexOf(".")).toLowerCase() : "";
      return file.type.startsWith("image/") || file.type.startsWith("audio/") || audioExtensions.includes(fileExtension);
    });

    if (validFiles.length > 0) {
      processFile(validFiles[0]);
    }
  }, [attachments]);

  const handleRemoveFile = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const openImageModal = (imageUrl) => {
    setSelectedImage(imageUrl);
  };

  const handlePaste = React.useCallback((e) => {
    const items = e.clipboardData?.items;

    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const isImg = items[i].type.indexOf("image") !== -1;
      const isAud = items[i].type.indexOf("audio") !== -1;
      if (isImg || isAud) {
        const file = items[i].getAsFile();

        if (file) {
          e.preventDefault();
          processFile(file);
          break;
        }
      } else if (items[i].kind === "file") {
        const file = items[i].getAsFile();
        if (file) {
          const audioExtensions = [".mp3", ".wav", ".webm", ".ogg", ".m4a", ".flac", ".aac", ".opus", ".oga"];
          const fileExtension = file.name ? file.name.substring(file.name.lastIndexOf(".")).toLowerCase() : "";
          if (audioExtensions.includes(fileExtension)) {
            e.preventDefault();
            processFile(file);
            break;
          }
        }
      }
    }
  }, [attachments]);

  React.useEffect(() => {
    document.addEventListener("paste", handlePaste);

    return () => {
      document.removeEventListener("paste", handlePaste);
    };
  }, [handlePaste]);

  const handleSubmit = () => {
    if (value.trim() || attachments.length > 0) {
      let messagePrefix = "";

      if (showSearch) messagePrefix = "[Search: ";
      else if (showThink) messagePrefix = "[Research: ";

      const formattedInput = messagePrefix
        ? `${messagePrefix}${value}]`
        : value;

      onSend(formattedInput);
      onValueChange("");
    }
  };

  const hasContent = value.trim() !== "" || attachments.length > 0;

  return (
    <>
      <PromptInput
        value={value}
        onValueChange={onValueChange}
        isLoading={isLoading}
        onSubmit={handleSubmit}
        className={cn(
          "w-full bg-[#1F2023] border-[#444444] shadow-[0_8px_30px_rgba(0,0,0,0.24)] transition-all duration-300 ease-in-out",
          className
        )}
        disabled={isLoading || disabled}
        ref={ref || promptBoxRef}
        inputRef={inputRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        isCapturing={isCapturing}
      >
        {/* Attachment Image/Audio Previews */}
        {attachments.length > 0 && (
          <div className="flex gap-2 p-2 px-3 border-b border-[#333333] mb-2 overflow-x-auto">
            {attachments.map((imgUrl, idx) => {
              const isAudio = imgUrl.startsWith("data:audio/") || imgUrl.startsWith("data:video/");
              const audioExt = isAudio ? (() => {
                const match = imgUrl.match(/^data:(?:audio|video)\/([a-zA-Z0-9]+)/);
                if (match) {
                  const sub = match[1].toLowerCase();
                  if (sub === "mpeg") return ".mp3";
                  return `.${sub}`;
                }
                return ".mp3";
              })() : "";
              return (
                <div
                  key={idx}
                  className={cn(
                    "relative rounded-xl border border-[#444444] overflow-hidden group/file flex-shrink-0",
                    isAudio ? "w-28 h-16 bg-neutral-950/80 border-emerald-500/20 p-2.5 flex flex-col justify-between" : "w-16 h-16"
                  )}
                >
                  {isAudio ? (
                    <>
                      <div className="flex items-center gap-1.5 text-emerald-400">
                        <AudioIcon className="h-4 w-4 animate-pulse" />
                        <span className="text-[10px] font-mono tracking-wider font-semibold uppercase text-emerald-400/90">AUDIO</span>
                      </div>
                      <div className="text-[9px] text-neutral-400 truncate font-mono">
                        {imgUrl.length > 30 ? `file_${idx}${audioExt}` : "audio"}
                      </div>
                    </>
                  ) : (
                    <img
                      src={imgUrl}
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => openImageModal(imgUrl)}
                      alt={`Attachment ${idx}`}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(idx)}
                    className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white/80 hover:text-white hover:bg-black/80 transition-all opacity-0 group-hover/file:opacity-100 z-10"
                  >
                    <XIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Input Textarea */}
        <PromptInputTextarea placeholder={placeholder} />

        {/* Invisible file upload input */}
        <input
          type="file"
          ref={uploadInputRef}
          onChange={(e) => {
            const fileList = e.target.files;
            if (fileList && fileList.length > 0) {
              processFile(fileList[0]);
              e.target.value = ""; // Reset value so the exact same file can be selected again
            }
          }}
          accept="image/*,audio/*"
          className="hidden"
        />

        {/* Bottom Actions Row */}
        <div className="flex items-center justify-between mt-2 pt-1 border-t border-[#333333]/10 px-1 sm:px-2">
          <PromptInputActions>
            <PromptInputAction tooltip="Upload Image/Audio">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-gray-400 hover:text-white rounded-full hover:bg-white/10 h-8 w-8"
                onClick={() => uploadInputRef.current?.click()}
                disabled={disabled}
              >
                <PaperclipIcon className="h-[18px] w-[18px]" />
              </Button>
            </PromptInputAction>

            {handleCapture && (
              <PromptInputAction tooltip="Screen Capture">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "rounded-full transition-all duration-200 hover:bg-white/10 h-8 w-8",
                    isCapturing ? "text-emerald-500 animate-pulse" : "text-gray-400 hover:text-white"
                  )}
                  onClick={handleCapture}
                  disabled={isCapturing || disabled}
                >
                  {isCapturing ? (
                    <div className="w-[18px] h-[18px] border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <CameraIcon className="h-[18px] w-[18px]" />
                  )}
                </Button>
              </PromptInputAction>
            )}

            <CustomDivider />

            <PromptInputAction tooltip="Web Search">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(
                  "rounded-full transition-all duration-200 hover:bg-white/10 h-8 w-8",
                  showSearch ? "text-[#9b87f5]" : "text-gray-400 hover:text-white"
                )}
                onClick={() => handleToggleChange("search")}
                disabled={disabled}
              >
                <GlobeIcon className="h-[18px] w-[18px]" />
              </Button>
            </PromptInputAction>

            <CustomDivider />

            <PromptInputAction tooltip="Deep Research (Native Google Research)">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(
                  "rounded-full transition-all duration-200 hover:bg-white/10 h-8 w-8",
                  showThink ? "text-[#9b87f5]" : "text-gray-400 hover:text-white"
                )}
                onClick={() => handleToggleChange("think")}
                disabled={disabled}
              >
                <BrainCogIcon className="h-[18px] w-[18px]" />
              </Button>
            </PromptInputAction>

            {handleSendAudio && (
              <>
                <CustomDivider />
                <div className="flex items-center">
                  {/* @ts-ignore */}
                  <MeetingRecorder onRecordingComplete={handleSendAudio} />
                </div>
              </>
            )}
          </PromptInputActions>

          <div className="flex items-center gap-2 relative">
            {/* Model Dropdown */}
            {availableModels.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowModelMenu(!showModelMenu)}
                  className="bg-neutral-800/60 hover:bg-neutral-700/80 text-[11px] text-neutral-300 px-2.5 py-1 rounded-md border border-white/5 flex items-center gap-1.5 transition-all duration-200 font-mono disabled:opacity-50 disabled:pointer-events-none"
                  disabled={disabled}
                >
                  <span>{selectedModel.split('/').pop()}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-300 ${showModelMenu ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"></polyline></svg>
                </button>

                {showModelMenu && (
                  <>
                    <div className="fixed inset-0 z-[1000]" onClick={() => setShowModelMenu(false)} />
                    <div className="absolute bottom-full right-0 mb-2 py-1 bg-neutral-900/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl z-[1001] min-w-[220px] max-h-64 overflow-y-auto">
                      {availableModels.map(m => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => {
                            setSelectedModel(m);
                            setShowModelMenu(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-[11px] hover:bg-white/5 transition-colors font-mono ${selectedModel === m ? 'text-emerald-400 bg-emerald-400/5' : 'text-neutral-400'}`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {isLoading ? (
              <PromptInputAction tooltip="Stop Generating">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="rounded-full h-[34px] w-[34px] active:scale-95 transition-all border-2 border-rose-500/30  hover:bg-rose-500/25 flex items-center justify-center "
                  onClick={onStop}
                >
                  <div className="w-2.5 h-2.5 bg-rose-500 rounded-sm" />
                </Button>
              </PromptInputAction>
            ) : (
              <PromptInputAction tooltip="Send Prompt">
                <Button
                  type="button"
                  variant="default"
                  size="icon"
                  className={cn(
                    "rounded-full shadow-lg h-[34px] w-[34px] active:scale-95 transition-all",
                    hasContent && !disabled
                      ? "bg-white text-black hover:bg-white/90"
                      : "bg-[#2E3033] text-gray-500 cursor-not-allowed"
                  )}
                  onClick={handleSubmit}
                  disabled={!hasContent || disabled}
                >
                  <ArrowUpIcon className="h-[18px] w-[18px] stroke-[2.5]" />
                </Button>
              </PromptInputAction>
            )}
          </div>
        </div>
      </PromptInput>

      <ImageViewDialog
        imageUrl={selectedImage}
        onClose={() => setSelectedImage(null)}
        isCapturing={isCapturing}
      />
    </>
  );
});

PromptInputBox.displayName = "PromptInputBox";
