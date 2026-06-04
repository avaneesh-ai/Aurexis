const STORAGE_KEY = "aurexis:store";

const defaultState = {
  user: null,
  pendingUser: null,
  settings: {
    theme: "light",
    coWorkMode: true,
    projectSpeed: true,
    codeMode: true,
    friendlyMode: true
  },
  subscription: {
    proActive: false,
    activatedAt: ""
  },
  admin: {
    enabled: false,
    checkedAt: ""
  },
  selectedModel: "llama3.3",
  activeChatId: "",
  activeProjectId: "none",
  chats: [],
  projects: [],
  coWorkDocs: [],
  registeredUsers: []
};

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function mergeState(state) {
  return {
    ...clone(defaultState),
    ...state,
    settings: {
      ...defaultState.settings,
      ...(state?.settings || {})
    },
    subscription: {
      ...defaultState.subscription,
      ...(state?.subscription || {})
    },
    admin: {
      ...defaultState.admin,
      ...(state?.admin || {})
    },
    chats: Array.isArray(state?.chats) ? state.chats : [],
    projects: Array.isArray(state?.projects) ? state.projects : [],
    coWorkDocs: Array.isArray(state?.coWorkDocs) ? state.coWorkDocs : [],
    registeredUsers: Array.isArray(state?.registeredUsers) ? state.registeredUsers : []
  };
}

export function readStore() {
  if (!isBrowser()) return clone(defaultState);

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return mergeState(raw ? JSON.parse(raw) : {});
  } catch {
    return clone(defaultState);
  }
}

export function writeStore(nextState) {
  const merged = mergeState(nextState);

  if (isBrowser()) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  }

  return merged;
}

export function updateStore(updater) {
  const current = readStore();
  const next = typeof updater === "function" ? updater(current) : updater;
  return writeStore(next);
}

export function resetSession() {
  return updateStore((state) => ({
    ...state,
    user: null,
    pendingUser: null,
    activeChatId: ""
  }));
}

export function uid(prefix) {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function upsertRegisteredUser(state, user) {
  if (!user?.email) return state;

  const email = user.email.trim().toLowerCase();
  const record = {
    email,
    name: user.name || email.split("@")[0],
    mobile: user.mobile || "",
    plan: state.subscription?.proActive ? "Pro" : "Free",
    lastLoginAt: user.loggedInAt || new Date().toISOString()
  };
  const existingIndex = state.registeredUsers.findIndex((item) => item.email === email);
  const registeredUsers = [...state.registeredUsers];

  if (existingIndex >= 0) {
    registeredUsers[existingIndex] = {
      ...registeredUsers[existingIndex],
      ...record
    };
  } else {
    registeredUsers.unshift({
      ...record,
      createdAt: new Date().toISOString()
    });
  }

  return {
    ...state,
    registeredUsers
  };
}

export { defaultState };
