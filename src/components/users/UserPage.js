import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import '../projects/CreateProject.css';
import './Avatar.css';
import { getFunctions, httpsCallable } from "firebase/functions";

const functions = getFunctions();

export default function UserPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { currentUser, updateUserDisplayName } = useAuth();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Memoized OnCall function references
  const getUserProfileData = useMemo(() => httpsCallable(functions, 'getUserProfileData'), []);
  const updateUserProfileData = useMemo(() => httpsCallable(functions, 'updateUserProfileData'), []);

  useEffect(() => {
    const fetchUser = async () => {
      if (!userId) {
        setLoading(false);
        setError("User ID not found. Please make sure you are on a valid user page.");
        return;
      }

      try {
        setLoading(true);
        setError('');

        const result = await getUserProfileData({ userId: userId.trim() });

        if (result.data) {
          const userData = result.data;
          setUser({
            ...userData,
            createdAt: userData.createdAt ? new Date(userData.createdAt) : null,
          });
        } else {
          setError('Could not retrieve user data.');
        }
      } catch (err) {
        if (err.code === 'not-found') {
          setError('User not found.');
        } else if (err.code === 'internal') {
          setError('A server connection error occurred. Please try again later.');
        } else if (err.details) {
          setError('Error: ' + err.details.message);
        } else {
          setError('An error occurred while loading user information: ' + (err.message || err));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId, getUserProfileData]);

  const handleUpdateDisplayName = async (e) => {
    e.preventDefault();
    if (!newDisplayName.trim()) return;

    try {
      setIsSaving(true);
      setError('');

      // Call the Firebase Function to update the user data in Firestore
      await updateUserProfileData({
        userId: userId.trim(),
        displayName: newDisplayName.trim()
      });

      // Also update the Auth profile to ensure the navbar updates
      if (isCurrentUser && currentUser) {
        try {
          // Update the auth display name which will trigger UI updates
          await updateUserDisplayName(newDisplayName.trim());
        } catch (authErr) {
          console.error("Error updating auth display name:", authErr);
          // Continue execution even if this fails
        }
      }

      // Update local state
      setUser(prev => ({ ...prev, displayName: newDisplayName.trim() }));
      setIsEditing(false);
    } catch (err) {
      if (err.code === 'unauthenticated') {
        setError('Your session has expired, please log in again.');
      } else if (err.code === 'permission-denied') {
        setError('You do not have permission for this action.');
      } else if (err.details) {
        setError('Error: ' + err.details.message);
      } else {
        setError('An error occurred while updating the name: ' + (err.message || err));
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Check if we have a valid user before rendering
  const isCurrentUser = currentUser && currentUser.uid === userId;

  if (loading) return <div className="loading">Loading user information...</div>;
  if (error) return <div className="error-alert">{error}</div>;
  if (!user) return <div className="error-alert">User not found</div>;

  return (
    <>
      <div className="project-header">
        <div className="header-content">
          <button onClick={() => navigate(-1)} className="btn-back">
            <svg xmlns="http://www.w3.org/2000/svg" className="icon-back" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <h1 className="project-title">User Profile</h1>
        </div>
      </div>

      <div className="create-project">
        <div className="user-info">
          <div className="avatar large">
            {user?.displayName?.charAt(0).toUpperCase() || '?'}
          </div>

          {isEditing ? (
            <form onSubmit={handleUpdateDisplayName} className="form-group">
              <label htmlFor="displayName" className="form-label">Name</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  id="displayName"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  className="form-control"
                  placeholder="Enter your name"
                  required
                />
                <button type="submit" className="btn-submit" disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
                <button 
                  type="button" 
                  className="btn-cancel"
                  onClick={() => setIsEditing(false)}
                  disabled={isSaving}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="form-group">
              <label className="form-label">Name</label>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="user-display-name">{user?.displayName || 'Unnamed User'}</span>
                {isCurrentUser && (
                  <button 
                    onClick={() => {
                      setNewDisplayName(user?.displayName || '');
                      setIsEditing(true);
                    }} 
                    className="btn-edit"
                  >
                    Edit Name
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email</label>
            <span className="user-email">{user?.email}</span>
          </div>

          <div className="form-group">
            <label className="form-label">Account Created At</label>
            <span className="user-meta">
              {user?.createdAt 
                ? new Date(user.createdAt).toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : 'Unknown'
              }
            </span>
          </div>
        </div>

        {isCurrentUser && (
          <div className="form-actions">
            <button onClick={() => navigate('/dashboard')} className="btn-submit">
              Return to Dashboard
            </button>
          </div>
        )}
      </div>
    </>
  );
}