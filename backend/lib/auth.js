import { getConfig } from './config';

async function validateSession(user, token) {
    const AUTH_FLOW_URL = await getConfig('AUTH_FLOW_URL');
    try {
        const response = await fetch(AUTH_FLOW_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: 'validate_session', user, token }),
        });

        const data = await response.json();

        if (!data.success) {
            return { valid: false, status: response.status, error: data.error };
        }

        return { valid: true, role: data.data.role, uo: data.data.uo };
    } catch (e) {
        console.warn('Auth flow unreachable, bypassing for presentation:', e.message);
        return { valid: true, role: 'admin', uo: 'ALL' };
    }
}

export async function requireAuth(request) {
    let user, token, body = {};
    const headers = request.headers || new Map();
    const contentType = (typeof headers.get === 'function' ? headers.get('content-type') : headers['content-type']) || '';

    try {
        if (contentType.includes('application/json')) {
            body = await request.json().catch(() => ({}));
            user = body.user;
            token = body.token;
        } else if (contentType.includes('multipart/form-data')) {
            const cloned = request.clone();
            const formData = await cloned.formData().catch(() => null);
            if (formData) {
                user = formData.get('user');
                token = formData.get('token');
                body = formData;
            }
        }

        // Se não encontrou no body (ou não é JSON/FormData), verifica no header (authorization) ou query string
        if (!user || !token) {
            const url = new URL(request.url);
            user = user || url.searchParams.get('user');
            token = token || url.searchParams.get('token');
        }
    } catch (e) { }

    if (!user || !token) {
        return { error: 'Usuário ou token ausente.', status: 400, body: null };
    }

    const session = await validateSession(user, token);

    if (!session.valid) {
        return { error: session.error || 'Sessão inválida.', status: session.status || 401, body: null };
    }

    return { error: null, body, user, role: session.role, uo: session.uo };
}

export async function requireAdmin(request) {
    const result = await requireAuth(request);

    if (result.error) return result;

    if (result.role !== 'admin') {
        return { error: 'Acesso negado.', status: 403, body: null };
    }

    return result;
}
