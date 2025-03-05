// pages/api/auth/login.js
import { connectToDatabase } from '../../../utils/mongodb';
import { serialize } from 'cookie';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { email, password } = req.body;
        const { db } = await connectToDatabase();

        const user = await db.collection('users').findOne({ email });
        
        if (!user || password !== user.password) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Create a secure token (in production, use proper JWT)
        const token = Buffer.from(JSON.stringify({
            userId: user._id,
            email: user.email,
            role: user.role
        })).toString('base64');

        // Set secure cookie
        res.setHeader('Set-Cookie', serialize('auth-token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 3600, // 1 hour
            path: '/'
        }));

        // Return user data
        res.status(200).json({
            user: {
                email: user.email,
                role: user.role,
                clientId: user.clientId
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}