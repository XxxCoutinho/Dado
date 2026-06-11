import { db, requireUser, showToast } from "./auth.js";
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const list = document.getElementById("campaignsList");
const modal = document.getElementById("campaignModal");
const form = document.getElementById("campaignForm");
const openModalBtn = document.getElementById("openCampaignModal");
const closeModalBtn = document.getElementById("closeCampaignModal");
const joinBtn = document.getElementById("joinCampaignBtn");
const inviteCodeInput = document.getElementById("inviteCodeInput");

let currentUser = null;

requireUser(async (user) => {
  currentUser = user;
  await loadCampaigns(user);
});

openModalBtn?.addEventListener("click", () => modal.showModal());
closeModalBtn?.addEventListener("click", () => modal.close());

form?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUser) {
    showToast("Faça login primeiro.");
    return;
  }

  const name = document.getElementById("campaignName").value.trim();
  const city = document.getElementById("campaignCity").value.trim();
  const description = document.getElementById("campaignDescription").value.trim();

  if (!name) {
    showToast("Informe o nome da campanha.");
    return;
  }

  try {
    const inviteCode = createInviteCode();

    const docRef = await addDoc(collection(db, "campaigns"), {
      name,
      city,
      description,
      inviteCode,
      ownerId: currentUser.uid,
      ownerName: currentUser.displayName || currentUser.email || "Mestre",
      playerIds: [currentUser.uid],
      playerNames: {
        [currentUser.uid]: currentUser.displayName || currentUser.email || "Mestre"
      },
      characterIds: [],
      system: "vampiro_mascara",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    showToast("Campanha criada.");
    location.href = `campanha.html?id=${docRef.id}`;
  } catch (error) {
    console.error(error);
    showToast("Não foi possível criar a campanha.");
  }
});

joinBtn?.addEventListener("click", async () => {
  if (!currentUser) {
    showToast("Faça login primeiro.");
    return;
  }

  const inviteCode = inviteCodeInput.value.trim().toUpperCase();

  if (!inviteCode) {
    showToast("Informe o código de convite.");
    return;
  }

  try {
    const campaignQuery = query(
      collection(db, "campaigns"),
      where("inviteCode", "==", inviteCode),
      where("system", "==", "vampiro_mascara")
    );

    const snapshot = await getDocs(campaignQuery);

    if (snapshot.empty) {
      showToast("Campanha não encontrada.");
      return;
    }

    const campaignDoc = snapshot.docs[0];

    await updateDoc(doc(db, "campaigns", campaignDoc.id), {
      playerIds: arrayUnion(currentUser.uid),
      [`playerNames.${currentUser.uid}`]: currentUser.displayName || currentUser.email || "Jogador",
      updatedAt: serverTimestamp()
    });

    showToast("Você entrou na campanha.");
    location.href = `campanha.html?id=${campaignDoc.id}`;
  } catch (error) {
    console.error(error);
    showToast("Não foi possível entrar na campanha.");
  }
});

async function loadCampaigns(user) {
  list.innerHTML = '<div class="empty-state">Carregando campanhas...</div>';

  try {
    const ownedQuery = query(
      collection(db, "campaigns"),
      where("ownerId", "==", user.uid),
      where("system", "==", "vampiro_mascara"),
      orderBy("updatedAt", "desc")
    );

    const joinedQuery = query(
      collection(db, "campaigns"),
      where("playerIds", "array-contains", user.uid),
      where("system", "==", "vampiro_mascara"),
      orderBy("updatedAt", "desc")
    );

    const [ownedSnapshot, joinedSnapshot] = await Promise.all([
      getDocs(ownedQuery),
      getDocs(joinedQuery)
    ]);

    const map = new Map();

    [...ownedSnapshot.docs, ...joinedSnapshot.docs].forEach((campaignDoc) => {
      map.set(campaignDoc.id, campaignDoc.data());
    });

    if (map.size === 0) {
      list.innerHTML = '<div class="empty-state">Nenhuma campanha encontrada.</div>';
      return;
    }

    list.innerHTML = "";

    map.forEach((campaign, id) => {
      const card = document.createElement("article");
      card.className = "campaign-card";

      card.innerHTML = `
        <h2>${escapeHtml(campaign.name || "Campanha sem nome")}</h2>
        <div class="card-meta">
          ${escapeHtml(campaign.city || "Cidade não definida")} ·
          ${campaign.ownerId === user.uid ? "Mestre" : "Jogador"}
        </div>
        <p>${escapeHtml(campaign.description || "Sem descrição.")}</p>
        <div class="card-actions">
          <a class="btn btn-small" href="campanha.html?id=${id}">Abrir campanha</a>
          <a class="btn btn-small btn-secondary" href="painel_campanha.html?id=${id}">Painel da campanha</a>
        </div>
      `;

      list.appendChild(card);
    });
  } catch (error) {
    console.error(error);
    list.innerHTML = '<div class="empty-state">Erro ao carregar campanhas.</div>';
  }
}

function createInviteCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}
