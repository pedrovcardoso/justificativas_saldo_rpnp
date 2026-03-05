import db from '@/lib/db';
import { ok, serverError, badRequest } from '@/lib/response';

export async function GET(request) {
    try {
        const params = new URL(request.url).searchParams;
        const user = params.get('user');

        if (!user) return badRequest('Campo "user" é obrigatório.');

        const [rows] = await db.query(`
            SELECT n.*, 
                   IF(nl.id IS NOT NULL, TRUE, FALSE) as lida
            FROM notificacoes n
            LEFT JOIN notificacoes_lidas nl ON n.id = nl.notificacao_id AND nl.user = ?
            WHERE n.ativo = TRUE
            ORDER BY n.id DESC
        `, [user]);

        return ok(rows, 'Notificações obtidas com sucesso.');
    } catch (e) {
        return serverError(e.message);
    }
}
