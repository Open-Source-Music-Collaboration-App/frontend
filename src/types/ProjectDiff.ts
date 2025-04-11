/**
 * Defines the structure of the diff data returned from the backend
 */
export interface ProjectDiff {
  summary: {
    totalChanges: number;
    changedTracks: string[];
    addedTracks: string[];
    removedTracks: string[];
    modifiedTracks: string[];
  };
  
  // Note changes (added/removed notes)
  noteChanges: Array<{
    type: 'noteAdded' | 'noteRemoved';
    trackName: string;
    note: string;
    beat: number;
    description: string;
  }>;
  
  // Velocity changes
  velocityChanges: Array<{
    type: 'velocity';
    trackName: string;
    note: string;
    from: number;
    to: number;
    description: string;
  }>;
  
  // Track parameter changes (volume, etc.)
  trackParameterChanges: Array<{
    type: 'volume' | 'volumeMin' | 'volumeMax';
    trackName: string;
    parameter: string;
    from: number;
    to: number;
    description: string;
  }>;
  
  // Loop changes
  loopChanges: Array<{
    type: 'loopPoints' | 'loopEnabled';
    trackName: string;
    from: any; // Can be { start: number, end: number } or boolean
    to: any;   // Can be { start: number, end: number } or boolean
    description: string;
  }>;
  
  // Audio file changes
  audioFileChanges: Array<{
    type: 'audioSource' | 'audioClip';
    trackName: string;
    from: string;
    to: string;
    position?: number; // Only for audioClip
    description: string;
  }>;
  
  // Track additions/removals
  trackAddRemove: Array<{
    type: 'added' | 'removed';
    trackName: string;
    trackType: string;
    description: string;
  }>;
}