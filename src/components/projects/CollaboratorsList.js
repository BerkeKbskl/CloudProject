// components/projects/CollaboratorsList.js
import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { useProjects } from '../../contexts/ProjectContext';
import { useNavigate } from 'react-router-dom';
import './CollaboratorsList.css';
import './CreateProject.css';
import './ProjectDetails.css';
import './List.css';
import './Form.css';
import '../users/Avatar.css';

export default function CollaboratorsList({ projectId, collaborators = [], ownerId, onCollaboratorUpdated }) {
  const [collaboratorUsers, setCollaboratorUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCollaboratorEmail, setNewCollaboratorEmail] = useState('');
  const [error, setError] = useState('');
  const [addingCollaborator, setAddingCollaborator] = useState(false);
  const [existingEmails, setExistingEmails] = useState(new Set());
  const { addCollaborator, removeCollaborator } = useProjects();
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchCollaborators() {
      try {
        setLoading(true);
        const usersData = [];
        const emailSet = new Set();

        // Fetch owner details
        if (ownerId) {
          const ownerRef = doc(db, 'users', ownerId);
          const ownerSnap = await getDoc(ownerRef);
          if (ownerSnap.exists()) {
            const ownerData = ownerSnap.data();
            usersData.push({
              id: ownerSnap.id,
              ...ownerData,
              isOwner: true, // Mark as owner
              role: 'Project Owner' // Add role
            });
            
            // Add owner email to the set
            if (ownerData.email) {
              emailSet.add(ownerData.email.toLowerCase());
            }
          }
        }

        // Fetch collaborator details
        if (collaborators && collaborators.length > 0) {
          for (const collab of collaborators) {
            // Skip if this is the owner (already added)
            const collabId = typeof collab === 'string' ? collab : collab.userId;
            if (collabId === ownerId) continue;
            
            const userRef = doc(db, 'users', collabId);
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists()) {
              const userData = userSnap.data();
              usersData.push({
                id: userSnap.id,
                ...userData,
                isOwner: false,
                role: typeof collab === 'object' && collab.role ? collab.role : 'Member' // Use role if available
              });
              
              // Add collaborator email to the set
              if (userData.email) {
                emailSet.add(userData.email.toLowerCase());
              }
            }
          }
        }

        setCollaboratorUsers(usersData);
        setExistingEmails(emailSet);
      } catch (err) {
        console.error('Error fetching collaborators:', err);
        setError('Failed to load team members.');
      } finally {
        setLoading(false);
      }
    }

    fetchCollaborators();
  }, [collaborators, ownerId]);

  const handleAddCollaborator = async (e) => {
    e.preventDefault();

    const trimmedEmail = newCollaboratorEmail.trim().toLowerCase();
    
    if (!trimmedEmail) {
      return setError('Please enter an email address');
    }

    // Check if the email is already in the project
    if (existingEmails.has(trimmedEmail)) {
      return setError('This email address is already in the project');
    }

    try {
      setError('');
      setAddingCollaborator(true);

      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', trimmedEmail));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return setError('No user found with this email address');
      }

      const userDoc = querySnapshot.docs[0];
      const userId = userDoc.id;

      // Check if user is already a collaborator
      const isAlreadyCollaborator = collaborators.some(collab => 
        typeof collab === 'string' 
          ? collab === userId 
          : collab.userId === userId
      );

      if (isAlreadyCollaborator || userId === ownerId) {
        return setError('This user is already in the project');
      }

      await addCollaborator(projectId, userId);
      setNewCollaboratorEmail('');
      
      // Update the existingEmails set
      setExistingEmails(prev => new Set([...prev, trimmedEmail]));
      
      if (onCollaboratorUpdated) {
        onCollaboratorUpdated();
      }
    } catch (err) {
      setError('An error occurred: ' + err.message);
    } finally {
      setAddingCollaborator(false);
    }
  };

  const handleRemoveCollaborator = async (userId, email) => {
    if (window.confirm('Are you sure you want to remove this user from the project?')) {
      try {
        await removeCollaborator(projectId, userId);
        
        if (email) {
          setExistingEmails(prev => {
            const updated = new Set(prev);
            updated.delete(email.toLowerCase());
            return updated;
          });
        }
        
        if (onCollaboratorUpdated) {
          onCollaboratorUpdated();
        }
      } catch (err) {
        setError('An error occurred while removing the user: ' + err.message);
      }
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
        <p className="collaborators-empty">No users have been added to this project yet</p>
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