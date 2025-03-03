import { useState, useEffect, useRef } from "react";
import "./ALSView.css";
import { FaPlay, FaPause, FaStepBackward, FaSearchMinus, FaSearchPlus } from "react-icons/fa";

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
  wav_file: string;
}

interface ProjectData {
  project: string;
  tempo: number;   // BPM
  tracks: Track[];
}

/**
 * ALSView
 *
 * Now the height of MIDI notes depends on the entire track's note range,
 * not just each event. Velocity affects only the opacity (not the height).
 * Also, we assume the timeline is in beats and we convert to measures visually
 * if desired, or simply keep it in beats. For demonstration, we do measures = beats / 4.
 */
function ALSView({ projectData }: { projectData: ProjectData }) {
  // --------------------- STATE ---------------------
  const [isPlaying, setIsPlaying] = useState(false);

  // We'll store the earliest and latest beats across ALL tracks, plus each
  // track's minimum and maximum MIDI note (for sizing).
  const [minBeat, setMinBeat] = useState(0);
  const [maxBeat, setMaxBeat] = useState(0);
  const [totalBeats, setTotalBeats] = useState(0); // maxBeat - minBeat
  const [currentBeat, setCurrentBeat] = useState(0); // "playhead" in beats
  const [zoom, setZoom] = useState(100);

  // Mute / Solo / Active track
  const [activeTrack, setActiveTrack] = useState<number | null>(null);
  const [soloTrack, setSoloTrack] = useState<number | null>(null);
  const [mutedTracks, setMutedTracks] = useState<number[]>([]);

  // For audio loading
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [loadingState, setLoadingState] = useState<{ total: number; loaded: number }>({
    total: 0,
    loaded: 0,
  });

  // We'll store each MIDI track's global note range in an array: [trackIndex => {minNote, maxNote}].
  // This way we can size the MIDI notes for the entire track consistently.
  const [trackMidiRanges, setTrackMidiRanges] = useState<{ minNote: number; maxNote: number }[]>([]);

  // --------------------- REFS ---------------------
  const audioRefs = useRef<(HTMLAudioElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const isPlayingRef = useRef(false);

  const tempo = projectData.tempo || 120; // Default if not specified
  const BEATS_PER_MEASURE = 4; // for 4/4 time

  // -------------- UTIL: Beats <-> Seconds --------------
  const beatsToSeconds = (b: number) => (b / tempo) * 60;
  const secondsToBeats = (s: number) => (s * tempo) / 60;

  // -------------- UTIL: Format mm:ss --------------
  const formatTime = (timeSec: number): string => {
    const minutes = Math.floor(timeSec / 60);
    const seconds = Math.floor(timeSec % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // -------------------------------------------------
  // 1) Determine minBeat & maxBeat, and also gather
  //    each MIDI track's global note range.
  // -------------------------------------------------
  useEffect(() => {
    if (!projectData?.tracks) return;

    let minB = Infinity;
    let maxB = 0;

    // We'll build an array that matches track indices
    const newTrackRanges: { minNote: number; maxNote: number }[] = [];

    projectData.tracks.forEach((track, trackIndex) => {
      // For beats:
      track.events.forEach((event) => {
        const s = parseFloat(event.start);
        const e = parseFloat(event.end);
        if (s < minB) minB = s;
        if (e > maxB) maxB = e;
      });

      // For the MIDI note range (only if it's a MIDI track):
      if (track.type === "MidiTrack") {
        let trackMin = 127;
        let trackMax = 0;

        // Scan all events and notes to find the overall min/max note for the entire track
        track.events.forEach((ev) => {
          if (!ev.notes) return;
          ev.notes.forEach((n) => {
            const keyValue = parseInt(n.key.Value, 10);
            if (keyValue < trackMin) trackMin = keyValue;
            if (keyValue > trackMax) trackMax = keyValue;
          });
        });

        // Ensure a small range of at least 12 if we want a minimum
        if (trackMax - trackMin < 12) {
          const mid = Math.floor((trackMax + trackMin) / 2);
          trackMin = Math.max(0, mid - 6);
          trackMax = Math.min(127, mid + 6);
        }

        newTrackRanges[trackIndex] = {
          minNote: trackMin === 127 ? 36 : trackMin, // fallback if no notes found
          maxNote: trackMax === 0 ? 52 : trackMax,
        };
      } else {
        // Audio track => no note range needed, store a dummy
        newTrackRanges[trackIndex] = { minNote: 60, maxNote: 72 }; // arbitrary
      }
    });

    if (minB === Infinity) minB = 0; // no events => fallback

    setMinBeat(minB);
    setMaxBeat(maxB);

    const totalB = maxB - minB;
    setTotalBeats(totalB);

    setCurrentBeat(minB); // start playhead at earliest
    setTrackMidiRanges(newTrackRanges);
  }, [projectData]);

  // -------------------------------------------------
  // 2) Audio loaded handler
  // -------------------------------------------------
  const handleAudioLoaded = () => {
    setLoadingState((prev) => {
      const newLoaded = prev.loaded + 1;
      if (newLoaded >= prev.total) {
        setAudioLoaded(true);
      }
      return { ...prev, loaded: newLoaded };
    });
  };

  // -------------------------------------------------
  // 3) Main animation loop: track playhead => update currentBeat
  // -------------------------------------------------
  const updatePlayhead = () => {
    if (!isPlayingRef.current) return;

    const activeAudio = audioRefs.current.find((audio, idx) => {
      return audio && !mutedTracks.includes(idx) && (soloTrack === null || soloTrack === idx);
    });

    if (activeAudio) {
      const sec = activeAudio.currentTime;
      const b = secondsToBeats(sec);
      setCurrentBeat(b);

      // Auto-scroll to keep playhead in view
      if (scrollContainerRef.current && timelineRef.current && playheadRef.current) {
        const scrollContainer = scrollContainerRef.current;
        const timelineWidthPx = timelineRef.current.scrollWidth;

        const fraction = (b - minBeat) / totalBeats;
        const playheadPx = fraction * timelineWidthPx;

        const containerWidth = scrollContainer.clientWidth;
        const scrollLeft = scrollContainer.scrollLeft;

        if (playheadPx > scrollLeft + containerWidth * 0.7) {
          scrollContainer.scrollLeft = playheadPx - containerWidth * 0.3;
        } else if (playheadPx < scrollLeft + containerWidth * 0.3 && scrollLeft > 0) {
          scrollContainer.scrollLeft = Math.max(0, playheadPx - containerWidth * 0.3);
        }
      }

      // If we go beyond maxBeat, stop
      if (b >= maxBeat) {
        stopPlayback();
        return;
      }
    }

    animationRef.current = requestAnimationFrame(updatePlayhead);
  };

  // -------------------------------------------------
  // 4) Start/Stop playback
  // -------------------------------------------------
  const startPlayback = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    setIsPlaying(true);
    isPlayingRef.current = true;

    const sec = beatsToSeconds(currentBeat);
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
  // 5) Handle timeline click => jump to that location
  // -------------------------------------------------
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || totalBeats <= 0) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left + (scrollContainerRef.current?.scrollLeft || 0);
    const timelineWidthPx = timelineRef.current.scrollWidth;

    const fraction = offsetX / timelineWidthPx;
    const newBeatPos = minBeat + fraction * totalBeats;
    setCurrentBeat(newBeatPos);

    const sec = beatsToSeconds(newBeatPos);
    audioRefs.current.forEach((audio) => {
      if (audio) audio.currentTime = sec;
    });
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
  // 7) For each track event, we place it on the timeline
  // -------------------------------------------------
  const renderTrackEvents = (track: Track, trackIndex: number) => {
    // We'll get the track's global note range for MIDI height calculations
    const trackMinNote = trackMidiRanges[trackIndex]?.minNote ?? 36;
    const trackMaxNote = trackMidiRanges[trackIndex]?.maxNote ?? 84;

    return track.events.map((event, eventIndex) => {
      const eStart = parseFloat(event.start);
      const eEnd = parseFloat(event.end);

      const startLocal = eStart - minBeat;
      const endLocal = eEnd - minBeat;
      const lengthBeats = endLocal - startLocal;

      // fraction along totalBeats
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
        // Audio
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
  // 8) Render MIDI notes. The entire track's note range is used
  //    to compute vertical positions. Velocity => only affects opacity.
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
          // figure out the top position from track range
          // e.g. 0% => bottom, 100% => top, or vice versa
          const relPosition = (keyValue - trackMinNote) / trackRange; // 0..1
          // We'll invert so a bigger pitch is higher up:
          const topPercent = (1 - relPosition) * 100;

          return note.occurences.map((occ, occIdx) => {
            if (occ.enabled === "false") return null;

            const velocity = parseFloat(occ.velocity);
            // We'll let velocity only influence opacity
            const noteOpacity = Math.max(0.2, velocity / 127);

            // Local start/duration in beats, relative to event
            const eStart = parseFloat(event.start);
            const eEnd = parseFloat(event.end);
            const eventLengthBeats = eEnd - eStart;

            const occStartBeats = parseFloat(occ.start);
            const occDurBeats = parseFloat(occ.duration);

            // Left/width fraction of the event
            const leftFrac = occStartBeats / eventLengthBeats;
            const widthFrac = occDurBeats / eventLengthBeats;

            const leftPercent = leftFrac * 100;
            const widthPercent = widthFrac * 100;

            // We'll set a "max note height" in px or in percent
            // For example, if you want the note to be up to 20% of track height
            const maxPercentHeight = 20; // up to you
            // We'll do a single-lane "normalized" height for each note, e.g. 8% if you want
            // to differentiate them. Or you can base it on trackRange:
            const baseHeight = trackRange <= 0 ? 5 : (100 / trackRange);
            // Then clamp it
            const finalHeight = Math.min(baseHeight, maxPercentHeight);

            return (
              <div
                key={`note-${trackIndex}-${eventIndex}-${noteIdx}-${occIdx}`}
                className="midi-note"
                style={{
                  position: "absolute",
                  left: `${leftPercent}%`,
                  width: `${widthPercent}%`,
                  // top is where the pitch is; the "height" is a small band
                  top: `${topPercent - finalHeight}%`,
                  height: `${finalHeight}%`, // clamp
                  backgroundColor: `rgba(147, 0, 215, 1)`,
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
  // 9) Timeupdate, loadeddata, cleanup
  // -------------------------------------------------
  useEffect(() => {
    const handlers: { [key: number]: EventListener } = {};
    audioRefs.current.forEach((audio, idx) => {
      if (!audio) return;
      const handler = () => {
        if (isPlayingRef.current && !mutedTracks.includes(idx) && (soloTrack === null || soloTrack === idx)) {
          const b = secondsToBeats(audio.currentTime);
          setCurrentBeat(b);
        }
      };
      handlers[idx] = handler;
      audio.addEventListener("timeupdate", handler);
      audio.addEventListener("loadeddata", handleAudioLoaded);
    });

    return () => {
      audioRefs.current.forEach((audio, idx) => {
        if (!audio) return;
        const h = handlers[idx];
        if (h) {
          audio.removeEventListener("timeupdate", h);
          audio.removeEventListener("loadeddata", handleAudioLoaded);
        }
      });
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [mutedTracks, soloTrack]);

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      audioRefs.current.forEach((audio) => {
        if (audio) audio.pause();
      });
    };
  }, []);

  // -------------------------------------------------
  // 10) Render timeline markers from 0..(maxBeat - minBeat)
  //     or in measures if you prefer
  // -------------------------------------------------
  const renderTimelineMarkers = () => {
    if (totalBeats <= 0) return null;

    // Convert total beats -> total measures if you want measure lines
    const totalMeasures = (maxBeat - minBeat) / BEATS_PER_MEASURE;
    const measureCount = Math.ceil(totalMeasures);

    const markers = [];
    for (let m = 0; m <= measureCount; m++) {
      // fraction across total measures
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
  // 11) Compute playhead position in %
  // -------------------------------------------------
  let playheadLeftPercent = 0;
  if (totalBeats > 0) {
    const fraction = (currentBeat - minBeat) / totalBeats;
    playheadLeftPercent = fraction * 100;
  }

  // For bottom-left display in mm:ss
  const currentSec = beatsToSeconds(currentBeat);
  const totalSec = beatsToSeconds(maxBeat - minBeat);

  // -------------------------------------------------
  // RENDER
  // -------------------------------------------------
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
              // Jump to start
              setCurrentBeat(minBeat);
              const sec = beatsToSeconds(minBeat);
              audioRefs.current.forEach((audio) => {
                if (audio) audio.currentTime = sec;
              });
              if (scrollContainerRef.current) scrollContainerRef.current.scrollLeft = 0;
            }}
          >
            <FaStepBackward />
          </button>

          <button className={`transport-btn play-btn ${isPlaying ? "playing" : ""}`} onClick={isPlaying ? stopPlayback : startPlayback}>
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

      {/* TIMELINE */}
      <div className="timeline-scroll-container" ref={scrollContainerRef}>
        <div
          className="timeline"
          ref={timelineRef}
          onClick={handleTimelineClick}
          style={{ width: `${zoom}%` }}
        >
          {renderTimelineMarkers()}
          {/* Playhead */}
          <div
            className="playhead"
            ref={playheadRef}
            style={{ left: `${playheadLeftPercent}%` }}
          ></div>
        </div>
      </div>

      {/* TRACKS */}
      <div className="tracks-scroll-container">
        <div className="tracks-container" ref={containerRef} style={{ width: `${zoom}%` }}>
          {projectData.tracks.map((track, trackIndex) => (
            <div
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
                src={`/src/assets/${track.wav_file}`}
                preload="auto"
                onEnded={() => {
                  // If no other track is still playing (and unmuted/unsoloed), stop
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
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ALSView;