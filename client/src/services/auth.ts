export class AuthService {
    private static API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

    static async register(name: string, email: string, password: string): Promise<any> {
        const res = await fetch(`${this.API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password }),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Registration failed');
        }
        return res.json();
    }

    static async login(email: string, password: string): Promise<any> {
        const res = await fetch(`${this.API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Login failed');
        }
        return res.json();
    }

    static async getMe(token: string): Promise<any> {
        const res = await fetch(`${this.API_URL}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!res.ok) throw new Error('Invalid token');
        return res.json();
    }
    static async updateProfile(name: string, password?: string, token?: string): Promise<any> {
        const body: any = { name };
        if (password) body.password = password;

        const res = await fetch(`${this.API_URL}/auth/me`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token || localStorage.getItem('token')}`
            },
            body: JSON.stringify(body),
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Update failed');
        }
        return res.json();
    }
}
