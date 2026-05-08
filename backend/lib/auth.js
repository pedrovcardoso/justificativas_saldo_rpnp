import { SignJWT, jwtVerify } from 'jose';
import db from './db';

function getJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET não configurado.');
    return new TextEncoder().encode(secret);
}

export async function signToken(payload) {
    const expiryHours = Number(process.env.JWT_EXPIRY_HOURS);
    if (!expiryHours) throw new Error("JWT_EXPIRY_HOURS não configurado no .env.local.");
    return new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(`${expiryHours}h`)
        .sign(getJwtSecret());
}

async function verifyToken(token) {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload;
}

function extractBearer(request) {
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) return null;
    return authHeader.slice(7);
}

export async function requireAuth(request) {
    const token = extractBearer(request);
    if (!token) {
        return { error: 'Token ausente.', status: 401, body: null };
    }

    let payload;
    try {
        payload = await verifyToken(token);
    } catch {
        return { error: 'Token inválido ou expirado.', status: 401, body: null };
    }

    const [rows] = await db.query(
        'SELECT role, uo FROM usuarios WHERE username = ? AND ativo = TRUE',
        [payload.username]
    );

    if (rows.length === 0) {
        return { error: 'Usuário sem acesso ao sistema.', status: 403, body: null };
    }

    let body = {};
    try {
        const cloned = request.clone();
        const contentType = request.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            body = await cloned.json().catch(() => ({}));
        } else if (contentType.includes('multipart/form-data')) {
            body = await cloned.formData().catch(() => new FormData());
        }
    } catch { }

    return { error: null, body, user: payload.username, role: rows[0].role, uo: rows[0].uo };
}

export async function requireAdmin(request) {
    const result = await requireAuth(request);
    if (result.error) return result;
    if (result.role !== 'admin') {
        return { error: 'Acesso negado.', status: 403, body: null };
    }
    return result;
}
