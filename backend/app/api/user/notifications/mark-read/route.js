import db from '@/lib/db';
import { ok, serverError, badRequest } from '@/lib/response';

export async function POST(request) {
    try {
        const { user } = await request.json();

        if (!user) return badRequest('Campo "user" é obrigatório.');

        // Marca todas as notificações ativas como lidas para este usuário
        await db.query(`
            INSERT IGNORE INTO notificacoes_lidas (user, notificacao_id)
            SELECT ?, id FROM notificacoes WHERE ativo = TRUE
        `, [user]);

        return ok({}, 'Todas as notificações marcadas como lidas.');
    } catch (e) {
        return serverError(e.message);
    }
}
