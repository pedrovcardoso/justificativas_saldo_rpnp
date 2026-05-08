import db from '@/lib/db';
import { requireAuth } from '@/lib/auth'
import { ok, serverError, authError } from '@/lib/response';

export async function POST(request) {
    try {
        const auth = await requireAuth(request)
        if(auth.error) return authError(auth)

        // Marca todas as notificações ativas como lidas para este usuário
        await db.query(`
            INSERT IGNORE INTO notificacoes_lidas (user, notificacao_id)
            SELECT ?, id FROM notificacoes WHERE ativo = TRUE
        `, [auth.user]);

        return ok({}, 'Todas as notificações marcadas como lidas.');
    } catch (e) {
        return serverError(e.message);
    }
}
