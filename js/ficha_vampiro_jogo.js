import { db, requireUser, showToast } from "./auth.js";
import {
  doc,
  getDoc,
  serverTimestamp,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const params = new URLSearchParams(location.search);
const characterId = params.get("id");

const characterPortrait = document.getElementById("characterPortrait");
const characterName = document.getElementById("characterName");
const characterSubtitle = document.getElementById("characterSubtitle");
const editCharacterLink = document.getElementById("editCharacterLink");
const saveRuntimeBtn = document.getElementById("saveRuntimeBtn");
const rollAttribute = document.getElementById("rollAttribute");
const rollSkill = document.getElementById("rollSkill");
const rollDifficulty = document.getElementById("rollDifficulty");
const rollSheetDice = document.getElementById("rollSheetDice");
const rollResult = document.getElementById("rollResult");
const attributesView = document.getElementById("attributesView");
const skillsView = document.getElementById("skillsView");
const disciplinesView = document.getElementById("disciplinesView");
const storyView = document.getElementById("storyView");

let currentUser = null;
let character = null;

const attributeLabels = {
  strength: "Força",
  dexterity: "Destreza",
  stamina: "Vigor",
  charisma: "Carisma",
  manipulation: "Manipulação",
  composure: "Autocontrole",
  intelligence: "Inteligência",
  wits: "Raciocínio",
  resolve: "Determinação"
};

const skillLabels = {
  athletics: "Atletismo",
  brawl: "Briga",
  craft: "Ofícios",
  drive: "Condução",
  firearms: "Armas de Fogo",
  melee: "Armas Brancas",
  larceny: "Ladinagem",
  stealth: "Furtividade",
  survival: "Sobrevivência",
  animalKen: "Empatia com Animais",
  etiquette: "Etiqueta",
  insight: "Intuição",
  intimidation: "Intimidação",
  leadership: "Liderança",
  performance: "Performance",
  persuasion: "Persuasão",
  streetwise: "Manha",
  subterfuge: "Lábia",
  academics: "Acadêmicos",
  awareness: "Prontidão",
  finance: "Finanças",
  investigation: "Investigação",
  medicine: "Medicina",
  occult: "Ocultismo",
  politics: "Política",
  science: "Ciência",
  technology: "Tecnologia"
};

if (!characterId) {
  characterName.textContent = "Personagem não informado";
}

requireUser(async (user) => {
  currentUser = user;

  if (!characterId) {
    return;
  }

  await loadCharacter();
});

saveRuntimeBtn?.addEventListener("click", async () => {
  if (!character) return;

  const runtimeData = {};

  document.querySelectorAll("[data-runtime-tracker]").forEach((tracker) => {
    runtimeData[tracker.dataset.runtimeTracker] = Number(tracker.dataset.value || 0);
  });

  try {
    await updateDoc(doc(db, "characters", characterId), {
      ...runtimeData,
      updatedAt: serverTimestamp()
    });

    showToast("Alterações salvas.");
  } catch (error) {
    console.error(error);
    showToast("Não foi possível salvar.");
  }
});

rollSheetDice?.addEventListener("click", () => {
  if (!character) return;

  const attributeKey = rollAttribute.value;
  const skillKey = rollSkill.value;
  const attributeValue = Number(character.attributes?.[attributeKey] || 0);
  const skillValue = Number(character.skills?.[skillKey] || 0);
  const hunger = Number(character.hunger || 0);
  const pool = Math.max(0, attributeValue + skillValue);
  const normalDice = Math.max(0, pool - hunger);
  const result = rollVampirePool(normalDice, hunger, Number(rollDifficulty.value || 1));

  rollResult.innerHTML = `
    <strong>${attributeLabels[attributeKey]} + ${skillLabels[skillKey]}</strong><br>
    Dados normais: [${result.normal.join(", ") || "-"}]<br>
    Dados de fome: [${result.hunger.join(", ") || "-"}]<br>
    Sucessos: <strong>${result.successes}</strong> / Dificuldade ${result.difficulty}<br>
    ${result.outcome}
  `;
});

async function loadCharacter() {
  const snapshot = await getDoc(doc(db, "characters", characterId));

  if (!snapshot.exists()) {
    characterName.textContent = "Personagem não encontrado";
    return;
  }

  character = snapshot.data();

  characterPortrait.src = character.portraitUrl || "https://placehold.co/600x800/230b13/f7e8ee?text=Vampiro";
  characterName.textContent = character.name || "Sem nome";
  characterSubtitle.textContent = `${character.clan || "Clã não definido"} · ${character.concept || "Conceito não definido"}`;
  editCharacterLink.href = `ficha_vampiro_criacao.html?id=${characterId}`;

  renderTracker("hunger", character.hunger || 0, 5);
  renderTracker("humanity", character.humanity || 0, 10);
  renderTracker("healthCurrent", character.healthCurrent || 0, character.healthMax || 3);
  renderTracker("willpowerCurrent", character.willpowerCurrent || 0, character.willpowerMax || 3);

  renderOptions(rollAttribute, attributeLabels);
  renderOptions(rollSkill, skillLabels);
  renderStats(attributesView, attributeLabels, character.attributes || {});
  renderStats(skillsView, skillLabels, character.skills || {});
  renderDisciplines();
  renderStory();
}

function renderTracker(key, value, max) {
  const tracker = document.querySelector(`[data-runtime-tracker="${key}"]`);
  if (!tracker) return;

  tracker.dataset.value = value;
  tracker.innerHTML = "";

  for (let i = 1; i <= max; i++) {
    const box = document.createElement("button");
    box.type = "button";
    box.className = `tracker-box ${i <= value ? "active" : ""}`;
    box.dataset.value = i;
    box.title = `${key}: ${i}`;

    box.addEventListener("click", () => {
      const currentValue = Number(tracker.dataset.value || 0);
      const nextValue = currentValue === i ? i - 1 : i;
      renderTracker(key, nextValue, max);
    });

    tracker.appendChild(box);
  }
}

function renderOptions(select, labels) {
  select.innerHTML = "";

  Object.entries(labels).forEach(([key, label]) => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = label;
    select.appendChild(option);
  });
}

function renderStats(container, labels, values) {
  container.innerHTML = Object.entries(labels).map(([key, label]) => `
    <div class="compact-stat">
      <span>${label}</span>
      <strong>${Number(values[key] || 0)}</strong>
    </div>
  `).join("");
}

function renderDisciplines() {
  const disciplines = character.disciplines || [];

  if (!disciplines.length) {
    disciplinesView.innerHTML = "<p>Nenhuma disciplina cadastrada.</p>";
    return;
  }

  disciplinesView.innerHTML = disciplines.map((item) => `
    <span class="tag">${escapeHtml(item.name)} ${"●".repeat(Number(item.level || 0))}</span>
  `).join("");
}

function renderStory() {
  const fields = [
    ["Ambição", character.ambition],
    ["Desejo", character.desire],
    ["Convicções", character.convictions],
    ["Toques", character.touchstones],
    ["Vantagens", character.advantages],
    ["Defeitos", character.flaws],
    ["Equipamentos", character.equipment],
    ["Anotações", character.notes]
  ];

  storyView.innerHTML = fields
    .filter(([, value]) => value)
    .map(([label, value]) => `<div><strong>${label}:</strong><br>${escapeHtml(value)}</div>`)
    .join("") || "<p>Nenhuma anotação cadastrada.</p>";
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
    difficulty,
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
