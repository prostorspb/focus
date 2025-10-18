import React, { useState, useRef, useEffect, useCallback } from 'react';
import { InteractionMode, Note } from '../types';
import { CameraIcon, MicrophoneIcon, XCircleIcon, ChevronUpIcon, ChevronDownIcon } from './icons';

// Adaptive thresholds based on viewport height
const DRAG_THRESHOLD_1 = window.innerHeight * 0.15;
const DRAG_THRESHOLD_2 = window.innerHeight * 0.30;
// Define a warning zone starting at 80% of the way to the final threshold
const WARNING_ZONE_START = DRAG_THRESHOLD_2 * 0.8;


const playClickSound = () => {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.1);
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.1);
};

const hapticFeedback = {
  light: () => navigator.vibrate?.(20), // For crossing the first threshold
  medium: () => navigator.vibrate?.(50), // For crossing the second threshold
  heavy: () => navigator.vibrate?.(100), // For confirming the final action
  warning: () => navigator.vibrate?.([30, 40, 30]), // Warning when approaching final threshold
};

const useWakeLock = () => {
    const wakeLockRef = useRef<WakeLockSentinel | null>(null);

    const requestWakeLock = useCallback(async () => {
        if ('wakeLock' in navigator) {
            try {
                wakeLockRef.current = await navigator.wakeLock.request('screen');
            } catch (err) {
                console.error(`Failed to acquire wake lock: ${err}`);
            }
        }
    }, []);

    const releaseWakeLock = useCallback(() => {
        if (wakeLockRef.current) {
            wakeLockRef.current.release();
            wakeLockRef.current = null;
        }
    }, []);

    return { requestWakeLock, releaseWakeLock };
};

interface InteractionZoneProps {
    addNote: (note: Omit<Note, 'id' | 'timestamp'>) => void;
}

export const InteractionZone: React.FC<InteractionZoneProps> = ({ addNote }) => {
    const [mode, setMode] = useState<InteractionMode>(InteractionMode.Text);
    const [text, setText] = useState('');
    const [y, setY] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const { requestWakeLock, releaseWakeLock } = useWakeLock();

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    
    // Ref to track feedback state during a single drag, preventing repeated triggers
    const feedbackState = useRef({
        crossedT1: false,
        crossedWarning: false,
        crossedT2: false,
    });
    
    const stopAllMediaStreams = useCallback(() => {
        if (videoRef.current?.srcObject) {
            (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        if (mediaRecorderRef.current && mediaRecorderRef.current.stream) {
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
    }, []);

    const resetState = useCallback(() => {
        setY(0);
        setMode(InteractionMode.Text);
        stopAllMediaStreams();
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        releaseWakeLock();
    }, [releaseWakeLock, stopAllMediaStreams]);

    const handlePermissions = useCallback(async (type: 'audio' | 'video') => {
        try {
            const constraints: MediaStreamConstraints = type === 'video'
                ? { video: { facingMode: 'environment' }, audio: false }
                : { audio: true, video: false };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            
            if (type === 'video' && videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            return stream;
        } catch (error) {
            console.error(`Error accessing ${type}:`, error);
            alert(`Could not access ${type}. Please check permissions.`);
            resetState();
            return null;
        }
    }, [resetState]);

    const capturePhoto = useCallback(() => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        if (context) {
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg');
            addNote({ type: 'image', content: dataUrl });
        }
        resetState();
    }, [addNote, resetState]);

    const startRecording = useCallback(async () => {
        const stream = await handlePermissions('audio');
        if (!stream) return;
        
        requestWakeLock();

        const options = {
            mimeType: 'audio/webm;codecs=opus'
        };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            // Fallback for browsers that don't support webm/opus (like Safari)
            options.mimeType = 'audio/mp4;codecs=aac';
             if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                 alert('Audio recording is not supported on this browser.');
                 resetState();
                 return;
             }
        }

        mediaRecorderRef.current = new MediaRecorder(stream, options);
        audioChunksRef.current = [];
        mediaRecorderRef.current.ondataavailable = (event) => {
            audioChunksRef.current.push(event.data);
        };
        mediaRecorderRef.current.onstop = () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: options.mimeType });
            const reader = new FileReader();
            reader.onloadend = () => {
                addNote({ type: 'audio', content: reader.result as string });
            };
            reader.readAsDataURL(audioBlob);
            
            stream.getTracks().forEach(track => track.stop());
            resetState();
        };
        mediaRecorderRef.current.start();
        setMode(InteractionMode.Recording);
    }, [addNote, handlePermissions, resetState, requestWakeLock]);
    
    const stopRecording = useCallback(() => {
         if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            mediaRecorderRef.current.stop(); // onstop handler will do the rest
        }
    }, []);

    useEffect(() => {
        if (mode === InteractionMode.CameraReady || mode === InteractionMode.Capturing) {
            requestWakeLock();
            handlePermissions('video').then((stream) => {
                if(stream && mode === InteractionMode.Capturing) {
                    setTimeout(capturePhoto, 300);
                }
            });
        }
        return () => {
             if (mode === InteractionMode.CameraReady || mode === InteractionMode.Capturing) {
                stopAllMediaStreams();
                releaseWakeLock();
             }
        }
    }, [mode, handlePermissions, capturePhoto, requestWakeLock, releaseWakeLock, stopAllMediaStreams]);

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (mode !== InteractionMode.Text || (e.target as HTMLElement).tagName === 'TEXTAREA' || (e.target as HTMLElement).tagName === 'BUTTON') return;
        // Reset feedback state at the beginning of a drag
        feedbackState.current = { crossedT1: false, crossedWarning: false, crossedT2: false };
        setIsDragging(true);
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDragging) return;
        setY(prevY => {
            const newY = prevY + e.movementY;
            const absY = Math.abs(newY);
            const { crossedT1, crossedWarning, crossedT2 } = feedbackState.current;

            // Threshold 1
            if (absY > DRAG_THRESHOLD_1 && !crossedT1) {
                hapticFeedback.light();
                playClickSound();
                feedbackState.current.crossedT1 = true;
            } else if (absY <= DRAG_THRESHOLD_1 && crossedT1) {
                feedbackState.current.crossedT1 = false;
            }

            // Warning Zone before Threshold 2
            if (absY > WARNING_ZONE_START && !crossedWarning) {
                hapticFeedback.warning();
                feedbackState.current.crossedWarning = true;
            } else if (absY <= WARNING_ZONE_START && crossedWarning) {
                 feedbackState.current.crossedWarning = false;
            }

            // Threshold 2
            if (absY > DRAG_THRESHOLD_2 && !crossedT2) {
                hapticFeedback.medium();
                playClickSound();
                feedbackState.current.crossedT2 = true;
            } else if (absY <= DRAG_THRESHOLD_2 && crossedT2) {
                 feedbackState.current.crossedT2 = false;
            }
            
            return newY;
        });
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDragging) return;
        setIsDragging(false);
        e.currentTarget.releasePointerCapture(e.pointerId);

        if (y < -DRAG_THRESHOLD_2) {
            hapticFeedback.heavy();
            setMode(InteractionMode.Capturing);
        } else if (y < -DRAG_THRESHOLD_1) {
            setMode(InteractionMode.CameraReady);
        } else if (y > DRAG_THRESHOLD_2) {
            hapticFeedback.heavy();
            startRecording();
        } else if (y > DRAG_THRESHOLD_1) {
            setMode(InteractionMode.AudioReady);
        } else {
            setY(0);
        }
    };
    
    const handleTextSubmit = () => {
        if (text.trim()) {
            addNote({ type: 'text', content: text.trim() });
            setText('');
        }
    };

    const renderContent = () => {
        switch (mode) {
            case InteractionMode.CameraReady:
            case InteractionMode.Capturing:
                return (
                    <div className="w-full h-full bg-black flex flex-col items-center justify-center relative">
                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" muted></video>
                        <canvas ref={canvasRef} className="hidden"></canvas>
                        {mode === InteractionMode.CameraReady && (
                            <button onClick={capturePhoto} className="absolute bottom-6 bg-white rounded-full p-4 border-4 border-gray-500 hover:bg-gray-200 transition-colors">
                                <CameraIcon className="w-10 h-10 text-gray-800" />
                            </button>
                        )}
                        <button onClick={resetState} className="absolute top-4 right-4 bg-black/50 text-white rounded-full p-2">
                             <XCircleIcon className="w-8 h-8"/>
                        </button>
                    </div>
                );
            case InteractionMode.AudioReady:
                return (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                        <button onClick={startRecording} className="bg-red-500 rounded-full p-6 animate-pulse hover:animate-none transition-transform hover:scale-110">
                            <MicrophoneIcon className="w-16 h-16 text-white" />
                        </button>
                         <button onClick={resetState} className="absolute top-4 right-4 bg-black/50 text-white rounded-full p-2">
                             <XCircleIcon className="w-8 h-8"/>
                        </button>
                    </div>
                );
            case InteractionMode.Recording:
                 return (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                        <button onClick={stopRecording} className="bg-red-600 rounded-full p-6 relative">
                            <MicrophoneIcon className="w-16 h-16 text-white" />
                             <div className="absolute inset-0 rounded-full border-4 border-red-400 animate-ping"></div>
                        </button>
                        <p className="mt-4 text-lg">Recording...</p>
                    </div>
                );
            case InteractionMode.Text:
            default:
                return (
                    <div className="w-full h-full flex flex-col items-center justify-center relative">
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center text-gray-500 animate-pulse">
                            <ChevronUpIcon className="w-6 h-6" />
                            <span className="text-sm">Photo</span>
                        </div>
                        <div className="w-full flex flex-col items-center px-4">
                            <textarea
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                placeholder="Type a thought..."
                                className="bg-transparent text-white text-xl text-center w-full resize-none focus:outline-none"
                                rows={1}
                            />
                            {text && (
                                <button onClick={handleTextSubmit} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-full hover:bg-blue-700 transition-colors">
                                    Save
                                </button>
                            )}
                        </div>
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center text-gray-500 animate-pulse">
                            <span className="text-sm">Voice</span>
                            <ChevronDownIcon className="w-6 h-6" />
                        </div>
                    </div>
                );
        }
    };
    
    const isExpanded = mode !== InteractionMode.Text || isDragging;
    const height = isExpanded ? '100vh' : '33vh';
    const top = isExpanded ? '0' : '50%';
    const baseTranslate = isExpanded ? '0' : '-50%';
    const dragOffset = mode === InteractionMode.Text ? `${y}px` : '0px';

    return (
        <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="absolute left-0 w-full bg-gray-900 touch-none flex items-center justify-center z-10"
            style={{
                height,
                top,
                transform: `translateY(calc(${baseTranslate} + ${dragOffset}))`,
                transition: isDragging ? 'none' : 'all 0.3s ease-out',
            }}
        >
           <div className="w-full max-w-md mx-auto h-full flex items-center justify-center relative">
             {renderContent()}
           </div>
        </div>
    );
};