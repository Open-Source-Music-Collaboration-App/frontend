export interface Note {
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

export interface Loop {
  start: string; // in beats
  end: string;   // in beats
  on: string;
}

export interface Event {
  start: string; // in beats (global)
  end: string;   // in beats (global)
  loop?: Loop;
  notes?: Note[];
  audio_name?: string;
  audio_file?: string;
}


export interface Track {
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

export interface ProjectData {
  project: string;
  tempo: number;   // BPM
  tracks: Track[];
}