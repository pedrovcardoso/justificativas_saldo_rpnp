import db from './db';

let cachedConfig = null;

export async function getConfig(chave) {
    if (cachedConfig) return cachedConfig[chave];
    
    try {
        const [rows] = await db.query('SELECT chave, valor FROM config');
        cachedConfig = {};
        rows.forEach(row => {
            cachedConfig[row.chave] = row.valor;
        });
        return cachedConfig[chave];
    } catch (e) {
        console.error('Erro ao ler config do banco:', e.message);
        return process.env[chave]; // Fallback para env var
    }
}
