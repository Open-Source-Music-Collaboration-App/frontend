import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import JSZip from 'jszip';
import { useAuth } from '../../context/AuthProvider';
import { ProjectDiff } from '../../types/ProjectDiff';
import { ProjectData, Track, Event, Note } from '../../types/ProjectData';
import './DiffViewer.css';
import { FaHistory, FaExclamationTriangle, FaInfoCircle, FaPlus, FaMinus, FaPen, FaArrowRight } from 'react-icons/fa';
// Assuming similar utility functions as ALSView might use
// import { beatsToSeconds, formatTime, calculateEventStyle } from '../utils/timelineUtils';

// --- Helper Functions (Simplified - Adapt from ALSView or create) ---
const calculateEventStyle = (event: Event, totalBeats: number, trackType: string): React.CSSProperties => {
  const startBeat = parseFloat(event.start);
  const endBeat = parseFloat(event.end);
  const durationBeat = endBeat - startBeat;

  // Basic percentage calculation (replace with more accurate logic if needed)
  const leftPercent = (startBeat / totalBeats) * 100;
  const widthPercent = (durationBeat / totalBeats) * 100;

  // Basic color - enhance as needed
  const backgroundColor = trackType === 'MidiTrack'
    ? 'rgba(147, 0, 215, 0.1)'
    : 'rgba(33, 150, 243, 0.1)';
  const borderColor = trackType === 'MidiTrack'
    ? 'rgba(147, 0, 215, 0.3)'
    : 'rgba(33, 150, 243, 0.3)';


  return {
    position: 'absolute',
    left: `${leftPercent}%`,
    width: `${Math.max(widthPercent, 0.1)}%`, // Ensure minimum width
    height: '80%', // Example height
    top: '10%',    // Example vertical position
    backgroundColor,
    borderColor,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderRadius: '4px',
    overflow: 'hidden',
    boxSizing: 'border-box',
    cursor: 'pointer',
    // Add transitions if desired
  };
};

const calculateNoteStyle = (note: Note, eventStartBeat: number, eventDurationBeats: number): React.CSSProperties => {
    const noteStartBeat = parseFloat(note.start);
    const noteEndBeat = parseFloat(note.end);
    const noteDurationBeats = noteEndBeat - noteStartBeat;

    const leftPercent = ((noteStartBeat - eventStartBeat) / eventDurationBeats) * 100;
    const widthPercent = (noteDurationBeats / eventDurationBeats) * 100;

    // Map pitch to vertical position (simplified)
    const bottomPercent = ((note.pitch - 20) / 88) * 100; // Assuming MIDI range 20-108 maps to 0-100%

    return {
        position: 'absolute',
        left: `${leftPercent}%`,
        width: `${Math.max(widthPercent, 0.5)}%`,
        bottom: `${Math.max(0, Math.min(100, bottomPercent))}%`,
        height: '4px', // Example height
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        borderRadius: '1px',
    };
};

// --- Component ---
function DiffViewer() {
  const { id: projectId, hash: currentHash } = useParams<{ id: string; hash: string }>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [diffData, setDiffData] = useState<ProjectDiff | null>(null);
  const [currentProjectData, setCurrentProjectData] = useState<ProjectData | null>(null);
  const [previousProjectData, setPreviousProjectData] = useState<ProjectData | null>(null);

  // Refs for potential future interactions (scrolling, zooming - like ALSView)
  const timelineRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
            { withCredentials: true, responseType: 'blob', timeout: 60000 } // Increased timeout
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
               return null; // Treat as non-fatal for fetching
           }
           console.error(`Error fetching project data for commit ${hash}:`, err);
           throw new Error(`Failed to fetch project data for commit ${hash}. ${err.message}`); // Re-throw other errors
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
          previousHash ? fetchProjectJson(previousHash) : Promise.resolve(null) // Only fetch if previous hash exists
        ]);

        if (!currentData && !previousData) {
            throw new Error("Could not load project data for either commit.");
        }

        setCurrentProjectData(currentData);
        setPreviousProjectData(previousData);

        if (!previousHash) {
            console.log("This is the first commit, no previous version to compare.");
            // Potentially set a flag to adjust UI if needed
        } else if (!previousData) {
            console.warn(`Could not load project data for the previous commit (${previousHash}). Showing only current state with additions.`);
        }

      } catch (err: any) {
        console.error("Error loading diff data:", err);
        setError(err.response?.data?.message || err.message || "Failed to load comparison data.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId, currentHash, user]); // Rerun if these change

  // --- Memoized Calculation for Rendering ---
  const { combinedTracks, totalBeats } = useMemo(() => {
    const currentTracks = currentProjectData?.tracks || [];
    const previousTracks = previousProjectData?.tracks || [];
    const allTrackIds = new Set<string>([...currentTracks.map(t => t.id), ...previousTracks.map(t => t.id)]);

    const combined = Array.from(allTrackIds).map(trackId => {
      const current = currentTracks.find(t => t.id === trackId);
      const previous = previousTracks.find(t => t.id === trackId);
      return { trackId, current, previous };
    });

    // Determine max beats (simplified - needs better calculation based on actual content)
    let maxBeat = 100; // Default
     const findMaxBeat = (project: ProjectData | null) => {
         let max = 0;
         project?.tracks.forEach(t => {
             t.events.forEach(e => {
                 max = Math.max(max, parseFloat(e.end));
             });
         });
         return max;
     };
     maxBeat = Math.max(findMaxBeat(currentProjectData), findMaxBeat(previousProjectData), maxBeat);
     // Add some padding
     const calculatedTotalBeats = Math.ceil(maxBeat / 16) * 16; // Round up to nearest 16 beats

    return { combinedTracks: combined, totalBeats: calculatedTotalBeats };
  }, [currentProjectData, previousProjectData]);


  // --- Rendering Logic ---

  const renderTrackEventsWithDiff = (trackId: string, trackName: string, trackType: string) => {
    const currentTrack = currentProjectData?.tracks.find(t => t.id === trackId);
    const previousTrack = previousProjectData?.tracks.find(t => t.id === trackId);
    const currentEvents = currentTrack?.events || [];
    const previousEvents = previousTrack?.events || [];

    // Combine events for rendering order (simplistic approach: previous then current, filter duplicates)
    const allEventIds = new Set([...previousEvents.map(e => e.id), ...currentEvents.map(e => e.id)]);

    return Array.from(allEventIds).map(eventId => {
      const currentEvent = currentEvents.find(e => e.id === eventId);
      const previousEvent = previousEvents.find(e => e.id === eventId);
      const event = currentEvent || previousEvent; // Use whichever exists for positioning info
      if (!event) return null; // Should not happen with Set logic

      const eventChangeInfo = diffData?.eventChanges?.find(ec => ec.trackName === trackName && ec.eventId === eventId); // Match by ID and Name
      const status = currentEvent && previousEvent ? (eventChangeInfo ? 'modified' : 'unchanged') : (currentEvent ? 'added' : 'removed');

      let eventClass = `event ${trackType === 'MidiTrack' ? 'midi-event' : 'audio-event'} ${status}`;
      const style = calculateEventStyle(event, totalBeats, trackType);

      // Add specific change styles
      if (status === 'modified' && eventChangeInfo?.changes) {
         // Example: Highlight if position changed
         if (eventChangeInfo.changes.start || eventChangeInfo.changes.end) {
             style.outline = '2px solid orange';
         }
      }

      const eventStartBeat = parseFloat(event.start);
      const eventDurationBeats = parseFloat(event.end) - eventStartBeat;

      return (
        <div key={eventId} className={eventClass} style={style} title={`Event ${eventId} (${status})`}>
          {/* Render Notes (if MIDI) */}
          {trackType === 'MidiTrack' && (
            <div className="notes-container">
              {renderEventNotesWithDiff(trackName, eventId, currentEvent?.notes || [], previousEvent?.notes || [], eventStartBeat, eventDurationBeats)}
            </div>
          )}
          {/* Render Audio Clip Info */}
          {trackType === 'AudioTrack' && (
            <div className="audio-clip-info">
              {event.audio_name || event.audio_file_path?.split('/').pop() || 'Audio Clip'}
            </div>
          )}
           {/* Add icons for status */}
           {status === 'added' && <FaPlus className="diff-icon added" />}
           {status === 'removed' && <FaMinus className="diff-icon removed" />}
           {status === 'modified' && <FaPen className="diff-icon modified" />}
        </div>
      );
    });
  };

  const renderEventNotesWithDiff = (trackName: string, eventId: string, currentNotes: Note[], previousNotes: Note[], eventStartBeat: number, eventDurationBeats: number) => {
      const allNoteIds = new Set([...previousNotes.map(n => n.id), ...currentNotes.map(n => n.id)]);

      return Array.from(allNoteIds).map(noteId => {
          const currentNote = currentNotes.find(n => n.id === noteId);
          const previousNote = previousNotes.find(n => n.id === noteId);
          const note = currentNote || previousNote;
          if (!note) return null;

          const noteChangeInfo = diffData?.noteChanges?.find(nc => nc.trackName === trackName && nc.eventId === eventId && nc.noteId === noteId);
          const status = currentNote && previousNote ? (noteChangeInfo ? 'modified' : 'unchanged') : (currentNote ? 'added' : 'removed');

          if (status === 'unchanged') return null; // Optionally hide unchanged notes for clarity

          let noteClass = `note ${status}`;
          const style = calculateNoteStyle(note, eventStartBeat, eventDurationBeats);

          // Add specific change styles
          if (status === 'modified' && noteChangeInfo?.changes) {
              // Example: Highlight if pitch changed
              if (noteChangeInfo.changes.pitch) {
                  style.outline = '1px solid orange';
              }
          }

          return (
              <div key={noteId} className={noteClass} style={style} title={`Note ${noteId} (${status})`}></div>
          );
      });
  };


  const renderTracksWithDiff = () => {
    if (!combinedTracks.length) return <div className="no-tracks-info">No track data available for comparison.</div>;

    return combinedTracks.map(({ trackId, current, previous }, index) => {
      const track = current || previous; // Get data from whichever exists
      if (!track) return null; // Should not happen

      const trackName = track.name;
      const trackType = track.type;

      // Determine track status
      const addRemoveInfo = diffData?.trackAddRemove?.find(change => change.trackId === trackId); // Use ID
      let status: 'added' | 'removed' | 'modified' | 'unchanged' = 'unchanged';
      if (current && !previous) status = 'added';
      else if (!current && previous) status = 'removed';
      else if (diffData?.summary.modifiedTracks.includes(trackName)) status = 'modified'; // Fallback to name if needed

      let trackClass = `track ${status}`;

      return (
        <div key={trackId} className={trackClass}>
          <div className="track-header">
             <span className="track-number">{index + 1}</span>
             <h3 className="track-name">{trackName}</h3>
             <span className="track-type">{trackType.replace('Track', '')}</span>
             {status === 'added' && <span className="diff-indicator added"><FaPlus /> Added</span>}
             {status === 'removed' && <span className="diff-indicator removed"><FaMinus /> Removed</span>}
             {status === 'modified' && <span className="diff-indicator modified"><FaPen /> Modified</span>}
          </div>
          <div className="track-content">
            {/* Render events only if track wasn't removed */}
            {status !== 'removed' && renderTrackEventsWithDiff(trackId, trackName, trackType)}
            {/* Optionally render placeholder/ghost of removed track's events */}
            {status === 'removed' && <div className="removed-track-overlay">Removed</div>}
          </div>
        </div>
      );
    });
  };

  // --- Main Render ---
  if (loading) {
    return <div className="diff-loading"><div className="spinner"></div> Loading Comparison...</div>;
  }

  if (error) {
    return <div className="diff-error"><FaExclamationTriangle /> Error: {error}</div>;
  }

  if (!diffData || (!currentProjectData && !previousProjectData)) {
     return <div className="diff-info"><FaInfoCircle /> No comparison data available to display. This might be the first commit or data failed to load.</div>;
  }

  const prevHashShort = diffData.summary.previousCommitHash?.substring(0, 7);
  const currHashShort = currentHash.substring(0, 7);

  return (
    <div className="diff-viewer-container">
      <div className="diff-viewer-header">
        <h2>
          Comparing Changes: {prevHashShort ? `${prevHashShort}` : 'Initial Commit'}
          <FaArrowRight style={{ margin: '0 10px', fontSize: '0.9em', opacity: 0.7 }}/>
          {currHashShort}
        </h2>
        {/* Add Legend/Key Here */}
        <div className="diff-legend">
            <span className="legend-item added"><FaPlus /> Added</span>
            <span className="legend-item removed"><FaMinus /> Removed</span>
            <span className="legend-item modified"><FaPen /> Modified</span>
        </div>
      </div>

      <div className="diff-viewer-content">
         {/* Simplified Timeline */}
         <div className="timeline-container" ref={timelineRef}>
            {/* Render beat markers based on totalBeats */}
            {Array.from({ length: totalBeats / 4 + 1 }).map((_, i) => (
                <div key={i} className="timeline-marker" style={{ left: `${(i * 4 / totalBeats) * 100}%` }}>
                    <span className="timeline-label">{i * 4}</span>
                </div>
            ))}
         </div>

         {/* Tracks */}
         <div className="tracks-scroll-container">
            <div className="tracks-container" ref={containerRef} style={{ width: '200%' /* Example: Allow horizontal scroll */ }}>
               {renderTracksWithDiff()}
            </div>
         </div>
      </div>
    </div>
  );
}

export default DiffViewer;