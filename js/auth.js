import { auth, provider, db } from "./firebase.js";
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export function getCurrentUser() {
  return auth.currentUser;
}

export function requireUser(callback) {
  return onAuthStateChanged(auth, (user) => {
    updateAuthUI(user);

    if (!user) {
      return;
    }

    callback(user);
  });
}

export function showToast(message) {
  const oldToast = document.querySelector(".toast");
  if (oldToast) oldToast.remove();

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 3600);
}

function updateAuthUI(user) {
  document.querySelectorAll("[data-user-name]").forEach((el) => {
    el.textContent = user?.displayName || user?.email || "Visitante";
  });

  document.querySelectorAll("[data-login-btn]").forEach((btn) => {
    btn.classList.toggle("hidden", Boolean(user));
  });

  document.querySelectorAll("[data-logout-btn]").forEach((btn) => {
    btn.classList.toggle("hidden", !user);
  });

  document.querySelectorAll("[data-auth-link]").forEach((link) => {
    link.textContent = user ? "Minha conta" : "Login";
  });
}

document.addEventListener("click", async (event) => {
  const loginBtn = event.target.closest("[data-login-btn]");
  const logoutBtn = event.target.closest("[data-logout-btn]");

  if (loginBtn) {
    try {
      await signInWithPopup(auth, provider);
      showToast("Login realizado.");
    } catch (error) {
      console.error(error);
      showToast("Não foi possível entrar.");
    }
  }

  if (logoutBtn) {
    try {
      await signOut(auth);
      showToast("Você saiu da conta.");
    } catch (error) {
      console.error(error);
      showToast("Não foi possível sair.");
    }
  }
});

onAuthStateChanged(auth, async (user) => {
  updateAuthUI(user);

  if (!user) {
    return;
  }

  const characterCounter = document.querySelector("[data-count-characters]");
  const campaignCounter = document.querySelector("[data-count-campaigns]");

  try {
    if (characterCounter) {
      const charactersQuery = query(
        collection(db, "characters"),
        where("ownerId", "==", user.uid),
        where("system", "==", "vampiro_mascara")
      );

      const snapshot = await getDocs(charactersQuery);
      characterCounter.textContent = snapshot.size;
    }

    if (campaignCounter) {
      const ownerQuery = query(
        collection(db, "campaigns"),
        where("ownerId", "==", user.uid),
        where("system", "==", "vampiro_mascara")
      );

      const playerQuery = query(
        collection(db, "campaigns"),
        where("playerIds", "array-contains", user.uid),
        where("system", "==", "vampiro_mascara")
      );

      const [ownerSnapshot, playerSnapshot] = await Promise.all([
        getDocs(ownerQuery),
        getDocs(playerQuery)
      ]);

      const ids = new Set([
        ...ownerSnapshot.docs.map((doc) => doc.id),
        ...playerSnapshot.docs.map((doc) => doc.id)
      ]);

      campaignCounter.textContent = ids.size;
    }
  } catch (error) {
    console.warn("Contadores não carregados:", error);
  }
});

export { auth, db };
