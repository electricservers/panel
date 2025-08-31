import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  try {
    // Get git commit count for master branch
    const { execSync } = await import('child_process');
    const commitCount = execSync('git rev-list --count master', { encoding: 'utf8' }).trim();
    
    return json({ version: commitCount });
  } catch (error) {
    console.error('Error getting git commit count:', error);
    // Fallback to a default version if git command fails
    return json({ version: 'unknown' });
  }
};
