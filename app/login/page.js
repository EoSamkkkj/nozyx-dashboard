import { redirect } from 'next/navigation';
import { isAuthed } from '@/lib/auth';
import Logo from '@/components/Logo';
import LoginForm from '@/components/LoginForm';

export const dynamic = 'force-dynamic';

export default async function Login({ searchParams }) {
  if (await isAuthed()) redirect('/');
  const { erro, resta, min } = await searchParams;
  const semSenha = !process.env.ADMIN_PASSWORD;
  let msg = '';
  if (semSenha) msg = 'Falta configurar a variável ADMIN_PASSWORD na Vercel.';
  else if (erro === 'senha') msg = `Senha incorreta.${Number(resta) > 0 ? ` Restam ${resta} tentativa${resta > 1 ? 's' : ''}.` : ''}`;
  else if (erro === 'bloqueio') msg = `Muitas tentativas erradas. Acesso bloqueado por ${min || 15} min.`;

  return (
    <main className="login-wrap">
      <div className="login-glow" aria-hidden="true" />
      <div className="login">
        <div className="login-logo"><Logo size={40} /></div>
        <span className="eyebrow">Nozyx · Área do administrador</span>
        <h1>Painel financeiro</h1>
        <p className="muted">Entre com a sua senha para ver vendas, recebimentos e metas.</p>
        {msg && <p className="alert">{msg}</p>}
        <LoginForm disabled={semSenha || erro === 'bloqueio'} />
        <p className="login-foot"><span className="dot-ok" /> Conexão protegida · acesso só do administrador</p>
      </div>
    </main>
  );
}
