import { FormEvent, useEffect, useState } from "react";
import axios from "axios";
import { FaCommentDots, FaPaperPlane } from "react-icons/fa";
import { Link } from "react-router-dom";
import { apiUrl } from "../../config/api";
import { useAuth } from "../../context/AuthProvider";
import "./ProjectDiscussion.css";

type Comment = { id: string; message: string; created_at: string; User?: { id: string; name: string; avatar_url?: string } };

export default function ProjectDiscussion({ projectId, compact = false }: { projectId: string; compact?: boolean }) {
  const { user } = useAuth() as { user: any };
  const [comments, setComments] = useState<Comment[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  useEffect(() => { axios.get(`${apiUrl}/api/comments/project/${projectId}`, { withCredentials: true }).then(({ data }) => setComments(data)).catch(() => setError("Couldn’t load the discussion.")); }, [projectId]);
  const submit = async (event: FormEvent) => { event.preventDefault(); if (!message.trim()) return; setSending(true); setError(""); try { const { data } = await axios.post(`${apiUrl}/api/comments/project/${projectId}`, { message }, { withCredentials: true }); setComments((current) => [...current, data]); setMessage(""); } catch (err) { setError(axios.isAxiosError(err) ? err.response?.data?.error || "Couldn’t post your comment." : "Couldn’t post your comment."); } finally { setSending(false); } };
  if (compact) return <section className="project-discussion project-discussion-compact" onClick={(event) => event.stopPropagation()}><header><span><FaCommentDots /> Comments</span><b>{comments.length}</b></header><p className="discussion-empty">{comments.length ? "Join the conversation on this track." : "No comments on this track yet."}</p><Link className="discussion-link" to={`/project/${projectId}#track-comments`}>View comments →</Link></section>;
  return <section id="track-comments" className="project-discussion" onClick={(event) => event.stopPropagation()}><header><span><FaCommentDots /> Comments</span><b>{comments.length}</b></header>{error && <p className="discussion-error">{error}</p>}<div className="discussion-list">{comments.length ? comments.map((comment) => <article key={comment.id}><img src={comment.User?.avatar_url || `https://avatars.githubusercontent.com/u/${comment.User?.id}?v=4`} alt="" /><div><strong>{comment.User?.name || "outsideSynq member"}</strong><p>{comment.message}</p></div></article>) : <p className="discussion-empty">No comments on this track yet. Start the conversation.</p>}</div>{user && <form onSubmit={submit}><input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Add a comment…" maxLength={2000} /><button disabled={sending || !message.trim()} aria-label="Post comment"><FaPaperPlane /></button></form>}</section>;
}
