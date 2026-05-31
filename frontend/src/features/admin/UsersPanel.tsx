import { useState, type FormEvent, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { KeyRound, Trash2, UserPlus, X } from 'lucide-react';

import { BracketBox } from '@/components/BracketBox';
import { useAuthStore } from '@/features/auth/auth-store';
import type { Role } from '@/features/auth/types';
import {
  useAdminUsers,
  useCreateUser,
  useDeleteUser,
  useResetPassword,
  useUpdateUser,
} from './use-admin';
import { PasswordRevealCard } from './PasswordRevealCard';

const inputClass =
  'w-full border border-ink-700 bg-ink-900/60 px-3 py-2 text-slate-100 focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 transition font-mono text-sm';

export function UsersPanel(): JSX.Element {
  const me = useAuthStore((s) => s.user);
  const users = useAdminUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const resetPassword = useResetPassword();

  const [showForm, setShowForm] = useState(false);
  const [revealedPassword, setRevealedPassword] = useState<{ email: string; password: string } | null>(null);

  const onCreate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const input = {
      email: String(form.get('email')),
      name: String(form.get('name')),
      role: String(form.get('role')) as Role,
    };
    const result = await createUser.mutateAsync(input);
    setRevealedPassword({ email: result.user.email, password: result.password });
    setShowForm(false);
    e.currentTarget.reset();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500 tabular-nums">
          {users.data ? `${String(users.data.length).padStart(2, '0')} utilisateurs enregistrés` : 'sync…'}
        </p>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="btn-primary text-xs uppercase tracking-widest font-mono"
        >
          {showForm ? <X size={12} /> : <UserPlus size={12} />}
          {showForm ? 'Annuler' : 'Nouvel utilisateur'}
        </button>
      </div>

      {showForm && (
        <BracketBox className="border border-ink-700 bg-ink-900/40 p-5">
          <motion.form
            onSubmit={onCreate}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-4"
          >
            <div className="grid sm:grid-cols-3 gap-3">
              <FormField label="Email">
                <input name="email" type="email" required className={inputClass} />
              </FormField>
              <FormField label="Nom">
                <input name="name" type="text" required className={inputClass} />
              </FormField>
              <FormField label="Rôle">
                <select name="role" defaultValue="USER" required className={inputClass}>
                  <option value="USER">USER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </FormField>
            </div>
            {createUser.isError && (
              <p className="font-mono text-xs text-signal-bad">
                {createUser.error?.status === 409
                  ? '✕ email déjà utilisé'
                  : '✕ erreur lors de la création'}
              </p>
            )}
            <button
              type="submit"
              disabled={createUser.isPending}
              className="btn-primary text-xs uppercase tracking-widest font-mono"
            >
              {createUser.isPending ? 'création…' : 'Créer + générer mot de passe'}
            </button>
          </motion.form>
        </BracketBox>
      )}

      {revealedPassword && (
        <PasswordRevealCard
          email={revealedPassword.email}
          password={revealedPassword.password}
          onClose={() => setRevealedPassword(null)}
        />
      )}

      {users.data && (
        <div className="border border-ink-700 bg-ink-900/40 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-ink-900/80 border-b border-ink-700">
              <tr className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
                <th className="text-left px-4 py-3 font-medium">Email</th>
                <th className="text-left px-4 py-3 font-medium">Nom</th>
                <th className="text-left px-4 py-3 font-medium">Rôle</th>
                <th className="text-left px-4 py-3 font-medium">Accès</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-700/60">
              {users.data.map((u, i) => {
                const isSelf = u.id === me?.id;
                return (
                  <tr key={u.id} className="hover:bg-ink-900/60 transition">
                    <td className="px-4 py-3 font-mono text-xs">
                      <span className="text-slate-600 mr-2 tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                      <span className="text-slate-200">{u.email}</span>
                      {isSelf && <span className="ml-2 text-accent text-[10px] uppercase tracking-widest">[vous]</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-200">{u.name}</td>
                    <td className="px-4 py-3">
                      <select
                        value={u.role}
                        disabled={isSelf || updateUser.isPending}
                        onChange={(e) => updateUser.mutate({ id: u.id, role: e.target.value as Role })}
                        className="border border-ink-700 bg-ink-900/60 px-2 py-1 text-xs font-mono disabled:opacity-50 focus:border-accent focus:outline-none"
                      >
                        <option value="USER">USER</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400 tabular-nums">
                      {u.role === 'ADMIN' ? <span className="text-accent">tous</span> : `${String(u.accessCount).padStart(2, '0')} dashboard${u.accessCount !== 1 ? 's' : ''}`}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <button
                          onClick={async () => {
                            const result = await resetPassword.mutateAsync(u.id);
                            setRevealedPassword({ email: u.email, password: result.password });
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-mono uppercase tracking-widest text-slate-500 hover:text-accent hover:bg-accent/10 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                          title="Réinitialiser le mot de passe"
                        >
                          <KeyRound size={11} />
                          reset
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Supprimer ${u.email} ?`)) deleteUser.mutate(u.id);
                          }}
                          disabled={isSelf}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-mono uppercase tracking-widest text-slate-500 hover:text-signal-bad hover:bg-signal-bad/10 transition disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                          title={isSelf ? 'Impossible de se supprimer soi-même' : 'Supprimer'}
                        >
                          <Trash2 size={11} />
                          del
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block font-mono text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">
        {label}
      </span>
      {children}
    </label>
  );
}
