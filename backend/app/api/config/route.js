import db from '@/lib/db';
import { ok, serverError } from '@/lib/response';

export async function GET() {
    try {
        const [rows] = await db.query('SELECT chave, valor FROM config');
        const config = {};
        rows.forEach(row => {
            config[row.chave] = row.valor;
        });
        return ok(config);
    } catch (e) {
        return serverError(e.message);
    }
}
