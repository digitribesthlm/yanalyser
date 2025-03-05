import { serialize } from 'cookie';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    // Clear the auth cookie
    res.setHeader('Set-Cookie', serialize('auth-token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: -1, // Expire immediately
        path: '/'
    }));

    res.status(200).json({ message: 'Logged out successfully' });
} 