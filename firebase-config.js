// Configuração do Firebase do projeto DADO.
// Este arquivo é usado por login.html e campanha.html.
//
// Importante: este projeto usa Firebase pelo navegador via CDN.
// Por isso, este arquivo deve EXPORTAR apenas a configuração,
// sem usar imports do tipo "firebase/app" do npm.

export const firebaseConfig = {
  apiKey: "AIzaSyDnHSWDVyknhU0V4JwIOLiSlEX2U2T3Hu8",
  authDomain: "dado-1d5f1.firebaseapp.com",
  projectId: "dado-1d5f1",
  storageBucket: "dado-1d5f1.firebasestorage.app",
  messagingSenderId: "401639555884",
  appId: "1:401639555884:web:955de92edaff9738832289",
  measurementId: "G-2G84QZ4V21"
};

export function firebaseEstaConfigurado() {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId &&
    !String(firebaseConfig.apiKey).includes("COLE_") &&
    !String(firebaseConfig.projectId).includes("COLE_")
  );
}
