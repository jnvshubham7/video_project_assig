import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { getOrganization, setOrganization, getOrganizations, setOrganizations, authAPI } from '../services/authService';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  role?: 'admin' | 'editor' | 'viewer';
}

interface OrganizationContextType {
  currentOrganization: Organization | null;
  organizations: Organization[] | null;
  switchOrganization: (orgId: string) => Promise<void>;
  refreshOrganizations: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [currentOrganization, setCurrentOrg] = useState<Organization | null>(() => {
    try {
      return getOrganization();
    } catch {
      return null;
    }
  });
  const [organizations, setOrgs] = useState<Organization[] | null>(() => {
    try {
      const stored = getOrganizations();
      return stored && stored.length > 0 ? stored : null;
    } catch {
      return null;
    }
  });

  // Refresh organizations from storage on mount
  useEffect(() => {
    try {
      const stored = getOrganizations();
      if (stored && stored.length > 0) {
        setOrgs(stored);
      }
    } catch {
      setOrgs(null);
    }
  }, []);

  // Auto-refresh organizations every 15 seconds when user is authenticated
  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    if (!token) return;

    const refreshInterval = setInterval(async () => {
      try {
        // Fetch fresh organizations from backend
        const response = await authAPI.getMyOrganizations();
        const freshOrganizations = response.data.organizations;
        
        if (freshOrganizations && freshOrganizations.length > 0) {
          // Check if organizations have changed
          const stored = getOrganizations();
          const hasChanged = 
            freshOrganizations.length !== stored.length ||
            freshOrganizations.some(org => !stored.some(s => s.id === org.id));
          
          if (hasChanged) {
            console.log('[ORG CONTEXT] Organizations updated:', freshOrganizations.length);
            setOrganizations(freshOrganizations);
            setOrgs(freshOrganizations);
          }
        }
      } catch (error) {
        console.error('Background organization refresh error:', error);
      }
    }, 15000); // Refresh every 15 seconds

    return () => clearInterval(refreshInterval);
  }, []);

  const switchOrganization = async (orgId: string) => {
    try {
      const response = await authAPI.switchOrganization(orgId);
      const newOrg = response.data.organization;
      const newToken = response.data.token;
      
      // Update token in localStorage
      if (newToken) {
        localStorage.setItem('token', newToken);
      }
      
      // Update current organization
      setCurrentOrg(newOrg);
      setOrganization(newOrg);
      
      // Dispatch event for listeners
      window.dispatchEvent(new Event('organizationChanged'));
    } catch (error) {
      console.error('Failed to switch organization:', error);
      throw error;
    }
  };

  const refreshOrganizations = async () => {
    try {
      // Fetch fresh organizations from backend
      const response = await authAPI.getMyOrganizations();
      const freshOrganizations = response.data.organizations;
      
      console.log('[ORG CONTEXT] Manual refresh triggered:', freshOrganizations.length, 'organizations');
      
      if (freshOrganizations && freshOrganizations.length > 0) {
        // Update localStorage and state
        setOrganizations(freshOrganizations);
        setOrgs(freshOrganizations);
        
        // If current org is not in the list anymore, switch to first one
        if (currentOrganization && !freshOrganizations.some(org => org.id === currentOrganization.id)) {
          const newCurrentOrg = freshOrganizations[0];
          setCurrentOrg(newCurrentOrg);
          setOrganization(newCurrentOrg);
        }
      }
    } catch (error) {
      console.error('Failed to refresh organizations:', error);
      throw error;
    }
  };

  return (
    <OrganizationContext.Provider value={{ currentOrganization, organizations, switchOrganization, refreshOrganizations }}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization(): OrganizationContextType {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within OrganizationProvider');
  }
  return context;
}
