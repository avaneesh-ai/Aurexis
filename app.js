const storageKeys = {
  user: "aurexis:user",
  pendingUser: "aurexis:pending-user",
  chats: "aurexis:chats",
  activeChat: "aurexis:active-chat",
  projects: "aurexis:projects",
  activeProject: "aurexis:active-project",
  images: "aurexis:images",
  model: "aurexis:model",
  settings: "aurexis:settings",
  subscription: "aurexis:subscription",
  registeredUsers: "aurexis:registered-users",
  adminLaptop: "aurexis:admin-laptop",
  deviceId: "aurexis:device-id"
};

if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

const defaultPaymentUrl = "https://aurexis.app/pay?plan=pro&amount=25";

const defaultSettings = {
  themeMode: "light",
  coWorkMode: true,
  projectSpeed: true,
  codeMode: true,
  friendlyMode: true
};

const defaultSubscription = {
  proActive: false,
  activatedAt: "",
  paymentUrl: defaultPaymentUrl
};

const fallbackModels = [
  { id: "llama3.3", label: "Llama 3.3", badge: "General", description: "A strong default for everyday reasoning, writing, and planning." },
  { id: "llama3.1", label: "Llama 3.1", badge: "Balanced", description: "Reliable general chat with broad model-size options." },
  { id: "llama3.2", label: "Llama 3.2", badge: "Fast", description: "Smaller and quick for lightweight chat sessions." },
  { id: "qwen3", label: "Qwen 3", badge: "Reasoning", description: "Versatile reasoning with dense and MoE options." },
  { id: "deepseek-r1", label: "DeepSeek R1", badge: "Thinking", description: "Good for harder multi-step prompts." },
  { id: "gemma3", label: "Gemma 3", badge: "Vision", description: "Capable single-GPU model family with vision options." },
  { id: "qwen2.5-coder", label: "Qwen 2.5 Coder", badge: "Code", description: "Focused on coding, fixing, and technical reasoning." }
];

const state = {
  user: readStorage(storageKeys.user, null),
  pendingUser: readStorage(storageKeys.pendingUser, null),
  chats: readStorage(storageKeys.chats, []),
  activeChatId: localStorage.getItem(storageKeys.activeChat),
  projects: readStorage(storageKeys.projects, []),
  activeProjectId: localStorage.getItem(storageKeys.activeProject) || "none",
  images: readStorage(storageKeys.images, []),
  models: fallbackModels,
  selectedModel: localStorage.getItem(storageKeys.model) || "llama3.3",
  settings: { ...defaultSettings, ...readStorage(storageKeys.settings, {}) },
  subscription: { ...defaultSubscription, ...readStorage(storageKeys.subscription, {}) },
  registeredUsers: readStorage(storageKeys.registeredUsers, []),
  deviceId: getOrCreateDeviceId(),
  isAdminLaptop: getAdminLaptopAccess(),
  loginTokenUser: null
};

document.documentElement.dataset.theme = state.settings.themeMode === "dark" ? "dark" : "light";

const els = {
  authShell: document.querySelector("#authShell"),
  appShell: document.querySelector("#appShell"),
  credentialsForm: document.querySelector("#credentialsForm"),
  profileForm: document.querySelector("#profileForm"),
  linkSentPanel: document.querySelector("#linkSentPanel"),
  confirmLoginPanel: document.querySelector("#confirmLoginPanel"),
  authError: document.querySelector("#authError"),
  emailInput: document.querySelector("#emailInput"),
  passwordInput: document.querySelector("#passwordInput"),
  nameInput: document.querySelector("#nameInput"),
  mobileInput: document.querySelector("#mobileInput"),
  linkSentText: document.querySelector("#linkSentText"),
  previewLoginLink: document.querySelector("#previewLoginLink"),
  backToProfileButton: document.querySelector("#backToProfileButton"),
  confirmLoginButton: document.querySelector("#confirmLoginButton"),
  confirmLoginText: document.querySelector("#confirmLoginText"),
  signedInName: document.querySelector("#signedInName"),
  signOutButton: document.querySelector("#signOutButton"),
  adminNavButton: document.querySelector("#adminNavButton"),
  navButtons: document.querySelectorAll(".nav-button"),
  views: document.querySelectorAll(".view"),
  modelSelect: document.querySelector("#modelSelect"),
  modelStrip: document.querySelector("#modelStrip"),
  ollamaStatus: document.querySelector("#ollamaStatus"),
  newChatButton: document.querySelector("#newChatButton"),
  chatList: document.querySelector("#chatList"),
  messageList: document.querySelector("#messageList"),
  chatForm: document.querySelector("#chatForm"),
  chatPrompt: document.querySelector("#chatPrompt"),
  chatProjectSelect: document.querySelector("#chatProjectSelect"),
  projectForm: document.querySelector("#projectForm"),
  projectNameInput: document.querySelector("#projectNameInput"),
  projectDetailsInput: document.querySelector("#projectDetailsInput"),
  projectGrid: document.querySelector("#projectGrid"),
  projectCount: document.querySelector("#projectCount"),
  imageForm: document.querySelector("#imageForm"),
  imagePrompt: document.querySelector("#imagePrompt"),
  imageGrid: document.querySelector("#imageGrid"),
  imageCount: document.querySelector("#imageCount"),
  settingsName: document.querySelector("#settingsName"),
  settingsEmail: document.querySelector("#settingsEmail"),
  settingsMobile: document.querySelector("#settingsMobile"),
  themeModeLabel: document.querySelector("#themeModeLabel"),
  themeModeSwitch: document.querySelector("#themeModeSwitch"),
  proQrImage: document.querySelector("#proQrImage"),
  proPaymentLink: document.querySelector("#proPaymentLink"),
  markProButton: document.querySelector("#markProButton"),
  proStatus: document.querySelector("#proStatus"),
  coWorkToggle: document.querySelector("#coWorkToggle"),
  projectSpeedToggle: document.querySelector("#projectSpeedToggle"),
  codeModeToggle: document.querySelector("#codeModeToggle"),
  friendlyToggle: document.querySelector("#friendlyToggle"),
  refreshAdminButton: document.querySelector("#refreshAdminButton"),
  adminUserCount: document.querySelector("#adminUserCount"),
  adminProCount: document.querySelector("#adminProCount"),
  adminDeviceStatus: document.querySelector("#adminDeviceStatus"),
  adminUpdatedAt: document.querySelector("#adminUpdatedAt"),
  adminUsersTable: document.querySelector("#adminUsersTable")
};

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getOrCreateDeviceId() {
  const existing = localStorage.getItem(storageKeys.deviceId);
  if (existing) return existing;

  const value = uid("device");
  localStorage.setItem(storageKeys.deviceId, value);
  return value;
}

function getAdminLaptopAccess() {
  const existing = localStorage.getItem(storageKeys.adminLaptop);
  if (existing === "true") return true;
  if (existing === "false") return false;

  const isLocalLaptop = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
  if (isLocalLaptop) {
    localStorage.setItem(storageKeys.adminLaptop, "true");
    return true;
  }

  return false;
}

function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function showAuthStep(step) {
  [els.credentialsForm, els.profileForm, els.linkSentPanel, els.confirmLoginPanel].forEach((panel) => {
    panel.classList.add("hidden");
  });
  step.classList.remove("hidden");
  els.authError.textContent = "";
  window.scrollTo({ top: 0, left: 0 });
}

function showApp() {
  els.authShell.classList.add("hidden");
  els.appShell.classList.remove("hidden");
  els.signedInName.textContent = state.user?.name || state.user?.email || "Aurexis user";
  state.isAdminLaptop = getAdminLaptopAccess();

  if (!state.chats.length) {
    createChat(false);
  }

  if (!state.chats.some((chat) => chat.id === state.activeChatId)) {
    state.activeChatId = state.chats[0]?.id || null;
  }

  renderAll();
  loadModels();
  loadConfig();
  syncCurrentRegistration();
  requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0 }));
  setTimeout(() => window.scrollTo({ top: 0, left: 0 }), 0);
}

function showAuth() {
  els.appShell.classList.add("hidden");
  els.authShell.classList.remove("hidden");
  showAuthStep(els.credentialsForm);
}

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), "=");
  return atob(padded);
}

function decodeLoginToken() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("login_token");
  if (!token) return null;

  try {
    return JSON.parse(decodeBase64Url(token));
  } catch {
    return null;
  }
}

function initAuthFlow() {
  const tokenUser = decodeLoginToken();

  if (tokenUser?.email) {
    state.loginTokenUser = tokenUser;
    els.confirmLoginText.textContent = `The login link was sent to ${tokenUser.email}.`;
    els.authShell.classList.remove("hidden");
    els.appShell.classList.add("hidden");
    showAuthStep(els.confirmLoginPanel);
    window.history.replaceState({}, document.title, window.location.pathname);
    return;
  }

  if (state.user) {
    showApp();
    return;
  }

  showAuth();
}

function currentChat() {
  return state.chats.find((chat) => chat.id === state.activeChatId) || null;
}

function currentProject() {
  return state.projects.find((project) => project.id === state.activeProjectId) || null;
}

function createChat(shouldRender = true) {
  const project = currentProject();
  const chat = {
    id: uid("chat"),
    title: "New chat",
    projectId: project?.id || "none",
    createdAt: new Date().toISOString(),
    messages: [
      {
        role: "assistant",
        content: project
          ? `Hey, I am Aurexis. I will keep this chat connected to "${project.name}" and help you move it along with clear next steps.`
          : "Hey, I am Aurexis. Tell me what you are building, ask me anything, or ask me to create an image. I am here with you."
      }
    ]
  };

  state.chats.unshift(chat);
  state.activeChatId = chat.id;
  persistChats();

  if (shouldRender) {
    renderChats();
    renderMessages();
  }
}

function persistChats() {
  writeStorage(storageKeys.chats, state.chats);
  localStorage.setItem(storageKeys.activeChat, state.activeChatId || "");
}

function persistProjects() {
  writeStorage(storageKeys.projects, state.projects);
  localStorage.setItem(storageKeys.activeProject, state.activeProjectId || "none");
}

function persistImages() {
  writeStorage(storageKeys.images, state.images);
}

function persistSettings() {
  writeStorage(storageKeys.settings, state.settings);
}

function persistSubscription() {
  writeStorage(storageKeys.subscription, state.subscription);
}

function persistRegisteredUsers() {
  writeStorage(storageKeys.registeredUsers, state.registeredUsers);
}

function renderAll() {
  renderProjects();
  renderProjectSelect();
  renderModels();
  renderChats();
  renderMessages();
  renderImages();
  renderSettings();
  renderAdminAccess();
  renderAdminUsers();
}

function renderProjectSelect() {
  const options = [
    `<option value="none">No project</option>`,
    ...state.projects.map((project) => (
      `<option value="${project.id}">${escapeHtml(project.name)}</option>`
    ))
  ];

  els.chatProjectSelect.innerHTML = options.join("");
  els.chatProjectSelect.value = state.activeProjectId || "none";
}

function renderModels() {
  els.modelSelect.innerHTML = state.models.map((model) => (
    `<option value="${model.id}">${escapeHtml(model.label || model.id)}</option>`
  )).join("");

  if (!state.models.some((model) => model.id === state.selectedModel)) {
    state.selectedModel = state.models[0]?.id || "llama3.3";
  }

  els.modelSelect.value = state.selectedModel;
  els.modelStrip.innerHTML = state.models.slice(0, 12).map((model) => `
    <button class="model-card ${model.id === state.selectedModel ? "active" : ""}" type="button" data-model="${model.id}">
      <span class="badge ${model.installed ? "installed" : ""}">${escapeHtml(model.installed ? "Installed" : model.badge || "Model")}</span>
      <strong>${escapeHtml(model.label || model.id)}</strong>
      <p>${escapeHtml(model.description || "Ollama model option.")}</p>
    </button>
  `).join("");
}

function renderChats() {
  if (!state.chats.length) {
    els.chatList.innerHTML = `<div class="empty-state">No chats yet.</div>`;
    return;
  }

  els.chatList.innerHTML = state.chats.map((chat) => {
    const project = state.projects.find((item) => item.id === chat.projectId);
    return `
      <button class="chat-row ${chat.id === state.activeChatId ? "active" : ""}" type="button" data-chat-id="${chat.id}">
        <strong>${escapeHtml(chat.title || "New chat")}</strong>
        <small>${escapeHtml(project?.name || "General chat")}</small>
      </button>
    `;
  }).join("");
}

function renderMessages() {
  const chat = currentChat();

  if (!chat) {
    els.messageList.innerHTML = `<div class="empty-state">Start a new chat to talk with Aurexis.</div>`;
    return;
  }

  els.messageList.innerHTML = chat.messages.map((message) => `
    <div class="message ${message.role === "user" ? "user" : "assistant"} ${message.pending ? "pending" : ""}">
      ${escapeHtml(message.content)}
    </div>
  `).join("");
  els.messageList.scrollTop = els.messageList.scrollHeight;
}

function renderProjects() {
  els.projectCount.textContent = `${state.projects.length} ${state.projects.length === 1 ? "project" : "projects"}`;

  if (!state.projects.length) {
    els.projectGrid.innerHTML = `<div class="empty-state">Create your first project to organize chats, notes, and image ideas.</div>`;
    return;
  }

  els.projectGrid.innerHTML = state.projects.map((project) => `
    <article class="project-card">
      <div>
        <strong>${escapeHtml(project.name)}</strong>
        <p>${escapeHtml(project.details || "No details added yet.")}</p>
      </div>
      <div class="project-actions">
        <button class="mini-button" type="button" data-project-chat="${project.id}">Chat</button>
        <button class="mini-button" type="button" data-project-delete="${project.id}">Delete</button>
      </div>
    </article>
  `).join("");
}

function renderImages() {
  els.imageCount.textContent = `${state.images.length} ${state.images.length === 1 ? "image" : "images"}`;

  if (!state.images.length) {
    els.imageGrid.innerHTML = `<div class="empty-state">Generated images will appear here.</div>`;
    return;
  }

  els.imageGrid.innerHTML = state.images.map((image) => `
    <article class="image-card">
      <img src="${escapeHtml(image.imageUrl)}" alt="${escapeHtml(image.prompt)}">
      <div>
        <strong>${escapeHtml(image.prompt)}</strong>
        <p>${escapeHtml(image.provider === "loading" ? "Creating image..." : image.provider === "local-preview" ? "Preview image" : "AI generated image")}</p>
      </div>
    </article>
  `).join("");
}

function renderSettings() {
  if (!els.settingsName) return;

  const user = state.user || {};
  const paymentUrl = state.subscription.paymentUrl || defaultPaymentUrl;
  const themeMode = state.settings.themeMode === "dark" ? "dark" : "light";

  els.settingsName.textContent = user.name || "Aurexis user";
  els.settingsEmail.textContent = user.email || "Not added";
  els.settingsMobile.textContent = user.mobile || "Not added";
  els.themeModeSwitch.checked = themeMode === "dark";
  els.themeModeLabel.textContent = themeMode === "dark" ? "Dark mode" : "Light mode";
  els.coWorkToggle.checked = Boolean(state.settings.coWorkMode);
  els.projectSpeedToggle.checked = Boolean(state.settings.projectSpeed);
  els.codeModeToggle.checked = Boolean(state.settings.codeMode);
  els.friendlyToggle.checked = Boolean(state.settings.friendlyMode);
  els.proPaymentLink.href = paymentUrl;
  els.proStatus.textContent = state.subscription.proActive ? "Pro active" : "Free plan";
  els.proStatus.classList.toggle("connected", Boolean(state.subscription.proActive));
  els.markProButton.textContent = state.subscription.proActive ? "Pro active on this device" : "Mark Pro active";
  els.markProButton.disabled = Boolean(state.subscription.proActive);

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=12&data=${encodeURIComponent(paymentUrl)}`;
  els.proQrImage.onerror = () => {
    els.proQrImage.onerror = null;
    els.proQrImage.src = qrFallback(paymentUrl);
  };
  els.proQrImage.src = qrUrl;
}

function applyTheme(themeMode) {
  state.settings.themeMode = themeMode === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = state.settings.themeMode;
  persistSettings();
  renderSettings();
}

function renderAdminAccess() {
  if (!els.adminNavButton) return;
  const canShowAdmin = Boolean(state.user && state.isAdminLaptop);
  els.adminNavButton.classList.toggle("hidden", !canShowAdmin);

  if (!canShowAdmin && document.querySelector("#adminView")?.classList.contains("active-view")) {
    setView("chat");
  }
}

function renderAdminUsers() {
  if (!els.adminUsersTable) return;

  const users = [...state.registeredUsers].sort((a, b) => (
    new Date(b.lastLoginAt || b.createdAt || 0) - new Date(a.lastLoginAt || a.createdAt || 0)
  ));
  const proCount = users.filter((user) => user.plan === "Pro").length;

  els.adminUserCount.textContent = String(users.length);
  els.adminProCount.textContent = String(proCount);
  els.adminDeviceStatus.textContent = state.isAdminLaptop ? "This laptop" : "Hidden";

  if (!users.length) {
    els.adminUsersTable.innerHTML = `<tr><td class="empty-row" colspan="6">No registered details yet.</td></tr>`;
    return;
  }

  els.adminUsersTable.innerHTML = users.map((user) => `
    <tr>
      <td>${escapeHtml(user.name || "Aurexis user")}</td>
      <td>${escapeHtml(user.email || "Not added")}</td>
      <td>${escapeHtml(user.mobile || "Not added")}</td>
      <td>${escapeHtml(user.plan || "Free")}</td>
      <td>${escapeHtml(formatDate(user.lastLoginAt || user.createdAt))}</td>
      <td>${escapeHtml(shortDevice(user.deviceId))}</td>
    </tr>
  `).join("");
}

function shortDevice(deviceId) {
  if (!deviceId) return "Unknown";
  return deviceId.length > 18 ? `${deviceId.slice(0, 18)}...` : deviceId;
}

function formatDate(value) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function qrFallback(value) {
  const cells = 29;
  const size = 232;
  const cell = size / cells;
  const seed = hashString(value);
  const fixedSquares = [
    [1, 1],
    [cells - 8, 1],
    [1, cells - 8]
  ];
  const rects = [];

  fixedSquares.forEach(([x, y]) => {
    rects.push(`<rect x="${x * cell}" y="${y * cell}" width="${cell * 7}" height="${cell * 7}" fill="#182321"/>`);
    rects.push(`<rect x="${(x + 1) * cell}" y="${(y + 1) * cell}" width="${cell * 5}" height="${cell * 5}" fill="#ffffff"/>`);
    rects.push(`<rect x="${(x + 2) * cell}" y="${(y + 2) * cell}" width="${cell * 3}" height="${cell * 3}" fill="#182321"/>`);
  });

  for (let y = 0; y < cells; y += 1) {
    for (let x = 0; x < cells; x += 1) {
      const inFinder = fixedSquares.some(([fx, fy]) => x >= fx && x < fx + 7 && y >= fy && y < fy + 7);
      if (inFinder) continue;

      const on = ((x * 17 + y * 31 + seed) % 7 < 3) || ((x ^ y ^ seed) % 11 === 0);
      if (on) {
        rects.push(`<rect x="${x * cell}" y="${y * cell}" width="${cell}" height="${cell}" fill="#182321"/>`);
      }
    }
  }

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <rect width="${size}" height="${size}" fill="#ffffff"/>
      ${rects.join("")}
    </svg>
  `;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function hashString(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

async function loadConfig() {
  try {
    const response = await fetch("/api/config");
    const data = await response.json();
    state.subscription.paymentUrl = data.proPaymentUrl || state.subscription.paymentUrl || defaultPaymentUrl;
    persistSubscription();
  } catch {
    state.subscription.paymentUrl = state.subscription.paymentUrl || defaultPaymentUrl;
  }

  renderSettings();
}

function buildRegistrationRecord() {
  if (!state.user?.email) return null;

  return {
    email: state.user.email.trim().toLowerCase(),
    name: state.user.name || state.user.email.split("@")[0],
    mobile: state.user.mobile || "",
    plan: state.subscription.proActive ? "Pro" : "Free",
    deviceId: state.deviceId,
    lastLoginAt: state.user.loggedInAt || new Date().toISOString(),
    settings: {
      themeMode: state.settings.themeMode === "dark" ? "dark" : "light",
      coWorkMode: Boolean(state.settings.coWorkMode),
      projectSpeed: Boolean(state.settings.projectSpeed),
      codeMode: Boolean(state.settings.codeMode),
      friendlyMode: Boolean(state.settings.friendlyMode)
    }
  };
}

function upsertRegisteredUsers(users, record) {
  const records = Array.isArray(users) ? users.filter((user) => user?.email) : [];
  const normalizedEmail = String(record.email || "").trim().toLowerCase();
  const existingIndex = records.findIndex((user) => String(user.email).toLowerCase() === normalizedEmail);

  if (existingIndex >= 0) {
    records[existingIndex] = {
      ...records[existingIndex],
      ...record,
      email: normalizedEmail,
      createdAt: records[existingIndex].createdAt || record.createdAt || new Date().toISOString()
    };
  } else {
    records.unshift({
      ...record,
      email: normalizedEmail,
      createdAt: record.createdAt || new Date().toISOString()
    });
  }

  return records;
}

function mergeRegisteredUsers(...groups) {
  return groups.flat().filter(Boolean).reduce((users, record) => upsertRegisteredUsers(users, record), []);
}

function saveLocalRegistration(record) {
  state.registeredUsers = upsertRegisteredUsers(state.registeredUsers, record);
  persistRegisteredUsers();
  renderAdminUsers();
}

async function syncCurrentRegistration() {
  const record = buildRegistrationRecord();
  if (!record) return;

  saveLocalRegistration(record);

  try {
    const response = await fetch("/api/registrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record)
    });
    const data = await response.json();

    if (Array.isArray(data.users)) {
      state.registeredUsers = mergeRegisteredUsers(state.registeredUsers, data.users);
      persistRegisteredUsers();
    }
  } catch {
    // Local registration is already saved, so the app can keep working offline.
  }

  if (state.isAdminLaptop) {
    loadAdminUsers();
  }
}

async function loadAdminUsers() {
  if (!state.isAdminLaptop) return;
  els.adminUpdatedAt.textContent = "Syncing...";

  try {
    const response = await fetch("/api/registrations");
    const data = await response.json();

    if (Array.isArray(data.users)) {
      state.registeredUsers = mergeRegisteredUsers(state.registeredUsers, data.users);
      persistRegisteredUsers();
    }

    els.adminUpdatedAt.textContent = `Updated ${formatDate(new Date().toISOString())}`;
  } catch {
    els.adminUpdatedAt.textContent = "Using saved local details";
  }

  renderAdminUsers();
}

function setView(viewName) {
  if (viewName === "admin" && !state.isAdminLaptop) return;

  els.views.forEach((view) => {
    view.classList.toggle("active-view", view.id === `${viewName}View`);
  });

  els.navButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.view === viewName);
  });
  if (viewName === "admin") {
    loadAdminUsers();
  }
  window.scrollTo({ top: 0, left: 0 });
}

async function loadModels() {
  try {
    const response = await fetch("/api/models");
    const data = await response.json();
    state.models = data.models?.length ? data.models : fallbackModels;
    state.selectedModel = localStorage.getItem(storageKeys.model) || data.defaultModel || state.models[0].id;

    els.ollamaStatus.textContent = data.connected ? "Ollama connected" : "Ollama not connected";
    els.ollamaStatus.classList.toggle("connected", Boolean(data.connected));
    els.ollamaStatus.classList.toggle("disconnected", !data.connected);
    renderModels();
  } catch {
    els.ollamaStatus.textContent = "Ollama not connected";
    els.ollamaStatus.classList.add("disconnected");
    renderModels();
  }
}

function isImageRequest(prompt) {
  const text = prompt.toLowerCase().trim();
  return /^(create|generate|make|draw|design)\s+(an?\s+)?image\b/.test(text)
    || /\b(turn|convert)\b.+\b(image|picture|poster|visual)\b/.test(text);
}

function loadingImage(prompt) {
  const label = escapeHtml(prompt.slice(0, 60) || "Creating image");
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="900" height="680" viewBox="0 0 900 680">
      <rect width="900" height="680" fill="#f5f7f4"/>
      <rect x="56" y="56" width="788" height="568" rx="8" fill="#ffffff" stroke="#dfe7e3"/>
      <path d="M220 420 C310 260 390 460 480 322 C560 198 650 258 724 160" fill="none" stroke="#0f766e" stroke-width="20" stroke-linecap="round"/>
      <circle cx="268" cy="230" r="54" fill="#f8ded8"/>
      <rect x="300" y="502" width="300" height="16" rx="8" fill="#dfe7e3"/>
      <rect x="340" y="536" width="220" height="12" rx="6" fill="#dfe7e3"/>
      <text x="450" y="470" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="28" font-weight="700" fill="#182321">Creating image...</text>
      <text x="450" y="580" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="18" fill="#65706d">${label}</text>
    </svg>
  `;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

async function createImageFromPrompt(prompt, source = "Image") {
  const imageRecord = {
    id: uid("image"),
    prompt,
    imageUrl: loadingImage(prompt),
    provider: "loading",
    createdAt: new Date().toISOString()
  };

  state.images.unshift(imageRecord);
  persistImages();
  renderImages();

  const response = await fetch("/api/image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, source })
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || data.error || "Image generation failed.");
  }

  imageRecord.imageUrl = data.imageUrl;
  imageRecord.provider = data.provider || "image-api";
  imageRecord.note = data.note || "";
  persistImages();
  renderImages();
  return imageRecord;
}

async function sendChat(prompt) {
  let chat = currentChat();

  if (!chat) {
    createChat(false);
    chat = currentChat();
  }

  chat.messages.push({ role: "user", content: prompt });
  chat.title = chat.title === "New chat" ? prompt.slice(0, 48) : chat.title;
  renderMessages();
  renderChats();
  persistChats();

  if (isImageRequest(prompt)) {
    chat.messages.push({ role: "assistant", content: "Absolutely, I am creating that image now and saving it in the Image section for you.", pending: true });
    renderMessages();

    try {
      const image = await createImageFromPrompt(prompt, "Chat");
      chat.messages = chat.messages.filter((message) => !message.pending);
      chat.messages.push({
        role: "assistant",
        content: image.provider === "local-preview"
          ? "I created a visual preview and saved it in the Image section. When you add an image-generation API environment variable, this will become real AI image generation."
          : "Done, I created the image and saved it in the Image section."
      });
      setView("images");
    } catch (error) {
      chat.messages = chat.messages.filter((message) => !message.pending);
      chat.messages.push({ role: "assistant", content: `I could not create the image yet, but I am close. ${error.message}` });
    }

    persistChats();
    renderChats();
    renderMessages();
    return;
  }

  chat.messages.push({ role: "assistant", content: "Aurexis is thinking with you...", pending: true });
  renderMessages();

  try {
    const project = state.projects.find((item) => item.id === chat.projectId);
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: state.selectedModel,
        messages: chat.messages.filter((message) => !message.pending),
        projectContext: project ? `${project.name}: ${project.details}` : "",
        preferences: state.settings,
        proMode: Boolean(state.subscription.proActive)
      })
    });
    const data = await response.json();

    chat.messages = chat.messages.filter((message) => !message.pending);

    if (!response.ok) {
      chat.messages.push({
        role: "assistant",
        content: `${data.error || "Ollama is not connected yet."}\n${data.help || data.detail || "Once Ollama is reachable, I will answer here."}`.trim()
      });
    } else {
      chat.messages.push({ role: "assistant", content: data.reply });
    }
  } catch (error) {
    chat.messages = chat.messages.filter((message) => !message.pending);
    chat.messages.push({
      role: "assistant",
      content: `I could not connect to the AI service yet. ${error.message}`
    });
  }

  persistChats();
  renderMessages();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

els.credentialsForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const email = els.emailInput.value.trim();
  const password = els.passwordInput.value;

  if (!email || password.length < 6) {
    els.authError.textContent = "Enter an email ID and a password with at least 6 characters.";
    return;
  }

  state.pendingUser = { email, passwordCreated: true };
  writeStorage(storageKeys.pendingUser, state.pendingUser);
  showAuthStep(els.profileForm);
});

els.profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  els.authError.textContent = "";
  const submitButton = els.profileForm.querySelector("button");
  submitButton.disabled = true;
  submitButton.textContent = "Sending...";

  const profile = {
    ...state.pendingUser,
    name: els.nameInput.value.trim(),
    mobile: els.mobileInput.value.trim()
  };

  try {
    const response = await fetch("/api/send-login-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile)
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "The login link could not be sent.");
    }

    state.pendingUser = profile;
    writeStorage(storageKeys.pendingUser, state.pendingUser);
    els.linkSentText.textContent = data.sent
      ? `A login link was sent to ${profile.email}.`
      : `Email sending is in preview mode. Use this link for now, or add email environment variables in Vercel.`;
    els.previewLoginLink.href = data.loginLink;
    showAuthStep(els.linkSentPanel);
  } catch (error) {
    els.authError.textContent = error.message;
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Send login link";
  }
});

els.backToProfileButton.addEventListener("click", () => {
  showAuthStep(els.profileForm);
});

els.confirmLoginButton.addEventListener("click", () => {
  const loginUser = state.loginTokenUser || state.pendingUser;

  if (!loginUser?.email) {
    els.authError.textContent = "This login link is not valid anymore.";
    return;
  }

  state.user = {
    email: loginUser.email,
    name: loginUser.name || loginUser.email.split("@")[0],
    mobile: loginUser.mobile || "",
    loggedInAt: new Date().toISOString()
  };
  writeStorage(storageKeys.user, state.user);
  localStorage.removeItem(storageKeys.pendingUser);
  showApp();
});

els.signOutButton.addEventListener("click", () => {
  localStorage.removeItem(storageKeys.user);
  state.user = null;
  renderAdminAccess();
  showAuth();
});

els.navButtons.forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.view));
});

els.themeModeSwitch.addEventListener("change", () => {
  applyTheme(els.themeModeSwitch.checked ? "dark" : "light");
  syncCurrentRegistration();
});

els.markProButton.addEventListener("click", () => {
  state.subscription.proActive = true;
  state.subscription.activatedAt = new Date().toISOString();
  persistSubscription();
  renderSettings();
  syncCurrentRegistration();
});

els.coWorkToggle.addEventListener("change", () => {
  state.settings.coWorkMode = els.coWorkToggle.checked;
  persistSettings();
  syncCurrentRegistration();
});

els.projectSpeedToggle.addEventListener("change", () => {
  state.settings.projectSpeed = els.projectSpeedToggle.checked;
  persistSettings();
  syncCurrentRegistration();
});

els.codeModeToggle.addEventListener("change", () => {
  state.settings.codeMode = els.codeModeToggle.checked;
  persistSettings();
  syncCurrentRegistration();
});

els.friendlyToggle.addEventListener("change", () => {
  state.settings.friendlyMode = els.friendlyToggle.checked;
  persistSettings();
  syncCurrentRegistration();
});

els.refreshAdminButton.addEventListener("click", () => {
  loadAdminUsers();
});

els.newChatButton.addEventListener("click", () => createChat());

els.chatList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-chat-id]");
  if (!button) return;
  state.activeChatId = button.dataset.chatId;
  persistChats();
  renderChats();
  renderMessages();
});

els.modelSelect.addEventListener("change", () => {
  state.selectedModel = els.modelSelect.value;
  localStorage.setItem(storageKeys.model, state.selectedModel);
  renderModels();
});

els.modelStrip.addEventListener("click", (event) => {
  const button = event.target.closest("[data-model]");
  if (!button) return;
  state.selectedModel = button.dataset.model;
  localStorage.setItem(storageKeys.model, state.selectedModel);
  renderModels();
});

els.chatProjectSelect.addEventListener("change", () => {
  state.activeProjectId = els.chatProjectSelect.value;
  persistProjects();
});

els.chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const prompt = els.chatPrompt.value.trim();
  if (!prompt) return;
  els.chatPrompt.value = "";
  els.chatPrompt.style.height = "";
  await sendChat(prompt);
});

els.chatPrompt.addEventListener("input", () => {
  els.chatPrompt.style.height = "auto";
  els.chatPrompt.style.height = `${Math.min(els.chatPrompt.scrollHeight, 160)}px`;
});

els.projectForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = els.projectNameInput.value.trim();
  const details = els.projectDetailsInput.value.trim();
  if (!name) return;

  const project = {
    id: uid("project"),
    name,
    details,
    createdAt: new Date().toISOString()
  };

  state.projects.unshift(project);
  state.activeProjectId = project.id;
  persistProjects();
  els.projectForm.reset();
  renderProjects();
  renderProjectSelect();
});

els.projectGrid.addEventListener("click", (event) => {
  const chatButton = event.target.closest("[data-project-chat]");
  const deleteButton = event.target.closest("[data-project-delete]");

  if (chatButton) {
    state.activeProjectId = chatButton.dataset.projectChat;
    persistProjects();
    renderProjectSelect();
    createChat();
    const chat = currentChat();
    if (chat) chat.projectId = state.activeProjectId;
    persistChats();
    setView("chat");
  }

  if (deleteButton) {
    const id = deleteButton.dataset.projectDelete;
    state.projects = state.projects.filter((project) => project.id !== id);
    state.chats = state.chats.map((chat) => chat.projectId === id ? { ...chat, projectId: "none" } : chat);
    if (state.activeProjectId === id) state.activeProjectId = "none";
    persistProjects();
    persistChats();
    renderAll();
  }
});

els.imageForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const prompt = els.imagePrompt.value.trim();
  if (!prompt) return;
  const button = els.imageForm.querySelector("button");
  button.disabled = true;
  button.textContent = "Creating...";

  try {
    await createImageFromPrompt(prompt, "Image");
    els.imagePrompt.value = "";
  } catch (error) {
    els.imageGrid.insertAdjacentHTML("afterbegin", `<div class="empty-state">${escapeHtml(error.message)}</div>`);
  } finally {
    button.disabled = false;
    button.textContent = "Create Image";
  }
});

initAuthFlow();
