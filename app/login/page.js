import { redirect } from 'next/navigation';
import { login } from '../actions';
import { isAuthed } from '@/lib/auth';
import Logo from '@/components/Logo';

export const dynamic = 'force-dynamic';

export default async function Login({ searchParams }) {
  if (await isAuthed()) redirect('/');
  const { erro } = await searchParams;
  const semSenha = !process.env.ADMIN_PASSWORD;
  return (
    <main className="login-wrap">
      <div className="card login">
        <Logo size={44} />
        <h1>Painel financeiro</h1>
        <p className="muted">Área privada. Digite sua senha para entrar.</p>
        {semSenha && <p className="alert">Falta configurar a variável <b>ADMIN_PASSWORD</b> na Vercel.</p>}
        {erro === 'senha' && <p className="alert">Senha errada. Tente de novo.</p>}
        <form action={login} className="stack">
          <input type="password" name="senha" placeholder="Senha" autoComplete="current-password" required autoFocus />
          <button className="btn primary">Entrar</button>
        </form>
      </div>
    </main>
  );
}
