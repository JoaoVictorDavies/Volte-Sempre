import OneSignal from 'react-onesignal';

export default async function runOneSignal() {
  await OneSignal.init({ appId: 'MINHA_APP_ID_DO_ONESIGNAL', allowLocalhostAsSecureOrigin: true});
  OneSignal.Slidedown.promptPush();
}