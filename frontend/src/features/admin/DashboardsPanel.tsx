import { useState, type FormEvent, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Pencil, Plus, Trash2, X } from 'lucide-react';

import { BracketBox } from '@/components/BracketBox';
import type { DashboardSummary } from '@/features/dashboards/types';
import {
  useAdminDashboards,
  useCreateDashboard,
  useDeleteDashboard,
  useUpdateDashboard,
} from './use-admin';

const inputClass =
  'w-full border border-ink-700 bg-ink-900/60 px-3 py-2 text-slate-100 focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 transition text-sm';

export function DashboardsPanel(): JSX.Element {
  const dashboards = useAdminDashboards();
  const createDashboard = useCreateDashboard();
  const updateDashboard = useUpdateDashboard();
  const deleteDashboard = useDeleteDashboard();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<DashboardSummary | null>(null);

  const onCreate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await createDashboard.mutateAsync({
      slug: String(form.get('slug')),
      title: String(form.get('title')),
      description: String(form.get('description') ?? '') || undefined,
      category: String(form.get('category') ?? '') || undefined,
    });
    setShowForm(false);
    e.currentTarget.reset();
  };

  const onUpdate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editing) return;
    const form = new FormData(e.currentTarget);
    await updateDashboard.mutateAsync({
      id: editing.id,
      slug: String(form.get('slug')),
      title: String(form.get('title')),
      description: String(form.get('description') ?? '') || undefined,
      category: String(form.get('category') ?? '') || undefined,
    });
    setEditing(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500 tabular-nums">
          {dashboards.data ? `${String(dashboards.data.length).padStart(2, '0')} dashboards enregistrés` : 'sync…'}
        </p>
        <button
          onClick={() => {
            setShowForm((v) => !v);
            setEditing(null);
          }}
          className="btn-primary text-xs uppercase tracking-widest font-mono"
        >
          {showForm ? <X size={12} /> : <Plus size={12} />}
          {showForm ? 'Annuler' : 'Nouveau dashboard'}
        </button>
      </div>

      {showForm && (
        <DashboardForm
          onSubmit={onCreate}
          isPending={createDashboard.isPending}
          error={createDashboard.error?.status === 409 ? '✕ slug déjà utilisé' : null}
          submitLabel="Créer"
        />
      )}

      {editing && (
        <DashboardForm
          key={editing.id}
          initial={editing}
          onSubmit={onUpdate}
          isPending={updateDashboard.isPending}
          error={updateDashboard.error?.status === 409 ? '✕ slug déjà utilisé' : null}
          submitLabel="Enregistrer"
          onCancel={() => setEditing(null)}
        />
      )}

      {dashboards.data && (
        <div className="border border-ink-700 bg-ink-900/40 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-ink-900/80 border-b border-ink-700">
              <tr className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
                <th className="text-left px-4 py-3 font-medium">Titre</th>
                <th className="text-left px-4 py-3 font-medium">Slug</th>
                <th className="text-left px-4 py-3 font-medium">Catégorie</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-700/60">
              {dashboards.data.map((d, i) => (
                <tr key={d.id} className="hover:bg-ink-900/60 transition">
                  <td className="px-4 py-3 text-slate-200">
                    <span className="text-slate-600 mr-2 font-mono tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                    {d.title}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{d.slug}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{d.category ?? '-'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <button
                        onClick={() => {
                          setEditing(d);
                          setShowForm(false);
                        }}
                        className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-mono uppercase tracking-widest text-slate-500 hover:text-accent hover:bg-accent/10 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      >
                        <Pencil size={11} />
                        edit
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Supprimer "${d.title}" ? Les accès associés seront révoqués.`)) {
                            deleteDashboard.mutate(d.id);
                          }
                        }}
                        className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-mono uppercase tracking-widest text-slate-500 hover:text-signal-bad hover:bg-signal-bad/10 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      >
                        <Trash2 size={11} />
                        del
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

interface DashboardFormProps {
  initial?: DashboardSummary;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  isPending: boolean;
  error?: string | null;
  submitLabel: string;
  onCancel?: () => void;
}

function DashboardForm({ initial, onSubmit, isPending, error, submitLabel, onCancel }: DashboardFormProps): JSX.Element {
  return (
    <BracketBox className="border border-ink-700 bg-ink-900/40 p-5">
      <motion.form
        onSubmit={onSubmit}
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        className="space-y-4"
      >
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Titre">
            <input name="title" required maxLength={120} defaultValue={initial?.title ?? ''} className={inputClass} />
          </Field>
          <Field label="Slug (kebab-case)">
            <input
              name="slug"
              required
              pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
              maxLength={80}
              defaultValue={initial?.slug ?? ''}
              className={`${inputClass} font-mono`}
            />
          </Field>
          <Field label="Catégorie">
            <input name="category" maxLength={80} defaultValue={initial?.category ?? ''} className={inputClass} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Description">
              <textarea
                name="description"
                maxLength={500}
                rows={2}
                defaultValue={initial?.description ?? ''}
                className={inputClass}
              />
            </Field>
          </div>
        </div>
        {error && <p className="font-mono text-xs text-signal-bad">{error}</p>}
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={isPending}
            className="btn-primary text-xs uppercase tracking-widest font-mono"
          >
            {isPending ? 'enregistrement…' : submitLabel}
          </button>
          {onCancel && (
            <button type="button" onClick={onCancel} className="btn-ghost text-xs uppercase tracking-widest font-mono">
              Annuler
            </button>
          )}
        </div>
      </motion.form>
    </BracketBox>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }): JSX.Element {
  return (
    <label className="block">
      <span className="block font-mono text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">{label}</span>
      {children}
    </label>
  );
}
