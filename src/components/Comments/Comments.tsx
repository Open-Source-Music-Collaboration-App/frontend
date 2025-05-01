import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthProvider';
import axios from 'axios';
import { FaUser, FaTrash, FaPaperPlane } from 'react-icons/fa';
import './Comments.css';
import SendButton from '../UI/SendButton/SendButton';

interface Comment {
  id: number;
  feature_id: number;
  author_id: string;
  message: string;
  created_at: string;
  User?: {
    id: string;
    name: string;
  }
}

interface CommentsProps {
  featureId: number;
}

function Comments({ featureId }: CommentsProps) {
  const { user } = useAuth() as { user: any };
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch comments when the component mounts or featureId changes
  useEffect(() => {
    if (featureId) {
      fetchComments();
    }
  }, [featureId]);

  const fetchComments = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(
        `/api/comments/feature/${featureId}`,
        { withCredentials: true }
      );
      
      setComments(response.data);
    } catch (err) {
      console.error('Failed to fetch comments:', err);
      setError('Failed to load comments. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newComment.trim()) return;
    
    setSubmitting(true);
    setError(null);
    
    try {
      const response = await axios.post(
        `api/comments/`,
        {
          feature_id: featureId,
          author_id: user?.id,
          message: newComment,
        },
        { withCredentials: true }
      );
      
      // Add new comment to the list
      setComments([...comments, response.data]);
      setNewComment('');
    } catch (err) {
      console.error('Failed to add comment:', err);
      setError('Failed to add comment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    try {
      await axios.delete(
        `/api/comments/${commentId}`,
        { withCredentials: true }
      );
      
      // Remove deleted comment from the list
      setComments(comments.filter(comment => comment.id !== commentId));
    } catch (err) {
      console.error('Failed to delete comment:', err);
      setError('Failed to delete comment. Please try again.');
    }
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };


  return (
    <div className="comments-section">
      <h3 className="comments-title">Comments</h3>
      
      {error && (
        <div className="comments-error">
          <span className="error-icon">!</span> {error}
        </div>
      )}
      
      {loading ? (
        <div className="comments-loading">
          <span className="spinner-small"></span> Loading comments...
        </div>
      ) : (
        <div className="comments-list">
          {comments.length === 0 ? (
            <div className="no-comments">No comments yet. Be the first to comment!</div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="comment-item">
                <div className="comment-header">
                  <img src = {`https://avatars.githubusercontent.com/u/${comment.User?.id}?v=4` || 'https://via.placeholder.com/40' } alt="User Avatar" className="user-avatar" />
                  <div className="comment-author">
                    <span style ={{
                      paddingLeft: "8px"
                    }}
                    >{comment.User?.name || 'Unknown user'}</span>
                    <div className="comment-date">
                      {formatDate(comment.created_at)}
                    </div>
                  </div>
                </div>
                
                <div className="comment-message">{comment.message}</div>
                
                {user?.id == comment.author_id && (
                  <button
                    className="delete-comment-btn"
                    onClick={() => handleDeleteComment(comment.id)}
                    title="Delete comment"
                  >
                    <FaTrash />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
      
      <form className="comment-form" onSubmit={handleAddComment}>
        <div className="comment-input-container">
          <textarea
            className="comment-input"
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            disabled={submitting}
            style={{ resize: 'none' }}
            rows={2}
          />
        {/* <button
          type="submit"
          className="submit-comment-btn"
          disabled={!newComment.trim() || submitting}
        >
          {submitting ? (
            <span className="spinner-small"></span>
          ) : (
            <FaPaperPlane />
          )}
        </button> */}
        <SendButton type="submit" disabled={!newComment.trim() || submitting} />
        </div>
      </form>
    </div>
  );
}

export default Comments;