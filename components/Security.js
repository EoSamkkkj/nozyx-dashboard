'use client';

import { useEffect, useState } from 'react';
import { logout } from '@/app/actions';
import { Icon, Modal } from './ui';
import { PinPad, bioEnabled, lockNow, pinEnabled, removePin, savePin, setBio } from './Lock';
import { biometryAvailable, verifyBiometry } from './native';

export default function Security({ notify }) {
  const [on, setOn] = useState(false);
  const [creating, setCreating] = useState(false);
  const [first, setFirst] = useState('');
  const [error, setError] = useState('');

  const [bioOk, setBioOk] = useState(false);
  const [bio, setBioOn] = useState(false);
  useEffect(() => {
    setOn(pinEnabled());
    setBioOn(bioEnabled());
    biometryAvailable().then(setBioOk);
  }, []);

  async function toggleBio() {
    if (bio) { setBio(false); setBioOn(false); return notify('Digital desligada.'); }
    if (!(await verifyBiometry())) return notify('Não confirmou a digital.');
    setBio(true);
    setBioOn(true);
    notify('Pronto: o app vai abrir com a sua digital.');
  }

  const close = () => { setCreating(false); setFirst(''); setError(''); };

  async function step(pin) {
    if (!first) { setFirst(pin); setError(''); return; }
    if (pin !== first) { setFirst(''); setError('Os PINs não batem. Comece de novo.'); navigator.vibrate?.(180); return; }
    await savePin(pin);
    setOn(true);
    close();
    notify('PIN ativado. O app vai pedir o PIN ao abrir.');
  }

  return (
    <div className="card stack">
      <div className="spread">
        <h2 className="row" style={{ gap: 8 }}><Icon name="escudo" size={18} /> Segurança</h2>
        <span className={`chip ${on ? 'ok' : ''}`}>{on ? 'PIN ativo' : 'Sem PIN'}</span>
      </div>
      <p className="muted" style={{ fontSize: 14 }}>
        Bloqueio por PIN de 4 dígitos, como app de banco: pede o PIN ao abrir e quando você volta depois de 2 minutos fora. Vale só para este aparelho.
        Errou 5 vezes, o app sai da conta e pede a senha de administrador.
      </p>
      <div className="row">
        {on ? (
          <>
            <button className="btn" onClick={() => setCreating(true)}><Icon name="cadeado" size={16} /> Trocar PIN</button>
            <button className="btn" onClick={lockNow}>Bloquear agora</button>
            <button className="btn danger" onClick={() => { removePin(); setOn(false); notify('PIN removido deste aparelho.'); }}>Remover PIN</button>
          </>
        ) : (
          <button className="btn primary" onClick={() => setCreating(true)}><Icon name="cadeado" size={16} /> Criar PIN</button>
        )}
        {on && bioOk && (
          <button className={`btn ${bio ? '' : 'primary'}`} onClick={toggleBio}><Icon name="digital" size={16} /> {bio ? 'Desligar digital' : 'Abrir com digital'}</button>
        )}
        <form action={logout}><button className="btn ghost"><Icon name="sair" size={16} /> Sair deste aparelho</button></form>
      </div>

      {creating && (
        <Modal title={first ? 'Repita o PIN' : 'Crie um PIN'} sub="4 números que só você sabe" onClose={close}>
          <PinPad key={first ? 2 : 1} onDone={step} error={error} />
        </Modal>
      )}
    </div>
  );
}
