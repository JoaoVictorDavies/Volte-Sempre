import OneSignal from 'react-onesignal';

export default async function runOneSignal() {
  const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;

  if (!appId) {
    console.error("OneSignal App ID não encontrado!");
    return;
  }

  await OneSignal.init({ 
    appId: appId, 
    allowLocalhostAsSecureOrigin: true
  });
  
  // Isso faz a caixinha de permissão descer do topo da tela
  OneSignal.Slidedown.promptPush();
}