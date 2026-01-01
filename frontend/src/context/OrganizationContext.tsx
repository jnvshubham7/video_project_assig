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
  refreshOrganizations: () => void;
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

  const switchOrganization = async (orgId: string) => {
    try {
      const response = await authAPI.switchOrganization(orgId);
      const newOrg = response.data.organization;
      setCurrentOrg(newOrg);
      setOrganization(newOrg);
      window.dispatchEvent(new Event('organizationChanged'));
    } catch (error) {
      console.error('Failed to switch organization:', error);
      throw error;
    }
  };

  const refreshOrganizations = () => {
    try {
      const stored = getOrganizations();
      setOrgs(stored && stored.length > 0 ? stored : null);
    } catch {
      setOrgs(null);
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
