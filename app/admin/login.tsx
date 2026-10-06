'use client';
import Link from 'next/link';
import { useState } from 'react';
export default function Login() {
  const [password, setPassword] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  return (
    <main className="crm-denied">
      <h1>Вход в CRM</h1>
      <p>Рабочее пространство владельца Facade Kazakhstan.</p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          setBusy(true);
          setError('');
          try {
            const r = await fetch('/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ password }),
            });
            const d = await r.json();
            if (!r.ok) throw Error(d.error);
            window.location.assign(
              window.location.pathname + window.location.search,
            );
          } catch (e) {
            setError((e as Error).message);
            setBusy(false);
          }
        }}
      >
        <label htmlFor="admin-password">Пароль владельца</label>
        <input
          id="admin-password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            display: 'block',
            border: '1px solid #b7c8d4',
            padding: '12px',
            margin: '12px 0',
            fontSize: '16px',
            maxWidth: '100%',
          }}
        />
        <button className="button" disabled={busy}>
          {busy ? 'Входим…' : 'Войти'}
        </button>
        {error && <p role="alert">{error}</p>}
      </form>
      <Link href="/">Вернуться на сайт</Link>
    </main>
  );
}
