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
import { ProjectData, Track, Event } from "../../types/ProjectData"; // Types for project data
import Tooltip from "../Tooltip/Tooltip";




// -------------------------------------------------
// TYPES
// -------------------------------------------------

/**
 * Project data structure
 */



/**
 * ALSViewProps
 * 
 * Props for the ALSView component
 */
interface ALSViewProps {
  projectData: ProjectData;
  trackFiles: {[key: string]: string};
  latestUpdate?: any; // Add this line
  isLoadingAudio?: boolean;
  audioLoadingProgress?: number;
  setIsLoadingAudio?: (loading: boolean) => void;
  setAudioLoadingProgress?: (progress: number) => void;
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

function ALSView({ projectData, trackFiles, latestUpdate. isLoadingAudio, audioLoadingProgress, setIsLoadingAudio, setAudioLoadingProgress }: ALSViewProps) {

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

  useEffect(() => {
    if(audioLoaded) {
      setIsLoadingAudio(false);
    }
  }, [audioLoaded]);

  // Update audio element sources with the fetched track files 
  useEffect(() => {
    if (audioRefs.current && projectData?.tracks) {
      console.log("Updating audio sources with track files");
      console.log("Available track files:", Object.keys(trackFiles));
      
      projectData.tracks.forEach((track, index) => {
        const audioEl = audioRefs.current[index];
        console.log(`Setting up track ${index}: ${track.name}`);
        
        if (audioEl && track.audio_file) {
          // Get file name from track.audio_file (might be a full path)
          const fileName = track.audio_file.split('/').pop() || track.audio_file;
          
          // Look for the file in trackFiles using the track.audio_file as key
          if (trackFiles[fileName]) {
            // Set the source to the blob URL
            audioEl.src = trackFiles[fileName];
            console.log(`✓ Set source for ${track.name} to ${fileName}`);
            
            // Add a canplaythrough event to verify the audio can be played
            audioEl.addEventListener('canplaythrough', () => {
              console.log(`Audio for track ${track.name} is ready to play through`);
            });
            
            // Check for errors
            audioEl.addEventListener('error', (e) => {
              console.error(`Error loading audio for track ${track.name}:`, e);
            });
          } else {            
            console.warn(`❌ No matching audio file found for track: ${track.name}, looking for: ${fileName}`);
            console.log(`Available files: ${Object.keys(trackFiles).join(', ')}`);
          }
        } else if (!audioEl) {
          console.warn(`No audio element reference for track ${index}`);
        } else if (!track.audio_file) {
          console.log(`Track ${track.name} has no audio_file property`);
        }
      });
    }
  }, [projectData, trackFiles]);

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
  
    // Debug: Check how many audio elements are available
    console.log(`Attempting to play ${audioRefs.current.length} audio tracks`);
    
    // Count how many tracks are actually playable
    let playableCount = 0;
    audioRefs.current.forEach((audio, idx) => {
      if (audio && !mutedTracks.includes(idx) && (soloTrack === null || soloTrack === idx)) {
        playableCount++;
      }
    });
    console.log(`Found ${playableCount} playable tracks`);
  
    // Try to play all unmuted (or soloed) tracks
    const promises: Promise<void>[] = [];
    audioRefs.current.forEach((audio, idx) => {
      if (audio && !mutedTracks.includes(idx) && (soloTrack === null || soloTrack === idx)) {
        try {
          // Check if the audio has a valid source
          if (!audio.src) {
            console.warn(`Track ${idx} has no audio source`);
            return;
          }
          
          // Log the attempt
          console.log(`Attempting to play track ${idx} from time ${sec}s`);
          
          // Set the current time
          audio.currentTime = sec;
          
          // Try to play and catch any errors
          const p = audio.play()
            .catch((err) => {
              console.error(`Audio play error for track ${idx}:`, err);
              // Try one more time with user interaction
              if (err.name === "NotAllowedError") {
                console.log("Autoplay prevented. Will try again on next user interaction.");
              }
            });
          
          if (p !== undefined) promises.push(p);
        } catch (err) {
          console.error(`Unexpected error playing track ${idx}:`, err);
        }
      }
    });
  
    // Begin the animation loop even if audio fails
    // This ensures the playhead moves even if audio can't play
    animationRef.current = requestAnimationFrame(updatePlayhead);
  
    // Once at least one track is playing or all have failed, log the result
    Promise.allSettled(promises).then(results => {
      const fulfilled = results.filter(r => r.status === 'fulfilled').length;
      console.log(`Successfully started playback for ${fulfilled}/${promises.length} audio tracks`);
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

  // Add this function inside ALSView component
  const getTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 30) return `${diffDays}d ago`;
    
    const diffMonths = Math.floor(diffDays / 30);
    return `${diffMonths}mo ago`;
  };

  // Add this function inside ALSView component
  const getChangeStats = (update: any) => {
    // First try to extract Track-Changes from the commit body
    try {
      if (update.body) {
        const trackChangesMatch = update.body.match(/Track-Changes: ({.+})/s);
        if (trackChangesMatch && trackChangesMatch[1]) {
          const trackChanges = JSON.parse(trackChangesMatch[1]);
          
          const addedCount = trackChanges.added?.length || 0;
          const modifiedCount = trackChanges.modified?.length || 0;
          const removedCount = trackChanges.removed?.length || 0;
          
          if (addedCount + modifiedCount + removedCount > 0) {
            return (
              <div className="change-stats">
                {addedCount > 0 && (
                  <span className="stat-badge added">
                    <span className="stat-icon">+</span>
                    <span className="stat-count">{addedCount}</span>
                  </span>
                )}
                {modifiedCount > 0 && (
                  <span className="stat-badge modified">
                    <span className="stat-icon">•</span>
                    <span className="stat-count">{modifiedCount}</span>
                  </span>
                )}
                {removedCount > 0 && (
                  <span className="stat-badge removed">
                    <span className="stat-icon">-</span>
                    <span className="stat-count">{removedCount}</span>
                  </span>
                )}
              </div>
            );
          }
        }
      }
    } catch (error) {
      console.warn("Error parsing Track-Changes JSON:", error);
    }
    
    // Fall back to regex pattern matching from the message
    const trackPattern = /(\d+)\s+(added|removed|modified)\s+tracks?/gi;
    const matches = [...(update.message.matchAll(trackPattern) || [])];
  
    if (matches.length) {
      return (
        <div className="change-stats">
          {matches.map((match, i) => {
            const [, count, type] = match;
            const icon = type === 'added' ? '+' : 
                      type === 'removed' ? '-' : '•';
            const className = `stat-badge ${type}`;
            return (
              <span key={i} className={className}>
                <span className="stat-icon">{icon}</span>
                <span className="stat-count">{count}</span>
              </span>
            );
          })}
        </div>
      );
    }
    
    // If no specific stats found, show a brief excerpt of the message
    return <span className="commit-excerpt">
      <span style ={{opacity: 0.5, marginRight: "5px", color: "#fff"}}>•</span>
      {update.message.slice(0, 50)}{update.message.length > 50 ? '...' : ''}
      </span>;
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
            <div className="audio-clip-info">
              <div className="audio-waveform">
                {/* Generate fake waveform visualization */}
                {Array.from({ length: 20 }).map((_, i) => {
                  // Create a deterministic "random" height based on track, event, and bar position
                  const seed = (trackIndex * 1000) + (eventIndex * 100) + i;
                  const pseudoRandom = Math.sin(seed) * 0.5 + 0.5; // value between 0-1
                  const height = 20 + pseudoRandom * 60;
                  
                  return (
                    <div 
                      key={`wave-${trackIndex}-${eventIndex}-${i}`} 
                      className="waveform-bar"
                      style={{ 
                        height: `${height}%`,
                        backgroundColor: `rgba(33, 150, 243, ${0.3 + pseudoRandom * 0.5})` // vary opacity for depth
                      }}
                    />
                  );
                })}
              </div>
              <span className="audio-name">{event.audio_name || "Audio Clip"}</span>
            </div>
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
        <div className="tempo-display" style={{
          animation: `${isPlaying ? "pulse " + (60/tempo) + "s infinite" : "none"}`,
          animationTimingFunction: "linear"
        }}>
          <svg className="beat-icon" width="18" height="18" viewBox="0 0 24 24">
            <path fill="currentColor" d="M3,12H6V19H9V12H12V19H15V12H18V19H21V12H24V9H21V2H18V9H15V2H12V9H9V2H6V9H3V12Z" />
          </svg>
          <span className="tempo">{Math.round(tempo)}</span>
          <span className="bpm">Tempo</span>
        </div>

        {latestUpdate && (
          <div className="latest-update-indicator">
            <img 
              src={`https://avatars.githubusercontent.com/u/${latestUpdate.body.match(/User-ID: (.+)$/s)?.[1].substring(0, latestUpdate.body.match(/User-ID: (.+)$/s)?.[1].indexOf("\n") ).trim() || latestUpdate.author_name}?v=4`}  
              alt="Author" 
              className="update-avatar"
              onError={(e) => {(e.target as HTMLImageElement).src = 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png'}}
            />
            <div className="update-content">
              <div className="update-info">
                <span className="update-author">{latestUpdate.author_name.split('<')[0].trim()}</span>
                <span className="update-time">{getTimeAgo(new Date(latestUpdate.date))}</span>
              </div>
              <div className="update-summary">
                {getChangeStats(latestUpdate)}
              </div>
            </div>
          </div>
        )}

        <div className="transport-controls">
        <Tooltip content="Go to beginning of project" position="bottom">
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
          </Tooltip>

          <Tooltip content={isLoadingAudio ? `Loading audio files (${audioLoadingProgress}%)` : isPlaying ? "Pause playback" : "Start playback"} position="bottom">
            <button
              className={`transport-btn play-btn ${isPlaying ? "playing" : ""} ${isLoadingAudio ? "loading" : ""}`}
              onClick={isPlaying ? stopPlayback : startPlayback}
              disabled={isLoadingAudio && audioLoadingProgress < 100}
            >
              {isLoadingAudio ? (
                <div className="loading-indicator">
                  <div className="circular-progress" style={{ 
                    backgroundImage: `conic-gradient(#9300D7 ${audioLoadingProgress}%, rgba(147, 0, 215, 0.2) 0%)` 
                  }}></div>
                  <FaPlay className="play-icon" />
                </div>
              ) : isPlaying ? (
                <FaPause />
              ) : (
                <FaPlay />
              )}
            </button>
          </Tooltip>

          {/* <Tooltip content={isPlaying ? "Pause playback" : "Start playback"} position="bottom">
            <button
              className={`transport-btn play-btn ${isPlaying ? "playing" : ""}`}
              onClick={isPlaying ? stopPlayback : startPlayback}
            >
              {isPlaying ? <FaPause /> : <FaPlay />}
            </button>
          </Tooltip> */}

          <Tooltip content="Current time / Total duration" position="bottom">
            <div className="time-display">
              <span>{formatTime(currentSec)}</span>
              <span className="time-divider">/</span>
              <span>{formatTime(totalSec)}</span>
            </div>
          </Tooltip>

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

        {/* TIMELINE */}

        {/* TRACKS */}
        <div className="tracks-scroll-container" onScroll={handleScroll}>
          {/* <div className="timeline-scroll-container" ref={scrollContainerRef} onScroll={handleScroll}> */}
            {/* The extended playhead line going from timeline down through tracks */}
            <div className="timeline" ref={timelineRef} onClick={handleTimelineClick} style={{ width: `calc(${zoom}% - 200px)` }}>
              {renderTimelineMarkers()}
              <div
            className="extended-playhead"
            style={{
              left: `calc(${playheadLeftPercent}% * ${zoom / 100} - ${
                scrollContainerRef.current?.scrollLeft || 0
              }px)`,
            }}
          />
            </div>
          {/* </div> */}
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
                  <Tooltip content={mutedTracks.includes(trackIndex) ? "Unmute track" : "Mute track"}>
                    <button
                      className={`track-btn mute-btn ${mutedTracks.includes(trackIndex) ? "active" : ""}`}
                      onClick={(e) => toggleMute(trackIndex, e)}
                      title="Mute track"
                    >
                      M
                    </button>
                  </Tooltip>

                  <Tooltip content={soloTrack === trackIndex ? "Unsolo track" : "Solo track"}>
                    <button
                      className={`track-btn solo-btn ${soloTrack === trackIndex ? "active" : ""}`}
                      onClick={(e) => toggleSolo(trackIndex, e)}
                      title="Solo track"
                    >
                      S
                    </button>
                  </Tooltip>
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