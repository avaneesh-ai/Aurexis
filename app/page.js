"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { defaultState, readStore, resetSession, uid, updateStore, upsertRegisteredUser, writeStore } from "@/lib/store";

const fallbackModels = [
  { id: "gpt-oss:120b", label: "GPT OSS 120B", provider: "Ollama Cloud", badge: "Cloud", description: "Large cloud model for strong reasoning and writing." },
  { id: "gpt-oss:20b", label: "GPT OSS 20B", provider: "Ollama Cloud", badge: "Cloud", description: "Balanced cloud model for everyday chat and project help." },
  { id: "llama3.3", label: "Llama 3.3", provider: "Meta Llama 3", badge: "General", description: "Strong everyday reasoning, writing, and planning." },
  { id: "mistral", label: "Mistral 7B", provider: "Mistral AI", badge: "Fast", description: "Quick local assistant responses." },
  { id: "gemma3", label: "Gemma 3", provider: "Google Gemma", badge: "Vision", description: "Modern capable model family." },
  { id: "codellama", label: "Code Llama 7B", provider: "Meta Code Llama", badge: "Code", description: "Useful for coding and explanations." },
  { id: "phi3", label: "Phi-3 Mini", provider: "Microsoft Phi-3", badge: "Small", description: "Compact and quick for lighter tasks." },
  { id: "neural-chat", label: "Neural Chat 7B", provider: "Intel Neural Chat", badge: "Chat", description: "Friendly assistant conversations." },
  { id: "qwen3", label: "Qwen 3", provider: "Qwen", badge: "Reasoning", description: "Versatile reasoning model family." },
  { id: "deepseek-r1", label: "DeepSeek R1", provider: "DeepSeek", badge: "Thinking", description: "Open reasoning models for harder prompts." }
];

function decodeToken(token) {
  try {
    const normalized = token.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), "=");
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function encodeToken(value) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(value))))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function formatTime(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "Today";

  return date.toLocaleString([], {
    hour: "numeric",
    minute: "2-digit"
  });
}

function getInitials(nameOrEmail) {
  const value = String(nameOrEmail || "Aurexis User").trim();
  const parts = value.includes("@") ? [value[0]] : value.split(/\s+/);
  return parts.slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function createWelcomeChat(projectId = "none") {
  return {
    id: uid("chat"),
    title: "Welcome to Aurexis",
    projectId,
    createdAt: new Date().toISOString(),
    messages: [
      {
        role: "assistant",
        content: "Hello. I am Aurexis, your AI assistant powered by Ollama. How can I help you today?",
        createdAt: new Date().toISOString()
      }
    ]
  };
}

function createLocalLoginLink(profile) {
  const url = new URL(window.location.href);
  url.search = "";
  url.searchParams.set("login_token", encodeToken({
    email: profile.email,
    name: profile.name,
    mobile: profile.mobile,
    iat: Date.now()
  }));
  return url.toString();
}

export default function HomePage() {
  const [store, setStore] = useState(defaultState);
  const [authStep, setAuthStep] = useState("credentials");
  const [authError, setAuthError] = useState("");
  const [loginLink, setLoginLink] = useState("");
  const [loginTokenUser, setLoginTokenUser] = useState(null);
  const [models, setModels] = useState(fallbackModels);
  const [modelStatus, setModelStatus] = useState({ connected: false, text: "Checking Ollama", help: "" });
  const [activeView, setActiveView] = useState("chat");
  const [adminKey, setAdminKey] = useState("");
  const [adminError, setAdminError] = useState("");
  const [config, setConfig] = useState({ paymentUrl: "https://aurexis.app/pay?plan=pro&amount=25", ollamaBaseUrl: "" });
  const [isSending, setIsSending] = useState(false);
  const [coWorkInput, setCoWorkInput] = useState("");
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installMessage, setInstallMessage] = useState("");
  const [installed, setInstalled] = useState(false);
  const messageListRef = useRef(null);

  const user = store.user;
  const activeChat = useMemo(() => (
    store.chats.find((chat) => chat.id === store.activeChatId) || store.chats[0] || null
  ), [store.chats, store.activeChatId]);
  const activeProject = useMemo(() => (
    store.projects.find((project) => project.id === store.activeProjectId) || null
  ), [store.projects, store.activeProjectId]);

  function save(updater) {
    setStore((current) => {
      const next = typeof updater === "function" ? updater(current) : updater;
      return writeStore(next);
    });
  }

  function applyTheme(theme) {
    const nextTheme = theme === "dark" ? "dark" : "light";
    document.documentElement.dataset.theme = nextTheme;
    save((current) => ({
      ...current,
      settings: {
        ...current.settings,
        theme: nextTheme
      }
    }));
  }

  function enterApp(loginUser) {
    const now = new Date().toISOString();
    const nextUser = {
      email: loginUser.email,
      name: loginUser.name || loginUser.email.split("@")[0],
      mobile: loginUser.mobile || "",
      loggedInAt: now
    };

    const next = updateStore((current) => {
      const base = {
        ...current,
        user: nextUser,
        pendingUser: null
      };
      const withUser = upsertRegisteredUser(base, nextUser);

      if (!withUser.chats.length) {
        const chat = createWelcomeChat();
        withUser.chats = [chat];
        withUser.activeChatId = chat.id;
      }

      return withUser;
    });

    setStore(next);
    setAuthStep("credentials");
    setActiveView("chat");
  }

  async function loadModels() {
    try {
      const response = await fetch("/api/models", { cache: "no-store" });
      const data = await response.json();
      const nextModels = data.models?.length ? data.models : fallbackModels;
      setModels(nextModels);
      setModelStatus({
        connected: Boolean(data.connected),
        text: data.connected ? "Ollama connected" : "Ollama not connected",
        help: data.help || data.error || ""
      });

      const currentStore = readStore();
      const selectedModel = currentStore.selectedModel;
      const selectedCard = nextModels.find((model) => model.id === selectedModel);
      const installedChoice = nextModels.find((model) => model.installed)?.id;
      const preferredModel = data.defaultModel || installedChoice || selectedModel || fallbackModels[0].id;

      if (!selectedModel || (data.connected && installedChoice && !selectedCard?.installed)) {
        save((current) => ({ ...current, selectedModel: preferredModel }));
      }
    } catch (error) {
      setModels(fallbackModels);
      setModelStatus({
        connected: false,
        text: "Ollama not connected",
        help: error.message
      });
    }
  }

  async function loadConfig() {
    try {
      const response = await fetch("/api/config", { cache: "no-store" });
      const data = await response.json();
      setConfig({
        paymentUrl: data.paymentUrl || "https://aurexis.app/pay?plan=pro&amount=25",
        ollamaBaseUrl: data.ollamaBaseUrl || "",
        adminKeyIsDefault: Boolean(data.adminKeyIsDefault)
      });
    } catch {
      setConfig((current) => current);
    }
  }

  useEffect(() => {
    const initial = readStore();
    setStore(initial);
    document.documentElement.dataset.theme = initial.settings.theme === "dark" ? "dark" : "light";

    const params = new URLSearchParams(window.location.search);
    const token = params.get("login_token");
    const decoded = token ? decodeToken(token) : null;

    if (decoded?.email) {
      setLoginTokenUser(decoded);
      setAuthStep("confirm");
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    loadModels();
    loadConfig();

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const onBeforeInstall = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallMessage("Aurexis is installed on this device.");
    };

    setInstalled(window.matchMedia?.("(display-mode: standalone)")?.matches || navigator.standalone === true);
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [activeChat?.messages]);

  async function submitCredentials(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim().toLowerCase();
    const password = String(form.get("password") || "");

    if (!email || password.length < 6) {
      setAuthError("Enter an email and a password with at least 6 characters.");
      return;
    }

    const next = updateStore((current) => ({
      ...current,
      pendingUser: {
        email,
        passwordCreated: true
      }
    }));
    setStore(next);
    setAuthError("");
    setAuthStep("profile");
  }

  async function submitProfile(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const profile = {
      ...store.pendingUser,
      name: String(form.get("name") || "").trim(),
      mobile: String(form.get("mobile") || "").trim()
    };

    try {
      const response = await fetch("/api/auth/send-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile)
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "The login link could not be sent.");

      save((current) => ({ ...current, pendingUser: profile }));
      setLoginLink(data.loginLink);
      setAuthError("");
      setAuthStep("link");
    } catch {
      const localLink = createLocalLoginLink(profile);
      save((current) => ({ ...current, pendingUser: profile }));
      setLoginLink(localLink);
      setAuthError("");
      setAuthStep("link");
    }
  }

  async function requestInstall() {
    if (installed) {
      setInstallMessage("Aurexis is already installed.");
      return;
    }

    if (installPrompt) {
      await installPrompt.prompt();
      setInstallPrompt(null);
      return;
    }

    setInstallMessage("On iPhone or iPad, use Share, then Add to Home Screen. On desktop, deploy over HTTPS and use the browser install button.");
  }

  function createChat(projectId = store.activeProjectId || "none") {
    const chat = createWelcomeChat(projectId);
    save((current) => ({
      ...current,
      chats: [chat, ...current.chats],
      activeChatId: chat.id
    }));
  }

  function selectChat(chatId) {
    save((current) => ({
      ...current,
      activeChatId: chatId
    }));
  }

  async function sendChat(event) {
    event.preventDefault();
    if (isSending) return;

    const form = new FormData(event.currentTarget);
    const prompt = String(form.get("prompt") || "").trim();
    if (!prompt) return;

    event.currentTarget.reset();
    setIsSending(true);

    let targetChat = activeChat;
    let nextStore = readStore();

    if (!targetChat) {
      targetChat = createWelcomeChat();
      nextStore = {
        ...nextStore,
        chats: [targetChat, ...nextStore.chats],
        activeChatId: targetChat.id
      };
    }

    const userMessage = {
      role: "user",
      content: prompt,
      createdAt: new Date().toISOString()
    };
    const assistantMessage = {
      role: "assistant",
      content: "",
      streaming: true,
      createdAt: new Date().toISOString()
    };

    nextStore = {
      ...nextStore,
      chats: nextStore.chats.map((chat) => chat.id === targetChat.id ? {
        ...chat,
        title: chat.title === "Welcome to Aurexis" ? prompt.slice(0, 54) : chat.title,
        messages: [...chat.messages, userMessage, assistantMessage]
      } : chat)
    };
    writeStore(nextStore);
    setStore(nextStore);

    try {
      const project = nextStore.projects.find((item) => item.id === targetChat.projectId);
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: nextStore.selectedModel,
          messages: [...targetChat.messages, userMessage],
          projectContext: project ? `${project.name}: ${project.description || ""}\n${project.instructions || ""}` : "",
          preferences: nextStore.settings,
          proMode: nextStore.subscription.proActive
        })
      });

      if (!response.body) throw new Error("Aurexis could not open the Ollama response stream.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let reply = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        reply += decoder.decode(value, { stream: true });

        setStore((current) => {
          const updated = {
            ...current,
            chats: current.chats.map((chat) => chat.id === targetChat.id ? {
              ...chat,
              messages: chat.messages.map((message, index) => (
                index === chat.messages.length - 1 ? { ...message, content: reply } : message
              ))
            } : chat)
          };
          writeStore(updated);
          return updated;
        });
      }

      if (!reply.trim()) {
        reply = response.ok ? "Aurexis did not return a message. Please try again." : "Aurexis could not reach Ollama. Check OLLAMA_BASE_URL and OLLAMA_API_KEY.";
      }

      setStore((current) => {
        const updated = {
          ...current,
          chats: current.chats.map((chat) => chat.id === targetChat.id ? {
            ...chat,
            messages: chat.messages.map((message, index) => (
              index === chat.messages.length - 1 ? { ...message, content: reply, streaming: false } : message
            ))
          } : chat)
        };
        writeStore(updated);
        return updated;
      });
    } catch (error) {
      setStore((current) => {
        const updated = {
          ...current,
          chats: current.chats.map((chat) => chat.id === targetChat.id ? {
            ...chat,
            messages: chat.messages.map((message, index) => (
              index === chat.messages.length - 1 ? {
                ...message,
                content: `I could not connect to Ollama yet. ${error.message}`,
                streaming: false
              } : message
            ))
          } : chat)
        };
        writeStore(updated);
        return updated;
      });
    } finally {
      setIsSending(false);
    }
  }

  function createProject(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const project = {
      id: uid("project"),
      name: String(form.get("name") || "").trim(),
      description: String(form.get("description") || "").trim(),
      instructions: String(form.get("instructions") || "").trim(),
      createdAt: new Date().toISOString()
    };

    if (!project.name) return;

    save((current) => ({
      ...current,
      projects: [project, ...current.projects],
      activeProjectId: project.id
    }));
    event.currentTarget.reset();
  }

  function createCoWorkDoc() {
    const doc = {
      id: uid("doc"),
      title: "Co-work draft",
      body: coWorkInput || "Start with a rough idea here. Aurexis can help you shape it.",
      createdAt: new Date().toISOString()
    };

    save((current) => ({
      ...current,
      coWorkDocs: [doc, ...current.coWorkDocs]
    }));
    setCoWorkInput("");
  }

  async function checkAdmin(event) {
    event.preventDefault();
    setAdminError("");

    try {
      const response = await fetch("/api/admin/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: adminKey })
      });
      const data = await response.json();

      if (!data.ok) {
        setAdminError("That admin key is not correct.");
        return;
      }

      save((current) => ({
        ...current,
        admin: {
          enabled: true,
          checkedAt: new Date().toISOString()
        }
      }));
      setAdminKey("");
      setActiveView("admin");
    } catch (error) {
      setAdminError(error.message);
    }
  }

  function signOut() {
    setStore(resetSession());
    setActiveView("chat");
  }

  function markProActive() {
    save((current) => ({
      ...upsertRegisteredUser({
        ...current,
        subscription: {
          proActive: true,
          activatedAt: new Date().toISOString()
        }
      }, current.user),
      subscription: {
        proActive: true,
        activatedAt: new Date().toISOString()
      }
    }));
  }

  function navTo(view) {
    if (view === "admin" && !store.admin.enabled) {
      setActiveView("settings");
      return;
    }

    setActiveView(view);
  }

  if (!user || authStep === "confirm") {
    return (
      <main className="auth-screen">
        <section className="auth-visual">
          <div className="auth-topline">
            <LogoLockup large />
            <ThemeSwitch settings={store.settings} onChange={applyTheme} />
          </div>
          <h1>Build, chat, and co-work in one AI workspace.</h1>
          <p>Aurexis is powered by your Ollama server, with warm AI help, projects, co-work drafts, and installable app support.</p>
          <button className="install-button" type="button" onClick={requestInstall}>Install Aurexis</button>
          {installMessage ? <small className="helper-text">{installMessage}</small> : null}
        </section>

        <section className="auth-card">
          {authStep === "credentials" ? (
            <form className="auth-step" onSubmit={submitCredentials}>
              <span className="step-label">Step 1</span>
              <h2>Enter your login details</h2>
              <label><span>Email ID</span><input name="email" type="email" placeholder="you@example.com" required /></label>
              <label><span>Password</span><input name="password" type="password" placeholder="Create a password" minLength={6} required /></label>
              <button className="primary-button" type="submit">Next</button>
            </form>
          ) : null}

          {authStep === "profile" ? (
            <form className="auth-step" onSubmit={submitProfile}>
              <span className="step-label">Step 2</span>
              <h2>Complete your profile</h2>
              <label><span>Name</span><input name="name" type="text" placeholder="Your name" required /></label>
              <label><span>Mobile number</span><input name="mobile" type="tel" placeholder="+91 98765 43210" required /></label>
              <button className="primary-button" type="submit">Send login link</button>
            </form>
          ) : null}

          {authStep === "link" ? (
            <div className="auth-step">
              <span className="step-label">Email sent</span>
              <h2>Check your email</h2>
              <p className="muted-text">Open the verification link to continue. If email is not configured yet, use the preview link below.</p>
              <a className="primary-button inline-button" href={loginLink}>Open login link</a>
              <button className="ghost-button" type="button" onClick={() => setAuthStep("profile")}>Edit details</button>
            </div>
          ) : null}

          {authStep === "confirm" ? (
            <div className="auth-step">
              <span className="step-label">Confirm login</span>
              <h2>Log in to Aurexis?</h2>
              <p className="muted-text">This verification link was issued for {loginTokenUser?.email}.</p>
              <button className="primary-button" type="button" onClick={() => enterApp(loginTokenUser)}>Okay</button>
            </div>
          ) : null}

          {authError ? <p className="error-text">{authError}</p> : null}
        </section>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <LogoLockup />
        <nav className="app-nav" aria-label="Main sections">
          <NavButton active={activeView === "chat"} icon="AI" label="AI Chatbot" onClick={() => navTo("chat")} />
          <NavButton active={activeView === "projects"} icon="PR" label="Projects" onClick={() => navTo("projects")} />
          <NavButton active={activeView === "coWork"} icon="CW" label="Co-Work" onClick={() => navTo("coWork")} />
          <NavButton active={activeView === "chat"} icon="CH" label="Chats" onClick={() => navTo("chat")} />
          <NavButton active={activeView === "subscription"} icon="SU" label="Subscription" onClick={() => navTo("subscription")} />
          <NavButton active={activeView === "settings"} icon="ST" label="Settings" onClick={() => navTo("settings")} />
          {store.admin.enabled ? <NavButton active={activeView === "admin"} icon="AD" label="Admin" badge="Admin Only" onClick={() => navTo("admin")} /> : null}
        </nav>

        <div className="upgrade-card">
          <div className="upgrade-icon">AX</div>
          <h3>Upgrade to Pro</h3>
          <strong>$25 / year</strong>
          <ul>
            <li>Faster responses</li>
            <li>Advanced models</li>
            <li>Priority support</li>
            <li>Early access features</li>
          </ul>
          <button className="ghost-button" type="button" onClick={() => navTo("subscription")}>Subscribe Now</button>
        </div>

        <button className="install-button sidebar-install" type="button" onClick={requestInstall}>Install Aurexis</button>
        {installMessage ? <small className="helper-text">{installMessage}</small> : null}

        <div className="sidebar-footer">
          <small>Aurexis v1.0.0</small>
          <span>Powered by Ollama</span>
        </div>
      </aside>

      <div className="app-body">
        <header className="topbar">
          <button className="menu-button" type="button">☰</button>
          <div className="topbar-actions">
            <ThemeSwitch settings={store.settings} onChange={applyTheme} compact />
            <div className="user-menu">
              <span className="user-avatar">{getInitials(user.name || user.email)}</span>
              <span>Hello, {user.name || user.email}</span>
              <button className="plain-icon-button" type="button" onClick={signOut}>⌄</button>
            </div>
          </div>
        </header>

        <main className="main-content">
          {activeView === "chat" ? (
            <Dashboard
              activeChat={activeChat}
              activeProject={activeProject}
              chats={store.chats}
              projects={store.projects}
              models={models}
              modelStatus={modelStatus}
              selectedModel={store.selectedModel}
              onCreateChat={createChat}
              onSelectChat={selectChat}
              onSendChat={sendChat}
              onSelectModel={(model) => save((current) => ({ ...current, selectedModel: model }))}
              onSelectProject={(projectId) => save((current) => ({ ...current, activeProjectId: projectId }))}
              onProjectsView={() => navTo("projects")}
              messageListRef={messageListRef}
              isSending={isSending}
            />
          ) : null}

          {activeView === "projects" ? (
            <ProjectsView
              projects={store.projects}
              projectCount={store.projects.length}
              onCreate={createProject}
              onChat={(projectId) => {
                save((current) => ({ ...current, activeProjectId: projectId }));
                createChat(projectId);
                navTo("chat");
              }}
            />
          ) : null}

          {activeView === "coWork" ? (
            <CoWorkView
              docs={store.coWorkDocs}
              value={coWorkInput}
              onChange={setCoWorkInput}
              onCreate={createCoWorkDoc}
            />
          ) : null}

          {activeView === "subscription" ? (
            <SubscriptionView
              subscription={store.subscription}
              paymentUrl={config.paymentUrl}
              onMarkPro={markProActive}
            />
          ) : null}

          {activeView === "settings" ? (
            <SettingsView
              user={user}
              settings={store.settings}
              adminEnabled={store.admin.enabled}
              adminKey={adminKey}
              adminError={adminError}
              config={config}
              onTheme={applyTheme}
              onSetting={(key, value) => save((current) => ({
                ...current,
                settings: {
                  ...current.settings,
                  [key]: value
                }
              }))}
              onAdminKey={setAdminKey}
              onCheckAdmin={checkAdmin}
            />
          ) : null}

          {activeView === "admin" ? (
            <AdminView users={store.registeredUsers} />
          ) : null}
        </main>
      </div>
    </div>
  );
}

function LogoLockup({ large = false }) {
  return (
    <div className={`logo-lockup ${large ? "logo-lockup-large" : ""}`}>
      <span className="app-logo" aria-hidden="true" />
      <strong>Aurexis</strong>
    </div>
  );
}

function ThemeSwitch({ settings, onChange, compact = false }) {
  const isDark = settings.theme === "dark";

  return (
    <label className={`theme-switch ${compact ? "theme-switch-compact" : ""}`}>
      {!compact ? (
        <span>
          <strong>{isDark ? "Dark mode" : "Light mode"}</strong>
          <small>Switch background mode</small>
        </span>
      ) : <span className="theme-prefix">{isDark ? "Dark" : "Light"}</span>}
      <input
        type="checkbox"
        role="switch"
        aria-label="Use dark mode"
        checked={isDark}
        onChange={(event) => onChange(event.target.checked ? "dark" : "light")}
      />
      <span className="theme-switch-track" aria-hidden="true">
        <span>Light</span>
        <span>Dark</span>
        <span className="theme-switch-thumb" />
      </span>
    </label>
  );
}

function NavButton({ active, icon, label, badge, onClick }) {
  return (
    <button className={`nav-button ${active ? "active" : ""}`} type="button" onClick={onClick}>
      <span className="nav-icon">{icon}</span>
      <span>{label}</span>
      {badge ? <small>{badge}</small> : null}
    </button>
  );
}

function Dashboard(props) {
  const {
    activeChat,
    activeProject,
    chats,
    projects,
    models,
    modelStatus,
    selectedModel,
    onCreateChat,
    onSelectChat,
    onSendChat,
    onSelectModel,
    onSelectProject,
    onProjectsView,
    messageListRef,
    isSending
  } = props;

  return (
    <>
      <div className="dashboard-grid">
        <aside className="chats-panel dashboard-card">
          <button className="primary-button compact-button" type="button" onClick={() => onCreateChat()}>＋ New Chat</button>
          <h3>Chats</h3>
          <div className="chat-list">
            {chats.map((chat) => (
              <button key={chat.id} className={`chat-row ${chat.id === activeChat?.id ? "active" : ""}`} type="button" onClick={() => onSelectChat(chat.id)}>
                <span className="chat-row-icon">AI</span>
                <span><strong>{chat.title}</strong><small>{formatTime(chat.createdAt)}</small></span>
              </button>
            ))}
          </div>
        </aside>

        <section className="chat-core">
          <article className="hero-card dashboard-card">
            <div className="logo-lockup">
              <span className="app-logo" aria-hidden="true" />
              <div>
                <h1>AI Chatbot Aurexis</h1>
                <p>Powered by Ollama</p>
              </div>
            </div>
            <p>Your intelligent assistant for chatting, co-working, coding, and more.</p>
          </article>

          <article className="model-panel dashboard-card">
            <div className="section-heading">
              <h3>Choose Ollama Model</h3>
              <span className={`status-pill ${modelStatus.connected ? "connected" : "disconnected"}`}>{modelStatus.text}</span>
            </div>
            <select value={selectedModel} onChange={(event) => onSelectModel(event.target.value)} aria-label="Ollama model">
              {models.map((model) => <option key={model.id} value={model.id}>{model.label}</option>)}
            </select>
            {modelStatus.help ? <p className="setup-note">{modelStatus.help}</p> : null}
            <div className="model-strip">
              {models.slice(0, 8).map((model) => (
                <button key={model.id} className={`model-card ${selectedModel === model.id ? "active" : ""}`} type="button" onClick={() => onSelectModel(model.id)}>
                  <span className={`model-badge ${model.installed ? "installed" : ""}`}>{model.installed ? "Installed" : model.badge}</span>
                  <strong>{model.label}</strong>
                  <small>{model.provider}</small>
                </button>
              ))}
            </div>
          </article>

          <section className="chat-workspace dashboard-card">
            <div ref={messageListRef} className="message-list">
              {(activeChat?.messages || []).map((message, index) => (
                <article key={`${message.createdAt}-${index}`} className={`message ${message.role}`}>
                  <header>
                    <span>{message.role === "user" ? "You" : "Aurexis AI"}</span>
                    <small>{formatTime(message.createdAt)}</small>
                  </header>
                  <p>{message.content || (message.streaming ? "Aurexis is thinking..." : "")}</p>
                </article>
              ))}
            </div>
            <form className="prompt-bar" onSubmit={onSendChat}>
              <textarea name="prompt" rows={1} placeholder="Type your message..." required />
              <button className="send-button" type="submit" disabled={isSending}>➤</button>
            </form>
          </section>
        </section>

        <aside className="right-rail">
          <article className="dashboard-card rail-card">
            <h3>Project</h3>
            <p>Create and manage your projects.</p>
            <button className="primary-button compact-button" type="button" onClick={onProjectsView}>＋ New Project</button>
            <label>
              <span>Chat project</span>
              <select value={activeProject?.id || "none"} onChange={(event) => onSelectProject(event.target.value)}>
                <option value="none">No project</option>
                {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
              </select>
            </label>
            <h3>My Projects</h3>
            <div className="mini-project-list">
              {projects.slice(0, 4).map((project) => (
                <div key={project.id} className="mini-project">
                  <span>PR</span>
                  <div><strong>{project.name}</strong><small>{project.description || "Project workspace"}</small></div>
                </div>
              ))}
              {!projects.length ? <p className="empty-mini">No projects yet.</p> : null}
            </div>
          </article>

          <article className="dashboard-card rail-card">
            <h3>Ollama Setup</h3>
            <p>Cloud API keys work with <strong>https://ollama.com</strong>. A local server needs a reachable <strong>OLLAMA_BASE_URL</strong>.</p>
          </article>
        </aside>
      </div>

      <div className="feature-grid">
        <Feature icon="SE" title="Secure & Private" text="Your data stays on your device until you connect shared storage." />
        <Feature icon="LO" title="Local & Fast" text="Powered by Ollama running locally or through Ollama Cloud." />
        <Feature icon="AI" title="Innovative AI" text="Choose from capable open models and installed server models." />
        <Feature icon="UF" title="User Friendly" text="Designed for everyone, easy to use." />
      </div>
    </>
  );
}

function Feature({ icon, title, text }) {
  return <article className="feature-card"><span>{icon}</span><strong>{title}</strong><p>{text}</p></article>;
}

function ProjectsView({ projects, projectCount, onCreate, onChat }) {
  return (
    <section className="view-page">
      <PageHeader eyebrow="Workspace" title="Projects" />
      <div className="project-layout">
        <form className="project-form dashboard-card" onSubmit={onCreate}>
          <h3>Create a project</h3>
          <label><span>Project name</span><input name="name" placeholder="AI Chat App" required /></label>
          <label><span>Description</span><input name="description" placeholder="What is this project about?" /></label>
          <label><span>Custom instructions</span><textarea name="instructions" rows={5} placeholder="How should Aurexis help inside this project?" /></label>
          <button className="primary-button" type="submit">Create Project</button>
        </form>

        <article className="dashboard-card padded-panel">
          <div className="section-heading"><h3>Your projects</h3><span>{projectCount} projects</span></div>
          <div className="project-grid">
            {projects.map((project) => (
              <article key={project.id} className="project-card">
                <div><strong>{project.name}</strong><p>{project.description || "No description yet."}</p></div>
                <button className="ghost-button" type="button" onClick={() => onChat(project.id)}>Chat in project</button>
              </article>
            ))}
            {!projects.length ? <div className="empty-state">Create your first project to organize chats and custom instructions.</div> : null}
          </div>
        </article>
      </div>
    </section>
  );
}

function CoWorkView({ docs, value, onChange, onCreate }) {
  return (
    <section className="view-page">
      <PageHeader eyebrow="Co-work" title="Writing canvas" />
      <div className="cowork-grid">
        <article className="dashboard-card padded-panel">
          <h3>Draft with Aurexis</h3>
          <textarea className="cowork-textarea" value={value} onChange={(event) => onChange(event.target.value)} placeholder="Write a rough idea, plan, email, script, or document draft..." />
          <button className="primary-button" type="button" onClick={onCreate}>Save Draft</button>
        </article>
        <article className="dashboard-card padded-panel">
          <h3>Saved drafts</h3>
          <div className="draft-list">
            {docs.map((doc) => <article key={doc.id}><strong>{doc.title}</strong><p>{doc.body}</p></article>)}
            {!docs.length ? <div className="empty-state">No co-work drafts yet.</div> : null}
          </div>
        </article>
      </div>
    </section>
  );
}

function SubscriptionView({ subscription, paymentUrl, onMarkPro }) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=12&data=${encodeURIComponent(paymentUrl)}`;

  return (
    <section className="view-page">
      <PageHeader eyebrow="Aurexis Pro" title="Subscription" right={<span className={`status-pill ${subscription.proActive ? "connected" : ""}`}>{subscription.proActive ? "Pro active" : "Free plan"}</span>} />
      <article className="pro-card dashboard-card">
        <div>
          <p className="eyebrow">Aurexis Pro</p>
          <h2>$25 / year</h2>
          <p>Faster responses, advanced models, priority support, and early access features.</p>
        </div>
        <img className="qr-image" src={qrUrl} alt="Aurexis Pro payment QR code" />
        <div className="pro-actions">
          <a className="primary-button" href={paymentUrl} target="_blank" rel="noreferrer">Open payment page</a>
          <button className="ghost-button" type="button" onClick={onMarkPro} disabled={subscription.proActive}>{subscription.proActive ? "Pro active" : "Mark Pro active"}</button>
        </div>
      </article>
    </section>
  );
}

function SettingsView(props) {
  const { user, settings, adminEnabled, adminKey, adminError, config, onTheme, onSetting, onAdminKey, onCheckAdmin } = props;

  return (
    <section className="view-page">
      <PageHeader eyebrow="App controls" title="Settings" />
      <div className="settings-grid">
        <article className="settings-card">
          <div className="section-heading"><h3>Appearance</h3><span>Light / Dark</span></div>
          <ThemeSwitch settings={settings} onChange={onTheme} />
        </article>

        <article className="settings-card">
          <div className="section-heading"><h3>Account</h3><span>Saved login</span></div>
          <dl className="account-details">
            <div><dt>Name</dt><dd>{user.name}</dd></div>
            <div><dt>Email</dt><dd>{user.email}</dd></div>
            <div><dt>Mobile</dt><dd>{user.mobile || "Not added"}</dd></div>
          </dl>
        </article>

        <article className="settings-card">
          <div className="section-heading"><h3>Behavior</h3><span>Assistant style</span></div>
          <Toggle checked={settings.coWorkMode} title="Enable co-work mode" text="Brainstorm, refine, and write together." onChange={(value) => onSetting("coWorkMode", value)} />
          <Toggle checked={settings.projectSpeed} title="Faster project replies" text="Keep project responses direct and actionable." onChange={(value) => onSetting("projectSpeed", value)} />
          <Toggle checked={settings.codeMode} title="Code-aware replies" text="Be implementation-ready when code is discussed." onChange={(value) => onSetting("codeMode", value)} />
          <Toggle checked={settings.friendlyMode} title="Very friendly chatbot" text="Keep Aurexis warm and easy to talk to." onChange={(value) => onSetting("friendlyMode", value)} />
        </article>

        <article className="settings-card">
          <div className="section-heading"><h3>Admin</h3><span>{adminEnabled ? "Enabled" : "Locked"}</span></div>
          <form className="admin-key-form" onSubmit={onCheckAdmin}>
            <label><span>Admin key</span><input value={adminKey} onChange={(event) => onAdminKey(event.target.value)} placeholder="Enter ADMIN_KEY" /></label>
            <button className="primary-button" type="submit">Unlock Admin</button>
          </form>
          {adminError ? <p className="error-text">{adminError}</p> : null}
          {config.adminKeyIsDefault ? <p className="setup-note">Change the default ADMIN_KEY before going live.</p> : null}
          <p className="setup-note">Ollama base currently resolves to: {config.ollamaBaseUrl || "not loaded"}</p>
        </article>
      </div>
    </section>
  );
}

function Toggle({ checked, title, text, onChange }) {
  return (
    <label className="toggle-row">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span><strong>{title}</strong><small>{text}</small></span>
    </label>
  );
}

function AdminView({ users }) {
  return (
    <section className="view-page">
      <PageHeader eyebrow="Admin only" title="Registered users" />
      <article className="dashboard-card padded-panel">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Name</th><th>Email</th><th>Mobile</th><th>Plan</th><th>Last login</th></tr></thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.email}><td>{user.name}</td><td>{user.email}</td><td>{user.mobile || "Not added"}</td><td>{user.plan}</td><td>{formatTime(user.lastLoginAt)}</td></tr>
              ))}
              {!users.length ? <tr><td colSpan={5}>No registered users on this device yet.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}

function PageHeader({ eyebrow, title, right }) {
  return (
    <header className="view-header dashboard-card">
      <div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1></div>
      {right}
    </header>
  );
}
