'use client';

import { useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { login } from '@/app/actions';
import { Icon } from './ui';

function Submit({ disabled }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn primary block lg" disabled={disabled || pending}>
      {pending ? <span className="spin" /> : <Icon name="cadeado" size={17} />} {pending ? 'Entrando…' : 'Entrar no painel'}
    </button>
  );
}

/**
 * O campo da senha não é um "password" comum: assim o Chrome não abre o
 * gerenciador de senhas do Google nem pede digital por cima do app.
 */
export default function LoginForm({ disabled }) {
  const [show, setShow] = useState(false);
  const [masked, setMasked] = useState(true); // navegador sabe esconder texto sem type=password?
  useEffect(() => {
    setMasked(typeof CSS !== 'undefined' && CSS.supports('-webkit-text-security', 'disc'));
  }, []);
  const type = masked || show ? 'text' : 'password';

  return (
    <form action={login} className="stack" autoComplete="off">
      <div className="pass">
        <input
          type={type}
          name="codigo"
          className={masked && !show ? 'secret' : ''}
          placeholder="Sua senha"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          data-lpignore="true"
          data-form-type="other"
          required
          autoFocus
          disabled={disabled}
        />
        <button type="button" className="eye" onClick={() => setShow((v) => !v)} aria-label={show ? 'Esconder senha' : 'Mostrar senha'}>
          <Icon name={show ? 'olhoOff' : 'olho'} size={18} />
        </button>
      </div>
      <label className="check">
        <input type="checkbox" name="lembrar" defaultChecked />
        <span className="box" />
        <span>
          Manter conectado neste aparelho
          <small>Fica 90 dias sem pedir a senha. Desmarque em aparelho que não é seu.</small>
        </span>
      </label>
      <Submit disabled={disabled} />
    </form>
  );
}
