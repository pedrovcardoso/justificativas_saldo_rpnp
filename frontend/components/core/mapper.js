/**
 * Utility to map database column names to CSV display names.
 * Uses columns_mapping.json as the source of truth.
 */
const ColumnMapper = {
    _map: null,

    async load() {
        if (this._map) return this._map;
        try {
            // Find base path based on location
            const isDashboard = window.location.href.includes('/pages/dashboard');
            const isRelatorio = window.location.href.includes('/pages/relatorio');
            let path = '../../assets/json/columns_mapping.json';

            if (!isDashboard && !isRelatorio) {
                // If called from a component or root
                path = '/frontend/assets/json/columns_mapping.json';
            }

            const response = await fetch(path);
            this._map = await response.json();
            return this._map;
        } catch (error) {
            console.error("Failed to load column mapping:", error);
            return {};
        }
    },

    /**
     * Converts an array of objects from database keys to CSV keys
     * @param {Array} rows - Rows from the API
     * @returns {Promise<Array>} - Mapped rows
     */
    async mapRows(rows) {
        const map = await this.load();
        if (!rows || !Array.isArray(rows)) return [];

        return rows.map(row => {
            const mapped = { ...row };
            for (const [dbKey, csvKey] of Object.entries(map)) {
                if (row[dbKey] !== undefined) {
                    mapped[csvKey] = row[dbKey];
                }
            }
            return mapped;
        });
    }
};

if (typeof module !== "undefined") {
    module.exports = ColumnMapper;
} else {
    window.ColumnMapper = ColumnMapper;
}
