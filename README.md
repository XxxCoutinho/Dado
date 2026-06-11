# Ficha online - Vampiro: A Máscara

Este pacote contém páginas focadas em Vampiro: A Máscara.

## Arquivos principais

- `index.html` — página inicial.
- `login.html` — login com Google/Firebase.
- `personagens.html` — lista e criação de personagens.
- `campanhas.html` — lista e criação de campanhas.
- `campanha.html` — página individual da campanha.
- `painel_campanha.html` — painel da campanha com abas.
- `ficha_vampiro_criacao.html` — criação/edição da ficha.
- `ficha_vampiro_jogo.html` — ficha finalizada para jogar.

## Configuração Firebase

Abra `js/firebase.js` e substitua:

```js
const firebaseConfig = {
  apiKey: "COLE_SUA_API_KEY",
  authDomain: "COLE_SEU_AUTH_DOMAIN",
  projectId: "COLE_SEU_PROJECT_ID",
  storageBucket: "COLE_SEU_STORAGE_BUCKET",
  messagingSenderId: "COLE_SEU_MESSAGING_SENDER_ID",
  appId: "COLE_SEU_APP_ID"
};
```

## Coleções usadas no Firestore

```txt
characters/{characterId}
campaigns/{campaignId}
campaigns/{campaignId}/notes/{noteId}
```

Os personagens possuem `ownerId`, `campaignIds` e `system: "vampiro_mascara"`.

As campanhas possuem:
- `ownerId`
- `playerIds`
- `characterIds`
- `inviteCode`

## Como usar

1. Configure o Firebase em `js/firebase.js`.
2. Ative Authentication com Google no Firebase.
3. Crie as coleções automaticamente usando o próprio site.
4. Suba os arquivos em um servidor local ou hospedagem.

Para testar localmente, use um servidor simples:

```bash
python -m http.server 8000
```

Depois abra:

```txt
http://localhost:8000
```
