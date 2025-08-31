import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  try {
    // Try to import the build-time version first
    const { VERSION } = await import('$lib/version.js');
    return json({ version: VERSION });
  } catch (error) {
    // Fallback to git command if version file doesn't exist (development)
    try {
      const { execSync } = await import('child_process');
      const commitCount = execSync('git rev-list --count master', { encoding: 'utf8' }).trim();
      return json({ version: commitCount });
    } catch (gitError) {
      console.error('Error getting version:', gitError);
      return json({ version: 'unknown' });
    }
  }
};
