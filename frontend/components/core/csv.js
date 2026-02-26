function parseCSV(csvString) {
    if (!csvString || typeof csvString !== "string") return [];

    const lines = csvString.split(/\r?\n/).filter(l => l.trim() !== "");
    if (lines.length < 2) return [];

    const headers = lines[0].split(";").map(h => h.replace(/^"|"$/g, "").trim());

    return lines.slice(1).map(line => {
        const values = line.split(";").map(v => v.replace(/^"|"$/g, "").trim());
        const obj = {};
        headers.forEach((h, i) => {
            obj[h] = values[i] ?? null;
        });
        return obj;
    });
}

function getColumns(data) {
    if (!data.length) return [];
    return Object.keys(data[0]);
}

function formatMoeda(value) {
    if (value === null || value === undefined || value === "") return "—";

    const num = parseMoeda(value);
    if (isNaN(num)) return value;

    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(num);
}

function parseMoeda(value) {
    if (value === null || value === undefined || value === "") return NaN;

    let cleanValue = String(value).trim();

    if (cleanValue.includes(".") && cleanValue.includes(",")) {
        cleanValue = cleanValue.replace(/\./g, "").replace(",", ".");
    } else {
        cleanValue = cleanValue.replace(",", ".");
    }

    return parseFloat(cleanValue);
}
