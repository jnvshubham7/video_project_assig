import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { organizationAPI } from '../services/organizationService';
import { getAuthToken } from '../services/authService';
import '../styles/Auth.css';

export function OrganizationSettings() {
  const navigate = useNavigate();
  const [organization, setOrganization] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getAuthToken()) {
      navigate('/login');
      return;
    }

    fetchOrganization();
  }, []);

  const fetchOrganization = async () => {
    try {
      setLoading(true);
      const response = await organizationAPI.getOrganization();
      setOrganization(response.data.organization);
      setFormData({
        name: response.data.organization.name,
        description: response.data.organization.description || '',
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch organization');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await organizationAPI.updateOrganization({
        name: formData.name,
        description: formData.description
      });
      setSuccess('Organization updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update organization');
    }
  };

  if (loading) {
    return <div className="auth-container"><div className="auth-card"><p>Loading...</p></div></div>;
  }

  if (!organization) {
    return <div className="auth-container"><div className="auth-card"><p>Organization not found</p></div></div>;
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Organization Settings</h2>
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Organization Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Organization name"
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Organization description"
              rows={4}
            />
          </div>

          <button type="submit" className="submit-btn">
            Update Organization
          </button>
        </form>

        <div className="org-info-section">
          <h3>Organization Info</h3>
          <p><strong>Slug:</strong> {organization.slug}</p>
          <p><strong>Status:</strong> {organization.status}</p>
          <p><strong>Created:</strong> {new Date(organization.createdAt).toLocaleDateString()}</p>
        </div>

        <div className="org-actions">
          <button
            onClick={() => navigate('/members')}
            className="nav-btn"
          >
            Manage Members
          </button>
          <button
            onClick={() => navigate('/organization/stats')}
            className="nav-btn"
          >
            View Statistics
          </button>
        </div>
      </div>
    </div>
  );
}
