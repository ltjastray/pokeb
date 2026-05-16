(() => {
  "use strict";

  const STORAGE_KEY = "katalog_menus_v2";
  const SESSION_KEY = "katalog_admin_session";
  const DATA_URL = "./data.json";

  // Demo credential untuk static hosting:
  // username: admin
  // password: admin123
  // SHA-256("admin123")
  const ADMIN_USERNAME = "admin";
  const ADMIN_PASSWORD_SHA256 = "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9";

  const state = {
    menus: [],
    isLoggedIn: sessionStorage.getItem(SESSION_KEY) === "true",
    query: ""
  };

  const el = {
    catalogSection: document.getElementById("catalogSection"),
    adminSection: document.getElementById("adminSection"),
    showCatalogBtn: document.getElementById("showCatalogBtn"),
    showAdminBtn: document.getElementById("showAdminBtn"),
    catalogContainer: document.getElementById("catalogContainer"),
    resetPublicBtn: document.getElementById("resetPublicBtn"),
    searchInput: document.getElementById("searchInput"),

    loginPanel: document.getElementById("loginPanel"),
    crudPanel: document.getElementById("crudPanel"),
    loginForm: document.getElementById("loginForm"),
    usernameInput: document.getElementById("usernameInput"),
    passwordInput: document.getElementById("passwordInput"),
    loginError: document.getElementById("loginError"),

    itemForm: document.getElementById("itemForm"),
    formTitle: document.getElementById("formTitle"),
    itemName: document.getElementById("itemName"),
    itemUrl: document.getElementById("itemUrl"),
    editId: document.getElementById("editId"),
    cancelEditBtn: document.getElementById("cancelEditBtn"),
    formError: document.getElementById("formError"),
    adminTableBody: document.getElementById("adminTableBody"),
    logoutBtn: document.getElementById("logoutBtn"),
    exportJsonBtn: document.getElementById("exportJsonBtn")
  };

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    state.menus = await loadMenus();
    bindEvents();
    renderAll();
    showCatalog();
  }

  function bindEvents() {
    el.showCatalogBtn.addEventListener("click", showCatalog);
    el.showAdminBtn.addEventListener("click", showAdmin);

    el.searchInput.addEventListener("input", (event) => {
      state.query = event.target.value.trim().toLowerCase();
      renderCatalog();
    });

    el.resetPublicBtn.addEventListener("click", async () => {
      if (!confirm("Reset data lokal dan muat ulang dari data.json?")) return;
      localStorage.removeItem(STORAGE_KEY);
      state.menus = await fetchDefaultMenus();
      persistMenus();
      resetForm();
      renderAll();
    });

    el.loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      await login();
    });

    el.itemForm.addEventListener("submit", (event) => {
      event.preventDefault();
      saveItem();
    });

    el.cancelEditBtn.addEventListener("click", resetForm);
    el.logoutBtn.addEventListener("click", logout);
    el.exportJsonBtn.addEventListener("click", exportJson);

    el.adminTableBody.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;

      const id = button.dataset.id;
      if (button.dataset.action === "edit") startEdit(id);
      if (button.dataset.action === "delete") deleteItem(id);
    });
  }

  async function loadMenus() {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return normalizeMenus(parsed);
      } catch (error) {
        console.warn("Data localStorage rusak, memuat ulang data.json", error);
      }
    }

    const defaults = await fetchDefaultMenus();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
    return defaults;
  }

  async function fetchDefaultMenus() {
    try {
      const response = await fetch(DATA_URL, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();
      if (!Array.isArray(json)) throw new Error("data.json harus berupa array");
      return normalizeMenus(json);
    } catch (error) {
      console.error("Gagal membaca data.json", error);
      return [];
    }
  }

  function normalizeMenus(items) {
    return items
      .filter((item) => item && item.name && item.url)
      .map((item) => ({
        id: item.id || crypto.randomUUID(),
        name: String(item.name).trim(),
        url: String(item.url).trim()
      }));
  }

  function persistMenus() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.menus));
  }

  function renderAll() {
    renderCatalog();
    renderAdminTable();
    renderAuthState();
  }

  function renderCatalog() {
    const filtered = state.menus.filter((item) => {
      if (!state.query) return true;
      return `${item.name} ${item.url}`.toLowerCase().includes(state.query);
    });

    if (filtered.length === 0) {
      el.catalogContainer.innerHTML = `<div class="empty-state">Tidak ada data yang cocok.</div>`;
      return;
    }

    el.catalogContainer.innerHTML = filtered.map((item) => `
      <article class="card">
        <h3>${escapeHTML(item.name)}</h3>
        <a href="${escapeAttribute(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(item.url)}</a>
      </article>
    `).join("");
  }

  function renderAdminTable() {
    if (state.menus.length === 0) {
      el.adminTableBody.innerHTML = `<tr><td colspan="3">Belum ada data.</td></tr>`;
      return;
    }

    el.adminTableBody.innerHTML = state.menus.map((item) => `
      <tr>
        <td>${escapeHTML(item.name)}</td>
        <td><a href="${escapeAttribute(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(item.url)}</a></td>
        <td>
          <div class="row-actions">
            <button class="btn btn-secondary" type="button" data-action="edit" data-id="${escapeAttribute(item.id)}">Edit</button>
            <button class="btn btn-danger" type="button" data-action="delete" data-id="${escapeAttribute(item.id)}">Hapus</button>
          </div>
        </td>
      </tr>
    `).join("");
  }

  function renderAuthState() {
    if (state.isLoggedIn) {
      el.loginPanel.classList.add("hidden");
      el.crudPanel.classList.remove("hidden");
      renderAdminTable();
    } else {
      el.loginPanel.classList.remove("hidden");
      el.crudPanel.classList.add("hidden");
    }
  }

  async function login() {
    const username = el.usernameInput.value.trim();
    const password = el.passwordInput.value;

    const hash = await sha256(password);
    if (username === ADMIN_USERNAME && hash === ADMIN_PASSWORD_SHA256) {
      state.isLoggedIn = true;
      sessionStorage.setItem(SESSION_KEY, "true");
      el.loginError.textContent = "";
      el.passwordInput.value = "";
      renderAuthState();
      return;
    }

    el.loginError.textContent = "Username atau password salah.";
  }

  function logout() {
    state.isLoggedIn = false;
    sessionStorage.removeItem(SESSION_KEY);
    el.usernameInput.value = "";
    el.passwordInput.value = "";
    resetForm();
    renderAuthState();
  }

  function saveItem() {
    const name = el.itemName.value.trim();
    const url = el.itemUrl.value.trim();
    const id = el.editId.value;

    if (!name || !url) {
      el.formError.textContent = "Nama dan URL wajib diisi.";
      return;
    }

    if (!isValidHttpUrl(url)) {
      el.formError.textContent = "URL harus valid dan diawali http:// atau https://.";
      return;
    }

    if (id) {
      const index = state.menus.findIndex((item) => item.id === id);
      if (index === -1) {
        el.formError.textContent = "Data yang diedit tidak ditemukan.";
        return;
      }
      state.menus[index] = { ...state.menus[index], name, url };
    } else {
      state.menus.push({ id: crypto.randomUUID(), name, url });
    }

    persistMenus();
    resetForm();
    renderAll();
  }

  function startEdit(id) {
    const item = state.menus.find((menu) => menu.id === id);
    if (!item) return;

    el.editId.value = item.id;
    el.itemName.value = item.name;
    el.itemUrl.value = item.url;
    el.formTitle.textContent = "Edit Item";
    el.formError.textContent = "";
    el.itemName.focus();
  }

  function deleteItem(id) {
    const item = state.menus.find((menu) => menu.id === id);
    if (!item) return;

    if (!confirm(`Hapus "${item.name}"?`)) return;

    state.menus = state.menus.filter((menu) => menu.id !== id);
    persistMenus();
    renderAll();
  }

  function resetForm() {
    el.editId.value = "";
    el.itemName.value = "";
    el.itemUrl.value = "";
    el.formTitle.textContent = "Tambah Item";
    el.formError.textContent = "";
  }

  function exportJson() {
    const dataForFile = state.menus.map(({ name, url }) => ({ name, url }));
    const blob = new Blob([JSON.stringify(dataForFile, null, 2)], { type: "application/json" });
    const objectUrl = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = "data.json";
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(objectUrl);
  }

  function showCatalog() {
    el.catalogSection.style.display = "block";
    el.adminSection.classList.remove("visible");
    el.showCatalogBtn.classList.add("active");
    el.showAdminBtn.classList.remove("active");
  }

  function showAdmin() {
    el.catalogSection.style.display = "none";
    el.adminSection.classList.add("visible");
    el.showAdminBtn.classList.add("active");
    el.showCatalogBtn.classList.remove("active");
    renderAuthState();
  }

  async function sha256(value) {
    const bytes = new TextEncoder().encode(value);
    const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(hashBuffer)]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  function isValidHttpUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }

  function escapeHTML(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escapeAttribute(value) {
    return escapeHTML(value).replaceAll("`", "&#096;");
  }
})();
