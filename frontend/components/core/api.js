const API_BASE = (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost") ? "http://localhost:3000/api" : "/api";

const API_URLS = {
    saveJustificativa: `${API_BASE}/justificativas/justificar`,
    avaliarStatus: `${API_BASE}/justificativas/avaliar_status`,
    getData: `${API_BASE}/data/get_data`,
    checkStatus: `${API_BASE}/data/check_status`,
    adminUsers: `${API_BASE}/admin/users`,
    adminNotif: `${API_BASE}/admin/notifications`,
    adminLeg: `${API_BASE}/admin/legislacao`,
    adminImport: `${API_BASE}/admin/import_csv`,
    adminTiposJustificativa: `${API_BASE}/admin/tipos_justificativa`,
    userNotif: `${API_BASE}/user/notifications`,
    userNotifRead: `${API_BASE}/user/notifications/mark-read`,
    authSend: `${API_BASE}/auth`,
    authMe: `${API_BASE}/auth/me`,
};

function getBearer() {
    const token = sessionStorage.getItem("rppn_token");
    return token ? { "Authorization": `Bearer ${token}` } : {};
}

async function apiCall(url, body, method = "POST", isFormData = false) {
    try {
        const options = { method };
        const bearerHeaders = getBearer();

        if (method !== "GET" && method !== "HEAD" && body) {
            options.body = isFormData ? body : JSON.stringify(body);
            options.headers = isFormData
                ? { ...bearerHeaders }
                : { "Content-Type": "application/json", ...bearerHeaders };
        } else {
            options.headers = { ...bearerHeaders };
        }

        const response = await fetch(url, options);

        let data = {};
        try { data = await response.json(); } catch (_) { }

        return { ok: response.ok, status: response.status, data };
    } catch (error) {
        console.error(error);
        return { ok: false, status: 0, data: { success: false, error: "Erro de conexão." } };
    }
}

async function sendOtp(username) {
    return apiCall(API_URLS.authSend, { action: "send_otp", username });
}

async function validateOtp(username, otp_code) {
    return apiCall(API_URLS.authSend, { action: "validate_otp", username, otp_code });
}

async function authMe() {
    return apiCall(API_URLS.authMe, null, "GET");
}

async function justificar(rppn, acao, justificativa) {
    return apiCall(API_URLS.saveJustificativa, { acao, justificativa, dados: [{ rppn }] });
}

async function justificarLote(acao, justificativa, dados) {
    return apiCall(API_URLS.saveJustificativa, { acao, justificativa, dados });
}

async function avaliarStatus(rppn, id, status, motivo_rejeicao = "") {
    return apiCall(API_URLS.avaliarStatus, { status, motivo_rejeicao, dados: [{ rppn, id }] });
}

async function getData() {
    return apiCall(API_URLS.getData, {});
}

async function checkStatus() {
    return apiCall(API_URLS.checkStatus, {});
}

async function getUsers() {
    return apiCall(API_URLS.adminUsers, null, "GET");
}

async function createUser(payload) {
    return apiCall(API_URLS.adminUsers, payload);
}

async function updateUser(payload) {
    return apiCall(API_URLS.adminUsers, payload, "PUT");
}

async function getNotifications() {
    return apiCall(API_URLS.adminNotif, null, "GET");
}

async function createNotification(payload) {
    return apiCall(API_URLS.adminNotif, payload);
}

async function updateNotification(payload) {
    return apiCall(API_URLS.adminNotif, payload, "PUT");
}

async function deleteNotification(id) {
    return apiCall(API_URLS.adminNotif, { id }, "DELETE");
}

async function getLegislacao() {
    return apiCall(API_URLS.adminLeg, null, "GET");
}

async function saveLegislacao(items) {
    return apiCall(API_URLS.adminLeg, { items });
}

async function importCSV(file) {
    const formData = new FormData();
    formData.append("file", file);
    return apiCall(API_URLS.adminImport, formData, "POST", true);
}

async function getUserNotifications() {
    return apiCall(API_URLS.userNotif, null, "GET");
}

async function markAllNotificationsAsRead() {
    return apiCall(API_URLS.userNotifRead, {});
}

async function getTiposJustificativa() {
    return apiCall(API_URLS.adminTiposJustificativa, null, "GET");
}

async function saveTipoJustificativa(payload) {
    return apiCall(API_URLS.adminTiposJustificativa, payload);
}

async function deleteTipoJustificativa(id) {
    return apiCall(`${API_URLS.adminTiposJustificativa}/${id}`, null, "DELETE");
}

if (typeof module !== "undefined") {
    module.exports = {
        sendOtp, validateOtp, authMe,
        justificar, justificarLote, avaliarStatus,
        getData, checkStatus,
        getUsers, createUser, updateUser,
        getNotifications, createNotification, updateNotification, deleteNotification,
        getLegislacao, saveLegislacao, importCSV,
        getUserNotifications, markAllNotificationsAsRead,
        getTiposJustificativa, saveTipoJustificativa, deleteTipoJustificativa
    };
}