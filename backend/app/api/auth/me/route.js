import { requireAuth } from '@/lib/auth';
import { ok, authError } from '@/lib/response';

export async function GET(request) {
    const auth = await requireAuth(request);
    if (auth.error) return authError(auth);
    return ok({ username: auth.user, role: auth.role, uo: auth.uo }, 'Sessão válida.');
}
