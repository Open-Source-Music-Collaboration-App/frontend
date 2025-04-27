// src/components/VisualDiffTimeline.tsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthProvider";

//
// ─── TYPES ─────────────────────────────────────────────────────────────────────
//
interface DiffResponse {
  noteChanges: Array<{
    type: "noteAdded" | "noteRemoved";
    trackName: string;
    note: string;
    beat: number;
  }>;
}

interface Note {
  time: number;
  pitch: number;
  duration: number;
  type: "added" | "removed";
}

interface VisualDiffTimelineProps {
  projectId: string;
  commitHash: string;
  width?: number;
  height?: number;
}
//
// ─── COMPONENT ────────────────────────────────────────────────────────────────
//

const VisualDiffTimeline: React.FC<VisualDiffTimelineProps> = ({
  projectId,
  commitHash,
  width = 800,
  height = 300,
}) => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.username || !projectId || !commitHash) return;
    setLoading(true);
    axios
      .get<DiffResponse>(
        `http://localhost:3333/api/history/diff/${user.username}/${projectId}/${commitHash}`,
        { withCredentials: true },
      )
      .then((res) => {
        const all: Note[] = res.data.noteChanges.map((c) => ({
          time: c.beat,
          pitch: Number(c.note),
          duration: 1,
          type: c.type === "noteAdded" ? "added" : "removed",
        }));
        setNotes(all);
      })
      .catch((err) => {
        console.error(err);
        setError("Could not load diff data.");
      })
      .finally(() => setLoading(false));
  }, [user, projectId, commitHash]);

  if (loading) {
    return <div>Loading diff…</div>;
  } else if (notes.length === 0) {
    // no diffs → ("no changes" message)
    return "No changes";
  } else if (error) {
    return <div style={{ color: "red" }}>{error}</div>;
  }
  if (notes.length === 0) return <div>No note changes to display.</div>;

  //
  // ─── LAYOUT CALCS ───────────────────────────────────────────────────────────
  //
  const pad = { top: 40, right: 20, bottom: 30, left: 40 };
  const dw = width - pad.left - pad.right;
  const dh = height - pad.top - pad.bottom;

  const times = notes.flatMap((n) => [n.time, n.time + n.duration]);
  const pitches = notes.map((n) => n.pitch);
  const t0 = Math.min(...times, 0);
  const t1 = Math.max(...times, 1);
  const p0 = Math.min(...pitches, 0);
  const p1 = Math.max(...pitches, 127);

  const xFor = (t: number) => pad.left + ((t - t0) / (t1 - t0)) * dw;
  const yFor = (p: number) => pad.top + ((p1 - p) / (p1 - p0)) * dh;

  const timeTicks = Array.from(
    { length: Math.ceil(t1 - t0) + 1 },
    (_, i) => t0 + i,
  );
  const pitchTicks = Array.from(
    { length: Math.floor((p1 - p0) / 12) + 2 },
    (_, i) => Math.round(p0 + i * 12),
  );

  //
  // ─── RENDER ──────────────────────────────────────────────────────────────────
  //
  return (
    <div
      style={{
        position: "relative",
        width,
        height: height + 20,
        background: "#1a1a1a",
        borderRadius: 8,
        overflow: "hidden",
        fontFamily: "sans-serif",
      }}
    >
      {/* horizontal pitch lines */}
      {pitchTicks.map((pt, i) => {
        const y = yFor(pt);
        return (
          <React.Fragment key={i}>
            <div
              style={{
                position: "absolute",
                left: pad.left,
                top: y,
                width: dw,
                height: 1,
                background: "#333",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 6,
                top: y - 6,
                color: "#888",
                fontSize: 10,
              }}
            >
              {pt}
            </div>
          </React.Fragment>
        );
      })}

      {/* vertical time lines */}
      {timeTicks.map((tt, i) => {
        const x = xFor(tt);
        return (
          <React.Fragment key={i}>
            <div
              style={{
                position: "absolute",
                top: pad.top,
                left: x,
                height: dh,
                width: 1,
                background: "#333",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: height - pad.bottom + 4,
                left: x - 6,
                color: "#888",
                fontSize: 10,
              }}
            >
              {Math.round(tt)}
            </div>
          </React.Fragment>
        );
      })}

      {/* note blocks */}
      {notes.map((n, i) => {
        const x0 = xFor(n.time);
        const x1 = xFor(n.time + n.duration);
        const y = yFor(n.pitch) - 4;
        const w = x1 - x0;
        const color = n.type === "added" ? "#2ecc71" : "#e74c3c";
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x0,
              top: y,
              width: w,
              height: 8,
              background: color,
              borderRadius: 2,
              opacity: 0.9,
            }}
          />
        );
      })}

      {/* legend */}
      <div
        style={{
          position: "absolute",
          bottom: 8,
          left: 8,
          display: "flex",
          alignItems: "center",
          color: "#fff",
          fontSize: 12,
        }}
      >
        <span
          style={{
            display: "inline-block",
            width: 12,
            height: 12,
            background: "#2ecc71",
            marginRight: 4,
            borderRadius: 2,
          }}
        />
        Added
        <span
          style={{
            display: "inline-block",
            width: 12,
            height: 12,
            background: "#e74c3c",
            margin: "0 4px 0 12px",
            borderRadius: 2,
          }}
        />
        Removed
      </div>
    </div>
  );
};

export default VisualDiffTimeline;
