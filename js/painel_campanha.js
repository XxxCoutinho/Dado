import { db, requireUser, showToast } from "./auth.js";
import {
  doc,
  getDoc,
  serverTimestamp,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const params = new URLSearchParams(location.search);
const campaignId = params.get("id");

const title = document.getElementById("panelCampaignTitle");
const backCampaignLink = document.getElementById("backCampaignLink");
const charactersList = document.getElementById("panelCharactersList");
const rollBtn = document.getElementById("rollVampireDice");
const diceResult = document.getElementById("diceResult");

let currentUser = null;
let campaign = null;

requireUser(async (user) => {
  currentUser = user;

  if (!campaignId) {
    title.textContent = "Campanha não informada";
    return;
  }

  backCampaignLink.href = `campanha.html?id=${campaignId}`;
  await loadPanel();
});

document.addEventListener("click", async (event) => {
  const tabButton = event.target.closest("[data-tab-target]");

  if (tabButton) {
    document.querySelectorAll(".tab-btn").forEach((btn) => btn.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.remove("active"));

    tabButton.classList.add("active");
    document.getElementById(tabButton.dataset.tabTarget)?.classList.add("active");
  }

  const saveNoteBtn = event.target.closest("[data-save-panel-note]");

  if (saveNoteBtn) {
    const fieldId = saveNoteBtn.dataset.savePanelNote;
    await savePanelField(fieldId);
  }
});

rollBtn?.addEventListener("click", () => {
  const normalCount = Number(document.getElementById("normalDice").value || 0);
  const hungerCount = Number(document.getElementById("hungerDice").value || 0);
  const difficulty = Number(document.getElementById("difficulty").value || 1);
  const result = rollVampirePool(normalCount, hungerCount, difficulty);

  diceResult.innerHTML = `
    Dados normais: [${result.normal.join(", ") || "-"}]<br>
    Dados de fome: [${result.hunger.join(", ") || "-"}]<br>
    Sucessos: <strong>${result.successes}</strong> / Dificuldade ${difficulty}<br>
    ${result.outcome}
  `;
});

async function loadPanel() {
  const snapshot = await getDoc(doc(db, "campaigns", campaignId));

  if (!snapshot.exists()) {
    title.textContent = "Campanha não encontrada";
    return;
  }

  campaign = snapshot.data();

  const isMember = campaign.ownerId === currentUser.uid || campaign.playerIds?.includes(currentUser.uid);

  if (!isMember) {
    title.textContent = "Acesso negado";
    return;
  }

  title.textContent = campaign.name || "Campanha sem nome";

  ["combatNotes", "investigationNotes", "reportNotes", "generalNotes"].forEach((field) => {
    const element = document.getElementById(field);
    if (element) {
      element.value = campaign.panelNotes?.[field] || "";
    }
  });

  await renderCharacters(campaign.characterIds || []);
}

async function renderCharacters(characterIds) {
  if (!characterIds.length) {
    charactersList.innerHTML = '<div class="empty-state">Nenhum personagem adicionado.</div>';
    return;
  }

  charactersList.innerHTML = "";

  for (const characterId of characterIds) {
    const snapshot = await getDoc(doc(db, "characters", characterId));

    if (!snapshot.exists()) {
      continue;
    }

    const character = snapshot.data();

    const card = document.createElement("article");
    card.className = "character-card";

    card.innerHTML = `
      <div class="character-mini">
        <img src="${escapeHtml(character.portraitUrl || "https://placehold.co/120x120/230b13/f7e8ee?text=V")}" alt="" />
        <div>
          <h2>${escapeHtml(character.name || "Sem nome")}</h2>
          <div class="card-meta">
            ${escapeHtml(character.clan || "Sem clã")} ·
            Fome ${Number(character.hunger || 0)} ·
            Humanidade ${Number(character.humanity || 0)}
          </div>
        </div>
      </div>

      <div class="card-actions">
        <a class="btn btn-small" href="ficha_vampiro_jogo.html?id=${characterId}">Acessar ficha</a>
        ${campaign.ownerId === currentUser.uid ? `<a class="btn btn-small btn-secondary" href="ficha_vampiro_criacao.html?id=${characterId}">Editar</a>` : ""}
      </div>
    `;

    charactersList.appendChild(card);
  }
}

async function savePanelField(fieldId) {
  const field = document.getElementById(fieldId);
  if (!field || !campaignId) return;

  try {
    await updateDoc(doc(db, "campaigns", campaignId), {
      [`panelNotes.${fieldId}`]: field.value,
      updatedAt: serverTimestamp()
    });

    showToast("Informação salva.");
  } catch (error) {
    console.error(error);
    showToast("Não foi possível salvar.");
  }
}

function rollVampirePool(normalDiceCount, hungerDiceCount, difficulty) {
  const normal = rollDice(normalDiceCount);
  const hunger = rollDice(hungerDiceCount);
  const allDice = [...normal, ...hunger];

  const successes = allDice.reduce((total, die) => total + (die >= 6 ? 1 : 0), 0);
  const normalTens = normal.filter((die) => die === 10).length;
  const hungerTens = hunger.filter((die) => die === 10).length;
  const hungerOnes = hunger.filter((die) => die === 1).length;

  const criticalPairs = Math.floor((normalTens + hungerTens) / 2);
  const totalSuccesses = successes + criticalPairs * 2;
  const success = totalSuccesses >= difficulty;

  let outcome = success ? "Sucesso." : "Falha.";

  if (criticalPairs > 0 && hungerTens > 0) {
    outcome += " Possível crítico bestial.";
  }

  if (!success && hungerOnes > 0) {
    outcome += " Possível falha bestial.";
  }

  return {
    normal,
    hunger,
    successes: totalSuccesses,
    outcome
  };
}

function rollDice(count) {
  return Array.from({ length: Math.max(0, count) }, () => Math.floor(Math.random() * 10) + 1);
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
