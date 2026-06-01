const config = window.APP_CONFIG || {};

const statusLabels = {
  neutral: "Neutre",
  preparing: "Se preparent",
  in_progress: "En cours",
  done: "Termine",
  cancelled: "Annule"
};

const tableBody = document.getElementById("scheduleBody");
const adminBtn = document.getElementById("adminBtn");
const adminColumnTitle = document.getElementById("adminColumnTitle");
const connectionBadge = document.getElementById("connectionBadge");

let supabaseClient = null;
let useMockData = false;

if (!config.supabaseUrl || !config.supabaseAnonKey || config.supabaseUrl.includes("YOUR-PROJECT")) {
  console.warn("Mode DEMO: Supabase non configure, utilisation de donnees mockees");
  useMockData = true;
} else {
  supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
}

let rows = [];
let isAdmin = false;
let adminPassword = "";
let autoAdvanceInFlightForId = null;
const TIMER_DURATION_MS = 15 * 60 * 1000;
const compactMobileQuery = window.matchMedia("(max-width: 760px)");

function setConnection(online) {
  connectionBadge.textContent = online ? "Connecte" : "Hors ligne";
  connectionBadge.classList.toggle("connection--online", online);
  connectionBadge.classList.toggle("connection--offline", !online);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function statusBadge(status) {
  const label = statusLabels[status] || "Neutre";
  const cssClass = status.replace(/_/g, "-");
  return `<span class="status-badge status--${cssClass}">${label}</span>`;
}

function formatTimer(remainingMs) {
  const safeMs = Math.max(0, remainingMs);
  const totalSeconds = Math.floor(safeMs / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function getRemainingMs(entry) {
  if (entry.status !== "in_progress") {
    return TIMER_DURATION_MS;
  }

  if (!entry.in_progress_started_at) {
    return TIMER_DURATION_MS;
  }

  const startMs = new Date(entry.in_progress_started_at).getTime();
  if (Number.isNaN(startMs)) {
    return TIMER_DURATION_MS;
  }

  return TIMER_DURATION_MS - (Date.now() - startMs);
}

function getNextActiveEntry(afterDisplayOrder) {
  return rows.find(
    (row) =>
      row.display_order > afterDisplayOrder &&
      !row.is_break &&
      row.status !== "cancelled"
  );
}

function moveNextToNeutral(afterDisplayOrder) {
  const nextEntry = getNextActiveEntry(afterDisplayOrder);
  if (!nextEntry) {
    return;
  }

  nextEntry.status = "neutral";
  nextEntry.cancelled_at = null;
  nextEntry.in_progress_started_at = null;
}

function render() {
  const useCompactMobileAdminLayout = isAdmin && compactMobileQuery.matches;
  const showAdminColumn = isAdmin && !useCompactMobileAdminLayout;
  adminColumnTitle.classList.toggle("hidden", !showAdminColumn);

  const html = rows
    .map((entry) => {
      if (entry.is_break) {
        return `
          <tr class="row--break">
            <td>${escapeHtml(entry.time_label)}</td>
            <td>${escapeHtml(entry.group_label)}</td>
            <td><span class="status-badge status--neutral">-</span></td>
            ${showAdminColumn ? "<td></td>" : ""}
          </tr>
        `;
      }

      const controlsHtml = isAdmin
        ? `
            <div class="admin-controls">
              <button class="btn" data-id="${entry.id}" data-status="neutral">Neutre</button>
              <button class="btn" data-id="${entry.id}" data-status="preparing">Se preparent</button>
              <button class="btn" data-id="${entry.id}" data-status="in_progress">En cours</button>
              <button class="btn" data-id="${entry.id}" data-status="done">Termine</button>
              <button class="btn" data-id="${entry.id}" data-status="cancelled">Annule</button>
            </div>
          `
        : "";

      const inlineControls = useCompactMobileAdminLayout
        ? `<div class="admin-controls-mobile">${controlsHtml}</div>`
        : "";

      const statusWithTimer = entry.status === "in_progress"
        ? `
            ${statusBadge(entry.status)}
            <div class="timer" data-timer-id="${entry.id}">${formatTimer(getRemainingMs(entry))}</div>
          `
        : statusBadge(entry.status);

      const controlsColumn = showAdminColumn
        ? `
          <td class="cell-admin">
            <div class="admin-controls">
              <button class="btn" data-id="${entry.id}" data-status="neutral">Neutre</button>
              <button class="btn" data-id="${entry.id}" data-status="preparing">Se preparent</button>
              <button class="btn" data-id="${entry.id}" data-status="in_progress">En cours</button>
              <button class="btn" data-id="${entry.id}" data-status="done">Termine</button>
              <button class="btn" data-id="${entry.id}" data-status="cancelled">Annule</button>
            </div>
          </td>
        `
        : "";

      return `
        <tr class="${isAdmin ? "row--admin" : ""}">
          <td>${escapeHtml(entry.time_label)}</td>
          <td class="cell-group">
            <div class="group-label">${escapeHtml(entry.group_label)}</div>
            ${inlineControls}
          </td>
          <td>${statusWithTimer}</td>
          ${controlsColumn}
        </tr>
      `;
    })
    .join("");

  tableBody.innerHTML = html;
}

function getMockData() {
  const nowIso = new Date().toISOString();
  return [
    { id: 1, display_order: 1, time_label: "9h30", group_label: "-", is_break: true, status: "neutral", cancelled_at: null, in_progress_started_at: null },
    { id: 2, display_order: 2, time_label: "9h45", group_label: "VIAL CECILE - POUNT ERICA", is_break: false, status: "neutral", cancelled_at: null, in_progress_started_at: null },
    { id: 3, display_order: 3, time_label: "10h", group_label: "PALISSE CLARA - MARTINEZ AURELIE", is_break: false, status: "in_progress", cancelled_at: null, in_progress_started_at: nowIso },
    { id: 4, display_order: 4, time_label: "10h15", group_label: "JOUBERT JULIETTE - NAHON EVY", is_break: false, status: "preparing", cancelled_at: null, in_progress_started_at: null },
    { id: 5, display_order: 5, time_label: "10h30", group_label: "PASSE ENOLA - RUBY AXEL", is_break: false, status: "done", cancelled_at: null, in_progress_started_at: null },
    { id: 6, display_order: 6, time_label: "10h45", group_label: "LINA - SASHA", is_break: false, status: "neutral", cancelled_at: null, in_progress_started_at: null },
    { id: 7, display_order: 7, time_label: "11h", group_label: "PAUSE", is_break: true, status: "neutral", cancelled_at: null, in_progress_started_at: null },
    { id: 8, display_order: 8, time_label: "11h15", group_label: "COME - LYNA", is_break: false, status: "neutral", cancelled_at: null, in_progress_started_at: null },
    { id: 9, display_order: 9, time_label: "11h30", group_label: "WAGNER YANN - WARNIER JULIE", is_break: false, status: "neutral", cancelled_at: null, in_progress_started_at: null },
    { id: 10, display_order: 10, time_label: "11h45", group_label: "SIMONIN HELENE - YUNG AURORE", is_break: false, status: "neutral", cancelled_at: null, in_progress_started_at: null },
    { id: 11, display_order: 11, time_label: "12h", group_label: "MAKAR - LILOU", is_break: false, status: "neutral", cancelled_at: null, in_progress_started_at: null },
    { id: 12, display_order: 12, time_label: "12h15", group_label: "NOEMIE - VINCENT", is_break: false, status: "neutral", cancelled_at: null, in_progress_started_at: null },
    { id: 13, display_order: 13, time_label: "12h30", group_label: "SIMON - DORIAN - TIMEO (puis pause)", is_break: false, status: "neutral", cancelled_at: null, in_progress_started_at: null },
    { id: 14, display_order: 14, time_label: "14h", group_label: "JULIETTE LEFEL - GUILLAUME", is_break: false, status: "neutral", cancelled_at: null, in_progress_started_at: null },
    { id: 15, display_order: 15, time_label: "14h15", group_label: "ALVIN EWAN - CARILLUCAS", is_break: false, status: "neutral", cancelled_at: null, in_progress_started_at: null },
    { id: 16, display_order: 16, time_label: "14h30", group_label: "BARBERA LOLA - BROGNARD MAY", is_break: false, status: "neutral", cancelled_at: null, in_progress_started_at: null },
    { id: 17, display_order: 17, time_label: "14h45", group_label: "ARISTOTE JULIE - DRISKILL LOUIS", is_break: false, status: "neutral", cancelled_at: null, in_progress_started_at: null },
    { id: 18, display_order: 18, time_label: "15h", group_label: "BARBATE LUCAS - CALAME LUICAS - GALO ELIE JUNE", is_break: false, status: "neutral", cancelled_at: null, in_progress_started_at: null },
    { id: 19, display_order: 19, time_label: "15h15", group_label: "BARIAL THOMAS - BONNEAUD LEONIE - CHARLES ALFRED CHERRYTON", is_break: false, status: "neutral", cancelled_at: null, in_progress_started_at: null },
    { id: 20, display_order: 20, time_label: "15h30", group_label: "BELARDI ELEA - CRUZ ANGELE", is_break: false, status: "neutral", cancelled_at: null, in_progress_started_at: null },
    { id: 21, display_order: 21, time_label: "15h45", group_label: "BERNARD BENJAMIN", is_break: false, status: "neutral", cancelled_at: null, in_progress_started_at: null },
    { id: 22, display_order: 22, time_label: "16h", group_label: "CASSAGNE EMILIE - CHANARD LOUIS", is_break: false, status: "neutral", cancelled_at: null, in_progress_started_at: null },
    { id: 23, display_order: 23, time_label: "16h15", group_label: "EL ASKI RANIA - GARULLI MARTIN", is_break: false, status: "neutral", cancelled_at: null, in_progress_started_at: null },
    { id: 24, display_order: 24, time_label: "16h30", group_label: "FAURE ESTEBAN - BRUCHET LISA - DECUREY SIRIWUN", is_break: false, status: "neutral", cancelled_at: null, in_progress_started_at: null },
    { id: 25, display_order: 25, time_label: "16h45", group_label: "GONZALES ESTEBAN - AU LENA", is_break: false, status: "neutral", cancelled_at: null, in_progress_started_at: null },
    { id: 26, display_order: 26, time_label: "17h", group_label: "FIN DE JOURNEE", is_break: true, status: "neutral", cancelled_at: null, in_progress_started_at: null }
  ];
}

async function loadRows() {
  if (useMockData) {
    rows = getMockData();
    setConnection(true);
    render();
    return;
  }

  const { data, error } = await supabaseClient
    .from("schedule_entries")
    .select("id, display_order, time_label, group_label, is_break, status, cancelled_at, in_progress_started_at")
    .order("display_order", { ascending: true });

  if (error) {
    setConnection(false);
    alert(`Erreur chargement: ${error.message}`);
    return;
  }

  rows = data || [];
  setConnection(true);
  render();
}

async function verifyAdminPassword(password) {
  if (useMockData) {
    return password === "ensi";
  }

  const { data, error } = await supabaseClient.rpc("verify_admin_password", {
    input_password: password
  });

  if (error) {
    alert(`Erreur admin: ${error.message}`);
    return false;
  }

  return Boolean(data);
}

async function setStatus(entryId, status) {
  if (useMockData) {
    const row = rows.find(r => r.id === entryId);
    if (row && !row.is_break) {
      if (status === "in_progress") {
        row.status = "in_progress";
        row.cancelled_at = null;
        row.in_progress_started_at = new Date().toISOString();
      } else if (status === "cancelled") {
        row.cancelled_at = new Date().toISOString();
        if (row.status !== "in_progress") {
          row.status = "cancelled";
          row.in_progress_started_at = null;
          moveNextToNeutral(row.display_order);
        }
      } else {
        row.status = status;
        row.cancelled_at = null;
        row.in_progress_started_at = null;
      }
      render();
    }
    return;
  }

  const { data, error } = await supabaseClient.rpc("set_entry_status", {
    p_entry_id: entryId,
    p_new_status: status,
    p_password: adminPassword
  });

  if (error || !data) {
    alert("Mise a jour refusee. Verifie le mot de passe admin.");
    return;
  }
}

async function handleTimerElapsed(entry) {
  if (useMockData) {
    if (entry.cancelled_at) {
      entry.status = "cancelled";
    } else {
      entry.status = "done";
    }
    entry.cancelled_at = null;
    entry.in_progress_started_at = null;
    moveNextToNeutral(entry.display_order);
    render();
    return;
  }

  if (!isAdmin || !adminPassword) {
    return;
  }

  const { error } = await supabaseClient.rpc("advance_entry_after_timer", {
    p_entry_id: entry.id,
    p_password: adminPassword
  });

  if (error) {
    console.warn("Erreur progression automatique timer:", error.message);
  }
}

async function tickTimers() {
  const currentEntry = rows.find((entry) => !entry.is_break && entry.status === "in_progress");
  if (!currentEntry) {
    return;
  }

  const timerNode = tableBody.querySelector(`[data-timer-id="${currentEntry.id}"]`);
  if (timerNode) {
    timerNode.textContent = formatTimer(getRemainingMs(currentEntry));
  }

  if (getRemainingMs(currentEntry) > 0) {
    return;
  }

  if (autoAdvanceInFlightForId === currentEntry.id) {
    return;
  }

  autoAdvanceInFlightForId = currentEntry.id;
  try {
    await handleTimerElapsed(currentEntry);
  } finally {
    autoAdvanceInFlightForId = null;
  }
}

function bindEvents() {
  adminBtn.addEventListener("click", async () => {
    if (isAdmin) {
      isAdmin = false;
      adminPassword = "";
      adminBtn.textContent = "Acces admin";
      render();
      return;
    }

    const answer = window.prompt("Mot de passe admin:");
    if (!answer) {
      return;
    }

    const ok = await verifyAdminPassword(answer);
    if (!ok) {
      alert("Mot de passe invalide.");
      return;
    }

    isAdmin = true;
    adminPassword = answer;
    adminBtn.textContent = "Quitter admin";
    render();
  });

  tableBody.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) {
      return;
    }

    const id = Number(target.dataset.id || "0");
    const status = target.dataset.status;

    if (!isAdmin || !id || !status) {
      return;
    }

    await setStatus(id, status);
  });

  const onMobileChange = () => render();
  if (typeof compactMobileQuery.addEventListener === "function") {
    compactMobileQuery.addEventListener("change", onMobileChange);
  } else {
    compactMobileQuery.addListener(onMobileChange);
  }
}

function subscribeRealtime() {
  if (useMockData) {
    console.log("Mode demo: pas de realtime Supabase");
    return;
  }

  supabaseClient
    .channel("schedule-live")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "schedule_entries" },
      async () => {
        await loadRows();
      }
    )
    .subscribe((state) => {
      setConnection(state === "SUBSCRIBED");
    });
}

bindEvents();
await loadRows();
subscribeRealtime();
window.setInterval(() => {
  tickTimers().catch((error) => {
    console.warn("Erreur timer:", error);
  });
}, 1000);
