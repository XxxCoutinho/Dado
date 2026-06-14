// Configure este arquivo com as credenciais do seu projeto Firebase.
// Firebase Console > Configurações do projeto > Seus apps > SDK setup and configuration > Config.
export const firebaseConfig = {
  apiKey: "COLE_SUA_API_KEY_AQUI",
  authDomain: "COLE_SEU_AUTH_DOMAIN_AQUI",
  projectId: "COLE_SEU_PROJECT_ID_AQUI",
  storageBucket: "COLE_SEU_STORAGE_BUCKET_AQUI",
  messagingSenderId: "COLE_SEU_MESSAGING_SENDER_ID_AQUI",
  appId: "COLE_SEU_APP_ID_AQUI"
};

export function firebaseEstaConfigurado() {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    !String(firebaseConfig.apiKey).includes("COLE_") &&
    !String(firebaseConfig.projectId).includes("COLE_")
  );
}
