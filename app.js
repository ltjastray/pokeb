(() => {
  "use strict";

  const STORAGE_KEY = "katalog_menus_v2";
  
  // Menggunakan file JSON hasil sinkronisasi Docker dari zizi.biz.id
  const EXTERNAL_DATA_URL = "./data-zizi-pokeb.json";
  const LOCAL_DATA_URL = "./data.json";
  
  // URL Web utama untuk tombol Copy Web
  const MAIN_WEB_URL = "https://ltjastray.github.io/pokeb/";

  const state = {
    menus: [],
    query: ""
  };

  const el = {
    catalogContainer: document.getElementById("catalogContainer"),
    resetPublicBtn: document.getElementById("resetPublicBtn"),
    copyWebBtn: document.getElementById("copyWebBtn"),
    searchInput: document.getElementById("searchInput"),
  };

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    state.menus = await loadMenus();
    bindEvents();
    renderCatalog();
  }

  function bindEvents() {
    el.searchInput.addEventListener("input", (event) => {
      state.query = event.target.value.trim().toLowerCase();
      renderCatalog();
    });

    // Logika tombol Copy Web (Menyalin link website utama)
    el.copyWebBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(MAIN_WEB_URL);
        const originalText = el.copyWebBtn.textContent;
        el.copyWebBtn.textContent = "Tersalin!";
        setTimeout(() => el.copyWebBtn.textContent = originalText, 2000);
      } catch (err) {
        console.error("Gagal menyalin URL Web: ", err);
        alert("Gagal menyalin link.");
      }
    });

    // Logika tombol Copy Link untuk masing-masing item (Event Delegation)
    el.catalogContainer.addEventListener("click", async (event) => {
      const copyBtn = event.target.closest(".btn-copy-item");
      if (!copyBtn) return; // Abaikan jika yang diklik bukan tombol copy item

      const urlToCopy = copyBtn.dataset.url;
      try {
        await navigator.clipboard.writeText(urlToCopy);
        const originalText = copyBtn.textContent;
        copyBtn.textContent = "Tersalin!";
        copyBtn.style.backgroundColor = "#28a745"; // Opsional: Beri warna hijau saat sukses
        copyBtn.style.color = "#fff";
        copyBtn.style.borderColor = "#28a745";
        
        // Kembalikan teks dan warna setelah 2 detik
        setTimeout(() => {
          copyBtn.textContent = originalText;
          copyBtn.style.backgroundColor = "";
          copyBtn.style.color = "";
          copyBtn.style.borderColor = "";
        }, 2000);
      } catch (err) {
        console.error("Gagal menyalin URL Item: ", err);
        alert("Gagal menyalin link.");
      }
    });

    // Logika Sinkronisasi Data Online (menarik ulang file JSON terbaru)
    el.resetPublicBtn.addEventListener("click", async () => {
      if (!confirm("Sinkronisasi data terbaru dari server online? Data lokal saat ini akan ditimpa.")) return;
      
      const originalText = el.resetPublicBtn.textContent;
      el.resetPublicBtn.textContent = "Syncing...";
      el.resetPublicBtn.disabled = true;

      try {
        state.menus = await fetchDefaultMenus();
        persistMenus();
        renderCatalog();
      } finally {
        el.resetPublicBtn.textContent = originalText;
        el.resetPublicBtn.disabled = false;
      }
    });
  }

  async function loadMenus() {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return normalizeMenus(parsed);
      } catch (error) {
        console.warn("Data localStorage rusak, memuat ulang data asli", error);
      }
    }

    const defaults = await fetchDefaultMenus();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
    return defaults;
  }

  async function fetchDefaultMenus() {
    try {
      const response = await fetch(EXTERNAL_DATA_URL, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      const json = await response.json();
      if (!Array.isArray(json)) throw new Error("Format JSON eksternal harus berupa array");
      
      // Memetakan title ke name, dan content ke url (sesuai format dari server)
      const mappedData = json.map(item => ({
        name: item.name || item.title,
        url: item.url || item.content
      }));
      
      return normalizeMenus(mappedData);
      
    } catch (error) {
      console.warn("Gagal membaca data eksternal, fallback ke data.json.", error);
      try {
        const fallbackResponse = await fetch(LOCAL_DATA_URL, { cache: "no-store" });
        if (!fallbackResponse.ok) throw new Error(`HTTP Error: ${fallbackResponse.status}`);
        const fallbackJson = await fallbackResponse.json();
        
        const mappedFallback = fallbackJson.map(item => ({
          name: item.name || item.title,
          url: item.url || item.content
        }));

        return normalizeMenus(mappedFallback);
      } catch (fallbackError) {
        console.error("Fallback ke data.json lokal gagal", fallbackError);
        return [];
      }
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
        <a href="${escapeAttribute(item.url)}" target="_blank" rel="noopener noreferrer" style="word-break: break-all; display: block; margin-bottom: 12px;">${escapeHTML(item.url)}</a>
        <button class="btn btn-secondary btn-copy-item" type="button" data-url="${escapeAttribute(item.url)}" style="width: 100%; margin-top: auto;">Copy Link</button>
      </article>
    `).join("");
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
