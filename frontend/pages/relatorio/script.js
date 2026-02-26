const session = requireSession("../login/index.html");

let rawData = [];
let panelFilteredData = [];
let tableFilteredData = [];
let columns = [];
let currentPage = 1;
let itemsPerPage = 25;

const PANEL_SELECT_IDS = ["filterUE", "filterPrograma", "filterElemento", "filterStatus"];

let COLUMN_CONFIG = [];

const INITIAL_COLUMNS = [
    { key: "Unidade Orçamentária - Código", label: "UNIDADE ORÇAMENTÁRIA", visible: true },
    { key: "Unidade Executora - Código", label: "UNIDADE EXECUTORA", visible: true },
    { key: "Ano Origem Restos a Pagar", label: "ANO ORIGEM EMPENHO", visible: true },
    { key: "Documento Restos a Pagar", label: "NÚMERO EMPENHO", visible: true },
    { key: "Função - Código", label: "FUNÇÃO", visible: true },
    { key: "Subfunção - Código", label: "SUBFUNÇÃO", visible: true },
    { key: "Natureza_Item Despesa - Código Form", label: "NATUREZA ITEM", visible: true },
    { key: "Procedência - Código", label: "PROCEDENCIA", visible: true },
    { key: "Projeto_Atividade - Código", label: "PROJETO ATIVIDADE", visible: true }
];

let descriptiveData = {
    unidades: [],
    programas: [],
    elementos: []
};

async function loadDescriptiveData() {
    try {
        const [u, p, e] = await Promise.all([
            fetch("../../assets/json/unidades.json").then(r => r.json()),
            fetch("../../assets/json/programas.json").then(r => r.json()),
            fetch("../../assets/json/elemento_item.json").then(r => r.json())
        ]);
        descriptiveData.unidades = u;
        descriptiveData.programas = p;
        descriptiveData.elementos = e;
    } catch (err) {
        console.error("Erro ao carregar dados descritivos:", err);
    }
}

function showState(name) {
    ["stateLoading", "stateTable", "stateEmpty"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle("hidden", id !== name);
    });
    const pag = document.getElementById("paginationWrap");
    if (pag) pag.classList.toggle("hidden", name !== "stateTable");
}

async function init() {
    // Sync itemsPerPage with the selector value
    const rowsSelect = document.getElementById("rowsPerPage");
    if (rowsSelect) {
        rowsSelect.value = itemsPerPage;
    }

    PANEL_SELECT_IDS.forEach(id => renderSkeletonSelect(id));
    showState("stateLoading");
    await loadDescriptiveData();

    const res = await getData(session.user, session.token);
    if (!res.ok || !res.data?.success) {
        showState("stateEmpty");
        return;
    }

    const csvRaw = res.data?.data?.csv || "";
    rawData = parseCSV(csvRaw);
    enrichRows(rawData);

    if (rawData.length > 0) {
        const allKeys = Object.keys(rawData[0]);

        // Versão profunda das colunas iniciais definidas no topo
        COLUMN_CONFIG = INITIAL_COLUMNS.map(conf => ({ ...conf }));

        // Adiciona automaticamente qualquer outra coluna que venha da API (mas deixa oculta por padrão)
        allKeys.forEach(key => {
            if (!COLUMN_CONFIG.some(c => c.key === key)) {
                COLUMN_CONFIG.push({
                    key,
                    label: key,
                    visible: false
                });
            }
        });

        columns = COLUMN_CONFIG
            .filter(conf => conf.visible)
            .map(conf => conf.key);
    }

    populateFilterOptions();
    applyFilters();
}

function enrichRows(rows) {
    rows.forEach(row => {
        const uoCode = String(row["Unidade Orçamentária - Código"] || "");
        const uo = descriptiveData.unidades.find(u => String(u.unidade_orcamentaria_codigo) === uoCode);
        const ueCode = String(row["Unidade Executora - Código"] || "");
        row["Unidade Executora - Nome"] = (uo && uo.unidades_executoras.find(u => String(u.codigo) === ueCode))?.nome || "N/A";

        const progCode = String(row["Programa - Código"] || "");
        let progDesc = "N/A";
        for (const entry of descriptiveData.programas) {
            const p = entry.programas.find(pr => String(pr.codigo) === progCode);
            if (p) { progDesc = p.descricao; break; }
        }
        row["Programa - Descrição"] = progDesc;

        const elemCode = String(row["Elemento Item Despesa - Código"] || "");
        let elemDesc = "N/A";
        for (const entry of descriptiveData.elementos) {
            const e = entry.itens.find(i => String(i.codigo) === elemCode);
            if (e) { elemDesc = e.descricao; break; }
        }
        row["Elemento Item - Descrição"] = elemDesc;
    });
}

function populateFilterOptions() {
    const sets = { filterUE: new Set(), filterPrograma: new Set(), filterElemento: new Set(), filterStatus: new Set() };
    rawData.forEach(row => {
        if (row["Unidade Executora - Nome"]) sets.filterUE.add(row["Unidade Executora - Nome"]);
        if (row["Programa - Descrição"]) sets.filterPrograma.add(row["Programa - Descrição"]);
        if (row["Elemento Item - Descrição"]) sets.filterElemento.add(row["Elemento Item - Descrição"]);
        if (row["Status Justificativa"]) sets.filterStatus.add(row["Status Justificativa"]);
    });

    Object.keys(sets).forEach(id => {
        setCustomSelectOptions(id, [...sets[id]].sort());
        onCustomSelectChange(id, () => applyFilters());
    });
}

function applyFilters() {
    const q = document.getElementById("searchInput").value.toLowerCase();
    const ue = getCustomSelectValues("filterUE");
    const pr = getCustomSelectValues("filterPrograma");
    const el = getCustomSelectValues("filterElemento");
    const st = getCustomSelectValues("filterStatus");

    panelFilteredData = rawData.filter(row => {
        const matchesSearch = !q || columns.some(c => String(row[c] || "").toLowerCase().includes(q));
        const matchesUE = !ue.length || ue.includes(row["Unidade Executora - Nome"]);
        const matchesPR = !pr.length || pr.includes(row["Programa - Descrição"]);
        const matchesEL = !el.length || el.includes(row["Elemento Item - Descrição"]);
        const matchesST = !st.length || st.includes(row["Status Justificativa"]);
        return matchesSearch && matchesUE && matchesPR && matchesEL && matchesST;
    });

    applyTableColumnFilters();
    updateFilterCount(q || ue.length || pr.length || el.length || st.length);
}

function applyTableColumnFilters() {
    const tableColFilters = typeof window.getActiveTableFilters === 'function' ? window.getActiveTableFilters() : {};

    tableFilteredData = panelFilteredData.filter(row => {
        for (const colKey in tableColFilters) {
            if (colKey.endsWith('_range')) continue;

            const reqVals = tableColFilters[colKey];
            const range = tableColFilters[colKey + '_range'];
            const cellValueStr = String(row[colKey] ?? '');

            if (reqVals && reqVals.length > 0) {
                const cellValuesList = cellValueStr.split('||');
                const isMatchFound = cellValuesList.some(val => reqVals.includes(val));
                if (!isMatchFound) return false;
            }

            if (range) {
                const val = typeof parseMoeda === 'function' ? parseMoeda(cellValueStr) : parseFloat(cellValueStr);
                if (range.min !== '' && val < parseFloat(range.min)) return false;
                if (range.max !== '' && val > parseFloat(range.max)) return false;
            }
        }
        return true;
    });

    const sort = typeof window.getActiveTableSort === 'function' ? window.getActiveTableSort() : null;
    if (sort && sort.key && sort.direction) {
        window.sortDataArray(tableFilteredData, sort.key, sort.direction);
    }

    window._tableFilteredData = tableFilteredData;
    currentPage = 1;
    renderTable();
}

window.addEventListener('tableFiltersChanged', () => {
    applyTableColumnFilters();
});

window.addEventListener('columnConfigChanged', (e) => {
    if (e.detail && e.detail.config) {
        COLUMN_CONFIG = e.detail.config;
        columns = COLUMN_CONFIG.filter(c => c.visible).map(c => c.key);

        // Reset header to force redraw with new names and visibility
        document.getElementById("tableHead").innerHTML = "";
        renderTable();
    }
});


function renderTable() {
    if (!tableFilteredData.length) { showState("stateEmpty"); return; }
    showState("stateTable");

    const head = document.getElementById("tableHead");
    if (head.innerHTML === "") {
        columns.forEach(colKey => {
            const conf = COLUMN_CONFIG.find(c => c.key === colKey) || { label: colKey };
            const th = document.createElement("th");
            th.className = "px-4 py-3 text-left text-[11px] font-bold text-slate-400 normal-case tracking-tight relative group min-w-0";

            // Match Dashboard widths
            th.style.width = "180px";
            th.style.minWidth = "50px";
            th.style.maxWidth = "400px";

            th.innerHTML = `
                <div class="flex items-center gap-1.5 min-w-0">
                    <i class='bx bx-grid-vertical table-drag-handle cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity'></i>
                    <span class="table-span-header cursor-pointer truncate min-w-0">${conf.label}</span>
                    <span class="sort-indicator"></span>
                    <button class="table-filter-trigger shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" data-key="${colKey}">
                        <i class="bx bx-filter filter-icon"></i>
                    </button>
                </div>
            `;
            head.appendChild(th);
        });
    }

    const body = document.getElementById("tableBody");
    const start = (currentPage - 1) * itemsPerPage;
    const pageData = tableFilteredData.slice(start, start + itemsPerPage);

    body.innerHTML = pageData.map(row => `
        <tr class="hover:bg-slate-50 transition-colors">
            ${columns.map(c => {
        let val = row[c] || "";
        const isCurrency = c.includes("Saldo") || c.includes("Valor");
        const isStatus = c.includes("Status");

        if (isCurrency) val = formatMoeda(val);

        let content = val;
        if (isStatus) {
            const status = String(val).toLowerCase();
            let cls = "bg-slate-100 text-slate-500";
            if (status.includes("pendente")) cls = "bg-amber-50 text-amber-700";
            else if (status.includes("mantido") || status.includes("aprovado")) cls = "bg-emerald-50 text-emerald-700";
            else if (status.includes("cancelado") || status.includes("rejeitado")) cls = "bg-rose-50 text-rose-700";
            content = `<span class="px-2 py-1 rounded-lg text-[10px] font-bold ${cls}">${val}</span>`;
        }

        return `
            <td class="px-4 py-3 text-[13px] text-slate-600 font-medium overflow-hidden min-w-0 ${isCurrency ? 'font-mono' : ''}">
                <span class="line-clamp-1 truncate block w-full" title="${val}">${content}</span>
            </td>
        `;
    }).join("")}
        </tr>
    `).join("");

    updatePagination();
    afterTableRender();
}

function updatePagination() {
    const total = tableFilteredData.length;
    const pages = Math.ceil(total / itemsPerPage) || 1;
    const start = total === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
    const end = Math.min(currentPage * itemsPerPage, total);

    document.getElementById("paginationInfo").textContent = `${start} — ${end} de ${total} registros`;
    document.getElementById("pageNumber").textContent = currentPage;
    document.getElementById("btnPrev").disabled = currentPage === 1;
    document.getElementById("btnNext").disabled = currentPage >= pages;
}

function changePage(delta) {
    currentPage += delta;
    renderTable();
}

function handleRowsPerPageChange() {
    itemsPerPage = parseInt(document.getElementById("rowsPerPage").value);
    currentPage = 1;
    renderTable();
}


function updateFilterCount(active) {
    const el = document.getElementById("filterResultCount");
    if (active) {
        el.textContent = `${tableFilteredData.length} resultados encontrados`;
        el.classList.remove("opacity-0");
    } else {
        el.classList.add("opacity-0");
    }
}

function clearAllTableFilters() {
    document.getElementById("searchInput").value = "";
    PANEL_SELECT_IDS.forEach(id => clearCustomSelect(id));
    window.dispatchEvent(new Event('clearAllFilters'));
    applyFilters();
}

function exportCSV() {
    if (!tableFilteredData.length) return;
    const labels = columns.map(colKey => {
        const conf = COLUMN_CONFIG.find(c => c.key === colKey);
        return conf ? conf.label : colKey;
    });
    const headers = labels.join(",");
    const rows = tableFilteredData.map(row => columns.map(c => `"${row[c] || ""}"`).join(",")).join("\n");
    const blob = new Blob([headers + "\n" + rows], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_rppn_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
}

function exportExcel() {
    if (!tableFilteredData.length) return;

    const data = tableFilteredData.map(row => {
        const n = {};
        columns.forEach(colKey => {
            const conf = COLUMN_CONFIG.find(c => c.key === colKey);
            const label = conf ? conf.label : colKey;
            n[label] = row[colKey];
        });
        return n;
    });

    const ws = XLSX.utils.json_to_sheet(data);

    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let C = range.s.c; C <= range.e.c; ++C) {
        const address = XLSX.utils.encode_col(C) + "1";
        if (!ws[address]) continue;
        ws[address].s = {
            fill: { fgColor: { rgb: "003D5D" } },
            font: { color: { rgb: "FFFFFF" }, bold: true },
            alignment: { horizontal: "center", vertical: "center" }
        };
    }

    ws['!autofilter'] = { ref: ws['!ref'] };
    ws['!views'] = [{ state: 'frozen', ySplit: 1 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Relatório");
    XLSX.writeFile(wb, `relatorio_rppn_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function filterTable() { applyFilters(); }

if (session) {
    Layout.ready.then(() => init());
}

function afterTableRender() {
    setTimeout(() => {
        initializeTableFilters("stateTable");
        initializeTableResizing("stateTable");
        initializeTableReordering("stateTable");
        initializeColumnRenaming("stateTable");
        initializeColumnVisibility("stateTable", "btnColumns", COLUMN_CONFIG);
    }, 50);
}
