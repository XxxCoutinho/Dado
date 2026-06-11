import { db, requireUser, showToast } from "./auth.js";
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const params = new URLSearchParams(location.search);
const campaignId = params.get("id");

const title = document.getElementById("campaignTitle");
const meta = document.getElementById("campaignMeta");
const description = document.getElementById("campaignDescription");
const panelLink = document.getElementById("panelLink");
const virtualTableLink = document.getElementById("virtualTableLink");
const copyInviteBtn = document.getElementById("copyInviteBtn");
const leaveCampaignBtn = document.getElementById("leaveCampaignBtn");
const addCharacterModal = document.getElementById("addCharacterModal");
const openAddCharacterModal = document.getElementById("openAddCharacterModal");
const closeAddCharacterModal = document.getElementById("closeAddCharacterModal");
const myCharactersSelect = document.getElementById("myCharactersSelect");
const addCharacterForm = document.getElementById("addCharacterForm");
const charactersList = document.getElementById("campaignCharactersList");
const playersList = document.getElementById("playersList");
const noteForm = document.getElementById("quickNoteForm");
const quickNoteText = document.getElementById("quickNoteText");
const notesList = document.getElementById("notesList");

let currentUser = null;
let currentCampaign = null;

if (!campaignId) {
  title.textContent = "Campanha não encontrada";
}

requireUser(async (user) => {
  currentUser = user;

  if (!campaignId) {
    return;
  }

  await loadCampaign();
  await loadMyCharacters();
  await loadNotes();
});

document.addEventListener("click", (event) => {
  const tabButton = event.target.closest("[data-tab-target]");
  if (!tabButton) return;

  document.querySelectorAll(".tab-btn").forEach((btn) => btn.classList.remove("active"));
  document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.remove("active"));

  tabButton.classList.add("active");
  document.getElementById(tabButton.dataset.tabTarget)?.classList.add("active");
});

openAddCharacterModal?.addEventListener("click", () => addCharacterModal.showModal());
closeAddCharacterModal?.addEventListener("click", () => addCharacterModal.close());

copyInviteBtn?.addEventListener("click", async () => {
  if (!currentCampaign?.inviteCode) return;

  await navigator.clipboard.writeText(currentCampaign.inviteCode);
  showToast(`Código copiado: ${currentCampaign.inviteCode}`);
});

leaveCampaignBtn?.addEventListener("click", async () => {
  if (!currentUser || !campaignId || !currentCampaign) return;

  if (currentCampaign.ownerId === currentUser.uid) {
    showToast("O mestre não pode sair da própria campanha por este botão.");
    return;
  }

  const confirmed = confirm("Deseja sair desta campanha?");
  if (!confirmed) return;

  try {
    await updateDoc(doc(db, "campaigns", campaignId), {
      playerIds: arrayRemove(currentUser.uid),
      [`playerNames.${currentUser.uid}`]: null,
      updatedAt: serverTimestamp()
    });

    showToast("Você saiu da campanha.");
    location.href = "campanhas.html";
  } catch (error) {
    console.error(error);
    showToast("Não foi possível sair da campanha.");
  }
});

addCharacterForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const characterId = myCharactersSelect.value;
  if (!characterId) {
    showToast("Escolha um personagem.");
    return;
  }

  try {
    await updateDoc(doc(db, "campaigns", campaignId), {
      characterIds: arrayUnion(characterId),
      updatedAt: serverTimestamp()
    });

    await updateDoc(doc(db, "characters", characterId), {
      campaignIds: arrayUnion(campaignId),
      updatedAt: serverTimestamp()
    });

    addCharacterModal.close();
    showToast("Personagem adicionado.");
    await loadCampaign();
  } catch (error) {
    console.error(error);
    showToast("Não foi possível adicionar personagem.");
  }
});

noteForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const text = quickNoteText.value.trim();
  if (!text) return;

  try {
    await addDoc(collection(db, "campaigns", campaignId, "notes"), {
      text,
      authorId: currentUser.uid,
      authorName: currentUser.displayName || currentUser.email || "Jogador",
      createdAt: serverTimestamp()
    });

    quickNoteText.value = "";
    showToast("Anotação salva.");
    await loadNotes();
  } catch (error) {
    console.error(error);
    showToast("Não foi possível salvar a anotação.");
  }
});

async function loadCampaign() {
  const campaignRef = doc(db, "campaigns", campaignId);
  const campaignSnap = await getDoc(campaignRef);

  if (!campaignSnap.exists()) {
    title.textContent = "Campanha não encontrada";
    return;
  }

  currentCampaign = campaignSnap.data();

  const isMember = currentCampaign.playerIds?.includes(currentUser.uid) || currentCampaign.ownerId === currentUser.uid;
  if (!isMember) {
    title.textContent = "Acesso negado";
    description.textContent = "Você precisa entrar na campanha para acessar esta página.";
    return;
  }

  title.textContent = currentCampaign.name || "Campanha sem nome";
  meta.textContent = `${currentCampaign.city || "Cidade não definida"} · Código: ${currentCampaign.inviteCode || "sem código"}`;
  description.textContent = currentCampaign.description || "Sem descrição.";

  panelLink.href = `painel_campanha.html?id=${campaignId}`;
  virtualTableLink.href = `painel_campanha.html?id=${campaignId}#diceTab`;

  renderPlayers(currentCampaign.playerNames || {});
  await renderCampaignCharacters(currentCampaign.characterIds || []);
}

async function renderCampaignCharacters(characterIds) {
  if (!characterIds.length) {
    charactersList.innerHTML = '<div class="empty-state">Nenhum personagem adicionado.</div>';
    return;
  }

  charactersList.innerHTML = "";

  for (const characterId of characterIds) {
    const characterSnap = await getDoc(doc(db, "characters", characterId));

    if (!characterSnap.exists()) {
      continue;
    }

    const character = characterSnap.data();
    const portrait = character.portraitUrl || "https://placehold.co/600x800/230b13/f7e8ee?text=Vampiro";

    const card = document.createElement("article");
    card.className = "character-card";

    card.innerHTML = `
      <img src="${escapeHtml(portrait)}" alt="Imagem de ${escapeHtml(character.name || "personagem")}" />
      <h2>${escapeHtml(character.name || "Sem nome")}</h2>
      <div class="card-meta">
        ${escapeHtml(character.clan || "Clã não definido")} · Fome ${Number(character.hunger || 0)}
      </div>
      <div class="card-actions">
        <a class="btn btn-small" href="ficha_vampiro_jogo.html?id=${characterId}">Acessar ficha</a>
        ${canEditCharacter(character) ? `<a class="btn btn-small btn-secondary" href="ficha_vampiro_criacao.html?id=${characterId}">Editar</a>` : ""}
      </div>
    `;

    charactersList.appendChild(card);
  }
}

function renderPlayers(playerNames) {
  const entries = Object.entries(playerNames).filter(([, name]) => Boolean(name));

  if (!entries.length) {
    playersList.innerHTML = "<p>Nenhum jogador listado.</p>";
    return;
  }

  playersList.innerHTML = `
    <h2>Jogadores</h2>
    <div class="player-list">
      ${entries.map(([id, name]) => `
        <div class="player-pill">
          <span>${escapeHtml(name)}</span>
          <small>${id === currentCampaign.ownerId ? "Mestre" : "Jogador"}</small>
        </div>
      `).join("")}
    </div>
  `;
}

async function loadMyCharacters() {
  const charactersQuery = query(
    collection(db, "characters"),
    where("ownerId", "==", currentUser.uid),
    where("system", "==", "vampiro_mascara")
  );

  const snapshot = await getDocs(charactersQuery);

  if (snapshot.empty) {
    myCharactersSelect.innerHTML = '<option value="">Você ainda não criou personagens</option>';
    return;
  }

  myCharactersSelect.innerHTML = '<option value="">Selecione...</option>';

  snapshot.forEach((characterDoc) => {
    const character = characterDoc.data();
    const option = document.createElement("option");
    option.value = characterDoc.id;
    option.textContent = `${character.name || "Sem nome"} — ${character.clan || "Sem clã"}`;
    myCharactersSelect.appendChild(option);
  });
}

async function loadNotes() {
  const notesQuery = query(
    collection(db, "campaigns", campaignId, "notes"),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(notesQuery);

  if (snapshot.empty) {
    notesList.innerHTML = '<div class="empty-state">Nenhuma anotação salva.</div>';
    return;
  }

  notesList.innerHTML = "";

  snapshot.forEach((noteDoc) => {
    const note = noteDoc.data();
    const card = document.createElement("article");
    card.className = "note-card";
    card.innerHTML = `
      <strong>${escapeHtml(note.authorName || "Jogador")}</strong>
      <p>${escapeHtml(note.text || "")}</p>
    `;
    notesList.appendChild(card);
  });
}

function canEditCharacter(character) {
  return character.ownerId === currentUser.uid || currentCampaign.ownerId === currentUser.uid;
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
