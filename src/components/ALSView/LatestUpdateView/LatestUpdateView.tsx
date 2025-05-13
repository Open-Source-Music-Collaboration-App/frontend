import "./LatestUpdateView.css";
import Tooltip from "../../Tooltip/Tooltip";

interface LatestUpdateViewProps {
  latestUpdate: {
    author_name: string;
    date: string;
    body: string;
    message: string;
  };
}


function LatestUpdateView({ latestUpdate }: LatestUpdateViewProps) {
  const getTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 30) return `${diffDays}d ago`;
    
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) return `${diffMonths}mo ago`;

    const diffYrs = Math.floor(diffMonths / 12);
    return `${diffYrs}y ago`;
  };

  
  const getChangeStats = (update: any) => {
    // First try to extract Track-Changes from the commit body
    try {
      if (update.body) {
        const trackChangesMatch = update.body.match(/Track-Changes: ({.+})/s);
        if (trackChangesMatch && trackChangesMatch[1]) {
          const trackChanges = JSON.parse(trackChangesMatch[1]);
          
          const addedCount = trackChanges.added?.length || 0;
          const modifiedCount = trackChanges.modified?.length || 0;
          const removedCount = trackChanges.removed?.length || 0;
          
          if (addedCount + modifiedCount + removedCount > 0) {
            return (
              <div className="change-stats">
                {addedCount > 0 && (
                  <span className="stat-badge added">
                    <span className="stat-icon">+</span>
                    <span className="stat-count">{addedCount}</span>
                  </span>
                )}
                {modifiedCount > 0 && (
                  <span className="stat-badge modified">
                    <span className="stat-icon">•</span>
                    <span className="stat-count">{modifiedCount}</span>
                  </span>
                )}
                {removedCount > 0 && (
                  <span className="stat-badge removed">
                    <span className="stat-icon">-</span>
                    <span className="stat-count">{removedCount}</span>
                  </span>
                )}
              </div>
            );
          }
        }
      }
    } catch (error) {
      console.warn("Error parsing Track-Changes JSON:", error);
    }
    
    // Fall back to regex pattern matching from the message
    const trackPattern = /(\d+)\s+(added|removed|modified)\s+tracks?/gi;
    const matches = [...(update.message.matchAll(trackPattern) || [])];
  
    if (matches.length) {
      return (
        <div className="change-stats">
          {matches.map((match, i) => {
            const [, count, type] = match;
            const icon = type === 'added' ? '+' : 
                      type === 'removed' ? '-' : '•';
            const className = `stat-badge ${type}`;
            return (
              <span key={i} className={className}>
                <span className="stat-icon">{icon}</span>
                <span className="stat-count">{count}</span>
              </span>
            );
          })}
        </div>
      );
    }
    
    // If no specific stats found, show a brief excerpt of the message
    return <span className="commit-excerpt">
      <span style ={{opacity: 0.5, marginRight: "5px", color: "#fff"}}>•</span>
      {update.message.slice(0, 50)}{update.message.length > 50 ? '...' : ''}
      </span>;
  };

  function getChangesSummary(update: any) {
    const author = update.author_name;
    const trackChanges = update.body.match(/Track-Changes: ({.+})/s);
    const changes = trackChanges ? JSON.parse(trackChanges[1]) : null;
 

    if (update.message.includes("Restored")) {
      return `${author} restored to a previous version.`;
    }

    if (changes) {
      const added = changes.added ? changes.added.length : 0;
      const modified = changes.modified ? changes.modified.length : 0;
      const removed = changes.removed ? changes.removed.length : 0;

      return `${author} added ${added}, modified ${modified}, and removed ${removed} track(s).`;
    } else {
      return `${author} made a commit.`;
    }
  }



  return (

      <Tooltip content={
        getChangesSummary(latestUpdate)
      } position="bottom" className="tooltip">
        <div className="latest-update-indicator">
            <img 
              src={`https://avatars.githubusercontent.com/u/${latestUpdate.body.match(/User-ID: (.+)$/s)?.[1].substring(0, latestUpdate.body.match(/User-ID: (.+)$/s)?.[1].indexOf("\n") ).trim() || latestUpdate.author_name}?v=4`}  
              alt="Author" 
              className="update-avatar"
              onError={(e) => {(e.target as HTMLImageElement).src = 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png'}}
            />
            <div className="update-content">
              <div className="update-info">
                <span className="update-author">{latestUpdate.author_name.split('<')[0].trim()}</span>
                <span className="update-time">{getTimeAgo(new Date(latestUpdate.date))}</span>
              </div>
              <div className="update-summary">
                {getChangeStats(latestUpdate)}
              </div>
            </div>
        </div>
      </Tooltip>
  );
}

export default LatestUpdateView;