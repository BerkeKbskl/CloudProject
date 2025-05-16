import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import '../projects/CreateProject.css';
import './Avatar.css';

export default function UserPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          setUser({
            ...userData,
            createdAt: userData.createdAt?.toDate() || null,
          });
        } else {
          setError('User not found.');
        }
      } catch (err) {
        setError('An error occurred while loading user information.');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId]);

  const handleUpdateDisplayName = async (e) => {
    e.preventDefault();
    if (!newDisplayName.trim()) return;

    try {
      setIsSaving(true);
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        displayName: newDisplayName.trim()
      });
      setUser(prev => ({ ...prev, displayName: newDisplayName.trim() }));
      setIsEditing(false);
    } catch (err) {
      setError('An error occurred while updating the name.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div className="loading">Loading user information...</div>;
  if (error) return <div className="error-alert">{error}</div>;

  const isCurrentUser = currentUser?.uid === userId;

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
              {user?.createdAt ? user.createdAt.toLocaleString('en-US') : 'Unknown'}
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
