import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { connectToDatabase } from '$lib/db';
import { SiteSettings } from '$lib/models/siteSettings';

// GET - Retrieve site settings
export const GET: RequestHandler = async () => {
  try {
    await connectToDatabase();
    
    // Get settings, create default if none exist
    let settings = await SiteSettings.findOne();
    if (!settings) {
      settings = new SiteSettings({});
      await settings.save();
    }

    return json(settings);
  } catch (error) {
    console.error('Error fetching site settings:', error);
    return json(
      { error: 'Failed to fetch site settings' },
      { status: 500 }
    );
  }
};

// PUT - Update site settings
export const PUT: RequestHandler = async (event) => {
  try {
    const user = event.locals.user as { role?: string } | null;
    if (!user || user.role !== 'owner') {
      return json({ error: 'Forbidden' }, { status: 403 });
    }

    const updateData = await event.request.json();
    
    await connectToDatabase();
    
    // Get or create settings
    let settings = await SiteSettings.findOne();
    if (!settings) {
      settings = new SiteSettings(updateData);
    } else {
      // Update existing settings
      Object.assign(settings, updateData);
    }
    
    await settings.save();

    return json(settings);
  } catch (error) {
    console.error('Error updating site settings:', error);
    return json(
      { error: 'Failed to update site settings' },
      { status: 500 }
    );
  }
};
