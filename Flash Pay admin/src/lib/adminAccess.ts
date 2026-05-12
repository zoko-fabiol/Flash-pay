import type { AdminActionKey, AdminPermissions, AdminSectionKey, UserProfile } from '../types';

export const ADMIN_SECTION_DEFINITIONS: Array<{
  key: AdminSectionKey;
  label: string;
}> = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'queue', label: 'Transactions' },
  { key: 'users', label: 'Clients' },
  { key: 'kyc', label: 'Validation KYC' },
  { key: 'countries', label: 'Gestion Réseau' },
  { key: 'settings', label: 'Paramètres' },
  { key: 'problems', label: 'Incidents' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'analytics', label: 'Analytics' },
  { key: 'security', label: 'Sécurité' },
  { key: 'webhooks', label: 'Webhooks' },
];

export const ADMIN_ACTION_LABELS: Record<AdminActionKey, string> = {
  add: 'Ajouter',
  edit: 'Modifier',
  delete: 'Supprimer',
};

const DEFAULT_SECTION_PERMISSIONS: Record<AdminSectionKey, boolean> = {
  dashboard: true,
  queue: true,
  users: true,
  kyc: true,
  countries: true,
  settings: true,
  problems: true,
  notifications: true,
  analytics: true,
  security: true,
  webhooks: true,
};

const DEFAULT_ACTION_PERMISSIONS: Record<AdminActionKey, boolean> = {
  add: true,
  edit: true,
  delete: true,
};

export const DEFAULT_ADMIN_PERMISSIONS: Required<AdminPermissions> = {
  sections: DEFAULT_SECTION_PERMISSIONS,
  actions: DEFAULT_ACTION_PERMISSIONS,
  receiveOrderEmails: true,
  receiveCountryEmails: false,
  assignedCountry: '',
};

export const buildPresetPermissions = (role: UserProfile['adminRole']): AdminPermissions => {
  if (role === 'email-only') {
    return {
      sections: {
        dashboard: false,
        queue: false,
        users: false,
        kyc: false,
        countries: false,
        settings: false,
        problems: false,
        notifications: true,
        analytics: false,
        security: false,
        webhooks: false,
      },
      actions: {
        add: false,
        edit: false,
        delete: false,
      },
      receiveOrderEmails: true,
    };
  }

  if (role === 'restricted') {
    return {
      sections: {
        dashboard: true,
        queue: true,
        users: false,
        kyc: false,
        countries: false,
        settings: false,
        problems: true,
        notifications: false,
        analytics: false,
        security: false,
        webhooks: false,
      },
      actions: {
        add: false,
        edit: true,
        delete: false,
      },
      receiveOrderEmails: false,
    };
  }

  if (role === 'agent') {
    return {
      sections: {
        dashboard: true,
        queue: true,
        users: false,
        kyc: false,
        countries: false,
        settings: false,
        problems: true,
        notifications: true,
        analytics: false,
        security: false,
        webhooks: false,
      },
      actions: {
        add: false,
        edit: true,
        delete: false,
      },
      receiveOrderEmails: false,
      receiveCountryEmails: true,
    };
  }

  return DEFAULT_ADMIN_PERMISSIONS;
};

export const mergeAdminPermissions = (permissions?: AdminPermissions) => ({
  sections: {
    ...DEFAULT_SECTION_PERMISSIONS,
    ...(permissions?.sections || {}),
  },
  actions: {
    ...DEFAULT_ACTION_PERMISSIONS,
    ...(permissions?.actions || {}),
  },
  receiveOrderEmails: permissions?.receiveOrderEmails ?? true,
  receiveCountryEmails: permissions?.receiveCountryEmails ?? false,
});

export const canAccessAdminSection = (profile: UserProfile | null | undefined, section: AdminSectionKey) => {
  if (!profile?.isAdmin) return false;
  if (!profile.adminPermissions) return true;
  return mergeAdminPermissions(profile.adminPermissions).sections[section];
};

export const canPerformAdminAction = (profile: UserProfile | null | undefined, action: AdminActionKey) => {
  if (!profile?.isAdmin) return false;
  if (!profile.adminPermissions) return true;
  return mergeAdminPermissions(profile.adminPermissions).actions[action];
};

export const canReceiveOrderEmails = (profile: UserProfile | null | undefined) => {
  if (!profile?.isAdmin) return false;
  if (!profile.adminPermissions) return true;
  return mergeAdminPermissions(profile.adminPermissions).receiveOrderEmails;
};
