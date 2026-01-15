import React, { useState, useRef, useEffect } from 'react';
import { MicIcon, StopCircleIcon, SaveIcon, PlayIcon, PauseIcon, VideoIcon, ChevronLeftIcon } from './Icons';

const MeetingRecorder = ({ onRecordingComplete }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [error, setError] = useState(null);
    const [reviewMode, setReviewMode] = useState(false);
    const [recordedBlob, setRecordedBlob] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [mode, setMode] = useState('audio'); // 'audio' | 'video'
    const [isExpanded, setIsExpanded] = useState(false);
    
    // Refs for cleanup
    const mediaRecorderRef = useRef(null);
    const audioContextRef = useRef(null);
    const streamsRef = useRef([]);
    const timerRef = useRef(null);
    const chunksRef = useRef([]);
    const audioRef = useRef(null);

    useEffect(() => {
        return () => {
            stopRecordingAndCleanup();
        };
    }, []);

    const stopRecordingAndCleanup = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        // Stop all tracks
        streamsRef.current.forEach(stream => {
            stream.getTracks().forEach(track => track.stop());
        });
        streamsRef.current = [];

        // Close Audio Context
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().catch(console.error);
        }
    };

    const startRecording = async (selectedMode) => {
        setError(null);
        setIsRecording(true);
        setRecordingTime(0);
        setMode(selectedMode); 
        setIsExpanded(false); // Collapse menu on start
        chunksRef.current = [];

        try {
            // 1. Get Sources from Electron
            if (!window.electron || !window.electron.getAudioSources) {
                throw new Error("Electron Audio API not found");
            }

            const response = await window.electron.getAudioSources();
            if (!response.success) throw new Error(response.error);

            // Default to first source (Primary Screen)
            const sourceId = response.sources[0]?.id;
            if (!sourceId) throw new Error("No screen source found for audio");

            // 2. Get Streams
            const desktopStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    mandatory: {
                        chromeMediaSource: 'desktop',
                        chromeMediaSourceId: sourceId
                    }
                },
                video: {
                    mandatory: {
                        chromeMediaSource: 'desktop',
                        chromeMediaSourceId: sourceId
                    }
                }
            });

            const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });

            streamsRef.current = [desktopStream, micStream];

            // 3. Mix Streams logic
            let finalStream;
            
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            const ctx = new AudioContext();
            audioContextRef.current = ctx;
            const dest = ctx.createMediaStreamDestination();
            
            const desktopSource = ctx.createMediaStreamSource(desktopStream);
            const micSource = ctx.createMediaStreamSource(micStream);
            
            desktopSource.connect(dest);
            micSource.connect(dest);

            const mixedAudioTrack = dest.stream.getAudioTracks()[0];

            if (selectedMode === 'video') {
                const videoTrack = desktopStream.getVideoTracks()[0];
                finalStream = new MediaStream([videoTrack, mixedAudioTrack]);
            } else {
                finalStream = new MediaStream([mixedAudioTrack]);
            }

            // 4. Record
            const mimeType = selectedMode === 'video' 
                ? 'video/webm; codecs=vp9,opus' 
                : 'audio/webm; codecs=opus';
                
            const options = MediaRecorder.isTypeSupported(mimeType) ? { mimeType } : {};

            const recorder = new MediaRecorder(finalStream, options);
            mediaRecorderRef.current = recorder;

            recorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            recorder.onstop = () => {
                const type = selectedMode === 'video' ? 'video/webm' : 'audio/webm';
                const blob = new Blob(chunksRef.current, { type });
                if (blob.size > 0) {
                    setRecordedBlob(blob);
                    setReviewMode(true);
                    setIsRecording(false);
                } else {
                    console.error("Recorded blob is empty");
                    setError("Recording failed: Empty data");
                    stopRecordingAndCleanup();
                    setIsRecording(false);
                }
            };

            recorder.start(1000); 

            // Start Timer
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

        } catch (e) {
            console.error("Recording Start Error:", e);
            setError("Failed to start recording: " + e.message);
            stopRecordingAndCleanup();
            setIsRecording(false);
        }
    };

    const stopRecording = () => {
         if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            stopRecordingAndCleanup();
        }
    };

    const handleDiscard = () => {
        setReviewMode(false);
        setRecordedBlob(null);
        setRecordingTime(0);
        setIsPlaying(false);
    };

    const handleTranscribe = () => {
        if (!recordedBlob) return;
        const reader = new FileReader();
        reader.readAsDataURL(recordedBlob);
        reader.onloadend = () => {
            onRecordingComplete(reader.result);
            handleDiscard(); 
        };
    };

    const handleSave = async () => {
        if (!recordedBlob) return;
        
        if (!window.electron || !window.electron.saveFile) {
            setError("Update Required: Please restart app.");
            return;
        }

        setError("Saving..."); 

        const reader = new FileReader();
        reader.readAsDataURL(recordedBlob);
        reader.onloadend = async () => {
            const base64data = reader.result;
            try {
                const ext = mode === 'video' ? 'webm' : 'webm';
                const prefix = mode === 'video' ? 'recording' : 'meeting';

                const result = await window.electron.saveFile({ 
                    buffer: base64data,
                    defaultName: `${prefix}-${new Date().toISOString().replace(/[:.]/g, '-')}.${ext}`
                });
                
                if (result.success) {
                    setError("Saved successfully! ✅");
                    setTimeout(() => setError(null), 3000);
                } else if (result.error !== 'Cancelled') {
                    setError('Save failed: ' + result.error);
                } else {
                    setError(null); 
                }
            } catch (e) {
                setError("Save error: " + e.message);
            }
        };
    };

    const togglePlayback = () => {
        if (!audioRef.current) {
            const url = URL.createObjectURL(recordedBlob);
            const audio = new Audio(url);
            audio.onended = () => setIsPlaying(false);
            audioRef.current = audio;
        }

        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (reviewMode && recordedBlob) {
         if (mode === 'video') {
             const url = URL.createObjectURL(recordedBlob);
             return (
                <div className="flex flex-col gap-2 bg-neutral-800 p-2 absolute bottom-9 -right-16 rounded-lg border border-neutral-600 shadow-xl z-50">
                    <video src={url} controls className="w-64 rounded bg-black" />
                    <div className="flex items-center justify-between">
                        <button 
                            onClick={handleSave}
                            className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs rounded flex items-center gap-1"
                        >
                           <SaveIcon className="w-3 h-3"/> Save
                        </button>
                        <button 
                            onClick={handleDiscard}
                            className="p-1 hover:text-red-400 text-neutral-300"
                            title="Discard"
                        >
                            <StopCircleIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>
             );
         }

        return (
            <div className="flex items-center gap-2 bg-neutral-800 p-1.5 absolute bottom-9 w-fit -right-16 rounded-lg border border-neutral-600 shadow-xl">
                 <button 
                    onClick={togglePlayback}
                    className="p-1 hover:text-emerald-400 text-neutral-300" 
                    title={isPlaying ? "Pause Preview" : "Play Preview"}
                 >
                    {isPlaying ? <PauseIcon /> : <PlayIcon />}
                 </button>
                 <div className="h-4 w-[1px] bg-neutral-600 mx-1"></div>
                 <button 
                    onClick={handleSave}
                    className="p-1 hover:text-blue-400 text-neutral-300" 
                    title="Save to Disk"
                 >
                    <SaveIcon/>
                 </button>
                 <button 
                    onClick={handleTranscribe}
                    className="px-2 py-0.5 whitespace-nowrap bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded animate-pulse" 
                 >
                    ✨ Analyze
                 </button>
                 <div className="h-4 w-[1px] bg-neutral-600 mx-1"></div>
                 <button 
                    onClick={handleDiscard}
                    className="p-1 hover:text-red-400 text-neutral-300"
                 >
                    <StopCircleIcon className="w-4 h-4" />
                 </button>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2 relative">
            {error && (
                <span className="text-xs text-red-500 max-w-[150px] truncate absolute right-full mr-2" >
                    {error}
                </span>
            )}
            
            {isRecording ? (
                <div className="flex items-center gap-2 bg-red-900/30 border border-red-500/50 rounded-full pl-3 pr-1 py-1 animate-pulse z-50">
                    <span className="text-xs text-red-200 font-mono w-10">{formatTime(recordingTime)}</span>
                    <button 
                        onClick={stopRecording}
                        className="p-1 rounded-full bg-red-600 hover:bg-red-500 text-white transition-colors"
                    >
                        <StopCircleIcon />
                    </button>
                </div>
            ) : (
                <div className="flex items-center bg-neutral-800/50 rounded-full border border-neutral-700/50 overflow-hidden transition-all duration-300"
                     style={{ maxWidth: isExpanded ? '120px' : '27px' }}
                >
                    <div className={`flex items-center gap-1 px-1 transition-opacity duration-200 ${isExpanded ? 'opacity-100' : 'opacity-0 w-[0px] '}`}>
                         <button
                            onClick={() => startRecording('audio')}
                            className="p-1.5 hover:text-emerald-400 text-neutral-400 transition-colors"
                            title="Record Audio"
                        >
                            <MicIcon />
                        </button>
                        <button
                            onClick={() => startRecording('video')}
                            className="p-1.5 hover:text-emerald-400 text-neutral-400 transition-colors"
                            title="Record Video"
                        >
                            <VideoIcon />
                        </button>
                    </div>

                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className={`p-1 -translate-x-2 w-fit text-neutral-400 hover:text-white transition-transform duration-300 ${isExpanded ? 'rotate-180' : 'rotate-0'}`}
                       
                    >
                        <ChevronLeftIcon />
                    </button>
                </div>
            )}
        </div>
    );
};

export default MeetingRecorder;
