import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { getOrganization, setOrganization, getOrganizations, setOrganizations, authAPI } from '../services/authService';
import socketService from '../services/socketService';

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
  addOrganizationChangeListener: (callback: (org: Organization | null) => void) => () => void;
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

  // Store organization change listeners
  const [changeListeners, setChangeListeners] = useState<Set<(org: Organization | null) => void>>(new Set());

  // Notify all listeners when organization changes
  const notifyOrganizationChange = (org: Organization | null) => {
    changeListeners.forEach(callback => {
      try {
        callback(org);
      } catch (error) {
        console.error('Error in organization change listener:', error);
      }
    });
  };

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
      const updatedOrg: Organization = {
        id: newOrg.id,
        name: newOrg.name,
        slug: newOrg.slug,
        role: newOrg.role
      };
      
      setCurrentOrg(updatedOrg);
      setOrganization(updatedOrg);
      
      // Switch socket.io organization room
      if (updatedOrg.id) {
        socketService.switchOrganizationRoom(updatedOrg.id);
      }
      
      // Notify all listeners of organization change
      notifyOrganizationChange(updatedOrg);
      
      // Dispatch event for other listeners (backward compatibility)
      window.dispatchEvent(new Event('organizationChanged'));
    } catch (error) {
      console.error('Failed to switch organization:', error);
      throw error;
    }
  };

  const addOrganizationChangeListener = (callback: (org: Organization | null) => void) => {
    const newListeners = new Set(changeListeners);
    newListeners.add(callback);
    setChangeListeners(newListeners);
    
    // Return unsubscribe function
    return () => {
      const updatedListeners = new Set(changeListeners);
      updatedListeners.delete(callback);
      setChangeListeners(updatedListeners);
    };
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
    <OrganizationContext.Provider value={{ currentOrganization, organizations, switchOrganization, refreshOrganizations, addOrganizationChangeListener }}>
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
