/**
 * ALSView.tsx
 * 
 * A simple Ableton Live Set (ALS) viewer component that displays MIDI and audio tracks
 * with a timeline. It supports playback synchronization and basic track controls.
 * 
 * This component is meant to be used with a parent component that fetches the ALS file,
 * audio files, and JSON-formatted project data. 
 * 
 * TODO:
 * - Fix playhead position, its not accurate and gets increasingly less accurate as time goes on
 * - Show audio waveform for audio tracks
 * - Render automation data
 * - Plugin support
 * - Track color coding
 */

import { useState, useEffect, useRef } from "react"; // React hooks
import "./ALSView.css";
import { FaPlay, FaPause, FaStepBackward, FaSearchMinus, FaSearchPlus } from "react-icons/fa"; // Icons for controls
import { motion } from "framer-motion"; // Animation library




// -------------------------------------------------
// TYPES
// -------------------------------------------------

/**
 * Project data structure
 */
interface Note {
  key: { Value: string };
  num_occurences: number;
  occurences: {
    start: string; // in beats (local or loop-based)
    duration: string; // in beats
    velocity: string;
    velocity_deviation: string;
    enabled: string;
  }[];
}

interface Loop {
  start: string; // in beats
  end: string;   // in beats
  on: string;
}

interface Event {
  start: string; // in beats (global)
  end: string;   // in beats (global)
  loop?: Loop;
  notes?: Note[];
  audio_name?: string;
  audio_file?: string;
}


interface Track {
  type: "MidiTrack" | "AudioTrack";
  id: string;
  name: string;
  volume: string;
  volumeMin: string;
  volumeMax: string;
  events: Event[];
  audio_file: string;
  audio_format: "wav" | "flac" | "mp3";
}

interface ProjectData {
  project: string;
  tempo: number;   // BPM
  tracks: Track[];
}


/**
 * ALSViewProps
 * 
 * Props for the ALSView component
 */
interface ALSViewProps {
  projectData: ProjectData;
  trackFiles: {[key: string]: string};
}

/**
 * ALSView Component
 * 
 * This component visualizes an Ableton Live Set (ALS) with MIDI and audio tracks.
 * It provides basic playback functionality with transport controls and track
 * management (mute/solo).
 * 
 * Features:
 * - Timeline visualization with measure markers
 * - MIDI note visualization with velocity-based opacity
 * - Audio track playback synchronization
 * - Mute/Solo functionality for individual tracks
 * - Zoom controls for timeline
 * - Responsive playhead that follows current playback position
 * 
 * Props:
 * - projectData: Contains all track information, tempo, and MIDI note data
 * - trackFiles: Mapping of audio filenames to blob URLs for playback
 * 
 * Height of MIDI notes depends on the entire track's note range (not velocity),
 * while velocity only affects opacity. The timeline is in beats, with optional
 * measure-based markers. Audio and timeline are synced: if the playhead moves
 * too fast, ensure we only update currentBeat in one place (the animation loop).
 * 
 * @component
 */
function ALSView({ projectData, trackFiles }: ALSViewProps) {
  // --------------------- STATE ---------------------
  const [isPlaying, setIsPlaying] = useState(false);

  // We'll store the earliest and latest beats across ALL tracks, plus each
  // track's overall MIDI note range (if any).
  const [minBeat, setMinBeat] = useState(0);
  const [maxBeat, setMaxBeat] = useState(0);
  const [totalBeats, setTotalBeats] = useState(0); // maxBeat - minBeat
  const [currentBeat, setCurrentBeat] = useState(0); // "playhead" in beats

  const [zoom, setZoom] = useState(100);

  // Mute / Solo / Active track
  const [activeTrack, setActiveTrack] = useState<number | null>(null);
  const [soloTrack, setSoloTrack] = useState<number | null>(null);
  const [mutedTracks, setMutedTracks] = useState<number[]>([]);

  // For audio loading (optional usage)
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [loadingState, setLoadingState] = useState<{ total: number; loaded: number }>({
    total: 0,
    loaded: 0,
  });

  // We'll store each MIDI track's note range in trackMidiRanges[trackIndex].
  const [trackMidiRanges, setTrackMidiRanges] = useState<{ minNote: number; maxNote: number }[]>([]);

  // --------------------- REFS ---------------------
  const audioRefs = useRef<(HTMLAudioElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number | null>(null);
  const startBeatRef = useRef<number>(0);

  // We'll store a reference to our animation frame so we can cancel it
  const animationRef = useRef<number | null>(null);
  const isPlayingRef = useRef(false);

  // BPM (beats per minute)
  const tempo = projectData.tempo || 120;
  // If you want to consider 4 beats per measure for time markers:
  const BEATS_PER_MEASURE = 4;

  // -------------- UTIL: Beats <-> Seconds --------------
  const beatsToSeconds = (b: number) => (b / tempo) * 60;
  const secondsToBeats = (s: number) => (s * tempo) / 60;

  // -------------- UTIL: Format mm:ss --------------
  const formatTime = (timeSec: number): string => {
    const minutes = Math.floor(timeSec / 60);
    const seconds = Math.floor(timeSec % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // Update the audio file sources to use the trackFiles prop
  useEffect(() => {
    // Initialize loading state
    if (projectData?.tracks) {
      setLoadingState(prev => ({
        ...prev,
        total: projectData.tracks.length
      }));
    }
  }, [projectData]);

  // Update audio element sources with the fetched track files
  useEffect(() => {
    if (audioRefs.current && projectData?.tracks) {
      console.log("Updating audio sources with track files");
      projectData.tracks.forEach((track, index) => {
        const audioEl = audioRefs.current[index];
        console.log(`Setting audio file for track: ${track.name}`);
        if (audioEl && track.audio_file) {
          console.log("audioel exists and track has audio file");
          // Get file name from track.audio_file (might be a full path)
          const fileName = track.audio_file.split('/').pop() || track.audio_file;
          
          // Look for the file in trackFiles using the track.audio_file as key
          if (trackFiles[fileName]) {
            // Set the source to the blob URL
            audioEl.src = trackFiles[fileName];
            console.log(`Set source for ${track.name} to ${fileName}`);
          } else {            
            console.warn(`No matching audio file found for track: ${track.name}, looking for: ${fileName}`);
          }
        }
      });
    }
  }, [projectData]);

  // -------------------------------------------------
  // 1) Determine minBeat & maxBeat, gather track note ranges
  // -------------------------------------------------
  useEffect(() => {
    if (!projectData?.tracks) return;

    let minB = Infinity;
    let maxB = 0;

    const newTrackRanges: { minNote: number; maxNote: number }[] = [];

    projectData.tracks.forEach((track, trackIndex) => {
      // For beats:
      if (!track.events) return;
      track.events.forEach((event) => {
        const s = parseFloat(event.start);
        const e = parseFloat(event.end);
        if (s < minB) minB = s;
        if (e > maxB) maxB = e;
      });

      // For MIDI note range:
      if (track.type === "MidiTrack") {
        let trackMin = 127;
        let trackMax = 0;

        track.events.forEach((ev) => {
          if (!ev.notes) return;
          ev.notes.forEach((n) => {
            const keyValue = parseInt(n.key.Value, 10);
            if (keyValue < trackMin) trackMin = keyValue;
            if (keyValue > trackMax) trackMax = keyValue;
          });
        });

        // Ensure at least a 12-semitone range
        if (trackMax - trackMin < 12) {
          const mid = Math.floor((trackMax + trackMin) / 2);
          trackMin = Math.max(0, mid - 6);
          trackMax = Math.min(127, mid + 6);
        }

        if (trackMin === 127) trackMin = 36; // fallback if no actual notes found
        if (trackMax === 0) trackMax = 52;   // fallback

        newTrackRanges[trackIndex] = { minNote: trackMin, maxNote: trackMax };
      } else {
        // Audio track => store dummy range
        newTrackRanges[trackIndex] = { minNote: 60, maxNote: 72 };
      }
    });

    if (minB === Infinity) minB = 0; // no events => fallback

    setMinBeat(minB);
    setMaxBeat(maxB);

    const totalB = maxB - minB;
    setTotalBeats(totalB);

    // Start the playhead at the earliest beat
    setCurrentBeat(minB);

    // Store the new track ranges
    setTrackMidiRanges(newTrackRanges);
  }, [projectData]);

  // -------------------------------------------------
  // 2) Audio onLoad
  // -------------------------------------------------
  const handleAudioLoaded = () => {
    setLoadingState((prev) => {
      const newLoaded = prev.loaded + 1;
      console.log(`Audio loaded: ${newLoaded} / ${prev.total}`);
      if (newLoaded >= prev.total) {
        setAudioLoaded(true);
      }
      return { ...prev, loaded: newLoaded };
    });
  };

  useEffect(() => {
    // Check if we've loaded all audio tracks
    if (loadingState.total > 0 && loadingState.loaded >= loadingState.total) {
      setAudioLoaded(true);
      console.log("All audio tracks loaded, setting audioLoaded to true");
    }
  }, [loadingState.loaded, loadingState.total]);

  // -------------------------------------------------
  // 3) Main animation loop -> update playhead from active audio
  // -------------------------------------------------
  const updatePlayhead = (timestamp: number) => {
    if (!isPlayingRef.current) return;

    // First time through, store start time and beat
    if (startTimeRef.current === null) {
      startTimeRef.current = timestamp;
      startBeatRef.current = currentBeat;
    }

    // Calculate elapsed time and corresponding beat position
    const elapsedMs = timestamp - startTimeRef.current;
    const elapsedSeconds = elapsedMs / 1000;
    const elapsedBeats = secondsToBeats(elapsedSeconds);
    
    // Calculate current beat based on starting beat plus elapsed beats
    let updatedBeat = startBeatRef.current + elapsedBeats;
    
    // Ensure we don't exceed maxBeat
    updatedBeat = Math.min(updatedBeat, maxBeat);
    setCurrentBeat(updatedBeat);

    // Auto-scroll the timeline so the playhead stays visible
    if (scrollContainerRef.current && timelineRef.current) {
      const scrollContainer = scrollContainerRef.current;
      const timelineWidthPx = timelineRef.current.scrollWidth;

      const fraction = (updatedBeat - minBeat) / totalBeats;
      const playheadPx = fraction * timelineWidthPx;

      const containerWidth = scrollContainer.clientWidth;
      const scrollLeft = scrollContainer.scrollLeft;

      if (playheadPx > scrollLeft + containerWidth * 0.7) {
        scrollContainer.scrollLeft = playheadPx - containerWidth * 0.3;
      } else if (playheadPx < scrollLeft + containerWidth * 0.3 && scrollLeft > 0) {
        scrollContainer.scrollLeft = Math.max(0, playheadPx - containerWidth * 0.3);
      }
    }

    // If we reach or exceed maxBeat, stop playback
    if (updatedBeat >= maxBeat) {
      stopPlayback();
      return;
    }

    // Update audio times to stay in sync with the visual playhead if needed
    const beatSec = beatsToSeconds(updatedBeat);
    const activeAudio = audioRefs.current.find(
      (audio, idx) => audio && !mutedTracks.includes(idx) && (soloTrack === null || soloTrack === idx)
    );

    if (activeAudio) {
      const audioDiff = Math.abs(activeAudio.currentTime - beatSec);
      if (audioDiff > 0.1) { // Only correct if off by more than 100ms
        audioRefs.current.forEach((audio) => {
          if (audio && !audio.paused) {
            audio.currentTime = beatSec;
          }
        });
      }
    }

    animationRef.current = requestAnimationFrame(updatePlayhead);
  };

  // -------------------------------------------------
  // 4) Start/Stop
  // -------------------------------------------------
  const startPlayback = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    setIsPlaying(true);
    isPlayingRef.current = true;
    
    // Reset timing references
    startTimeRef.current = null;
    startBeatRef.current = currentBeat;

    // Convert the current beat to seconds
    const sec = beatsToSeconds(currentBeat);

    // Attempt to play all unmuted (or soloed) tracks from that time
    const promises: Promise<void>[] = [];
    audioRefs.current.forEach((audio, idx) => {
      if (audio && !mutedTracks.includes(idx) && (soloTrack === null || soloTrack === idx)) {
        try {
          audio.currentTime = sec;
          const p = audio.play();
          if (p !== undefined) promises.push(p);
        } catch (err) {
          console.error("Audio play error:", err);
        }
      }
    });

    // Once at least one track is playing, begin the animation loop
    Promise.allSettled(promises).finally(() => {
      if (isPlayingRef.current) {
        animationRef.current = requestAnimationFrame(updatePlayhead);
      }
    });
  };

  const stopPlayback = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    startTimeRef.current = null;
    setIsPlaying(false);
    isPlayingRef.current = false;

    audioRefs.current.forEach((audio) => {
      if (audio) {
        try {
          audio.pause();
        } catch (err) {
          console.error("Audio pause error:", err);
        }
      }
    });
  };

  // -------------------------------------------------
  // 5) Timeline click => jump
  // -------------------------------------------------
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || totalBeats <= 0) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left + (scrollContainerRef.current?.scrollLeft || 0);
    const timelineWidthPx = timelineRef.current.scrollWidth;

    const fraction = offsetX / timelineWidthPx;
    
    // Calculate new beat position bounded by min and max
    const newBeatPos = Math.min(
      Math.max(minBeat, minBeat + fraction * totalBeats),
      maxBeat
    );
    
    setCurrentBeat(newBeatPos);
    startBeatRef.current = newBeatPos;
    startTimeRef.current = null;

    // Also set audio positions
    const sec = beatsToSeconds(newBeatPos);
    audioRefs.current.forEach((audio) => {
      if (audio) audio.currentTime = sec;
    });
  };

  // Keep timeline & tracks scrolled in sync horizontally
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    // If user scrolls the top timeline container, match the bottom tracks container, or vice versa
    if (target === scrollContainerRef.current && containerRef.current) {
      containerRef.current.scrollLeft = target.scrollLeft;
    } else if (target === containerRef.current && scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = target.scrollLeft;
    }
  };

  // -------------------------------------------------
  // 6) Mute / Solo
  // -------------------------------------------------
  const toggleMute = (trackIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newMutes = [...mutedTracks];
    const i = newMutes.indexOf(trackIndex);
    if (i !== -1) {
      // unmute
      newMutes.splice(i, 1);
      if (isPlaying && audioRefs.current[trackIndex] && (soloTrack === null || soloTrack === trackIndex)) {
        audioRefs.current[trackIndex]!.currentTime = beatsToSeconds(currentBeat);
        audioRefs.current[trackIndex]!.play().catch((err) => console.error("Audio playback error:", err));
      }
    } else {
      // mute
      newMutes.push(trackIndex);
      if (audioRefs.current[trackIndex]) {
        audioRefs.current[trackIndex]!.pause();
      }
    }
    setMutedTracks(newMutes);
  };

  const toggleSolo = (trackIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (soloTrack === trackIndex) {
      // unsolo
      setSoloTrack(null);
      if (isPlaying) {
        audioRefs.current.forEach((audio, idx) => {
          if (audio && !mutedTracks.includes(idx)) {
            audio.currentTime = beatsToSeconds(currentBeat);
            audio.play().catch((err) => console.error("Audio playback error:", err));
          }
        });
      }
    } else {
      // solo
      setSoloTrack(trackIndex);
      if (isPlaying) {
        audioRefs.current.forEach((audio, idx) => {
          if (!audio) return;
          if (idx === trackIndex && !mutedTracks.includes(idx)) {
            audio.currentTime = beatsToSeconds(currentBeat);
            audio.play().catch((err) => console.error("Audio playback error:", err));
          } else {
            audio.pause();
          }
        });
      }
    }
  };

  // -------------------------------------------------
  // 7) Rendering track events
  // -------------------------------------------------
  const renderTrackEvents = (track: Track, trackIndex: number) => {
    const trackMinNote = trackMidiRanges[trackIndex]?.minNote ?? 36;
    const trackMaxNote = trackMidiRanges[trackIndex]?.maxNote ?? 84;

    // Guard against undefined events
    if (!track.events || !Array.isArray(track.events)) {
      track.events = [];
    }

    return track.events.map((event, eventIndex) => {
      const eStart = parseFloat(event.start);
      const eEnd = parseFloat(event.end);

      const startLocal = eStart - minBeat;
      const endLocal = eEnd - minBeat;
      const lengthBeats = endLocal - startLocal;

      const leftFrac = startLocal / totalBeats;
      const widthFrac = lengthBeats / totalBeats;

      const leftPercent = leftFrac * 100;
      const widthPercent = widthFrac * 100;

      if (track.type === "MidiTrack") {
        return (
          <div
            key={`event-${trackIndex}-${eventIndex}`}
            className="midi-event"
            style={{
              position: "absolute",
              left: `${leftPercent}%`,
              width: `${widthPercent}%`,
              height: "100%",
              opacity: mutedTracks.includes(trackIndex) ? 0.4 : 1,
            }}
          >
            {renderMidiNotes(event, trackIndex, eventIndex, trackMinNote, trackMaxNote)}
          </div>
        );
      } else {
        // Audio track
        return (
          <div
            key={`event-${trackIndex}-${eventIndex}`}
            className="audio-event"
            style={{
              position: "absolute",
              left: `${leftPercent}%`,
              width: `${widthPercent}%`,
              height: "100%",
              opacity: mutedTracks.includes(trackIndex) ? 0.4 : 1,
            }}
            title={event.audio_name || "Audio Event"}
          >
            <span className="audio-name">{event.audio_name || "Audio Clip"}</span>
          </div>
        );
      }
    });
  };

  // -------------------------------------------------
  // 8) Rendering MIDI notes
  // -------------------------------------------------
  const renderMidiNotes = (
    event: Event,
    trackIndex: number,
    eventIndex: number,
    trackMinNote: number,
    trackMaxNote: number
  ) => {
    if (!event.notes || event.notes.length === 0) return null;

    const trackRange = trackMaxNote - trackMinNote;

    return (
      <div className="midi-notes-container" style={{ position: "absolute", width: "100%", height: "100%" }}>
        {event.notes.map((note, noteIdx) => {
          const keyValue = parseInt(note.key.Value, 10);
          // figure out the vertical position
          const relPosition = trackRange <= 0 ? 0 : (keyValue - trackMinNote) / trackRange;
          const topPercent = (1 - relPosition) * 100;

          return note.occurences.map((occ, occIdx) => {
            if (occ.enabled === "false") return null;
            const velocity = parseFloat(occ.velocity);
            const noteOpacity = Math.max(0.2, velocity / 127);

            // local start/duration in beats
            const eStart = parseFloat(event.start);
            const eEnd = parseFloat(event.end);
            const eventLengthBeats = eEnd - eStart;

            const occStartBeats = parseFloat(occ.start);
            const occDurBeats = parseFloat(occ.duration);

            const leftFrac = eventLengthBeats > 0 ? occStartBeats / eventLengthBeats : 0;
            const widthFrac = eventLengthBeats > 0 ? occDurBeats / eventLengthBeats : 0;

            const leftPercent = leftFrac * 100;
            const widthPercent = widthFrac * 100;

            // We'll set a small band for each note
            const maxPercentHeight = 20;
            const baseHeight = trackRange <= 0 ? 5 : 100 / trackRange;
            const finalHeight = Math.min(baseHeight, maxPercentHeight);

            return (
              <motion.div
                initial={{ opacity: 0, scaleX: 0, transformOrigin: "0 50%" }}
                transition={{ duration: 0.3, delay: 0.2 + 0.1 * occStartBeats - 0.1 * noteIdx + trackIndex * 0.1, ease: "easeOut" }}
                animate={{ opacity: 1, scaleX: 1 }}

                key={`note-${trackIndex}-${eventIndex}-${noteIdx}-${occIdx}`}
                className="midi-note"
                style={{
                  position: "absolute",
                  left: `${leftPercent}%`,
                  width: `${widthPercent}%`,
                  top: `${topPercent - finalHeight}%`,
                  height: `${finalHeight}%`,
                  backgroundColor: "rgba(147, 0, 215, 1)",
                  opacity: noteOpacity,
                  border: "1px solid rgba(200, 120, 255, 0.7)",
                  borderRadius: "2px",
                }}
                title={`Note: ${keyValue}, Vel: ${velocity.toFixed(1)}`}
              />
            );
          });
        })}
      </div>
    );
  };

  // -------------------------------------------------
  // 9) Audio load and cleanup
  // -------------------------------------------------
  useEffect(() => {
    const loadedDataHandlers: { [key: number]: EventListener } = {};

    audioRefs.current.forEach((audio, idx) => {
      if (!audio) return;

      // Only attach loadeddata or canplay events
      const loadHandler = () => handleAudioLoaded();
      loadedDataHandlers[idx] = loadHandler;

      audio.addEventListener("loadeddata", loadHandler);
    });

    return () => {
      audioRefs.current.forEach((audio, idx) => {
        if (!audio) return;
        const lh = loadedDataHandlers[idx];
        if (lh) {
          audio.removeEventListener("loadeddata", lh);
        }
      });
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      audioRefs.current.forEach((audio) => {
        if (audio) audio.pause();
      });
    };
  }, []);

  // -------------------------------------------------
  // 10) Markers along the timeline
  // -------------------------------------------------
  const renderTimelineMarkers = () => {
    if (totalBeats <= 0) return null;

    // We'll do measure-based markers:
    const totalMeasures = (maxBeat - minBeat) / BEATS_PER_MEASURE;
    const measureCount = Math.ceil(totalMeasures);

    const markers = [];
    for (let m = 0; m <= measureCount; m++) {
      const fraction = m / totalMeasures;
      const leftPct = fraction * 100;
      markers.push(
        <div
          key={`marker-${m}`}
          className={`timeline-marker ${m % 4 === 0 ? "major" : ""}`}
          style={{ left: `${leftPct}%` }}
        >
          <div className="marker-line"></div>
          <span className="marker-time">{m}</span>
        </div>
      );
    }
    return markers;
  };

  // -------------------------------------------------
  // 11) Playhead position
  // -------------------------------------------------
  let playheadLeftPercent = 0;
  if (totalBeats > 0) {
    // Ensure currentBeat stays between minBeat and maxBeat
    const boundedBeat = Math.min(Math.max(currentBeat, minBeat), maxBeat);
    const fraction = (boundedBeat - minBeat) / totalBeats;
    playheadLeftPercent = fraction * 100;
  }

  // For display
  const currentSec = beatsToSeconds(currentBeat);
  const totalSec = beatsToSeconds(maxBeat - minBeat);

  // -------------------------------------------------
  // RENDER
  // -------------------------------------------------
  return (
    <div className="als-view-container">
      <div className="als-view-header">
        <div className="project-info">
          <h2>{projectData.project}.als</h2>
          <div className="tracks-count">{projectData.tracks.length} tracks</div>
        </div>
        <div className="tempo-display" style = {{
            animation: `${isPlaying ? "pulse " + (60/tempo) + "s infinite" : "none"}`,
            animationTimingFunction: "linear"
          }}>
          <svg className="beat-icon" width="18" height="18" viewBox="0 0 24 24">
            <path fill="currentColor" d="M3,12H6V19H9V12H12V19H15V12H18V19H21V12H24V9H21V2H18V9H15V2H12V9H9V2H6V9H3V12Z" />
          </svg>
          <span className="tempo">{Math.round(tempo)}</span>
          <span className="bpm">Tempo</span>
        </div>

        <div className="transport-controls">
          <button
            className="transport-btn"
            onClick={() => {
              // Jump to start
              setCurrentBeat(minBeat);
              startBeatRef.current = minBeat;
              startTimeRef.current = null;
              
              const sec = beatsToSeconds(minBeat);
              audioRefs.current.forEach((audio) => {
                if (audio) audio.currentTime = sec;
              });
              if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollLeft = 0;
              }
            }}
          >
            <FaStepBackward />
          </button>

          <button
            className={`transport-btn play-btn ${isPlaying ? "playing" : ""}`}
            onClick={isPlaying ? stopPlayback : startPlayback}
          >
            {isPlaying ? <FaPause /> : <FaPlay />}
          </button>

          <div className="time-display">
            <span>{formatTime(currentSec)}</span>
            <span className="time-divider">/</span>
            <span>{formatTime(totalSec)}</span>
          </div>

          <div className="zoom-controls">
            <button className="transport-btn" onClick={() => setZoom(Math.max(50, zoom - 10))}>
              <FaSearchMinus />
            </button>
            <span className="zoom-value">{zoom}%</span>
            <button className="transport-btn" onClick={() => setZoom(Math.min(300, zoom + 10))}>
              <FaSearchPlus />
            </button>
          </div>
        </div>
      </div>

      {/* Content wrapper for timeline + tracks + extended playhead */}
      <div className="als-view-content" ref={contentRef}>
        {/* The extended playhead line going from timeline down through tracks */}
        <div
          className="extended-playhead"
          style={{
            left: `calc(200px + ${playheadLeftPercent}% * ${zoom / 100} - ${
              scrollContainerRef.current?.scrollLeft || 0
            }px)`,
          }}
        />

        {/* TIMELINE */}
        <div className="timeline-scroll-container" ref={scrollContainerRef} onScroll={handleScroll}>
          <div className="timeline" ref={timelineRef} onClick={handleTimelineClick} style={{ width: `${zoom}%` }}>
            {renderTimelineMarkers()}
          </div>
        </div>

        {/* TRACKS */}
        <div className="tracks-scroll-container" onScroll={handleScroll}>
          <div className="tracks-container" ref={containerRef} style={{ width: `${zoom}%` }}>
            {projectData.tracks.map((track, trackIndex) => (
              <motion.div
              initial={{ opacity: 0, y: 0 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.15 * trackIndex }}
              key={`track-${track.id}`}
              className={`track ${
                activeTrack === trackIndex ? "active" : ""
              } ${mutedTracks.includes(trackIndex) ? "muted" : ""} ${
                soloTrack === trackIndex ? "solo" : ""
              }`}
              onClick={() => setActiveTrack(trackIndex)}
            >
                <div className="track-header">
                  <div className="track-info">
                    <span className="track-number">{trackIndex + 1}</span>
                    <h3 className="track-name">{track.name}</h3>
                    <span className={`track-type ${track.type === "MidiTrack" ? "midi" : "audio"}`}>
                      {track.type === "MidiTrack" ? "MIDI" : "Audio"}
                    </span>
                  </div>
                  <div className="track-controls">
                    <button
                      className={`track-btn mute-btn ${mutedTracks.includes(trackIndex) ? "active" : ""}`}
                      onClick={(e) => toggleMute(trackIndex, e)}
                      title="Mute track"
                    >
                      M
                    </button>
                    <button
                      className={`track-btn solo-btn ${soloTrack === trackIndex ? "active" : ""}`}
                      onClick={(e) => toggleSolo(trackIndex, e)}
                      title="Solo track"
                    >
                      S
                    </button>
                  </div>
                </div>

                <div className="track-content" style={{ position: "relative" }}>
                  {renderTrackEvents(track, trackIndex)}
                </div>

                <audio
                  ref={(el) => (audioRefs.current[trackIndex] = el)}
                  preload="auto"
                  onEnded={() => {
                    // If no other track is still playing, stop
                    const anyStillPlaying = audioRefs.current.some((audio, idx) => {
                      return (
                        audio &&
                        idx !== trackIndex &&
                        !audio.paused &&
                        !mutedTracks.includes(idx) &&
                        (soloTrack === null || soloTrack === idx)
                      );
                    });
                    if (!anyStillPlaying) {
                      stopPlayback();
                      setCurrentBeat(minBeat);
                    }
                  }}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ALSView;