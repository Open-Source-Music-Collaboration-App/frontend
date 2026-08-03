import { FormEvent, useEffect, useState } from "react";
import axios from "axios";
import { FaPaperPlane } from "react-icons/fa";
import { useAuth } from "../../context/AuthProvider";
import { apiUrl } from "../../config/api";

type Comment = { id: string; message: string; User?: { name: string } };
export default function StarterDiscussion({ artist, compact = false }: { artist: string; compact?: boolean }) {
  const { user } = useAuth() as { user: any };
  const [comments, setComments] = useState<Comment[]>([]); const [message, setMessage] = useState("");
  useEffect(() => { axios.get(`${apiUrl}/api/comments/starter/${encodeURIComponent(artist)}`, { withCredentials: true }).then(({ data }) => setComments(data)).catch(() => setComments([])); }, [artist]);
  const submit = async (event: FormEvent) => { event.preventDefault(); if (!message.trim()) return; const { data } = await axios.post(`${apiUrl}/api/comments/starter/${encodeURIComponent(artist)}`, { message }, { withCredentials: true }); setComments((current) => [...current, data]); setMessage(""); };
  return <section className={`starter-chat ${compact ? "starter-chat-compact" : ""}`}>{!compact && <p className="starter-kicker">STARTER TRACK CHAT</p>}<h3>{compact ? "Track comments" : `Talk about ${artist}'s original`}</h3><div className="starter-chat-list">{comments.length ? comments.map((comment) => <p key={comment.id}><b>{comment.User?.name || "OutsideSynq member"}</b>{comment.message}</p>) : <p>{compact ? "No comments yet—start the conversation." : "Ask about the V1, stems, or where you’d take it next."}</p>}</div>{user && <form onSubmit={submit}><input value={message} onChange={(event) => setMessage(event.target.value)} placeholder={compact ? "Comment on this version…" : "Talk about the starter track…"} /><button><FaPaperPlane /></button></form>}</section>;
}
