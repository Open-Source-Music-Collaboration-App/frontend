import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import JSZip from 'jszip';
import { useAuth } from '../../context/AuthProvider';
import { ProjectDiff } from '../../types/ProjectDiff';
import { ProjectData, Track, Event, Note } from '../../types/ProjectData';
import './DiffViewer.css';
import {
  FaHistory, FaExclamationTriangle, FaInfoCircle, FaPlus, FaMinus, FaPen, FaArrowRight,
  FaSearchMinus, FaSearchPlus, FaExpand, FaLock, FaLockOpen, FaPlay
} from 'react-icons/fa';
import { BiDice1, BiDice2, BiDice3, BiDice4, BiDice5, BiDice6 } from 'react-icons/bi';

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
  const { id: projectId, hash: currentHash } = useParams<{ id: string; hash: string }>();
  const { user } = useAuth();
  
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
  
  // Refs
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const tracksScrollRef = useRef<HTMLDivElement>(null);
  const isSyncingScroll = useRef(false);

  // --- Data Fetching ---
  useEffect(() => {
    const fetchData = async () => {
      if (!projectId || !currentHash || !user?.username) {
        setError("Missing project ID, commit hash, or user information.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setDiffData(null);
      setCurrentProjectData(null);
      setPreviousProjectData(null);

      const fetchProjectJson = async (hash: string): Promise<ProjectData | null> => {
        console.log(`Fetching project data for commit: ${hash}`);
        try {
          const zipResponse = await axios.get(
            `http://${window.location.hostname}:3333/api/history/${user.username}/${projectId}/${hash}`,
            { withCredentials: true, responseType: 'blob', timeout: 60000 }
          );
          if (zipResponse.status === 204) {
             console.warn(`No content found for commit ${hash}.`);
             return null;
          }
          const zip = await new JSZip().loadAsync(zipResponse.data);
          const jsonFile = zip.file("ableton_project.json");
          if (jsonFile) {
            const jsonContent = await jsonFile.async("string");
            console.log(`Project data loaded for ${hash}.`);
            return JSON.parse(jsonContent);
          } else {
            console.warn(`ableton_project.json not found in commit ${hash}`);
            return null;
          }
        } catch (err: any) {
           if (axios.isAxiosError(err) && err.response?.status === 404) {
               console.warn(`Commit ${hash} not found or project structure missing.`);
               return null;
           }
           console.error(`Error fetching project data for commit ${hash}:`, err);
           throw new Error(`Failed to fetch project data for commit ${hash}. ${err.message}`);
        }
      };

      try {
        // 1. Fetch Diff Data
        console.log(`Fetching diff for commit: ${currentHash}`);
        const diffResponse = await axios.get<ProjectDiff>(
          `http://${window.location.hostname}:3333/api/history/diff/${user.username}/${projectId}/${currentHash}`,
          { withCredentials: true, timeout: 30000 }
        );
        setDiffData(diffResponse.data);
        console.log("Diff data loaded:", diffResponse.data);

        const previousHash = diffResponse.data?.summary?.previousCommitHash;

        // 2. Fetch Current and Previous Project JSON in parallel
        const [currentData, previousData] = await Promise.all([
          fetchProjectJson(currentHash),
          previousHash ? fetchProjectJson(previousHash) : Promise.resolve(null)
        ]);

        if (!currentData && !previousData) {
            throw new Error("Could not load project data for either commit.");
        }

        setCurrentProjectData(currentData);
        setPreviousProjectData(previousData);

        if (!previousHash) {
            console.log("This is the first commit, no previous version to compare.");
        } else if (!previousData) {
            console.warn(`Could not load project data for the previous commit (${previousHash}).`);
        }
      } catch (err: any) {
        console.error("Error loading diff data:", err);
        setError(err.response?.data?.message || err.message || "Failed to load comparison data.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId, currentHash, user]);

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
    if (diffData) {
      // Add IDs of modified tracks
      [...(diffData.summary.modifiedTracks || [])].forEach(trackName => {
        const track = [...currentTracks, ...previousTracks].find(t => t.name === trackName);
        if (track) changedTrackIds.add(track.id);
      });
      
      // Add IDs of added/removed tracks
      diffData.trackAddRemove?.forEach(change => {
        const matchingTrack = [...currentTracks, ...previousTracks].find(t => t.name === change.trackName);
        if (matchingTrack) changedTrackIds.add(matchingTrack.id);
      });
    }

    const combined = Array.from(allTrackIds).map(trackId => {
      const current = currentTracks.find(t => t.id === trackId);
      const previous = previousTracks.find(t => t.id === trackId);
      return { trackId, current, previous };
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
    
    if (diffData?.noteChanges) {
      diffData.noteChanges.forEach(change => {
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
    
    if (diffData?.velocityChanges) {
      diffData.velocityChanges.forEach(change => {
        const trackWithName = [...currentTracks, ...previousTracks].find(t => 
          t.name === change.trackName
        );
        
        if (!trackWithName) return;
        
        const trackId = trackWithName.id;
        
        if (!modifiedNotesByTrack[trackId]) modifiedNotesByTrack[trackId] = [];
        modifiedNotesByTrack[trackId].push(change);
      });
    }

    console.log(removedNotesByTrack)

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
  }, [currentProjectData, previousProjectData, diffData]);

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

  // --- Rendering Functions ---
  const renderTimelineMarkers = () => {
    const markers = [];
    const majorInterval = totalBeats > 128 ? 16 : 4; // Adjust for zoom level
    const minorInterval = majorInterval / 4;
    
    // Add a beat ruler
    for (let beat = 0; beat <= totalBeats; beat += minorInterval) {
      const isMajor = beat % majorInterval === 0;
      const isMinor = beat % majorInterval !== 0 && beat % minorInterval === 0;
      
      markers.push(
        <div
          key={`marker-${beat}`}
          className={`timeline-marker ${isMajor ? 'major' : isMinor ? 'minor' : 'micro'}`}
          style={{ left: `${(beat / totalBeats) * 100}%` }}
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
    trackMaxNote: number
  ) => {
    // Early exit if no notes
    if (!currentNotes && !previousNotes) return null;
    
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
    
    // Track changes from our diffData for this event
    const relevantAddedNotes = (addedNotesByTrack[trackId] || [])
      .filter(note => Math.abs(note.beat - eventStartBeat) < eventDurationBeats);
      
    const relevantRemovedNotes = (removedNotesByTrack[trackId] || [])
      .filter(note => Math.abs(note.beat - eventStartBeat) < eventDurationBeats);

    const relevantModifiedNotes = (modifiedNotesByTrack[trackId] || [])
      .filter(note => Math.abs(note.beat - eventStartBeat) < eventDurationBeats);

    // Process current notes (exist in the current version)
    if (currentNotes?.length) {
      currentNotes.forEach(note => {
        // Handle different note data structures
        let pitch = 0;
        let localStart = 0;
        let duration = 0.25; // Default duration if not specified
        let velocity = 100;  // Default velocity
        
        // Handle ALSView's data structure
        if (note.key?.Value) {
          pitch = parseInt(note.key.Value, 10);
          
          if (note.occurences?.length) {
            // Use the first occurrence
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
        
        // Determine if this note was added according to diff data
        // This is tricky - we need to fuzzy match since exact IDs might not be available
        let status: ProcessedNote['status'] = 'unchanged';
        
        // Check if it's in the added notes list from diff data
        const matchingAddedNote = relevantAddedNotes.find(n => 
          Math.abs(n.beat - globalStart) < 0.1 && // Very close in time
          parseInt(n.note, 10) === pitch           // Same pitch
        );
        
        if (matchingAddedNote) {
          status = 'added';
        } else {
          // Check for modified notes (e.g., velocity changes)
          const matchingModifiedNote = relevantModifiedNotes.find(n => 
            Math.abs(parseFloat(n.note) - pitch) < 0.5 &&
            Math.abs(n.beat - globalStart) < 0.1
          );
          
          if (matchingModifiedNote) {
            status = 'modified';
          }
        }
        
        // Filter by view mode
        if (viewMode !== 'all' && viewMode !== status && status !== 'unchanged') {
          return; // Skip this note if it doesn't match our filter
        }
        
        processedNotes.push({
          id: note.id || `${pitch}-${globalStart}`,
          pitch,
          start: globalStart,
          duration,
          velocity,
          status,
          localStart,
          localEnd: localStart + duration
        });
      });
    }
    
    // Process previous notes (existed in the previous version)
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
        }
        
        const globalStart = eventStartBeat + localStart;
        
        // Check if this note already exists in our list (might have been processed as current)
        const alreadyProcessed = processedNotes.some(n => 
          Math.abs(n.start - globalStart) < 0.1 && 
          n.pitch === pitch
        );
        
        if (alreadyProcessed) return;
        
        // Check if it's a removed note according to diff data
        const matchingRemovedNote = relevantRemovedNotes.find(n => 
          Math.abs(n.beat - globalStart) < 0.1 && 
          parseInt(n.note, 10) === pitch
        );
        
        // Only add it if it was removed - unchanged notes are already represented
        // in the current version
        if (matchingRemovedNote) {
          // Filter by view mode
          if (viewMode !== 'all' && viewMode !== 'removed') {
            return; // Skip this note if it doesn't match our filter
          }
          
          processedNotes.push({
            id: note.id || `removed-${pitch}-${globalStart}`,
            pitch,
            start: globalStart,
            duration,
            velocity,
            status: 'removed',
            localStart,
            localEnd: localStart + duration
          });
        }
      });
    }
    
    if (processedNotes.length === 0) return null;
    
    // Calculate position and appearance of each note
    return processedNotes.map(note => {
      // Calculate vertical position (piano roll style)
      const trackNoteRange = Math.max(trackMaxNote - trackMinNote, 12); // Ensure minimum range of 12 semitones
      const notePosition = (trackMaxNote - note.pitch) / trackNoteRange;
      const noteHeight = Math.min(100 / trackNoteRange, 3); // Cap the height percentage
      
      // Horizontal position and width
      const leftPercent = ((note.start - eventStartBeat) / eventDurationBeats) * 100;
      const widthPercent = (note.duration / eventDurationBeats) * 100;
      
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
    
    // Calculate MIDI note range for this track
    const { minNote, maxNote } = trackMidiRanges[trackId] || { minNote: 36, maxNote: 84 };
    
    // Combine all event IDs from both versions
    const allEventIds = new Set([
      ...currentEvents.map(e => e.id), 
      ...previousEvents.map(e => e.id)
    ]);

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
          const currentEvent = currentEvents.find(e => e.id === eventId);
          const previousEvent = previousEvents.find(e => e.id === eventId);
          
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
          const leftPercent = (startBeat / totalBeats) * 100;
          const widthPercent = (durationBeat / totalBeats) * 100;
          
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
            height: trackType === 'MidiTrack' ? '100%' : '80%',
            top: trackType === 'MidiTrack' ? '0' : '10%',
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
          const tooltipContent = `${eventStatus === 'added' ? 'Added' : eventStatus === 'removed' ? 'Removed' : eventStatus === 'modified' ? 'Modified' : ''} ${trackType === 'MidiTrack' ? 'MIDI Clip' : 'Audio Clip'} at beat ${startBeat.toFixed(2)}`;
          
          return (
            <div 
              key={`${eventId}-${eventStatus}`} 
              className={eventClass}
              style={eventStyle}
              title={tooltipContent}
            >
              {/* Render Notes if MIDI */}
              {trackType === 'MidiTrack' && (
                <div className="notes-container">
                  {renderEventNotesWithDiff(
                    trackId,
                    trackName,
                    eventId,
                    currentEvent?.notes,
                    previousEvent?.notes,
                    startBeat,
                    durationBeat,
                    minNote,
                    maxNote
                  )}
                </div>
              )}
              
              {/* Render Audio Clip Info */}
              {trackType === 'AudioTrack' && (
                <div className={`audio-clip-info ${audioChangeInfo ? 'modified' : ''}`}>
                  <div className="audio-waveform">
                    {/* Fake waveform visualization */}
                    {Array.from({ length: 20 }).map((_, i) => (
                      <div 
                        key={`wave-${i}`} 
                        className="waveform-bar"
                        style={{ 
                          height: `${20 + Math.random() * 60}%`,
                          opacity: eventStatus === 'removed' ? 0.5 : 0.8
                        }}
                      />
                    ))}
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
              )}
              
              {/* Status indicator */}
              <div className={`event-status-indicator ${eventStatus}`}>
                {eventStatus === 'added' && <FaPlus />}
                {eventStatus === 'removed' && <FaMinus />}
                {eventStatus === 'modified' && <FaPen />}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderTracksWithDiff = () => {
    if (!combinedTracks.length) return (
      <div className="no-tracks-info">No track data available for comparison.</div>
    );
    
    return combinedTracks.map(({ trackId, current, previous }, index) => {
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
      
      if (addRemoveInfo?.type === 'added') status = 'added';
      else if (addRemoveInfo?.type === 'removed') status = 'removed';
      // Then check for modified
      else if (diffData?.summary.modifiedTracks.includes(trackName)) status = 'modified';
      
      // Skip tracks that don't match our view filter
      if (viewMode !== 'all' && viewMode !== status && status !== 'unchanged') {
        return null;
      }
      
      // See if track has any parameter changes
      const paramChanges = diffData?.trackParameterChanges?.filter(change => 
        change.trackName === trackName
      );
      
      // Get track height based on vertical zoom and track type
      const baseHeight = trackType === 'MidiTrack' ? 150 : 90;
      const trackHeight = baseHeight * (verticalZoom / 100);
      
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
                    <span className="param-old">{change.from.toFixed(2)}</span>
                    <FaArrowRight className="param-arrow" />
                    <span className="param-new">{change.to.toFixed(2)}</span>
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
      <div className="changes-summary">
        <h3>Changes Summary</h3>
        <div className="summary-stats">
          <div className="summary-stat">
            <span className="stat-value">{totalChanges}</span>
            <span className="stat-label">Total Changes</span>
          </div>
          <div className="summary-stat">
            <span className="stat-value">{addedTracks.length}</span>
            <span className="stat-label">Tracks Added</span>
          </div>
          <div className="summary-stat">
            <span className="stat-value">{removedTracks.length}</span>
            <span className="stat-label">Tracks Removed</span>
          </div>
          <div className="summary-stat">
            <span className="stat-value">{modifiedTracks.length}</span>
            <span className="stat-label">Tracks Modified</span>
          </div>
          <div className="summary-stat">
            <span className="stat-value">{noteChanges}</span>
            <span className="stat-label">Note Changes</span>
          </div>
          <div className="summary-stat">
            <span className="stat-value">{velocityChanges}</span>
            <span className="stat-label">Velocity Changes</span>
          </div>
          <div className="summary-stat">
            <span className="stat-value">{parameterChanges}</span>
            <span className="stat-label">Parameter Changes</span>
          </div>
          <div className="summary-stat">
            <span className="stat-value">{audioChanges}</span>
            <span className="stat-label">Audio Changes</span>
          </div>
        </div>
      </div>
    );
  };

  // --- Main Render ---
  if (loading) {
    return (
      <div className="diff-loading">
        <div className="spinner"></div>
        <div className="loading-text">Loading Project Comparison...</div>
      </div>
    );
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

  const prevHashShort = diffData.summary.previousCommitHash?.substring(0, 7);
  const currHashShort = currentHash.substring(0, 7);

  return (
    <div className="diff-viewer-container">
      {/* Header with controls */}
      <div className="diff-viewer-header">
        {/* Left: Title & Commit Info */}
        <div className="header-section">
          <h2>
            <FaHistory className="header-icon" />
            Comparing Changes: {prevHashShort ? `${prevHashShort}` : 'Initial Commit'}
            <FaArrowRight className="arrow-icon" />
            {currHashShort}
          </h2>
        </div>
        
        {/* Middle: Filter Options */}
        <div className="header-section">
          {renderFilterOptions()}
        </div>
        
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
      <div className="diff-viewer-content">
        {/* Scrollable Timeline */}
        <div 
          className="timeline-scroll-container" 
          ref={timelineScrollRef} 
          onScroll={() => handleScroll('timeline')}
        >
          <div className="timeline" style={{ width: `${zoom}%` }}>
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
          <div className="tracks-background-grid" style={{ width: `${zoom}%` }}>
            {/* Render vertical beat lines */}
            {Array.from({ length: Math.ceil(totalBeats / 4) + 1 }).map((_, i) => (
              <div 
                key={`grid-${i}`}
                className={`grid-line ${i % 4 === 0 ? 'major' : 'minor'}`}
                style={{ left: `${(i * 4 / totalBeats) * 100}%` }}
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
      
      {/* Legend */}
      <div className="diff-legend">
        <div className="legend-item added">
          <FaPlus /> <span>Added</span>
        </div>
        <div className="legend-item removed">
          <FaMinus /> <span>Removed</span>
        </div>
        <div className="legend-item modified">
          <FaPen /> <span>Modified</span>
        </div>
      </div>
    </div>
  );
}

export default DiffViewer;