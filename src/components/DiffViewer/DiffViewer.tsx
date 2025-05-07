import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import JSZip from 'jszip';
import { useAuth } from '../../context/AuthProvider';
import { ProjectDiff } from '../../types/ProjectDiff';
import { ProjectData, Track, Event, Note } from '../../types/ProjectData';
import './DiffViewer.css';
import {
  FaHistory, FaExclamationTriangle, FaInfoCircle, FaPlus, FaMinus, FaPen, FaArrowRight,
  FaSearchMinus, FaSearchPlus, FaExpand, FaLock, FaLockOpen, FaPlay,
  FaArrowLeft
} from 'react-icons/fa';
import { BiDice1, BiDice2, BiDice3, BiDice4, BiDice5, BiDice6 } from 'react-icons/bi';
import LoadingSpinner from '../LoadingSpinner/LoadingSpinner';

// --- Helper Utilities ---
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
};

const beatsToSeconds = (beats: number, tempo: number): number => {
  return (beats / tempo) * 60;
};

const getPianoRollColor = (note: number): string => {
  // Base color palette for piano roll keys (alternates white/black keys)
  const colorMap = [
    '#f0f0f0', '#303030', '#f0f0f0', '#303030', '#f0f0f0', 
    '#f0f0f0', '#303030', '#f0f0f0', '#303030', '#f0f0f0', '#303030', '#f0f0f0'
  ];
  return colorMap[note % 12];
};

// --- Component ---
function DiffViewer() {
  const { id: projectId, hash: currentHash, prevHash: prevHash } = useParams<{ id: string; hash: string; prevHash: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [diffData, setDiffData] = useState<ProjectDiff | null>(null);
  const [currentProjectData, setCurrentProjectData] = useState<ProjectData | null>(null);
  const [previousProjectData, setPreviousProjectData] = useState<ProjectData | null>(null);
  const [zoom, setZoom] = useState(100);
  const [verticalZoom, setVerticalZoom] = useState(100);
  const [lockScrolling, setLockScrolling] = useState(true);
  const [activeTrack, setActiveTrack] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'all' | 'added' | 'removed' | 'modified'>('all');
  const [loadingStage, setLoadingStage] = useState<'initial' | 'fetching' | 'extracting' | 'analyzing' | 'finalizing'>('initial');
  
  // Refs
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const tracksScrollRef = useRef<HTMLDivElement>(null);
  const isSyncingScroll = useRef(false);

  const handleWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    // Check for pinch-to-zoom gesture (ctrl+wheel on macOS trackpads)
    if (event.shiftKey) {
      // Prevent default to stop page scrolling
      event.preventDefault();
      
      // Reduce sensitivity for pinch gestures
      const delta = event.deltaY;
      const zoomStep = 5; // Reduced from 10 for less sensitivity
      
      // Pinch gesture: control horizontal zoom
      setZoom(prevZoom => {
        const newZoom = delta > 0 
          ? Math.max(100, prevZoom - zoomStep) 
          : Math.min(400, prevZoom + zoomStep);
        return newZoom;
      });
    } 
    // Alt+wheel for vertical zoom
    else if (event.altKey) {
      // Prevent default to avoid page scrolling
      event.preventDefault();
      // Reduce sensitivity for pinch gestures
      
      const delta = event.deltaY;
      const zoomStep = 3; // Reduced sensitivity
      
      // Alt + wheel: vertical zoom
      setVerticalZoom(prevZoom => {
        const newZoom = delta > 0 
          ? Math.max(20, prevZoom - zoomStep) 
          : Math.min(300, prevZoom + zoomStep);
        return newZoom;
      });
    }
    // Regular wheel - don't handle it, let the browser manage scrolling
  }, []);

  // --- Data Fetching ---
  useEffect(() => {
    const fetchData = async () => {
      if (!projectId || !currentHash || !user?.username) {
        setError("Missing project ID, commit hash, or user information.");
        setLoading(false);
        return;
      }
    
      setLoading(true);
      setLoadingStage('initial');
      setError(null);
      setDiffData(null);
      setCurrentProjectData(null);
      setPreviousProjectData(null);
  
      try {
        // 1. Fetch Diff Data
        setLoadingStage('fetching');
        console.log(`Fetching diff for commit: ${currentHash}`);
        const diffResponse = await axios.get<ProjectDiff>(
          `/api/history/diff/${user.username}/${projectId}/${currentHash}`,
          { withCredentials: true, timeout: 30000 }
        );
        setDiffData(diffResponse.data);
        console.log("Diff data loaded:", diffResponse.data);
  
        const previousHash = prevHash;
        
        // Define fetchProjectJson here
        const fetchProjectJson = async (hash: string): Promise<ProjectData | null> => {
          console.log(`Fetching project data for commit: ${hash}`);
          try {
            // Use the new optimized endpoint instead of downloading and extracting ZIP
            const response = await axios.get<ProjectData>(
              `/api/history/json/${user.username}/${projectId}/${hash}`,
              { 
                withCredentials: true, 
                timeout: 30000 // We can reduce timeout since response should be faster
              }
            );
            
            if (response.status === 204) {
              console.warn(`No content found for commit ${hash}.`);
              return null;
            }
            
            // The response is already JSON, no need to parse
            return response.data;
          } catch (err: any) {
            console.error(`Error loading project data for commit ${hash}:`, err);
            return null;
          }
        };
  
        // 2. Fetch Project Data in parallel
        setLoadingStage('fetching');
        const [currentData, previousData] = await Promise.all([
          fetchProjectJson(currentHash),
          previousHash ? fetchProjectJson(previousHash) : Promise.resolve(null)
        ]);
        
        if (!currentData && !previousData) {
          throw new Error("Could not load project data for either commit.");
        }
        
        setLoadingStage('finalizing')
        setCurrentProjectData(currentData);
        setPreviousProjectData(previousData);
        
      } catch (err: any) {
        console.error("Error loading diff data:", err);
        setError(err.response?.data?.message || err.message || "Failed to load comparison data.");
      } finally {
        setLoading(false);
      }
    };
  
    fetchData();
  }, [projectId, currentHash, prevHash, user]);

  // 1) Define a default “empty” diff
  const emptyDiff: ProjectDiff = {
    summary: {
      totalChanges: 0,
      changedTracks: [],
      addedTracks: [],
      removedTracks: [],
      modifiedTracks: [],
    },
    trackAddRemove: [],
    noteChanges: [],
    velocityChanges: [],
    trackParameterChanges: [],
    audioFileChanges: [],
  };

  // 2) Coerce diffData & previousProjectData to non-null
  const safeDiff = diffData ?? emptyDiff;
  const safePrevious = previousProjectData ?? ({ tracks: [] } as ProjectData);

  // --- Memoized Calculations ---
  const { 
    combinedTracks, 
    totalBeats, 
    maxBeat,
    trackMidiRanges, 
    changedTrackIds,
    addedNotesByTrack,
    removedNotesByTrack,
    modifiedNotesByTrack,
  } = useMemo(() => {
    const currentTracks = currentProjectData?.tracks || [];
    const previousTracks = previousProjectData?.tracks || [];
    const allTrackIds = new Set<string>([...currentTracks.map(t => t.id), ...previousTracks.map(t => t.id)]);
    
    // Track the tracks that have changes
    const changedTrackIds = new Set<string>();
    if (safeDiff) {
      // Add IDs of modified tracks
      [...(safeDiff.summary.modifiedTracks || [])].forEach((trackName) => {
        const track = [...currentTracks, ...previousTracks].find(
          (t) => t.name === trackName,
        );
       if (track) changedTrackIds.add(track.id);
      });
      
      // Add IDs of added/removed tracks
      safeDiff.trackAddRemove?.forEach((change) => {
        const matchingTrack = [...currentTracks, ...previousTracks].find(
          (t) => t.name === change.trackName,
        );
       if (matchingTrack) changedTrackIds.add(matchingTrack.id);
      });
    }

    const combined = Array.from(allTrackIds).map(trackId => {
      const current = currentTracks.find(t => t.id === trackId);
      const previous = previousTracks.find(t => t.id === trackId);
      return { trackId, current, previous };
    });
    // Inject any removed-only tracks
    safeDiff.trackAddRemove
      .filter((c) => c.type === "removed")
      .forEach((c) => {
        if (
          !combined.some(
            (x) =>
              x.current?.name === c.trackName ||
              x.previous?.name === c.trackName,
          )
        ) {
          combined.push({
            trackId: `removed-${c.trackName}`,
            current: null,
            previous: {
              id: `removed-${c.trackName}`,
              name: c.trackName,
              type: c.trackType,
              events: [],
            },
          });
        }
      });

   // Sort tracks to keep the order consistent
    combined.sort((a, b) => {
      const trackA = a.current || a.previous;
      const trackB = b.current || b.previous;
      if (!trackA || !trackB) return 0;
      return trackA.name.localeCompare(trackB.name);
    });

    // Find max beat including padding
    let calculatedMaxBeat = 0;
    const findMaxBeat = (project: ProjectData | null) => {
      let max = 0;
      project?.tracks.forEach(t => {
        t.events.forEach(e => {
          max = Math.max(max, parseFloat(e.end));
        });
      });
      return max;
    };
    calculatedMaxBeat = Math.max(
      findMaxBeat(currentProjectData), 
      findMaxBeat(previousProjectData), 
      32 // Minimum project length
    );
    const calculatedTotalBeats = Math.ceil(calculatedMaxBeat / 16) * 16 + 16; // Round up to nearest 16 beats + padding

    // Calculate MIDI note ranges per track for vertical positioning
    const midiRanges: Record<string, { minNote: number; maxNote: number }> = {};
    combined.forEach(({ trackId, current, previous }) => {
      const track = current || previous;
      if (track?.type === 'MidiTrack') {
        let min = 127, max = 0;
        
        // Process current track notes
        if (current?.events) {
          current.events.forEach(e => {
            if (!e.notes) return;
            e.notes.forEach(note => {
              // Check if note has key.Value or pitch property
              const pitch = note.key?.Value ? parseInt(note.key.Value) : note.pitch;
              if (pitch) {
                min = Math.min(min, pitch);
                max = Math.max(max, pitch);
              }
            });
          });
        }
        
        // Process previous track notes
        if (previous?.events) {
          previous.events.forEach(e => {
            if (!e.notes) return;
            e.notes.forEach(note => {
              const pitch = note.key?.Value ? parseInt(note.key.Value) : note.pitch;
              if (pitch) {
                min = Math.min(min, pitch);
                max = Math.max(max, pitch);
              }
            });
          });
        }
        
        // Ensure at least an octave range and add padding
        if (max - min < 12) {
          const center = Math.floor((min + max) / 2);
          min = center - 6;
          max = center + 6;
        }
        
        // Default range if no notes found
        midiRanges[trackId] = { 
          minNote: min === 127 ? 36 : Math.max(0, min - 2), 
          maxNote: max === 0 ? 84 : Math.min(127, max + 2) 
        };
      }
    });
    
    // Index note changes by track for efficient lookup
    const addedNotesByTrack: Record<string, any[]> = {};
    const removedNotesByTrack: Record<string, any[]> = {};
    const modifiedNotesByTrack: Record<string, any[]> = {};

    if (safeDiff?.noteChanges) {
      safeDiff.noteChanges.forEach((change) => {
        // Find the track ID from the track name
        const trackWithName = [...currentTracks, ...previousTracks].find(t => 
          t.name === change.trackName
        );
        
        if (!trackWithName) return;
        
        const trackId = trackWithName.id;
        
        if (change.type === 'noteAdded') {
          if (!addedNotesByTrack[trackId]) addedNotesByTrack[trackId] = [];
          addedNotesByTrack[trackId].push(change);
        } else if (change.type === 'noteRemoved') {
          if (!removedNotesByTrack[trackId]) removedNotesByTrack[trackId] = [];
          removedNotesByTrack[trackId].push(change);
        }
      });
    }

    if (safeDiff?.velocityChanges) {
      safeDiff.velocityChanges.forEach((change) => {
        const trackWithName = [...currentTracks, ...previousTracks].find(
          (t) => t.name === change.trackName,
        );
        
        if (!trackWithName) return;
        
        const trackId = trackWithName.id;
        
        if (!modifiedNotesByTrack[trackId]) modifiedNotesByTrack[trackId] = [];
        modifiedNotesByTrack[trackId].push(change);
      });
    }

    console.log("removed notes: ", removedNotesByTrack);

    return { 
      combinedTracks: combined, 
      totalBeats: calculatedTotalBeats,
      maxBeat: calculatedMaxBeat,
      trackMidiRanges: midiRanges,
      changedTrackIds,
      addedNotesByTrack,
      removedNotesByTrack,
      modifiedNotesByTrack
    };
  }, [currentProjectData, previousProjectData, safeDiff]);

  // --- Scroll Synchronization ---
  const handleScroll = useCallback((source: 'timeline' | 'tracks') => {
    if (!lockScrolling || isSyncingScroll.current) return;

    isSyncingScroll.current = true;
    const timelineEl = timelineScrollRef.current;
    const tracksEl = tracksScrollRef.current;

    if (timelineEl && tracksEl) {
      if (source === 'timeline') {
        tracksEl.scrollLeft = timelineEl.scrollLeft;
      } else {
        timelineEl.scrollLeft = tracksEl.scrollLeft;
      }
    }

    requestAnimationFrame(() => {
      isSyncingScroll.current = false;
    });
  }, [lockScrolling]);

  const calculateLeftPercent = (beat: number, totalBeats: number): number => {
    return (beat / totalBeats) * 100;
  };
  
  const calculateWidthPercent = (duration: number, totalBeats: number): number => {
    return (duration / totalBeats) * 100;
  };

  // --- Rendering Functions ---
  const renderTimelineMarkers = () => {
    const markers = [];
    const majorInterval = totalBeats > 128 ? 16 : 4;
    const minorInterval = majorInterval / 4;
    
    for (let beat = 0; beat <= totalBeats - minorInterval; beat += minorInterval) {
      const isMajor = beat % majorInterval === 0;
      const isMinor = beat % majorInterval !== 0 && beat % minorInterval === 0;
      
      markers.push(
        <div
          key={`marker-${beat}`}
          className={`timeline-marker ${isMajor ? 'major' : isMinor ? 'minor' : 'micro'}`}
          style={{ left: `${calculateLeftPercent(beat, totalBeats)}%` }}
        >
          {isMajor && (
            <span className="timeline-label">
              {beat}
              <span className="timeline-time">
                {formatTime(beatsToSeconds(beat, currentProjectData?.tempo || 120))}
              </span>
            </span>
          )}
        </div>
      );
    }
    
    return markers;
  };
  
  // Render the playhead marker
  const renderPlayhead = () => {
    return null;
  };
  
  // Enhanced note rendering with proper piano roll style
  const renderEventNotesWithDiff = (
    trackId: string,
    trackName: string, 
    eventId: string, 
    currentNotes: any[] | undefined, 
    previousNotes: any[] | undefined,
    eventStartBeat: number,
    eventDurationBeats: number,
    trackMinNote: number,
    trackMaxNote: number,
    eventStatus: 'added' | 'removed' | 'modified' | 'unchanged'
  ) => {
    // Early exit if no notes
    if (!currentNotes && !previousNotes) return { notes: null, hasChanges: false };

    if (eventStatus === 'added' && !currentNotes) return { notes: null, hasChanges: false };
    // For a removed event, don't show notes from current version
    if (eventStatus === 'removed' && !previousNotes) return { notes: null, hasChanges: false };

    let hasChanges = eventStatus !== 'unchanged';
    
    // Mapping for note state identification and visual treatment
    interface ProcessedNote {
      id: string;
      pitch: number;
      start: number;
      duration: number;
      velocity: number;
      status: 'added' | 'removed' | 'modified' | 'unchanged';
      localStart: number; // Start relative to event start
      localEnd: number;   // End relative to event start  
    }
    
    const processedNotes: ProcessedNote[] = [];
    
    // Get relevant notes from our diff data for this event
    const relevantAddedNotes = (addedNotesByTrack[trackId] || [])
      .filter(note => Math.abs(note.beat - eventStartBeat) < eventDurationBeats);
      
    const relevantRemovedNotes = (removedNotesByTrack[trackId] || [])
      .filter(note => Math.abs(note.beat - eventStartBeat) < eventDurationBeats);
  
    const relevantModifiedNotes = (modifiedNotesByTrack[trackId] || [])
      .filter(note => Math.abs(note.beat - eventStartBeat) < eventDurationBeats);

       // If there are any changes in this event, mark as having changes
    if (relevantAddedNotes.length > 0 || relevantRemovedNotes.length > 0 || relevantModifiedNotes.length > 0) {
      hasChanges = true;
    }
  
    // Step 1: First process all added notes from diff data
    relevantAddedNotes.forEach(note => {
      const pitch = parseInt(note.note, 10);
      const eventStartBeat = parseFloat(note.beat);
      const duration = note.duration || 0.25;
      const velocity = note.velocity || 100;
      const globalStart = parseFloat(note.beat);
      const localStart = globalStart - eventStartBeat;
      
      // Only add if it matches our view mode filter
      if (viewMode === 'all' || viewMode === 'added') {
        processedNotes.push({
          id: `added-${pitch}-${globalStart}`,
          pitch,
          start: globalStart,
          duration: note.duration || 0.25, // Use the new duration value
          velocity: note.velocity || 100,  // Use the new velocity value
          status: 'added',
          localStart,
          localEnd: localStart + (note.duration || 0.25)
        });
      }
    });
    
    // Step 2: Process removed notes from diff data
    relevantRemovedNotes.forEach(note => {
      const pitch = parseInt(note.note, 10);
      const globalStart = parseFloat(note.beat);
      const localStart = globalStart - eventStartBeat;

      
      // Only add if it matches our view mode filter
      if (viewMode === 'all' || viewMode === 'removed') {
        processedNotes.push({
          id: `removed-${pitch}-${globalStart}`,
          pitch,
          start: globalStart,
          duration: note.duration || 0.25, // Use the new duration value
          velocity: note.velocity || 100, // Use the new velocity value
          status: 'removed',
          localStart,
          localEnd: localStart + (note.duration || 0.25)
        });
      }
    });
    
    // Step 3: Process modified notes from diff data
    relevantModifiedNotes.forEach(note => {
      const pitch = parseInt(note.note, 10);
      const globalStart = parseFloat(note.beat);
      const localStart = globalStart - eventStartBeat;
      
      // Only add if it matches our view mode filter
      if (viewMode === 'all' || viewMode === 'modified') {
        processedNotes.push({
          id: `modified-${pitch}-${globalStart}`,
          pitch,
          start: globalStart,
          duration: 0.25, // Default duration
          velocity: note.to || 100, // Use the new velocity value
          status: 'modified',
          localStart,
          localEnd: localStart + 0.25
        });
      }
    });
    
    // Step 4: Process current notes (for unchanged notes and better duration info)
    if (currentNotes?.length) {
      currentNotes.forEach(note => {
        // Get note data
        let pitch = 0;
        let localStart = 0;
        let duration = 0.25;
        let velocity = 100;
        
        // Handle ALSView's data structure
        if (note.key?.Value) {
          pitch = parseInt(note.key.Value, 10);
          
          if (note.occurences?.length) {
            const occ = note.occurences[0];
            localStart = parseFloat(occ.start);
            duration = parseFloat(occ.duration);
            velocity = parseInt(occ.velocity, 10);
          }
        } 
        // Handle the structure from diff data
        else if (note.pitch) {
          pitch = note.pitch;
          localStart = parseFloat(note.start) - eventStartBeat;
          duration = note.duration || 0.25;
          velocity = note.velocity || 100;
        }
        
        const globalStart = eventStartBeat + localStart;
        
        // Check if this note is already in our list (added, modified, etc.)
        const existingNote = processedNotes.find(n => 
          Math.abs(n.start - globalStart) < 0.1 && 
          n.pitch === pitch
        );
        
        if (existingNote) {
          // Update duration and velocity from the actual note data
          existingNote.duration = duration;
          existingNote.localEnd = localStart + duration;
          
          // For modified notes, keep the modified velocity
          if (existingNote.status !== 'modified') {
            existingNote.velocity = velocity;
          }
        } else if (viewMode === 'all') {
          // If event is added, all notes should be marked as added too
          const noteStatus = 
            relevantAddedNotes.some(n => n.note === pitch) ? 'added' :
            relevantRemovedNotes.some(n => n.note === pitch) ? 'removed' :
            relevantModifiedNotes.some(n => n.note === pitch) ? 'modified' :
            'unchanged';
          
          // Add as unchanged note if it's not in our changes list and we're showing all notes
          processedNotes.push({
            id: note.id || `${pitch}-${globalStart}`,
            pitch,
            start: globalStart,
            duration,
            velocity,
            status: noteStatus,
            localStart,
            localEnd: localStart + duration
          });
        }
      });
    }
    
    // Step 5: Fill in durations for removed notes from previous version data
    if (previousNotes?.length) {
      previousNotes.forEach(note => {
        let pitch = 0;
        let localStart = 0;
        let duration = 0.25;
        let velocity = 100;
        
        // Handle ALSView's data structure
        if (note.key?.Value) {
          pitch = parseInt(note.key.Value, 10);
          
          if (note.occurences?.length) {
            const occ = note.occurences[0];
            localStart = parseFloat(occ.start);
            duration = parseFloat(occ.duration);
            velocity = parseInt(occ.velocity, 10);
          }
        } 
        // Handle the structure from diff data
        else if (note.pitch) {
          
          pitch = note.pitch;
          localStart = parseFloat(note.start) - eventStartBeat;
          duration = note.duration || 0.25;
          velocity = note.velocity || 100;
          console.log(note)
        }
        
        const globalStart = eventStartBeat + localStart;
        
        // Find matching removed note to update its properties
        const removedNote = processedNotes.find(n => 
          n.status === 'removed' &&
          Math.abs(n.start - globalStart) < 0.1 && 
          n.pitch === pitch
        );
        
        if (removedNote) {
          removedNote.duration = duration;
          removedNote.velocity = velocity;
          removedNote.localEnd = localStart + duration;
        }
      });
    }
    
    if (processedNotes.length === 0) return { notes: null, hasChanges: false };

    // Check if there are any changed notes
    const hasAnyNonUnchangedNotes = processedNotes.some(note => note.status !== 'unchanged');
  
    
    // Calculate position and appearance of each note
    const noteElements = processedNotes.map(note => {
      // Calculate vertical position (piano roll style)
      const trackNoteRange = Math.max(trackMaxNote - trackMinNote, 12); // Ensure minimum range of 12 semitones
      const notePosition = (trackMaxNote - note.pitch) / trackNoteRange;
      const noteHeight = Math.min(100 / trackNoteRange, 3); // Cap the height percentage
      
      // Horizontal position and width
      const leftPercent = calculateLeftPercent(note.start - eventStartBeat, eventDurationBeats);
      const widthPercent = calculateWidthPercent(note.duration, eventDurationBeats);
      
      // Visual styling based on status
      let noteClass = `piano-note status-${note.status}`;
      let noteStyle: React.CSSProperties = {
        position: 'absolute',
        top: `${notePosition * 100}%`,
        height: `${noteHeight * 100}%`,
        left: `${leftPercent}%`,
        width: `${Math.max(widthPercent, 0.5)}%`,
        zIndex: note.status === 'added' ? 3 : note.status === 'removed' ? 1 : 2
      };
      
      const pitchName = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][note.pitch % 12];
      const octave = Math.floor(note.pitch / 12) - 1;
      const tooltipContent = `${pitchName}${octave} (${note.pitch}) - ${note.status}`;
      
      return (
        <div 
          key={note.id} 
          className={noteClass} 
          style={noteStyle}
          title={tooltipContent}
        >
          <div className="note-velocity" style={{ opacity: note.velocity / 127 }}></div>
          {/* Show pitch name for certain zoom levels or status */}
          {(note.status !== 'unchanged' || noteHeight > 0.3) && widthPercent > 5 && (
            <span className="note-label">{pitchName}{octave}</span>
          )}
        </div>
      );
    });

    return { notes: noteElements, hasChanges: hasChanges || hasAnyNonUnchangedNotes };
  };
  
  const renderPianoRoll = (track: Track, trackIndex: number) => {
    if (track.type !== 'MidiTrack') return null;
    
    const { minNote, maxNote } = trackMidiRanges[track.id] || { minNote: 48, maxNote: 72 };
    const noteRange = maxNote - minNote;
    
    return (
      <div className="piano-roll-wrapper">
        {/* Piano keys on the left */}
        <div className="piano-keys">
          {Array.from({ length: noteRange + 1 }).map((_, i) => {
            const currentNote = maxNote - i;
            const isBlackKey = [1, 3, 6, 8, 10].includes(currentNote % 12);
            const pitchName = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][currentNote % 12];
            const octave = Math.floor(currentNote / 12) - 1;
            
            // Only show labels for white keys or at octave boundaries
            const showLabel = !isBlackKey || currentNote % 12 === 0;
            
            return (
              <div 
                key={`key-${currentNote}`} 
                className={`piano-key ${isBlackKey ? 'black' : 'white'}`}
                style={{ 
                  top: `${(i / noteRange) * 100}%`,
                  height: `${100 / noteRange}%`
                }}
              >
                {showLabel && (
                  <span className="key-label">
                    {pitchName}{currentNote % 12 === 0 ? octave : ''}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderTrackEventsWithDiff = (trackId: string, trackName: string, trackType: string, status: string) => {
    const currentTrack = currentProjectData?.tracks.find(t => t.id === trackId);
    const previousTrack = previousProjectData?.tracks.find(t => t.id === trackId);
    const currentEvents = currentTrack?.events || [];
    const previousEvents = previousTrack?.events || [];

    console.log("currentEvents: ", currentEvents);
    console.log("previousEvents: ", previousEvents);
    
    // Calculate MIDI note range for this track
    const { minNote, maxNote } = trackMidiRanges[trackId] || { minNote: 36, maxNote: 84 };
    
    // Combine all event IDs from both versions
    const allEventIds = new Set();
    
    currentEvents.forEach((e, index) => {
      // Use existing ID if available, otherwise generate one based on start time
      const eventId = e.id || `current-${e.start}-${index}`;
      allEventIds.add(eventId);
      // Add the ID to the event object if it doesn't have one
      if (!e.id) e.id = eventId;
    });
    
    // Do the same for previous events
    previousEvents.forEach((e, index) => {
      const eventId = e.id || `previous-${e.start}-${index}`;
      allEventIds.add(eventId);
      if (!e.id) e.id = eventId;
    });

    // Show vertical piano roll grid for MIDI tracks
    const showPianoRollGrid = trackType === 'MidiTrack';
    
    return (
      <div className="track-events-wrapper">
        {/* For MIDI tracks, show a piano roll background */}
        {showPianoRollGrid && (
          <div className="piano-roll-grid" style={{ height: '100%' }}>
            {/* Horizontal beat lines are handled by global grid */}
            {/* Vertical note lines */}
            {Array.from({ length: maxNote - minNote + 1 }).map((_, i) => {
              const currentNote = minNote + i;
              const isBlackKey = [1, 3, 6, 8, 10].includes(currentNote % 12);
              
              return (
                <div 
                  key={`gridline-${currentNote}`} 
                  className={`piano-grid-line ${isBlackKey ? 'black' : 'white'}`}
                  style={{ 
                    bottom: `${((currentNote - minNote) / (maxNote - minNote)) * 100}%`,
                    backgroundColor: isBlackKey ? 'rgba(0,0,0,0.1)' : 'transparent',
                    borderBottom: '1px solid rgba(255,255,255,0.05)'
                  }}
                />
              );
            })}
          </div>
        )}
        
        {/* Render all events */}
        {Array.from(allEventIds).map(eventId => {
          // console.log("eventId: ", eventId)
          const currentEvent = currentEvents.find(e => e.id === eventId);
          const previousEvent = previousEvents.find(e => e.id === eventId);

          // console.log("eventId:", eventId, 
          //   "Current event:", currentEvents.find(e => e.id === eventId), 
          //   "Previous event:", previousEvents.find(e => e.id === eventId)
          // );
          
          // Skip if no event data available
          if (!currentEvent && !previousEvent) return null;
          
          // Use the event from current version if available, otherwise from previous
          const event = currentEvent || previousEvent!;
          
          // Check if this event was changed according to diff data
          const eventChangeInfo = diffData?.eventChanges?.find(ec => 
            ec.trackName === trackName && ec.eventId === eventId
          );
          
          // For audio tracks, check audio changes
          const audioChangeInfo = trackType === 'AudioTrack' ? 
            diffData?.audioFileChanges?.find(ac => 
              ac.trackName === trackName && 
              (ac.position === parseFloat(event.start) || Math.abs(ac.position - parseFloat(event.start)) < 0.1)
            ) : undefined;
          
          // Determine status of the event
          let eventStatus: 'added' | 'removed' | 'modified' | 'unchanged' = 'unchanged';
          
          if (currentEvent && !previousEvent) eventStatus = 'added';
          else if (!currentEvent && previousEvent) eventStatus = 'removed';
          else if (eventChangeInfo || audioChangeInfo) eventStatus = 'modified';
          
          // Calculate event styling
          const startBeat = parseFloat(event.start);
          const endBeat = parseFloat(event.end);
          const durationBeat = endBeat - startBeat;
          
          // Skip events outside our view if in a filtered mode
          if (viewMode !== 'all' && viewMode !== eventStatus && eventStatus !== 'unchanged') {
            return null;
          }
          
          // Position calculation
          const leftPercent = calculateLeftPercent(startBeat, totalBeats);
          const widthPercent = calculateWidthPercent(durationBeat, totalBeats);

          
          // Color and style based on type and status
          let backgroundColor = trackType === 'MidiTrack' 
            ? 'rgba(147, 0, 215, 0.15)' 
            : 'rgba(33, 150, 243, 0.15)';
            
          let borderColor = trackType === 'MidiTrack'
            ? 'rgba(147, 0, 215, 0.4)'
            : 'rgba(33, 150, 243, 0.4)';
          
          // Adjust styling based on diff status
          if (eventStatus === 'added') {
            backgroundColor = 'rgba(76, 175, 80, 0.15)';
            borderColor = 'rgba(76, 175, 80, 0.5)';
          } else if (eventStatus === 'removed') {
            backgroundColor = 'rgba(244, 67, 54, 0.05)';
            borderColor = 'rgba(244, 67, 54, 0.4)';
          } else if (eventStatus === 'modified') {
            backgroundColor = 'rgba(255, 152, 0, 0.1)';
            borderColor = 'rgba(255, 152, 0, 0.5)';
          }
          
          const eventStyle: React.CSSProperties = {
            position: 'absolute',
            left: `${leftPercent}%`,
            width: `${Math.max(widthPercent, 0.1)}%`,
            height: trackType === 'MidiTrack' ? '100%' : '100%',
            top: trackType === 'MidiTrack' ? '0' : '0%',
            backgroundColor,
            borderColor,
            borderWidth: '1px',
            borderStyle: eventStatus === 'removed' ? 'dashed' : 'solid',
            borderRadius: '4px',
            overflow: 'hidden',
            opacity: eventStatus === 'removed' ? 0.6 : 1,
            zIndex: eventStatus === 'added' ? 3 : eventStatus === 'removed' ? 1 : 2
          };
          
          // Create event class for styling
          const eventClass = `track-event ${trackType.toLowerCase().replace('track', '')}-event status-${eventStatus}`;
          
          // For tooltip
          const tooltipContent = `${eventStatus === 'added' ? 'Added' : eventStatus === 'removed' ? 'Removed' : eventStatus === 'modified' ? 'Modified' : ''} ${trackType === 'MidiTrack' ? 'MIDI Clip' : 'Audio Clip'} at beat ${startBeat?.toFixed(2)}`;
          
          return (
              <>
              {trackType === 'MidiTrack' && (
                (() => {
                  const { notes, hasChanges } = renderEventNotesWithDiff(
                    trackId,
                    trackName,
                    eventId,
                    currentEvent?.notes,
                    previousEvent?.notes,
                    startBeat,
                    durationBeat,
                    minNote,
                    maxNote,
                    eventStatus
                  );
                  
                  // If event is unchanged and has no changed notes, don't render anything
                  if (eventStatus === 'unchanged' && !hasChanges) {
                    return null;
                  }

                  //get length of notes's children. notes is $$typeof: Symbol(react.element)
                  const notesLength = notes?.length || 0;
                  //get length of notes's children that have the class "status-unchanged"
                  const unchangedNotesLength = notes?.filter((note: any) => note.props.className.includes('status-unchanged')).length || 0;
                  
                  if( notesLength === unchangedNotesLength) { 
                    return null;
                  }
                  
                  return(
                    <div 
                      key={`${eventId}-${eventStatus}`} 
                      className={eventClass}
                      style={eventStyle}
                      title={tooltipContent}
                    >
                    <div className="notes-container">
                      {notes}
                    </div>
                    </div>
                  )
                })()
              )}
              
              {/* Render Audio Clip Info */}
              {trackType === 'AudioTrack' && (
                <div 
                  key={`${eventId}-${eventStatus}`} 
                  className={eventClass}
                  style={eventStyle}
                  title={tooltipContent}
                >
                  <div className={`audio-clip-info ${audioChangeInfo ? 'modified' : ''}`}>
                    <div className="audio-waveform">
                      {/* Fake waveform visualization */}
                      {Array.from({ length: 20 }).map((_, i) => {
                        const seed = 10 + i + (audioChangeInfo ? 1 : 0);
                        const pseudoRandom = Math.sin(seed) * 0.5 + 0.5; // value between 0-1
                        const height = 20 + pseudoRandom * 60;
                        return (
                          <div 
                            key={`wave-${i}`} 
                            className="waveform-bar"
                            style={{ 
                              height: `${height}%`,
                              opacity: eventStatus === 'removed' ? 0.5 : 0.8
                            }}
                          />
                        );
                      })}
                    </div>
                    <div className="audio-name">
                      {audioChangeInfo && (
                        <>
                          <span className="old-audio">{audioChangeInfo.from}</span>
                          <FaArrowRight className="audio-change-arrow" />
                          <span className="new-audio">{audioChangeInfo.to}</span>
                        </>
                      )}
                      {!audioChangeInfo && (
                        event.audio_name || event.audio_file?.split('/').pop() || 'Audio Clip'
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Status indicator */}
              <div className={`event-status-indicator ${eventStatus}`}>
                {eventStatus === 'added' && <FaPlus />}
                {eventStatus === 'removed' && <FaMinus />}
                {eventStatus === 'modified' && <FaPen />}
              </div>
            </>
          );
        })}
      </div>
    );
  };

  const renderTracksWithDiff = () => {
    if (!combinedTracks.length) return (
      <div className="no-tracks-info">No track data available for comparison.</div>
    );
    
    // First, filter to only modified tracks (or tracks that match viewMode)
    const filteredTracks = combinedTracks.filter(({ trackId, current, previous }) => {
      const track = current || previous;
      if (!track) return false;
      
      const trackName = track.name;
      
      // Determine track status
      let status: 'added' | 'removed' | 'modified' | 'unchanged' = 'unchanged';
      
      // Check for added/removed from trackAddRemove
      const addRemChange = safeDiff.trackAddRemove?.find(c => c.trackName === trackName);
      if (addRemChange) {
        status = addRemChange.type as 'added' | 'removed';
      }
      // Check if modified from summary
      else if (safeDiff.summary.modifiedTracks.includes(trackName)) {
        status = 'modified';
      }
      
      // Filter by status
      if (viewMode === 'all') {
        // In 'all' mode, only show tracks with changes (exclude unchanged)
        return status !== 'unchanged';
      } else {
        // In other modes, only show tracks matching that specific mode
        return status === viewMode;
      }
    });
    
    if (filteredTracks.length === 0) {
      return (
        <div className="no-tracks-info">
          {viewMode === 'all' 
            ? "No tracks were changed in this commit."
            : `No tracks were ${viewMode} in this commit.`}
        </div>
      );
    }
    
    return filteredTracks.map(({ trackId, current, previous }, index) => {
      const track = current || previous;
      if (!track) return null;
      
      const trackName = track.name;
      const trackType = track.type;
      
      // Determine track status using diffData
      let status: 'added' | 'removed' | 'modified' | 'unchanged' = 'unchanged';
      
      // Check for added/removed first
      const addRemoveInfo = diffData?.trackAddRemove?.find(change => 
        change.trackName === trackName
      );
      
      // first look in trackAddRemove:
      const addRemChange = safeDiff.trackAddRemove?.find(c => c.trackName === trackName);
      if (addRemChange) {
        // c.type is "added" or "removed"
        status = addRemChange.type as 'added' | 'removed';
      }
      // if it wasn’t added/removed, fall back to “modified” from the summary
      else if (safeDiff.summary.modifiedTracks.includes(trackName)) {
        status = 'modified';
      }
      // otherwise it stays 'unchanged'
      // Skip tracks that don't match our view filter
      if (viewMode !== 'all' && viewMode !== status) {
        return null;
      }
      
      // See if track has any parameter changes
      const paramChanges = diffData?.trackParameterChanges?.filter(change => 
        change.trackName === trackName
      );
      
      // Get track height based on vertical zoom and track type
      const trackHeight = verticalZoom * (trackType === 'MidiTrack' ? 2 : 1.5);
      
      // Create track class for styling
      const trackClass = `track ${trackType.toLowerCase().replace('track', '')}-track status-${status} ${activeTrack === trackId ? 'active' : ''}`;
      
      // For MIDI tracks, get the note ranges to show
      const { minNote, maxNote } = trackMidiRanges[trackId] || { minNote: 36, maxNote: 84 };
      
      return (
        <div 
          key={trackId} 
          className={trackClass}
          style={{ height: `${trackHeight}px` }}
          onClick={() => setActiveTrack(trackId === activeTrack ? null : trackId)}
        >
          {/* Track Header */}
          <div className="track-header">
            <div className="track-header-top">
              <span className="track-number">{index + 1}</span>
              <h3 className="track-name">{trackName}</h3>
            </div>
            
            <div className="track-header-middle">
              <span className={`track-type ${trackType.toLowerCase().replace('track', '')}`}>
                {trackType.replace('Track', '')}
              </span>
              
              {status === 'added' && <span className="diff-indicator added"><FaPlus /> Added</span>}
              {status === 'removed' && <span className="diff-indicator removed"><FaMinus /> Removed</span>}
              {status === 'modified' && <span className="diff-indicator modified"><FaPen /> Modified</span>}
            </div>
            
            {/* Show parameter changes if any */}
            {paramChanges && paramChanges.length > 0 && (
              <div className="track-parameters">
                {paramChanges.map((change, i) => (
                  <div key={`param-${i}`} className="parameter-change">
                    <span className="param-name">{change.parameter}:</span>
                    <span className="param-old">{change.from?.toFixed(2)}</span>
                    <FaArrowRight className="param-arrow" />
                    <span className="param-new">{change.to?.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
            
            {/* MIDI Range Info */}
            {trackType === 'MidiTrack' && (
              <div className="track-midi-range">
                <span className="range-label">Range:</span>
                <span className="range-value">
                  {minNote} - {maxNote}
                </span>
              </div>
            )}
          </div>
          
          {/* Track Content */}
          <div className="track-content">
            {/* Render piano roll for MIDI tracks */}
            {trackType === 'MidiTrack' && (
              renderPianoRoll(track, index)
            )}
            
            {/* Render events based on status */}
            {renderTrackEventsWithDiff(trackId, trackName, trackType, status)}
            
            {/* Overlay for removed tracks */}
            {status === 'removed' && (
              <div className="removed-track-overlay">
                <span>Removed in this version</span>
              </div>
            )}
          </div>
        </div>
      );
    });
  };
  
  const renderFilterOptions = () => {
    return (
      <div className="filter-options">
        <button 
          className={`filter-btn ${viewMode === 'all' ? 'active' : ''}`}
          onClick={() => setViewMode('all')}
        >
          All Changes
        </button>
        <button
          className={`filter-btn ${viewMode === 'added' ? 'active' : ''}`}
          onClick={() => setViewMode('added')}
        >
          <FaPlus /> Added
        </button>
        <button
          className={`filter-btn ${viewMode === 'removed' ? 'active' : ''}`}
          onClick={() => setViewMode('removed')}
        >
          <FaMinus /> Removed
        </button>
        <button
          className={`filter-btn ${viewMode === 'modified' ? 'active' : ''}`}
          onClick={() => setViewMode('modified')}
        >
          <FaPen /> Modified
        </button>
      </div>
    );
  };

  const getTimelineWidth = (zoom: number) =>
  {
    //our tracks container width is zoom% - 220px
    //since the timeline with is screenWidth - 220px the same calcualtion will not work
    //for the timeline width
    //so we will use the screen width to calculate the timeline width
    // const tracksContainerWidth = (zoom / 100) * (window.innerWidth - 220);
    let screenWidth = window.innerWidth - 1 * window.innerWidth / 150;
    let sizeIncrease = screenWidth * zoom / 100 - screenWidth;
    let timelineWidth = screenWidth + sizeIncrease;
    return timelineWidth - 220;
    
  }
  
  const renderChangesSummary = () => {
    if (!diffData) return null;
    
    const { 
      totalChanges, 
      addedTracks, 
      removedTracks,
      modifiedTracks 
    } = diffData.summary;
    
    const noteChanges = (diffData.noteChanges || []).length;
    const velocityChanges = (diffData.velocityChanges || []).length;
    const parameterChanges = (diffData.trackParameterChanges || []).length;
    const audioChanges = (diffData.audioFileChanges || []).length;
    
    return (
      <div className="changes-summary compact">
        <div className="summary-header">
          <h3>Changes Summary</h3>
          <span className="total-changes">
            <strong>{totalChanges}</strong> total changes
          </span>
        </div>
        
        <div className="summary-stats">
          <div className="stat-group tracks">
            <div className="summary-stat">
              <FaPlus className="stat-icon added" />
              <span className="stat-value">{addedTracks.length}</span>
              <span className="stat-label">Added</span>
            </div>
            <div className="summary-stat">
              <FaMinus className="stat-icon removed" />
              <span className="stat-value">{removedTracks.length}</span>
              <span className="stat-label">Removed</span>
            </div>
            <div className="summary-stat">
              <FaPen className="stat-icon modified" />
              <span className="stat-value">{modifiedTracks.length}</span>
              <span className="stat-label">Modified</span>
            </div>
          </div>
          
          <div className="stat-divider"></div>
          
          <div className="stat-group changes">
            <div className="summary-stat">
              <span className="stat-value">{noteChanges}</span>
              <span className="stat-label">Notes</span>
            </div>
            <div className="summary-stat">
              <span className="stat-value">{velocityChanges}</span>
              <span className="stat-label">Velocity</span>
            </div>
            <div className="summary-stat">
              <span className="stat-value">{parameterChanges}</span>
              <span className="stat-label">Params</span>
            </div>
            <div className="summary-stat">
              <span className="stat-value">{audioChanges}</span>
              <span className="stat-label">Audio</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  
  // --- Main Render ---
  if (loading) {
    let loadingMessage = "Initializing comparison engine";
    
    switch(loadingStage) {
      case 'fetching':
        loadingMessage = "Retrieving project data";
        break;
      case 'extracting':
        loadingMessage = "Decompressing project archives";
        break;
      case 'analyzing':
        loadingMessage = "Analyzing track modifications";
        break;
      case 'finalizing':
        loadingMessage = "Finalizing visual diff representation";
        break;
    }
    
    return <LoadingSpinner message={loadingMessage} fullScreen />;
  }

  if (error) {
    return (
      <div className="diff-error">
        <FaExclamationTriangle />
        <div className="error-message">Error: {error}</div>
      </div>
    );
  }


  if (!diffData || (!currentProjectData && !previousProjectData)) {
    return (
      <div className="diff-info">
        <FaInfoCircle />
        <div className="info-message">
          No comparison data available to display. This might be the first commit or data failed to load.
        </div>
      </div>
    );
  }

  const prevHashShort = prevHash?.substring(0, 7);
  const currHashShort = currentHash?.substring(0, 7);

  return (
    <div className="diff-viewer-container">
      {/* Header with controls */}
      <div className="diff-viewer-header">
        {/* Left: Title & Commit Info */}
        <div className="header-section">
          <h2>
            <button
              className="back-btn"
              onClick={() => navigate(`/project/${projectId}/history`)}
              title="Back to History"
            > 
              <FaArrowLeft /> Back
            
            </button>
            
            {prevHashShort ? `${prevHashShort}` : 'Initial Commit'}
            <span style ={{opacity: 0.5}}> vs </span>
            {currHashShort}
            <span style ={{opacity: 0.5}}> - </span>
            Changes
          </h2>
        </div>
        
        {/* Middle: Filter Options */}
        {/* <div className="header-section">
          {renderFilterOptions()}
        </div> */}
        
        {/* Right: Zoom Controls */}
        <div className="header-section controls">
          <div className="zoom-controls">
            <button
              className="control-btn"
              onClick={() => setZoom(Math.max(50, zoom - 25))}
              title="Zoom Out Horizontal"
            >
              <FaSearchMinus />
            </button>
            <span className="zoom-value">{zoom}%</span>
            <button
              className="control-btn"
              onClick={() => setZoom(Math.min(400, zoom + 25))}
              title="Zoom In Horizontal"
            >
              <FaSearchPlus />
            </button>
            
            <span className="control-divider" />
            
            <button
              className="control-btn"
              onClick={() => setVerticalZoom(Math.max(50, verticalZoom - 25))}
              title="Decrease Track Height"
            >
              <BiDice1 />
            </button>
            <span className="zoom-value">{verticalZoom}%</span>
            <button
              className="control-btn"
              onClick={() => setVerticalZoom(Math.min(200, verticalZoom + 25))}
              title="Increase Track Height"
            >
              <BiDice6 />
            </button>
            
            <span className="control-divider" />
            
            <button
              className="control-btn"
              onClick={() => setLockScrolling(!lockScrolling)}
              title={lockScrolling ? "Unlock Scrolling" : "Lock Scrolling"}
            >
              {lockScrolling ? <FaLock /> : <FaLockOpen />}
            </button>
          </div>
        </div>
      </div>
      
      {/* Summary Panel */}
      {renderChangesSummary()}
      
      {/* Main Content Area */}
      <div 
      className="diff-viewer-content"
      onWheel={handleWheel}
      >
        {/* Scrollable Timeline */}
        <div 
          className="timeline-scroll-container" 
          ref={timelineScrollRef} 
          onScroll={() => handleScroll('timeline')}
        >
          <div className="timeline" style={{ width: getTimelineWidth(zoom) }}>
            {renderTimelineMarkers()}
            {renderPlayhead()}
          </div>
        </div>
        
        {/* Tracks Container */}
        <div 
          className="tracks-scroll-container" 
          ref={tracksScrollRef} 
          onScroll={() => handleScroll('tracks')}
        >
          {/* Track Background Grid */}
          <div className="tracks-background-grid" style={{ width: `calc(${zoom}% - 220px)` }}>
            {/* Render vertical beat lines */}
            {Array.from({ length: Math.ceil(totalBeats / 4) + 1 }).map((_, i) => (
              <div 
                key={`grid-${i}`}
                className={`grid-line ${i % 4 === 0 ? 'major' : 'minor'}`}
                style={{ left: `${calculateLeftPercent(i * 4, totalBeats)}%` }}
              />
            ))}
          </div>
          
          {/* Tracks */}
          <div 
            className="tracks-container" 
            style={{ width: `${zoom}%` }}
          >
            {renderTracksWithDiff()}
          </div>
        </div>
      </div>
      
    

      {/* Interactive Footer Controls */}
      <div className="diff-footer">
        <div className="diff-footer-left">
          <button className="footer-btn" onClick={() => setViewMode('all')}>
            <span className="footer-btn-indicator" style={{ background: viewMode === 'all' ? '#9c27b0' : 'transparent' }}/>
            All
          </button>
          <button className="footer-btn" onClick={() => setViewMode('added')}>
            <span className="footer-btn-indicator" style={{ background: viewMode === 'added' ? '#4CAF50' : 'transparent' }}/>
            Added
          </button>
          <button className="footer-btn" onClick={() => setViewMode('removed')}>
            <span className="footer-btn-indicator" style={{ background: viewMode === 'removed' ? '#F44336' : 'transparent' }}/>
            Removed
          </button>
          <button className="footer-btn" onClick={() => setViewMode('modified')}>
            <span className="footer-btn-indicator" style={{ background: viewMode === 'modified' ? '#FF9800' : 'transparent' }}/>
            Modified
          </button>
        </div>
       
        
        <div className="diff-footer-right">
          <button 
            className="footer-btn"
            onClick={() => setZoom(100)}
            title="Reset Zoom"
          >
            <FaExpand /> <span>{zoom}%</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default DiffViewer;