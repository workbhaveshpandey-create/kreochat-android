import React, { useState, useRef, useEffect } from 'react';
import { MdPlayArrow, MdPause } from 'react-icons/md';

interface AudioPlayerProps {
    src: string;
    isMe: boolean;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ src, isMe }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const setAudioData = () => {
            setDuration(audio.duration);
            setCurrentTime(audio.currentTime);
        };

        const setAudioTime = () => setCurrentTime(audio.currentTime);
        const handleEnded = () => setIsPlaying(false);

        // Events
        audio.addEventListener('loadeddata', setAudioData);
        audio.addEventListener('timeupdate', setAudioTime);
        audio.addEventListener('ended', handleEnded);

        return () => {
            audio.removeEventListener('loadeddata', setAudioData);
            audio.removeEventListener('timeupdate', setAudioTime);
            audio.removeEventListener('ended', handleEnded);
        };
    }, []);

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!audioRef.current) return;
        const time = Number(e.target.value);
        audioRef.current.currentTime = time;
        setCurrentTime(time);
    };

    const formatTime = (seconds: number) => {
        if (!seconds || isNaN(seconds)) return "0:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    // Dynamic colors based on who sent the message
    const theme = isMe
        ? {
            icon: "text-md-primary bg-white",
            text: "text-md-on-primary",
            slider: "accent-white bg-white/30"
        }
        : {
            icon: "text-white bg-md-primary",
            text: "text-md-on-surface",
            slider: "accent-md-primary bg-md-primary/20"
        };

    return (
        <div className="flex items-center gap-3 w-full min-w-[220px] max-w-[280px] py-1">
            <audio ref={audioRef} src={src} preload="metadata" />

            <button
                onClick={togglePlay}
                className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-sm transition-transform active:scale-95 text-xl ${theme.icon}`}
            >
                {isPlaying ? <MdPause /> : <MdPlayArrow />}
            </button>

            <div className="flex-1 flex flex-col justify-center gap-1">
                <input
                    type="range"
                    min="0"
                    max={duration || 0}
                    value={currentTime}
                    onChange={handleSeek}
                    className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer ${theme.slider}`}
                />
                <div className={`flex justify-between text-[10px] font-medium opacity-80 ${theme.text}`}>
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>
        </div>
    );
};

export default AudioPlayer;
