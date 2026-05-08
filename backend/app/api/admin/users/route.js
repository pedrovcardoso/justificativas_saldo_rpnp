import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { ok, authError, badRequest, conflict, notFound, serverError } from '@/lib/response';

export async function GET(request) {
    const admin = await requireAdmin(request);
    if (admin.error) return authError(admin);

    const [rows] = await db.query(
        'SELECT id, username, role, uo, ativo, criado_em FROM usuarios ORDER BY criado_em DESC'
    );
    return ok(rows, 'Usuários obtidos com sucesso.');
}

export async function POST(request) {
    const admin = await requireAdmin(request);
    if (admin.error) return authError(admin);

    const { username, role, uo } = admin.body;
    if (!username || !role) return badRequest('Campos "username" e "role" são obrigatórios.');
    if (!['user', 'admin'].includes(role)) return badRequest('Role inválida.');

    const [existing] = await db.query('SELECT id FROM usuarios WHERE username = ?', [username]);
    if (existing.length > 0) return conflict('Usuário já cadastrado.');

    const [result] = await db.query(
        'INSERT INTO usuarios (username, role, uo) VALUES (?, ?, ?)',
        [username, role, uo || null]
    );
    return ok({ id: result.insertId, username, role, uo: uo || null }, 'Usuário criado com sucesso.');
}

export async function PUT(request) {
    const admin = await requireAdmin(request);
    if (admin.error) return authError(admin);

    const { id, role, uo, ativo } = admin.body;
    if (!id) return badRequest('Campo "id" é obrigatório.');
    if (role && !['user', 'admin'].includes(role)) return badRequest('Role inválida.');

    const [existing] = await db.query('SELECT id FROM usuarios WHERE id = ?', [id]);
    if (existing.length === 0) return notFound('Usuário não encontrado.');

    const fields = [];
    const params = [];
    if (role !== undefined) { fields.push('role = ?'); params.push(role); }
    if (uo !== undefined) { fields.push('uo = ?'); params.push(uo || null); }
    if (ativo !== undefined) { fields.push('ativo = ?'); params.push(ativo ? 1 : 0); }

    if (fields.length === 0) return badRequest('Nenhum campo para atualizar.');

    params.push(id);
    await db.query(`UPDATE usuarios SET ${fields.join(', ')} WHERE id = ?`, params);
    return ok({ id }, 'Usuário atualizado com sucesso.');
}
