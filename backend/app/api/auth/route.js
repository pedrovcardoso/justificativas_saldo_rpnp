import { dispatchOtp, validateOtp } from '@/lib/otp';
import { signToken } from '@/lib/auth';
import db from '@/lib/db';
import { ok, badRequest, unauthorized, forbidden, serverError } from '@/lib/response';

export async function POST(request) {
    try {
        const body = await request.json();
        const { action, username, otp_code } = body;

        if (!action || !username) {
            return badRequest('Campos "action" e "username" são obrigatórios.');
        }

        if (action === 'send_otp') {
            const [users] = await db.query(
                'SELECT id FROM usuarios WHERE username = ? AND ativo = TRUE',
                [username]
            );
            if (users.length === 0) {
                return forbidden('Usuário sem acesso ao sistema.');
            }
            await dispatchOtp(username);
            return ok({}, 'Código enviado com sucesso.');
        }

        if (action === 'validate_otp') {
            if (!otp_code) return badRequest('Campo "otp_code" é obrigatório.');

            const valid = await validateOtp(username, otp_code);
            if (!valid) return unauthorized('Código inválido ou expirado.');

            const [users] = await db.query(
                'SELECT role, uo FROM usuarios WHERE username = ? AND ativo = TRUE',
                [username]
            );
            if (users.length === 0) return forbidden('Usuário sem acesso ao sistema.');

            const { role, uo } = users[0];
            const token = await signToken({ username, role, uo });

            return ok({ token, role, uo }, 'Autenticado com sucesso.');
        }

        return badRequest('Action inválida.');
    } catch (e) {
        console.error("Erro na rota de autenticação:", e);
        return serverError(e.message);
    }
}
