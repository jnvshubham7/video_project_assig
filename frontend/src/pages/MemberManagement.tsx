import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { organizationAPI } from '../services/organizationService';
import type { OrganizationMember } from '../services/organizationService';
import { getAuthToken } from '../services/authService';
import '../styles/Auth.css';

export function MemberManagement() {
  const navigate = useNavigate();
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'editor' | 'viewer'>('viewer');
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (!getAuthToken()) {
      navigate('/login');
      return;
    }

    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const response = await organizationAPI.getMembers();
      setMembers(response.data.members);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch members');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!inviteEmail.trim()) {
      setError('Email is required');
      return;
    }

    try {
      setInviting(true);
      await organizationAPI.inviteUser(inviteEmail, inviteRole);
      setSuccess(`User ${inviteEmail} invited successfully!`);
      setInviteEmail('');
      setInviteRole('viewer');
      setTimeout(() => setSuccess(''), 3000);
      fetchMembers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to invite user');
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (window.confirm('Are you sure you want to remove this member?')) {
      try {
        await organizationAPI.removeUser(userId);
        setSuccess('Member removed successfully!');
        setTimeout(() => setSuccess(''), 3000);
        fetchMembers();
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to remove member');
      }
    }
  };

  const handleChangeRole = async (userId: string, newRole: 'admin' | 'editor' | 'viewer') => {
    try {
      await organizationAPI.changeUserRole(userId, newRole);
      setSuccess('Role updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
      fetchMembers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to change role');
    }
  };

  if (loading) {
    return <div className="auth-container"><div className="auth-card"><p>Loading...</p></div></div>;
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Member Management</h2>
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <div className="invite-section">
          <h3>Invite New Member</h3>
          <form onSubmit={handleInvite}>
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </div>

            <div className="form-group">
              <label>Role</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'admin' | 'editor' | 'viewer')}
              >
                <option value="viewer">Viewer (View only)</option>
                <option value="editor">Editor (Upload & manage own)</option>
                <option value="admin">Admin (Full access)</option>
              </select>
            </div>

            <button type="submit" className="submit-btn" disabled={inviting}>
              {inviting ? 'Inviting...' : 'Invite Member'}
            </button>
          </form>
        </div>

        <div className="members-section">
          <h3>Members ({members.length})</h3>
          {members.length === 0 ? (
            <p>No members found</p>
          ) : (
            <div className="members-list">
              {members.map((member) => (
                <div key={member.userId._id} className="member-card">
                  <div className="member-info">
                    <p><strong>{member.userId.username}</strong></p>
                    <p className="email">{member.userId.email}</p>
                    <p className="role">Role: <span className={`role-badge ${member.role}`}>{member.role}</span></p>
                    <p className="joined">Joined: {new Date(member.joinedAt).toLocaleDateString()}</p>
                  </div>

                  <div className="member-actions">
                    {member.role === 'viewer' ? (
                      <button
                        onClick={() => handleChangeRole(member.userId._id, 'editor')}
                        className="btn-promote"
                      >
                        Make Editor
                      </button>
                    ) : member.role === 'editor' ? (
                      <>
                        <button
                          onClick={() => handleChangeRole(member.userId._id, 'admin')}
                          className="btn-promote"
                        >
                          Make Admin
                        </button>
                        <button
                          onClick={() => handleChangeRole(member.userId._id, 'viewer')}
                          className="btn-demote"
                        >
                          Make Viewer
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleChangeRole(member.userId._id, 'editor')}
                        className="btn-demote"
                      >
                        Make Editor
                      </button>
                    )}
                    <button
                      onClick={() => handleRemoveMember(member.userId._id)}
                      className="btn-remove"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => navigate('/organization')}
          className="back-btn"
        >
          Back to Settings
        </button>
      </div>

      <style>{`
        .invite-section {
          margin-bottom: 2rem;
          padding-bottom: 2rem;
          border-bottom: 1px solid #e0e0e0;
        }

        .members-section h3 {
          margin-top: 2rem;
        }

        .members-list {
          display: grid;
          gap: 1rem;
          margin-top: 1rem;
        }

        .member-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          background: #f9f9f9;
        }

        .member-info p {
          margin: 0.5rem 0;
          font-size: 0.9rem;
        }

        .member-info .email {
          color: #666;
          font-size: 0.85rem;
        }

        .member-info .role {
          margin: 0.75rem 0 0.5rem 0;
        }

        .role-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: bold;
        }

        .role-badge.admin {
          background: #ffebee;
          color: #c62828;
        }

        .role-badge.editor {
          background: #fff3e0;
          color: #e65100;
        }

        .role-badge.viewer {
          background: #e3f2fd;
          color: #1565c0;
        }

        .member-info .joined {
          color: #999;
          font-size: 0.8rem;
        }

        .member-actions {
          display: flex;
          gap: 0.5rem;
        }

        .member-actions button {
          padding: 0.5rem 1rem;
          font-size: 0.85rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-promote {
          background: #4caf50;
          color: white;
        }

        .btn-promote:hover {
          background: #45a049;
        }

        .btn-demote {
          background: #ff9800;
          color: white;
        }

        .btn-demote:hover {
          background: #e68900;
        }

        .btn-remove {
          background: #f44336;
          color: white;
        }

        .btn-remove:hover {
          background: #da190b;
        }

        .back-btn {
          margin-top: 2rem;
          padding: 0.75rem 1.5rem;
          background: #2196f3;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 1rem;
        }

        .back-btn:hover {
          background: #0b7dda;
        }
      `}</style>
    </div>
  );
}
