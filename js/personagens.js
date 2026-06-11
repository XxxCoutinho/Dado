import { db, requireUser, showToast } from "./auth.js";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const list = document.getElementById("charactersList");

requireUser(async (user) => {
  await loadCharacters(user);
});

async function loadCharacters(user) {
  list.innerHTML = '<div class="empty-state">Carregando personagens...</div>';

  try {
    const charactersQuery = query(
      collection(db, "characters"),
      where("ownerId", "==", user.uid),
      where("system", "==", "vampiro_mascara"),
      orderBy("updatedAt", "desc")
    );

    const snapshot = await getDocs(charactersQuery);

    if (snapshot.empty) {
      list.innerHTML = `
        <div class="empty-state">
          Nenhum personagem criado. Clique em "Criar personagem".
        </div>
      `;
      return;
    }

    list.innerHTML = "";

    snapshot.forEach((item) => {
      const character = item.data();
      const card = document.createElement("article");
      card.className = "character-card";

      const portrait = character.portraitUrl || "https://placehold.co/600x800/230b13/f7e8ee?text=Vampiro";

      card.innerHTML = `
        <img src="${escapeHtml(portrait)}" alt="Imagem de ${escapeHtml(character.name || "personagem")}" />
        <h2>${escapeHtml(character.name || "Sem nome")}</h2>
        <div class="card-meta">
          ${escapeHtml(character.clan || "Clã não definido")} ·
          ${escapeHtml(character.concept || "Conceito não definido")}
        </div>
        <div class="card-actions">
          <a class="btn btn-small" href="ficha_vampiro_jogo.html?id=${item.id}">Acessar ficha</a>
          <a class="btn btn-small btn-secondary" href="ficha_vampiro_criacao.html?id=${item.id}">Editar</a>
          <button class="btn btn-small btn-danger" data-delete-character="${item.id}">Excluir</button>
        </div>
      `;

      list.appendChild(card);
    });
  } catch (error) {
    console.error(error);
    list.innerHTML = '<div class="empty-state">Erro ao carregar personagens.</div>';
  }
}

document.addEventListener("click", async (event) => {
  const deleteBtn = event.target.closest("[data-delete-character]");

  if (!deleteBtn) {
    return;
  }

  const id = deleteBtn.dataset.deleteCharacter;
  const confirmed = confirm("Excluir este personagem? Essa ação não pode ser desfeita.");

  if (!confirmed) {
    return;
  }

  try {
    await deleteDoc(doc(db, "characters", id));
    showToast("Personagem excluído.");
    location.reload();
  } catch (error) {
    console.error(error);
    showToast("Não foi possível excluir.");
  }
});

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}
