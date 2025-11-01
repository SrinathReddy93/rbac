// import { verify } from 'jsonwebtoken';
import jwt from 'jsonwebtoken';
import { config } from '../configs/config.js';


export function authenticate(req, res, next) {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: 'Missing Authorization header' });
    const parts = auth.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') return res.status(401).json({ error: 'Invalid Authorization header' });
    const token = parts[1];
    try {
        const payload = jwt.verify(token, config.accessSecret);
        req.user = { id: payload.sub, roles: payload.roles || [] };
        return next();
    } catch (e) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}


export function authorize(allowedRoles = []) {
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
        const has = req.user.roles.some(r => allowedRoles.includes(r));
        if (!has) return res.status(403).json({ error: 'Forbidden' });
        return next();
    };
}
