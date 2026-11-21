const wallpaper = document.querySelector(".wallpaper");
const headlineEl = document.querySelector(".hero-section > .headline");

document.addEventListener("DOMContentLoaded", () => {
  if (wallpaper) wallpaper.src = `/assets/images/wallpapers/${randomInt(0, 2)}.jpg`;
  if (headlineEl) headlineEl.innerHTML = getRandomItem(HEADLINES);
});

async function signup(event) {
  event.preventDefault();

  await withLoading(async () => {
    const email = document.querySelector(".email-input").value;
    const password = document.querySelector(".password-input").value;

    await Firebase.signup({ email, password });

    event.target.reset();
    redirectAfterAuth();
  });
}

async function login(event) {
  event.preventDefault();

  await withLoading(async () => {
    const email = document.querySelector(".email-input").value;
    const password = document.querySelector(".password-input").value;

    await Firebase.login({ email, password });

    event.target.reset();
    redirectAfterAuth();
  });
}

async function loginWithGoogle(event) {
  await withLoading(async () => {
    await Firebase.loginWithGoogle();
    redirectAfterAuth();
  });
}

async function sendPasswordResetEmail(event) {
  event.preventDefault();

  await withLoading(async () => {
    const email = document.querySelector(".email-input").value;
    await Firebase.sendPasswordResetEmail(email);
  });
}

async function redirectAfterAuth() {
  const redirectUrl = urlParams.get("redirect");
  if (redirectUrl) redirectToPartnerApp(redirectUrl);
  else navigate("home");
}

async function redirectToPartnerApp(targetUrl) {
  if (!currentAuthUser) throw new Error("User not signed in");

  const idToken = await currentAuthUser.getIdToken();

  const apiUrl = `https://kgdee-firebase-functions.netlify.app/.netlify/functions/create-custom-token`;
  const res = await fetch(apiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });

  if (!res.ok) throw new Error("Failed to create custom token");
  const { customToken } = await res.json();

  // Redirect to target domain with the custom token
  const url = new URL(targetUrl);
  url.searchParams.set("custom_token", customToken);
  window.location.href = url.toString();
}
