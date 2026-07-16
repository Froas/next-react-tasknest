import type { NextApiRequest, NextApiResponse } from 'next';

const API_BASE_URL = (process.env.API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

export default async function register(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ detail: 'Method not allowed' });
  }

  try {
    // Keep the trailing slash: FastAPI registers this route as `/users/`.
    // Avoiding its 307 redirect prevents the private backend URL from ever
    // being exposed to or followed by the browser.
    const response = await fetch(`${API_BASE_URL}/users/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });

    const body = await response.text();
    res.status(response.status);
    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/json');
    return res.send(body);
  } catch (error) {
    console.error('Registration backend request failed:', error);
    return res.status(502).json({ detail: 'Registration service is unavailable' });
  }
}
