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

function redirectAfterAuth() {
  const redirectUrl = urlParams.get("redirect");
  if (redirectUrl) window.location.href = redirectUrl;
  else navigate("home");
}
