// components/projects/CollaboratorsList.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFunctions, httpsCallable } from 'firebase/functions';
import './CollaboratorsList.css';
import './CreateProject.css';
import './ProjectDetails.css';
import './List.css';
import './Form.css';
import '../users/Avatar.css';
import { Timestamp } from 'firebase/firestore';

// Firebase functions reference
const functions = getFunctions();

// Define Cloud Functions
const getProjectCollaborators = httpsCallable(functions, 'getProjectCollaborators');
const addProjectCollaborator = httpsCallable(functions, 'addProjectCollaborator');
const removeProjectCollaborator = httpsCallable(functions, 'removeProjectCollaborator');
const updateCollaboratorRole = httpsCallable(functions, 'updateCollaboratorRole');

export default function CollaboratorsList({ projectId, ownerId, onCollaboratorUpdated }) {
  const [collaboratorUsers, setCollaboratorUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCollaboratorEmail, setNewCollaboratorEmail] = useState('');
  const [error, setError] = useState('');
  const [addingCollaborator, setAddingCollaborator] = useState(false);
  const [existingEmails, setExistingEmails] = useState(new Set());
  const navigate = useNavigate();

  // Load collaborators
  const fetchCollaborators = async () => {
    try {
      setLoading(true);
      setError('');

      // Call Cloud Function
      const result = await getProjectCollaborators({ projectId });
      const collaboratorsData = result.data.collaborators || [];
      
      // Update email set
      const emailSet = new Set();
      collaboratorsData.forEach(user => {
        if (user.email) {
          emailSet.add(user.email.toLowerCase());
        }
      });

      setCollaboratorUsers(collaboratorsData);
      setExistingEmails(emailSet);
    } catch (err) {
      console.error('Error loading collaborators:', err);
      setError('Failed to load team members.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch collaborators when component mounts
  useEffect(() => {
    if (projectId) {
      fetchCollaborators();
    }
  }, [projectId]);

  // Add collaborator
  const handleAddCollaborator = async (e) => {
    e.preventDefault();

    const trimmedEmail = newCollaboratorEmail.trim().toLowerCase();
    
    if (!trimmedEmail) {
      return setError('Please enter an email address');
    }

    if (existingEmails.has(trimmedEmail)) {
      return setError('This email is already in the project');
    }

    try {
      setError('');
      setAddingCollaborator(true);

      await addProjectCollaborator({
        projectId,
        email: trimmedEmail,
        role: 'Member',
        time: Timestamp.now()
      });
      
      setNewCollaboratorEmail('');
      setExistingEmails(prev => new Set([...prev, trimmedEmail]));
      fetchCollaborators();
      
      if (onCollaboratorUpdated) {
        onCollaboratorUpdated();
      }
    } catch (err) {
      console.error('Error adding collaborator:', err);
      setError('An error occurred: ' + (err.message || 'Could not add user'));
    } finally {
      setAddingCollaborator(false);
    }
  };

  // Remove collaborator
  const handleRemoveCollaborator = async (userId, email) => {
    if (window.confirm('Are you sure you want to remove this user from the project?')) {
      try {
        setError('');
        
        await removeProjectCollaborator({
          projectId,
          userId,
          time: Timestamp.now()
        });
        
        if (email) {
          setExistingEmails(prev => {
            const updated = new Set(prev);
            updated.delete(email.toLowerCase());
            return updated;
          });
        }
        
        fetchCollaborators();
        
        if (onCollaboratorUpdated) {
          onCollaboratorUpdated();
        }
      } catch (err) {
        console.error('Error removing collaborator:', err);
        setError('Error removing user: ' + (err.message || 'Operation failed'));
      }
    }
  };

  // Update collaborator role
  const handleUpdateRole = async (userId, newRole) => {
    try {
      setError('');
      
      await updateCollaboratorRole({
        projectId,
        userId,
        role: newRole,
        time: Timestamp.now()
      });
      
      fetchCollaborators();
      
      if (onCollaboratorUpdated) {
        onCollaboratorUpdated();
      }
    } catch (err) {
      console.error('Error updating role:', err);
      setError('Error updating role: ' + (err.message || 'Operation failed'));
    }
  };

  return (
    <div className="list-container">
      <form onSubmit={handleAddCollaborator} className="collab-form">
        <input
          type="email"
          placeholder="User Email Address"
          value={newCollaboratorEmail}
          onChange={(e) => setNewCollaboratorEmail(e.target.value)}
          className="form-input"
        />
        <button
          type="submit"
          disabled={addingCollaborator}
          className="form-btn form-btn-primary"
        >
          {addingCollaborator ? 'Adding...' : 'Add'}
        </button>
      </form>
      {error && <p className="form-error">{error}</p>}
      
      {loading ? (
        <div className="collaborators-loading">Loading...</div>
      ) : collaboratorUsers.length === 0 ? (
        <p className="collaborators-empty">No users added to this project yet</p>
      ) : (
        <ul className="list">
          {collaboratorUsers.map((user) => (
            <li
              key={user.id}
              className="list-item clickable"
              onClick={() => navigate(`/user/${user.id}`)}
            >
              <div className="avatar medium">
                {user.displayName?.charAt(0).toUpperCase() || '?'}
              </div>
              <div className="list-main">
                <span className="list-title">
                  {user.displayName || 'Unnamed User'}
                  <span className={`list-badge ${user.isOwner ? 'owner' : 'collaborator'}`}>
                    {user.role || (user.isOwner ? 'Project Owner' : 'Member')}
                  </span>
                </span>
                <span className="list-desc">{user.email}</span>
              </div>
              
              {!user.isOwner && (
                <div className="list-actions">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveCollaborator(user.id, user.email);
                    }}
                    className="list-action-btn delete"
                  >
                    Remove
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}