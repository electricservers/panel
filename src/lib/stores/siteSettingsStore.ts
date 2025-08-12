import { writable } from 'svelte/store';

interface SiteSettings {
  siteName: string;
  siteDescription: string;
  faviconPath: string;
  enabledRegions: string[];
  enabledModules: {
    mge: boolean;
    whois: boolean;
    tf2pickup: boolean;
  };
}

const defaultSettings: SiteSettings = {
  siteName: 'Electric Panel',
  siteDescription: '',
  faviconPath: '/images/favicon.png',
  enabledRegions: ['ar', 'br'],
  enabledModules: {
    mge: true,
    whois: true,
    tf2pickup: false
  }
};

export const siteSettingsStore = writable<SiteSettings>(defaultSettings);

// Function to load settings from API
export async function loadSiteSettings() {
  try {
    const response = await fetch('/api/admin/settings');
    const result = await response.json();
    
    if (response.ok) {
      siteSettingsStore.set(result);
    }
  } catch (error) {
    console.error('Error loading site settings:', error);
  }
}

// Function to update settings
export function updateSiteSettings(settings: Partial<SiteSettings>) {
  siteSettingsStore.update(current => ({
    ...current,
    ...settings
  }));
}
