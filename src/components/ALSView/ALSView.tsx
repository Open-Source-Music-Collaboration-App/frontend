import { useState, useEffect, useRef } from "react";
import "./ALSView.css";
import { FaPlay, FaPause, FaStepBackward, FaSearchMinus, FaSearchPlus } from "react-icons/fa";

interface Note {
  key: { Value: string };
  num_occurences: number;
  occurences: {
    start: string;
    duration: string;
    velocity: string;
    velocity_deviation: string;
    enabled: string;
  }[];
}

interface Loop {
  start: string;
  end: string;
  on: string;
}

interface Event {
  start: string;
  end: string;
  loop?: Loop;
  notes?: Note[];
  audio_name?: string;
  audio_file?: string;
}

interface Track {
  type: string;
  id: string;
  name: string;
  volume: string;
  volumeMin: string;
  volumeMax: string;
  events: Event[];
  wav_file: string;
}

interface ProjectData {
  project: string;
  tracks: Track[];
}

function ALSView({ projectData }: { projectData: ProjectData }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(1);
  const [duration, setDuration] = useState(0);
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [activeTrack, setActiveTrack] = useState<number | null>(null);
  const [soloTrack, setSoloTrack] = useState<number | null>(null);
  const [mutedTracks, setMutedTracks] = useState<number[]>([]);
  const [zoom, setZoom] = useState(100);
  const [totalDuration, setTotalDuration] = useState(0);
  const [loadingState, setLoadingState] = useState<{total: number, loaded: number}>({total: 0, loaded: 0});
  
  // References
  const audioRefs = useRef<(HTMLAudioElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const isPlayingRef = useRef(false);
  
  // Find minimum and maximum note values for each event to scale notes appropriately
  const calculateEventNoteRange = (event: Event) => {
    if (!event.notes || event.notes.length === 0) return { min: 0, max: 127 };
    
    let minNote = 127;
    let maxNote = 0;
    
    event.notes.forEach(note => {
      const keyValue = parseInt(note.key.Value);
      minNote = Math.min(minNote, keyValue);
      maxNote = Math.max(maxNote, keyValue);
    });
    
    // Ensure minimum range of 12 notes for better visualization
    if (maxNote - minNote < 12) {
      const mid = Math.floor((maxNote + minNote) / 2);
      minNote = Math.max(0, mid - 6);
      maxNote = Math.min(127, mid + 6);
    }
    
    return { min: minNote, max: maxNote };
  };

  // Calculate the project duration based on track events
  useEffect(() => {
    if (projectData?.tracks) {
      let minStart = Infinity;
      let maxEnd = 0;
      
      projectData.tracks.forEach(track => {
        track.events.forEach(event => {
          const eventStart = parseFloat(event.start);
          const eventEnd = parseFloat(event.end);
          if (eventStart < minStart) minStart = eventStart;
          if (eventEnd > maxEnd) maxEnd = eventEnd;
        });
      });
  
      if (minStart === Infinity) minStart = 1; // Default if no events found
  
      setTotalDuration(maxEnd - minStart);
      setDuration(maxEnd - minStart); 
      setCurrentTime(minStart); // Start at actual first event
  
    }
  }, [projectData]);

  // Handle audio loading events
  const handleAudioLoaded = () => {
    setLoadingState(prev => {
      const newLoaded = prev.loaded + 1;
      if (newLoaded >= prev.total) {
        setAudioLoaded(true);
      }
      return { ...prev, loaded: newLoaded };
    });
  };

  // Update playhead position during playback
  const updatePlayhead = () => {
    if (!isPlayingRef.current) return;
    
    // Find an active audio element to get time from
    const activeAudio = audioRefs.current.find((audio, idx) => 
      audio && !mutedTracks.includes(idx) && (soloTrack === null || soloTrack === idx)
    );
    
    if (activeAudio) {
      const audioTime = activeAudio.currentTime;
      setCurrentTime(audioTime);
      
      // Scroll view to follow playhead
      if (scrollContainerRef.current && playheadRef.current) {
        const scrollContainer = scrollContainerRef.current;
        const playheadElement = playheadRef.current;
        const playheadPos = ((audioTime) / duration) * 100;
        
        // Make sure playhead is visible by adjusting scroll position
        const containerWidth = scrollContainer.clientWidth;
        const playheadPosition = (playheadPos / 100) * timelineRef.current!.clientWidth;
        const scrollLeft = scrollContainer.scrollLeft;
        
        if (playheadPosition > scrollLeft + containerWidth * 0.7) {
          scrollContainer.scrollLeft = playheadPosition - containerWidth * 0.3;
        } else if (playheadPosition < scrollLeft + containerWidth * 0.3 && scrollLeft > 0) {
          scrollContainer.scrollLeft = Math.max(0, playheadPosition - containerWidth * 0.3);
        }
      }
      
      // Check if we've reached the end
      if (audioTime >= totalDuration) {
        stopPlayback();
        return;
      }
    }
    
    animationRef.current = requestAnimationFrame(updatePlayhead);
  };

  // Handle play/pause
  const togglePlay = () => {
    if (!isPlaying) {
      startPlayback();
    } else {
      stopPlayback();
    }
  };
  
  // Start the playback of all tracks
  const startPlayback = () => {
    // Stop any existing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    // Set flags first to ensure consistent state
    setIsPlaying(true);
    isPlayingRef.current = true;
    
    // Start audio playback for non-muted tracks
    const startPromises: Promise<void>[] = [];
    
    audioRefs.current.forEach((audio, index) => {
      if (audio && !mutedTracks.includes(index) && (soloTrack === null || soloTrack === index)) {
        try {
          audio.currentTime = currentTime;
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            startPromises.push(playPromise);
          }
        } catch (err) {
          console.error("Failed to play audio:", err);
        }
      }
    });
    
    // Start animation after at least one track has started playing
    Promise.allSettled(startPromises).finally(() => {
      // Double-check play state in case it was changed during async operation
      if (isPlayingRef.current) {
        animationRef.current = requestAnimationFrame(updatePlayhead);
      }
    });
  };
  
  // Stop the playback of all tracks
  const stopPlayback = () => {
    // Stop animation first
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    // Update state flags
    setIsPlaying(false);
    isPlayingRef.current = false;
    
    // Pause all audio
    audioRefs.current.forEach(audio => {
      if (audio) {
        try {
          audio.pause();
        } catch (err) {
          console.error("Failed to pause audio:", err);
        }
      }
    });
  };

  // Update isPlayingRef when isPlaying state changes
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Handle seeking in the timeline
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (timelineRef.current) {
      const rect = timelineRef.current.getBoundingClientRect();
      const offsetX = e.clientX - rect.left + (scrollContainerRef.current?.scrollLeft || 0);
      const timelineWidth = timelineRef.current.scrollWidth;
      const clickPosition = offsetX / timelineWidth;
      const newTime = clickPosition * duration;
      
      setCurrentTime(newTime);
      
      // Update all audio elements to the new time
      audioRefs.current.forEach(audio => {
        if (audio) audio.currentTime = newTime;
      });
    }
  };

  // Toggle mute for a track
  const toggleMute = (trackIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const newMutedTracks = [...mutedTracks];
    const muteIndex = newMutedTracks.indexOf(trackIndex);
    
    if (muteIndex !== -1) {
      // Unmute the track
      newMutedTracks.splice(muteIndex, 1);
      
      // If playing, start this track's audio
      if (isPlaying && audioRefs.current[trackIndex] && (soloTrack === null || soloTrack === trackIndex)) {
        audioRefs.current[trackIndex]!.currentTime = currentTime;
        audioRefs.current[trackIndex]!.play().catch(e => console.error("Audio playback error:", e));
      }
    } else {
      // Mute the track
      newMutedTracks.push(trackIndex);
      
      // If playing, pause this track's audio
      if (audioRefs.current[trackIndex]) {
        audioRefs.current[trackIndex]!.pause();
      }
    }
    
    setMutedTracks(newMutedTracks);
  };

  // Toggle solo for a track
  const toggleSolo = (trackIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (soloTrack === trackIndex) {
      // Unsolo current track
      setSoloTrack(null);
      
      // Resume other non-muted tracks if playing
      if (isPlaying) {
        audioRefs.current.forEach((audio, idx) => {
          if (audio && !mutedTracks.includes(idx)) {
            audio.currentTime = currentTime;
            audio.play().catch(e => console.error("Audio playback error:", e));
          }
        });
      }
    } else {
      // Solo the selected track
      setSoloTrack(trackIndex);
      
      // If playing, stop all tracks except the soloed one
      if (isPlaying) {
        audioRefs.current.forEach((audio, idx) => {
          if (audio) {
            if (idx === trackIndex && !mutedTracks.includes(idx)) {
              audio.currentTime = currentTime;
              audio.play().catch(e => console.error("Audio playback error:", e));
            } else {
              audio.pause();
            }
          }
        });
      }
    }
  };

  // Format time as mm:ss
  const formatTime = (timeInSeconds: number): string => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Render MIDI notes for visualization
  const renderMidiNotes = (event: Event, trackIndex: number, eventIndex: number) => {
    if (!event.notes) return null;
    
    // Calculate the range of notes in this event
    const { min: minNote, max: maxNote } = calculateEventNoteRange(event);
    const noteRange = maxNote - minNote + 1;
    
    return event.notes.map((note, noteIdx) => {
      // Calculate vertical position based on key and the event's note range
      const keyValue = parseInt(note.key.Value);
      const relativePosition = 1 - ((keyValue - minNote) / noteRange);
      const topPosition = relativePosition * 90; // Leave some margin at top and bottom
      
      return (
        <div 
          key={`note-group-${trackIndex}-${eventIndex}-${noteIdx}`} 
          className="note-group"
          style={{ top: `${topPosition}%` }}
        >
          {note.occurences.map((occurrence, occIdx) => {
            // Only show enabled notes
            if (occurrence.enabled === "false") return null;
            
            const velocity = parseFloat(occurrence.velocity);
            const loopEnd = parseFloat(event.loop?.end || "4");
            
            // Calculate position within the event
            const startTime = parseFloat(occurrence.start);
            const duration = parseFloat(occurrence.duration);
            const left = (startTime / loopEnd) * 100;
            const width = (duration / loopEnd) * 100;
            
            // Calculate height based on velocity
            const height = Math.max(10, Math.min(100, velocity / 127 * 100));
            
            return (
              <div 
                key={`occ-${trackIndex}-${eventIndex}-${noteIdx}-${occIdx}`}
                className="midi-note"
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                  height: `${height}%`,
                  opacity: Math.max(0.6, velocity / 127),
                  backgroundColor: `rgba(147, 0, 215, ${Math.max(0.7, velocity / 127)})`,
                  border: '1px solid rgba(200, 120, 255, 0.7)'
                }}
                title={`Note: ${note.key.Value}, Velocity: ${velocity.toFixed(1)}`}
              />
            );
          })}
        </div>
      );
    });
  };

  // Render audio events for visualization
  const renderAudioEvents = (track: Track, trackIndex: number) => {
    return track.events.map((event, eventIndex) => {
      // Calculate position based on timeline
      const startTime = parseFloat(event.start);
      const endTime = parseFloat(event.end);
      const eventWidth = endTime - startTime;
      
      const left = (startTime / duration) * 100; 
      const width = (eventWidth / duration) * 100;
      
      if (track.type === "MidiTrack") {
        return (
          <div 
            key={`event-${trackIndex}-${eventIndex}`}
            className="midi-event"
            style={{
              left: `${left}%`,
              width: `${width}%`,
              opacity: mutedTracks.includes(trackIndex) ? 0.4 : 1
            }}
          >
            {renderMidiNotes(event, trackIndex, eventIndex)}
          </div>
        );
      } else if (track.type === "AudioTrack") {
        return (
          <div 
            key={`event-${trackIndex}-${eventIndex}`}
            className="audio-event"
            style={{
              left: `${left}%`,
              width: `${width}%`,
              opacity: mutedTracks.includes(trackIndex) ? 0.4 : 1
            }}
            title={event.audio_name || "Audio Event"}
          >
            <span className="audio-name">{event.audio_name || "Audio Clip"}</span>
          </div>
        );
      }
      return null;
    });
  };

  // Add timeupdate event listeners to all audio elements
  useEffect(() => {
    const timeUpdateHandlers: { [key: number]: EventListener } = {};
    
    const setupAudioListeners = () => {
      audioRefs.current.forEach((audio, idx) => {
        if (audio) {
          // Create handler for this audio element
          const handler = () => {
            if (isPlayingRef.current && (soloTrack === null || soloTrack === idx) && !mutedTracks.includes(idx)) {
              setCurrentTime(audio.currentTime);
            }
          };
          
          // Store handler reference for cleanup
          timeUpdateHandlers[idx] = handler;
          
          // Add event listener
          audio.addEventListener('timeupdate', handler);
          audio.addEventListener('loadeddata', handleAudioLoaded);
        }
      });
    };
    
    setupAudioListeners();
    
    return () => {
      // Cleanup event listeners
      audioRefs.current.forEach((audio, idx) => {
        if (audio) {
          const handler = timeUpdateHandlers[idx];
          if (handler) {
            audio.removeEventListener('timeupdate', handler);
            audio.removeEventListener('loadeddata', handleAudioLoaded);
          }
        }
      });
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [mutedTracks, soloTrack]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      
      audioRefs.current.forEach(audio => {
        if (audio) audio.pause();
      });
    };
  }, []);

  return (
    <div className="als-view-container">
      <div className="als-view-header">
        <div className="project-info">
          <h2>{projectData.project.toUpperCase()} Project</h2>
          <div className="tracks-count">{projectData.tracks.length} tracks</div>
        </div>
        <div className="transport-controls">
          <button 
            className="transport-btn" 
            onClick={() => {
              setCurrentTime(1)
              audioRefs.current.forEach(audio => {
                if (audio) audio.currentTime = 1
              });
              
              // Ensure playhead is positioned correctly
              if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollLeft = 0;
              }
            }}
          >
            <FaStepBackward />
          </button>
          <button 
            className={`transport-btn play-btn ${isPlaying ? 'playing' : ''}`} 
            onClick={togglePlay}
          >
            {isPlaying ? <FaPause /> : <FaPlay />}
          </button>
          <div className="time-display">
            <span>{formatTime(Math.max(0, currentTime))}</span>
            <span className="time-divider">/</span>
            <span>{formatTime(duration)}</span>
          </div>
          <div className="zoom-controls">
            <button 
              className="transport-btn" 
              onClick={() => setZoom(Math.max(50, zoom - 10))}
            >
              <FaSearchMinus />
            </button>
            <span className="zoom-value">{zoom}%</span>
            <button 
              className="transport-btn" 
              onClick={() => setZoom(Math.min(300, zoom + 10))}
            >
              <FaSearchPlus />
            </button>
          </div>
        </div>
      </div>

      <div className="timeline-scroll-container" ref={scrollContainerRef}>
        <div 
          className="timeline" 
          ref={timelineRef}
          onClick={handleTimelineClick}
          style={{ width: `${zoom}%` }}
        >
          {/* Time markers every beat */}
          {Array.from({ length: Math.ceil(duration) + 1 }).map((_, i) => (
            <div 
              key={`marker-${i}`} 
              className={`timeline-marker ${i % 4 === 0 ? 'major' : ''}`}
              style={{ left: `${(i / duration) * 100}%` }}
            >
              <div className="marker-line"></div>
              <span className="marker-time">{i}</span>
            </div>
          ))}
          
          {/* Playhead */}
          <div 
            className="playhead"
            ref={playheadRef}
            style={{ left: `${((currentTime) / duration) * 100}%` }}
          ></div>
        </div>
      </div>

      <div className="tracks-scroll-container">
        <div 
          className="tracks-container" 
          ref={containerRef}
          style={{ width: `${zoom}%` }}
        >
          {projectData.tracks.map((track, trackIndex) => (
            <div 
              key={`track-${track.id}`}
              className={`track ${activeTrack === trackIndex ? 'active' : ''} ${mutedTracks.includes(trackIndex) ? 'muted' : ''} ${soloTrack === trackIndex ? 'solo' : ''}`}
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
                    className={`track-btn mute-btn ${mutedTracks.includes(trackIndex) ? 'active' : ''}`}
                    onClick={(e) => toggleMute(trackIndex, e)}
                    title="Mute track"
                  >
                    M
                  </button>
                  <button 
                    className={`track-btn solo-btn ${soloTrack === trackIndex ? 'active' : ''}`}
                    onClick={(e) => toggleSolo(trackIndex, e)}
                    title="Solo track"
                  >
                    S
                  </button>
                </div>
              </div>
              
              <div className="track-content">
                {renderAudioEvents(track, trackIndex)}
              </div>
              
              <audio 
                ref={el => audioRefs.current[trackIndex] = el}
                src={`/src/assets/${track.wav_file}`}
                preload="auto"
                onEnded={() => {
                  // If this is the last track to end, stop playback
                  const anyStillPlaying = audioRefs.current.some((audio, idx) => 
                    audio && idx !== trackIndex && !audio.paused && !mutedTracks.includes(idx) &&
                    (soloTrack === null || soloTrack === idx)
                  );
                  if (!anyStillPlaying) {
                    stopPlayback();
                    setCurrentTime(1);
                  }
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ALSView;