import { useEffect, useRef, useState } from "react";
import { FaPause, FaPlay } from "react-icons/fa";
import "./NativeAudioPlayer.css";

type NativeAudioPlayerProps = {
  src: string;
  label: string;
};

const fallbackPeaks = Array.from({ length: 68 }, (_, index) => {
  const wave = Math.abs(Math.sin(index * 1.71) + Math.cos(index * 0.43));
  return 18 + Math.round(wave * 50);
});

export default function NativeAudioPlayer({ src, label }: NativeAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [peaks, setPeaks] = useState<number[]>(fallbackPeaks);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let alive = true;
    const context = new AudioContext();

    fetch(src, { credentials: "include" })
      .then((response) => response.ok ? response.arrayBuffer() : Promise.reject())
      .then((buffer) => context.decodeAudioData(buffer))
      .then((buffer) => {
        if (!alive) return;
        const channel = buffer.getChannelData(0);
        const slice = Math.max(1, Math.floor(channel.length / 68));
        const nextPeaks = Array.from({ length: 68 }, (_, index) => {
          let peak = 0;
          const start = index * slice;
          for (let sample = start; sample < Math.min(start + slice, channel.length); sample += 32) {
            peak = Math.max(peak, Math.abs(channel[sample] || 0));
          }
          return Math.max(12, Math.round(peak * 100));
        });
        setPeaks(nextPeaks);
      })
      .catch(() => undefined)
      .finally(() => context.close());

    return () => { alive = false; context.close().catch(() => undefined); };
  }, [src]);

  const togglePlayback = async (event: React.MouseEvent) => {
    event.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;
    try {
      if (audio.paused) await audio.play();
      else audio.pause();
    } catch {
      setUnavailable(true);
    }
  };

  const seek = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    audio.currentTime = Math.max(0, Math.min(duration, ((event.clientX - bounds.left) / bounds.width) * duration));
  };

  const format = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
  const playedBars = Math.round(progress * peaks.length);

  return (
    <div className="native-audio-player" onClick={(event) => event.stopPropagation()}>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
        onTimeUpdate={(event) => setProgress(event.currentTarget.duration ? event.currentTarget.currentTime / event.currentTarget.duration : 0)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => { setIsPlaying(false); setProgress(0); }}
        onError={() => setUnavailable(true)}
      />
      <button className="native-audio-play" onClick={togglePlayback} aria-label={`${isPlaying ? "Pause" : "Play"} ${label}`}>
        {isPlaying ? <FaPause /> : <FaPlay />}
      </button>
      <div className="native-audio-wave" onClick={seek} role="slider" aria-label={`Seek ${label}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} tabIndex={0}>
        <div className="native-audio-bars">
          {peaks.map((height, index) => <i key={index} className={index < playedBars ? "played" : ""} style={{ height: `${height}%` }} />)}
        </div>
        <div className="native-audio-playhead" style={{ left: `${progress * 100}%` }} />
      </div>
      <span className="native-audio-time">{unavailable ? "PREVIEW SOON" : `${format((audioRef.current?.currentTime) || 0)} / ${duration ? format(duration) : "--:--"}`}</span>
    </div>
  );
}
