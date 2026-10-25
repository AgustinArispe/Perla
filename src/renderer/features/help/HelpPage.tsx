import { PageHeading } from '../../components/PageHeader';
import { useState } from 'react';
import type { Role } from '../../../shared/auth';
import { normalizeHelpSearch } from './search';
import { searchHelpTopics } from './topics';
import './help.css';
export { helpTopics } from './topics';

export function HelpPage({ role }: { role: Role }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState('caja');
  const query = normalizeHelpSearch(search).trim();
  const topics = searchHelpTopics(role, query);
  const activeTopic = topics.find((topic) => topic.id === selected) ?? topics[0];
  return (
    <div className="admin-workspace help-workspace">
      <PageHeading className="page-heading">
        <div>
          <h1>Ayuda</h1>
          <p>
            Guías de trabajo y respuestas según tu perfil. Los módulos opcionales se habilitan desde
            Configuración.
          </p>
        </div>
      </PageHeading>
      <section className="panel help-page">
        <label className="field">
          Buscar en la ayuda
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Orden para caja, remitos, stock, backups…"
          />
        </label>
        <div className="help-search-summary" role="status" aria-live="polite">
          <span>
            {topics.length} {topics.length === 1 ? 'tema disponible' : 'temas disponibles'}
            {search.trim() ? ' para tu búsqueda' : ''}
          </span>
          {search.trim() && topics.length > 0 && (
            <button className="button secondary small" onClick={() => setSearch('')}>
              Limpiar búsqueda
            </button>
          )}
        </div>
        <nav className="help-index" aria-label="Temas de ayuda">
          {topics.map((t) => (
            <button
              type="button"
              className={activeTopic?.id === t.id ? 'selected' : ''}
              aria-pressed={activeTopic?.id === t.id}
              onClick={() => setSelected(t.id)}
              key={t.id}
            >
              {t.title}
            </button>
          ))}
        </nav>
        {!topics.length && (
          <div className="admin-empty" role="status">
            <p>No hay temas para esa búsqueda. Probá con otra palabra o volvé a todos los temas.</p>
            <button className="button secondary small" onClick={() => setSearch('')}>
              Limpiar búsqueda
            </button>
          </div>
        )}
        {activeTopic && (
          <article id={`ayuda-${activeTopic.id}`}>
            <h2>{activeTopic.title}</h2>
            {activeTopic.sections.map((s) => (
              <section key={s.title}>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </section>
            ))}
          </article>
        )}
      </section>
    </div>
  );
}
