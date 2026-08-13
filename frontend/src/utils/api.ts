// Centralized API URL helper
// In production (Vercel), NEXT_PUBLIC_API_URL = https://smart-vw9p.onrender.com
// In development (local), falls back to localhost:5000
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
