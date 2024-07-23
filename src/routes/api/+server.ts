import { json } from '@sveltejs/kit';
export async function GET(event)
{
    var result = {
        status: 'healthy'
    }

    return json(result);
}