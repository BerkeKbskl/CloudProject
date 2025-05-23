// components/projects/ProjectItem.js
import React from 'react';
import { Link } from 'react-router-dom';
import './ProjectItem.css';
import './List.css';

export default function ProjectItem({ project, isOwner, isCollaborator, isPublic }) {
  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'No date';
    const date = timestamp.toDate();
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  // Get visibility badge class and text
  const getVisibilityInfo = () => {
    return {
      class: project.visibility === 'public' ? 'public' : 'private',
      text: project.visibility === 'public' ? 'Public' : 'Private'
    };
  };

  const visibilityInfo = getVisibilityInfo();

  // Determine role badge for the project
  const getRoleBadge = () => {
    if (isOwner) {
      return (
        <span className="role-badge owner">
          <i className="icon-crown"></i> Owner
        </span>
      );
    } else if (isCollaborator) {
      return (
        <span className="role-badge collaborator">
          <i className="icon-users"></i> Team Member
        </span>
      );
    }
    return null; // Remove the public badge since we already show visibility
  };

  return (
    <div className="list-container">
      <div className={`list-item ${isPublic ? 'public-project' : ''}`}>
        <div className="list-main">
          <span className="list-title">
            <Link to={`/projects/${project.id}`}>
              {project.name}
            </Link>
            <span className={`list-badge ${visibilityInfo.class}`}>
              {visibilityInfo.text}
            </span>
            {getRoleBadge()}
          </span>
          <div className="list-meta">
            <span>
              <i className="icon-calendar"></i> {formatDate(project.createdAt)}
            </span>
            {project.ownerName && isPublic && (
              <span>
                <i className="icon-user"></i> {project.ownerName}
              </span>
            )}
          </div>
          <span className="list-desc">
            {project.description || 'No description provided for this project.'}
          </span>
        </div>
        <div className="list-actions">
          <Link
            to={`/projects/${project.id}`}
            className="list-action-btn"
          >
            View Details
          </Link>
        </div>
      </div>
    </div>
  );
}