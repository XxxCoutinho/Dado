import { db, requireUser, showToast } from "./auth.js";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const params = new URLSearchParams(location.search);
const characterId = params.get("id");

const form = document.getElementById("vampireSheetForm");
const formTitle = document.getElementById("formTitle");
const saveTopBtn = document.getElementById("saveCharacterTop");
const finishBtn = document.getElementById("finishBtn");
const cancelBtn = document.getElementById("cancelBtn");
const portraitInput = document.getElementById("portraitInput");
const portraitPreview = document.getElementById("portraitPreview");
const portraitUrl = document.getElementById("portraitUrl");
const portraitUploader = document.querySelector(".portrait-uploader");
const disciplinesList = document.getElementById("disciplinesList");
const addDisciplineBtn = document.getElementById("addDisciplineBtn");

let currentUser = null;
let savedId = characterId;

const attributes = [
  ["strength", "Força"],
  ["dexterity", "Destreza"],
  ["stamina", "Vigor"],
  ["charisma", "Carisma"],
  ["manipulation", "Manipulação"],
  ["composure", "Autocontrole"],
  ["intelligence", "Inteligência"],
  ["wits", "Raciocínio"],
  ["resolve", "Determinação"]
];

const skills = [
  ["athletics", "Atletismo"],
  ["brawl", "Briga"],
  ["craft", "Ofícios"],
  ["drive", "Condução"],
  ["firearms", "Armas de Fogo"],
  ["melee", "Armas Brancas"],
  ["larceny", "Ladinagem"],
  ["stealth", "Furtividade"],
  ["survival", "Sobrevivência"],
  ["animalKen", "Empatia com Animais"],
  ["etiquette", "Etiqueta"],
  ["insight", "Intuição"],
  ["intimidation", "Intimidação"],
  ["leadership", "Liderança"],
  ["performance", "Performance"],
  ["persuasion", "Persuasão"],
  ["streetwise", "Manha"],
  ["subterfuge", "Lábia"],
  ["academics", "Acadêmicos"],
  ["awareness", "Prontidão"],
  ["finance", "Finanças"],
  ["investigation", "Investigação"],
  ["medicine", "Medicina"],
  ["occult", "Ocultismo"],
  ["politics", "Política"],
  ["science", "Ciência"],
  ["technology", "Tecnologia"]
];

requireUser(async (user) => {
  currentUser = user;
  buildDotsSection("attributes", attributes, 1);
  buildDotsSection("skills", skills, 0);
  addDisciplineRow();

  if (characterId) {
    await loadCharacter(characterId);
  }
});

saveTopBtn?.addEventListener("click", () => form.requestSubmit());

finishBtn?.addEventListener("click", async () => {
  const id = await saveCharacter();

  if (id) {
    location.href = `ficha_vampiro_jogo.html?id=${id}`;
  }
});

cancelBtn?.addEventListener("click", () => {
  location.href = "personagens.html";
});

form?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const id = await saveCharacter();

  if (id) {
    showToast("Ficha salva.");
  }
});

portraitInput?.addEventListener("change", () => {
  const file = portraitInput.files?.[0];

  if (!file) {
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    portraitPreview.src = reader.result;
    portraitUrl.value = reader.result;
    portraitUploader.classList.add("has-image");
  };

  reader.readAsDataURL(file);
});

portraitUrl?.addEventListener("input", () => {
  if (portraitUrl.value.trim()) {
    portraitPreview.src = portraitUrl.value.trim();
    portraitUploader.classList.add("has-image");
  }
});

addDisciplineBtn?.addEventListener("click", () => addDisciplineRow());

function buildDotsSection(section, items, defaultValue) {
  const container = document.querySelector(`[data-dot-section="${section}"]`);
  if (!container) return;

  container.innerHTML = "";

  items.forEach(([key, label]) => {
    const row = document.createElement("div");
    row.className = "dot-row";
    row.dataset.dotKey = key;
    row.dataset.dotSection = section;
    row.dataset.value = defaultValue;

    row.innerHTML = `
      <strong>${label}</strong>
      <div class="dots">
        ${[1, 2, 3, 4, 5].map((value) => `
          <button type="button" class="dot ${value <= defaultValue ? "filled" : ""}" data-dot-value="${value}" aria-label="${label} ${value}"></button>
        `).join("")}
      </div>
    `;

    container.appendChild(row);
  });

  container.addEventListener("click", (event) => {
    const dot = event.target.closest("[data-dot-value]");
    if (!dot) return;

    const row = dot.closest(".dot-row");
    const value = Number(dot.dataset.dotValue);
    const currentValue = Number(row.dataset.value || 0);
    const nextValue = currentValue === value ? value - 1 : value;

    setDotValue(row, nextValue);
  });
}

function setDotValue(row, value) {
  row.dataset.value = value;

  row.querySelectorAll("[data-dot-value]").forEach((dot) => {
    dot.classList.toggle("filled", Number(dot.dataset.dotValue) <= value);
  });
}

function addDisciplineRow(data = {}) {
  const row = document.createElement("div");
  row.className = "dynamic-item";

  row.innerHTML = `
    <label>
      Nome
      <input data-discipline-name placeholder="Ex.: Auspícios" value="${escapeAttr(data.name || "")}" />
    </label>
    <label>
      Nível
      <input data-discipline-level type="number" min="0" max="5" value="${Number(data.level || 1)}" />
    </label>
    <button type="button" class="btn btn-small btn-ghost" data-remove-discipline>Remover</button>
  `;

  disciplinesList.appendChild(row);

  row.querySelector("[data-remove-discipline]").addEventListener("click", () => {
    row.remove();
  });
}

async function saveCharacter() {
  if (!currentUser) {
    showToast("Faça login primeiro.");
    return null;
  }

  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());

  if (!data.name?.trim()) {
    showToast("Informe o nome do personagem.");
    return null;
  }

  const character = {
    ...data,
    name: data.name.trim(),
    system: "vampiro_mascara",
    ownerId: currentUser.uid,
    ownerName: currentUser.displayName || currentUser.email || "Jogador",
    portraitUrl: portraitUrl.value.trim(),
    attributes: collectDots("attributes"),
    skills: collectDots("skills"),
    disciplines: collectDisciplines(),
    hunger: toNumber(data.hunger, 1),
    humanity: toNumber(data.humanity, 7),
    stains: toNumber(data.stains, 0),
    bloodPotency: toNumber(data.bloodPotency, 1),
    healthMax: toNumber(data.healthMax, 3),
    healthCurrent: toNumber(data.healthCurrent, 3),
    willpowerMax: toNumber(data.willpowerMax, 3),
    willpowerCurrent: toNumber(data.willpowerCurrent, 3),
    campaignIds: [],
    updatedAt: serverTimestamp()
  };

  try {
    if (savedId) {
      await setDoc(doc(db, "characters", savedId), character, { merge: true });
    } else {
      const ref = await addDoc(collection(db, "characters"), {
        ...character,
        createdAt: serverTimestamp()
      });

      savedId = ref.id;
      history.replaceState(null, "", `ficha_vampiro_criacao.html?id=${savedId}`);
    }

    return savedId;
  } catch (error) {
    console.error(error);
    showToast("Não foi possível salvar a ficha.");
    return null;
  }
}

async function loadCharacter(id) {
  const snapshot = await getDoc(doc(db, "characters", id));

  if (!snapshot.exists()) {
    showToast("Personagem não encontrado.");
    return;
  }

  const character = snapshot.data();
  formTitle.textContent = `Editar ${character.name || "personagem"}`;

  Object.entries(character).forEach(([key, value]) => {
    const field = form.elements[key];

    if (!field || typeof value === "object") {
      return;
    }

    field.value = value ?? "";
  });

  if (character.portraitUrl) {
    portraitUrl.value = character.portraitUrl;
    portraitPreview.src = character.portraitUrl;
    portraitUploader.classList.add("has-image");
  }

  setDotsFromObject("attributes", character.attributes || {});
  setDotsFromObject("skills", character.skills || {});

  disciplinesList.innerHTML = "";
  const disciplines = character.disciplines?.length ? character.disciplines : [{}];
  disciplines.forEach(addDisciplineRow);
}

function collectDots(section) {
  const result = {};

  document.querySelectorAll(`[data-dot-section="${section}"].dot-row`).forEach((row) => {
    result[row.dataset.dotKey] = Number(row.dataset.value || 0);
  });

  return result;
}

function setDotsFromObject(section, values) {
  document.querySelectorAll(`[data-dot-section="${section}"].dot-row`).forEach((row) => {
    setDotValue(row, Number(values[row.dataset.dotKey] || 0));
  });
}

function collectDisciplines() {
  return [...disciplinesList.querySelectorAll(".dynamic-item")]
    .map((row) => ({
      name: row.querySelector("[data-discipline-name]").value.trim(),
      level: toNumber(row.querySelector("[data-discipline-level]").value, 0)
    }))
    .filter((item) => item.name);
}

function toNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function escapeAttr(value = "") {
  return String(value).replace(/"/g, "&quot;");
}
