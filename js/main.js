const urlParams = new URLSearchParams(window.location.search);
let isLoading = false;
let currentUser = null;
let currentSettings = load("currentSettings", {
  notifications: true,
  darkTheme: true,
});
globalThis.currentAuthUser = null;

document.addEventListener("DOMContentLoaded", async () => {
  loading(true);
  await loadResources(RESOURCES.utils);
  for (const component of [LoadingOverlay, Toast]) {
    await component.init();
  }

  loadingWithOverlay(true);

  Firebase.init(onAuthStateChanged);
  updateUI();
});

async function onAuthStateChanged(user) {
  globalThis.currentAuthUser = user;
  console.log("currentAuthUser:", currentAuthUser);

  await globalThis.initPage?.();

  updateUI();

  loadingWithOverlay(false);
}

function navigate(name, params = "") {
  if (!name) {
    window.location.href = "/";
    return;
  }
  const targetPath = `/pages/${name}/${name}.html`;
  window.location.href = `${targetPath}${params}`;
}

function loading(state = true) {
  isLoading = state;
}

function loadingWithOverlay(state = true) {
  isLoading = state;
  LoadingOverlay.toggle(state);
}

async function withLoading(action, { shouldShow = true, isDisabled = false } = {}) {
  if (!isDisabled) {
    if (isLoading) return;
  }

  try {
    if (!isDisabled) {
      loading(true);
      if (shouldShow) LoadingOverlay.toggle(true);
    }

    return await action();
  } finally {
    if (!isDisabled) {
      loading(false);
      if (shouldShow) LoadingOverlay.toggle(false);
    }
  }
}

function updateUI() {
  document.body.classList.toggle("dark-theme", currentSettings.darkTheme);

  const avatarEls = document.querySelectorAll(".self-avatar");
  avatarEls?.forEach((el) => (el.innerHTML = Avatar.createInner()));

  const usernameEls = document.querySelectorAll(".self-username");
  usernameEls?.forEach((el) => (el.textContent = getUserName()));

  const settingEls = document.querySelectorAll(`[data-setting-id]`);
  settingEls.forEach((el) => {
    const setting = currentSettings[el.dataset.settingId];

    const checkbox = el.querySelector("input");
    if (checkbox) checkbox.checked = setting;

    const descEl = el.querySelector(".desc");
    if (descEl) descEl.textContent = setting ? "Enabled" : "Disabled";
  });
}

function getUserName(data) {
  data = data || currentAuthUser;
  return data?.name || data?.displayName || data?.email || data?.authorName || "Anonymous User";
}

function generateUserName(userId) {
  return `${getRandomItem(USERNAMES)}_${userId.slice(0, 4)}`;
}

function toggleSetting(name, force) {
  currentSettings[name] = force !== undefined ? force : !currentSettings[name];
  save("currentSettings", currentSettings);
  updateUI();
}

async function logout() {
  await withLoading(async () => {
    await Firebase.logout();
  });
}

async function deleteAccount() {
  if (isLoading) return;

  const confirmed = await ConfirmModal.confirmAction(`Delete account?`, "This action cannot be undone.");
  if (!confirmed) return;

  loading(true);
  await Firebase.deleteUser(currentUser.id);
  loading(false);
}

function debug() {
  if (typeof currentUser !== "undefined") console.log("currentUser", currentUser);
}

const keyActions = {
  Space: debug,
  KeyF: toggleFullscreen,
};

document.addEventListener("keydown", (event) => {
  const action = keyActions[event.code];
  const isFocus = document.activeElement.matches("input, textarea");

  if (action && !isFocus) {
    event.preventDefault();
    action();
  }
});
