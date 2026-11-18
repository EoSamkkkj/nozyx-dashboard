'use client';

// Ponte com o app Android nativo (Capacitor). No navegador, nada disso roda.
export const isNative = () => typeof window !== 'undefined' && Boolean(window.Capacitor?.isNativePlatform?.());
const plugin = (name) => window.Capacitor?.Plugins?.[name];

function deviceName() {
  return 'App Android';
}

/** Liga as notificações nativas: pede permissão, registra no Firebase e manda o token ao servidor. */
export async function startNativePush({ onMessage, ask = true } = {}) {
  const Push = plugin('PushNotifications');
  if (!isNative() || !Push) return 'indisponivel';
  if (!window.__nzPushListeners) {
    window.__nzPushListeners = true;
    Push.createChannel?.({ id: 'vendas', name: 'Vendas e pagamentos', description: 'Avisos de venda aprovada e pagamento recebido', importance: 5, visibility: 1, vibration: true, lights: true, lightColor: '#4A98FF' }).catch(() => {});
    Push.addListener('registration', ({ value }) => {
      window.__nzPushToken = value;
      fetch('/api/push', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'subscribe-native', token: value, device: deviceName() }) }).catch(() => {});
      window.dispatchEvent(new Event('nz-push'));
    });
    Push.addListener('registrationError', (e) => console.error('[push nativo]', e?.error));
    Push.addListener('pushNotificationReceived', (n) => window.__nzOnPush?.(n));
    Push.addListener('pushNotificationActionPerformed', ({ notification }) => {
      const url = notification?.data?.url;
      if (url && url.startsWith('/')) window.location.href = url;
    });
  }
  if (onMessage) window.__nzOnPush = onMessage;
  let perm = await Push.checkPermissions();
  if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') {
    if (!ask) return 'pendente';
    perm = await Push.requestPermissions();
  }
  if (perm.receive !== 'granted') return 'negada';
  await Push.register();
  return 'ativa';
}

export const nativePushToken = () => window.__nzPushToken || null;

/** Digital / rosto do próprio Android. */
export async function biometryAvailable() {
  const B = plugin('NativeBiometric');
  if (!isNative() || !B) return false;
  try {
    const r = await B.isAvailable({ useFallback: false });
    return Boolean(r?.isAvailable);
  } catch {
    return false;
  }
}

export async function verifyBiometry() {
  const B = plugin('NativeBiometric');
  if (!B) return false;
  try {
    await B.verifyIdentity({ reason: 'Desbloquear o painel', title: 'Nozyx', subtitle: 'Use sua digital para abrir o painel', negativeButtonText: 'Usar PIN' });
    return true;
  } catch {
    return false;
  }
}
