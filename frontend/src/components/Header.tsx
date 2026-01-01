import { useNavigate, useLocation } from 'react-router-dom';
import { clearAuthToken, getAuthToken, getOrganization } from '../services/authService';
import { useState, useEffect } from 'react';
import { useOrganization } from '../context/OrganizationContext';
import './Header.css';

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const organizationContext = useOrganization();
  const { currentOrganization, organizations, switchOrganization } = organizationContext;
  const [authenticated, setAuthenticated] = useState(() => !!getAuthToken());
  const [user, setUser] = useState<any>(null);
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);

  useEffect(() => {
    const token = getAuthToken();
    setAuthenticated(!!token);
    
    // Get user from localStorage if available
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        setUser(null);
      }
    }
    
    // Ensure organizations are loaded in context and refreshed
    if (token && organizationContext) {
      organizationContext.refreshOrganizations().catch(err => {
        console.error('Failed to refresh organizations on route change:', err);
      });
    }
  }, [location, organizationContext]);

  // Listen to organization changes
  useEffect(() => {
    const handleOrgChange = () => {
      // Refresh component state
      getOrganization();
      window.location.reload(); // Full reload to refresh all data
    };

    window.addEventListener('organizationChanged', handleOrgChange);
    return () => window.removeEventListener('organizationChanged', handleOrgChange);
  }, []);

  // Listen to storage changes for real-time updates
  useEffect(() => {
    const handleStorageChange = () => {
      const token = getAuthToken();
      setAuthenticated(!!token);
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          setUser(null);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleLogout = () => {
    clearAuthToken();
    setAuthenticated(false);
    setUser(null);
    navigate('/login');
  };

  const handleLogoClick = () => {
    navigate('/');
  };

  const handleOrgSwitch = async (orgId: string) => {
    try {
      await switchOrganization(orgId);
      setShowOrgDropdown(false);
      window.location.reload(); // Reload to refresh organization-specific data
    } catch (error) {
      console.error('Failed to switch organization:', error);
    }
  };

  return (
    <header className="header">
      <div className="header-container">
        <div className="logo" onClick={handleLogoClick}>
          <h1>🎬 Video Platform</h1>
        </div>
        
        <nav className="nav">
          {authenticated ? (
            <div className="nav-authenticated">
              <a href="/" className="nav-item">Home</a>
              <a href="/videos" className="nav-item">All Videos</a>
              <a href="/my-videos" className="nav-item">My Videos</a>
              <a href="/upload" className="nav-item upload-link">+ Upload</a>
              <a href="/organization" className="nav-item">Organization</a>
              <div className="user-org-info">
                <span className="user-info">👤 {user?.username || 'User'}</span>
                {currentOrganization && (
                  <div className="org-dropdown-container">
                    <button 
                      className={`org-info ${showOrgDropdown ? 'active' : ''}`}
                      onClick={() => setShowOrgDropdown(!showOrgDropdown)}
                    >
                      🏢 {currentOrganization.name} ({currentOrganization.role})
                      <span className="dropdown-arrow">▼</span>
                    </button>
                    {showOrgDropdown && organizations && organizations.length > 1 && (
                      <div className="org-dropdown">
                        {organizations.map(org => (
                          <button
                            key={org.id}
                            className={`org-option ${org.id === currentOrganization.id ? 'active' : ''}`}
                            onClick={() => handleOrgSwitch(org.id)}
                          >
                            <span>{org.name}</span>
                            <span className="org-role">({org.role})</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <button onClick={handleLogout} className="logout-btn">
                Logout
              </button>
            </div>
          ) : (
            <div className="nav-links">
              <a href="/login" className="nav-link">Login</a>
              <a href="/register" className="nav-link register-link">Register</a>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
