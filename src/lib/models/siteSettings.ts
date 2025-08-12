import mongoose from 'mongoose';

interface ISiteSettings {
  siteName: string;
  siteDescription?: string;
  faviconPath?: string;
  enabledRegions: string[];
  enabledModules: {
    mge: boolean;
    whois: boolean;
    tf2pickup: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const SiteSettingsSchema = new mongoose.Schema<ISiteSettings>({
  siteName: {
    type: String,
    required: true,
    default: 'Electric Panel'
  },
  siteDescription: {
    type: String,
    default: ''
  },
  faviconPath: {
    type: String,
    default: '/images/favicon.png'
  },
  enabledRegions: {
    type: [String],
    default: ['ar', 'br']
  },
  enabledModules: {
    mge: {
      type: Boolean,
      default: true
    },
    whois: {
      type: Boolean,
      default: true
    },
    tf2pickup: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true
});

// Ensure only one settings document exists
SiteSettingsSchema.index({}, { unique: true });

export const SiteSettings = mongoose.model<ISiteSettings>('SiteSettings', SiteSettingsSchema);

export type { ISiteSettings };
