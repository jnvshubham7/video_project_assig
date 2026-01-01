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
  organizations: Organization[];
  switchOrganization: (orgId: string) => Promise<void>;
  refreshOrganizations: () => void;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [currentOrganization, setCurrentOrg] = useState<Organization | null>(getOrganization());
  const [organizations, setOrgs] = useState<Organization[]>(getOrganizations());

  // Refresh organizations from storage on mount
  useEffect(() => {
    const stored = getOrganizations();
    if (stored && stored.length > 0) {
      setOrgs(stored);
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
    const stored = getOrganizations();
    setOrgs(stored);
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
