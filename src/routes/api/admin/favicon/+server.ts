import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { connectToDatabase } from '$lib/db';
import { SiteSettings } from '$lib/models/siteSettings';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// POST - Upload favicon
export const POST: RequestHandler = async (event) => {
  try {
    const user = event.locals.user as { role?: string } | null;
    if (!user || user.role !== 'owner') {
      return json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await event.request.formData();
    const file = formData.get('favicon') as File;
    
    if (!file) {
      return json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/x-icon', 'image/vnd.microsoft.icon', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      return json(
        { error: 'Invalid file type. Please upload a PNG, ICO, or JPEG file.' },
        { status: 400 }
      );
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return json(
        { error: 'File too large. Maximum size is 2MB.' },
        { status: 400 }
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'static', 'uploads');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const extension = path.extname(file.name) || '.png';
    const filename = `favicon-${timestamp}${extension}`;
    const filepath = path.join(uploadsDir, filename);

    // Save file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await writeFile(filepath, buffer);

    // Update site settings with new favicon path
    await connectToDatabase();
    const faviconPath = `/uploads/${filename}`;
    
    let settings = await SiteSettings.findOne();
    if (!settings) {
      settings = new SiteSettings({ faviconPath });
    } else {
      settings.faviconPath = faviconPath;
    }
    await settings.save();

    return json({
      faviconPath,
      message: 'Favicon uploaded successfully'
    });
  } catch (error) {
    console.error('Error uploading favicon:', error);
    return json(
      { error: 'Failed to upload favicon' },
      { status: 500 }
    );
  }
};
