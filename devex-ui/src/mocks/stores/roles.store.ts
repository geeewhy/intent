import { createStore } from './createStore';

// Define the role entry type with domain as id to satisfy Identifiable
interface RoleEntry {
  id: string;  // This will be the domain
  domain: string;
  roles: string[];
}

export const rolesStore = createStore<RoleEntry>();

// Helper function to push a role entry using domain as id
export const addRoleEntry = (domain: string, roles: string[]) => {
  rolesStore.push({
    id: domain,
    domain,
    roles
  });
};