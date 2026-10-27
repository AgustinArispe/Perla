import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { FeatureFlags } from '../../../shared/features';
import {
  deliveryNoteFeatures,
  deliveryNoteLabels,
  type DeliveryNoteKind,
  type DeliveryNote,
} from '../../../shared/delivery-notes';
import { formatStock } from '../../../domain/inventory';
import { api, unwrap, errorMessage } from '../../api';
import { PerlaLoading } from '../../components/PerlaLoading';
import { PageHeading } from '../../components/PageHeader';
import { Dialog } from '../../components/Dialog';
import './delivery-notes.css';

const kinds = ['SALE', 'PURCHASE', 'TRANSFER'] as const;
const statuses = { ISSUED: 'Emitido', DELIVERED: 'Entrega confirmada', CANCELLED: 'Anulado' };
const sourceStatuses: Record<string, string> = {
  COMPLETED: 'Venta vigente',
  VOIDED: 'Origen anulado',
  IN_TRANSIT: 'En tránsito',
  RECEIVED: 'Recepción registrada',
  CANCELLED: 'Origen cancelado',
};
const date = (value: string) =>
  new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(new Date(value));

export function DeliveryNotesPage({ enabled }: { enabled: FeatureFlags }) {
  const client = useQueryClient();
  const [kind, setKind] = useState<DeliveryNoteKind | ''>('');
  const [status, setStatus] = useState<DeliveryNote['status'] | ''>('');
  const [offset, setOffset] = useState(0);
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState('');
  const available = kinds.filter((k) => enabled[deliveryNoteFeatures[k]]);
  const list = useQuery({
    queryKey: ['delivery-notes', kind, status, offset],
    queryFn: () =>
      api()
        .deliveryNotes.list({
          ...(kind ? { kind } : {}),
          ...(status ? { status } : {}),
          limit: 30,
          offset,
        })
        .then(unwrap),
  });
  async function refresh() {
    await Promise.all([
      list.refetch(),
      client.invalidateQueries({ queryKey: ['delivery-note-history-exists'] }),
    ]);
  }
  return (
    <div className="documents-workspace delivery-notes-workspace">
      <PageHeading className="page-heading">
        <div>
          <h1>Remitos</h1>
          <p>Entregas y recepciones vinculadas a tus operaciones.</p>
        </div>
        <button
          className="button primary"
          disabled={!available.length}
          onClick={() => {
            setError('');
            setCreating(true);
          }}
        >
          Nuevo remito
        </button>
      </PageHeading>
      {!available.length && (
        <p className="alert">
          La emisión está desactivada. El historial sigue disponible para el jefe.
        </p>
      )}
      <section className="document-guidance">
        <strong>Un remito acompaña una operación registrada</strong>
        <p>
          Elegí una venta, compra o traslado. Emitir el documento no vuelve a mover mercadería ni
          registra otro cobro.
        </p>
      </section>
      <section className="catalog-card document-history">
        <div className="document-section-heading">
          <h2>Documentos emitidos</h2>
          <span className="pill">{list.data?.total ?? 0} en esta consulta</span>
        </div>
        <div className="delivery-note-filters">
          <label>
            Tipo
            <select
              value={kind}
              onChange={(e) => {
                setKind(e.target.value as typeof kind);
                setOffset(0);
              }}
            >
              <option value="">Todos</option>
              {kinds.map((k) => (
                <option key={k} value={k}>
                  {deliveryNoteLabels[k]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Estado
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as typeof status);
                setOffset(0);
              }}
            >
              <option value="">Todos</option>
              {Object.entries(statuses).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button className="button secondary" onClick={() => void refresh()}>
            Actualizar
          </button>
          {(kind || status) && (
            <button
              className="button quiet"
              onClick={() => {
                setKind('');
                setStatus('');
                setOffset(0);
              }}
            >
              Limpiar filtros
            </button>
          )}
        </div>
        {(list.isError || error) && (
          <p className="alert error" role="alert">
            {error || errorMessage(list.error)}
          </p>
        )}
        {list.isPending ? (
          <PerlaLoading size="panel" label="Cargando remitos…" />
        ) : !list.data?.items.length && !list.isError ? (
          <div className="document-empty-state">
            <h2>No hay remitos para estos filtros</h2>
            <p>Emití un remito a partir de una venta, compra o traslado registrado.</p>
            {available.length > 0 && (
              <button className="button secondary" onClick={() => setCreating(true)}>
                Emitir desde una operación
              </button>
            )}
          </div>
        ) : null}
        {list.data?.items.map((note) => (
          <div className="document-list-row" key={note.id}>
            <div>
              <strong>
                Remito N.º {note.number} · {deliveryNoteLabels[note.kind]}
              </strong>
              <small>
                {note.snapshot.recipient} · {date(note.createdAt)}
              </small>
              <small>{sourceStatuses[note.sourceStatus] ?? note.sourceStatus}</small>
            </div>
            <span className={`document-status document-status-${note.status.toLowerCase()}`}>
              {statuses[note.status]}
            </span>
            <button className="button secondary" onClick={() => setSelected(note.id)}>
              Ver e imprimir
            </button>
          </div>
        ))}
        {Boolean(list.data?.total) && (
          <div className="delivery-note-filters">
            <button
              className="button secondary"
              disabled={!offset}
              onClick={() => setOffset(Math.max(0, offset - 30))}
            >
              Anterior
            </button>
            <span>
              {offset + 1}–{Math.min(offset + 30, list.data!.total)} de {list.data!.total}
            </span>
            <button
              className="button secondary"
              disabled={offset + 30 >= list.data!.total}
              onClick={() => setOffset(offset + 30)}
            >
              Siguiente
            </button>
          </div>
        )}
      </section>
      {creating && (
        <CreateNote
          available={available}
          onClose={() => setCreating(false)}
          onCreated={(note) => {
            setCreating(false);
            setSelected(note.id);
            void refresh();
          }}
        />
      )}
      {selected && (
        <NoteDetail
          id={selected}
          onClose={() => {
            setSelected(null);
            void refresh();
          }}
        />
      )}
    </div>
  );
}

function CreateNote({
  available,
  onClose,
  onCreated,
}: {
  available: DeliveryNoteKind[];
  onClose: () => void;
  onCreated: (note: DeliveryNote) => void;
}) {
  const [kind, setKind] = useState<DeliveryNoteKind>(available[0]!);
  const [number, setNumber] = useState('');
  const [sourceId, setSourceId] = useState('');
  const [recipient, setRecipient] = useState('');
  const [address, setAddress] = useState('');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [operationKey] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const sources = useQuery({
    queryKey: ['delivery-note-sources', kind, number],
    queryFn: () =>
      api()
        .deliveryNotes.sources({ kind, ...(Number(number) > 0 ? { number: Number(number) } : {}) })
        .then(unwrap),
  });
  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const result = await api().deliveryNotes.create({
        kind,
        sourceId,
        operationKey,
        recipient,
        address,
        reference,
        note,
      });
      if (!result.ok) {
        setError(result.error.message);
        setUncertain(result.error.retryable);
        return;
      }
      onCreated(result.value);
    } catch (failure) {
      setError(errorMessage(failure));
      setUncertain(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      title="Nuevo remito"
      className="document-editor-dialog"
      onClose={onClose}
      busy={busy}
      wide
    >
      <form onSubmit={(e) => void create(e)}>
        <p className="document-guidance">
          Documenta todos los artículos del origen seleccionado. El movimiento de mercadería ya
          pertenece a esa operación.
        </p>
        {error && (
          <p className="alert error" role="alert">
            {error}
          </p>
        )}
        {uncertain && (
          <p className="alert">
            Podés reintentar con estos mismos datos. Si cerrás, revisá el historial antes de emitir
            otro.
          </p>
        )}
        <fieldset disabled={busy || uncertain} className="delivery-note-form">
          <label>
            Tipo
            <select
              value={kind}
              onChange={(e) => {
                setKind(e.target.value as DeliveryNoteKind);
                setSourceId('');
                setRecipient('');
              }}
            >
              {available.map((k) => (
                <option key={k} value={k}>
                  {deliveryNoteLabels[k]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Buscar número de origen
            <input
              type="number"
              min="1"
              value={number}
              onChange={(e) => {
                setNumber(e.target.value);
                setSourceId('');
              }}
              placeholder="Últimos 30 documentos"
            />
          </label>
          <label>
            Documento de origen
            <select
              required
              value={sourceId}
              onChange={(e) => {
                setSourceId(e.target.value);
                setRecipient(sources.data?.find((s) => s.id === e.target.value)?.recipient ?? '');
              }}
            >
              <option value="">Elegí una operación</option>
              {sources.data?.map((s) => (
                <option key={s.id} value={s.id}>
                  N.º {s.number} · {s.recipient} · {date(s.date)}
                </option>
              ))}
            </select>
          </label>
          {sources.isPending && <PerlaLoading size="compact" label="Buscando documentos…" />}
          {sources.isError && <p className="alert error">{errorMessage(sources.error)}</p>}
          {!sources.isPending && !sources.isError && !sources.data?.length && (
            <p>
              No hay documentos disponibles. Los que ya tienen remito se consultan en el historial.
            </p>
          )}
          <label>
            {kind === 'PURCHASE' ? 'Proveedor / entregado por' : 'Destinatario'}
            <input
              required
              minLength={2}
              maxLength={160}
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            />
          </label>
          <details className="document-extra-options">
            <summary>Dirección y datos adicionales (opcional)</summary>
            <div className="document-extra-fields">
              <label>
                Dirección de entrega / recepción
                <input
                  maxLength={300}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </label>
              <label>
                {kind === 'PURCHASE' ? 'Número de remito del proveedor' : 'Referencia externa'}
                <input
                  maxLength={80}
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
              </label>
              <label>
                Observaciones
                <textarea maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
              </label>
            </div>
          </details>
        </fieldset>
        <div className="dialog-footer">
          <button type="button" className="button secondary" onClick={onClose} disabled={busy}>
            Cerrar
          </button>
          <button className="button primary" disabled={busy || !sourceId || !recipient.trim()}>
            {busy ? 'Emitiendo…' : uncertain ? 'Reintentar emisión' : 'Emitir remito'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

function NoteDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const query = useQuery({
    queryKey: ['delivery-note', id],
    queryFn: () => api().deliveryNotes.detail(id).then(unwrap),
    refetchOnWindowFocus: true,
  });
  const [action, setAction] = useState<'deliver' | 'cancel' | null>(null);
  const [reason, setReason] = useState('');
  const [operationKey, setOperationKey] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [retryInput, setRetryInput] = useState<
    Parameters<ReturnType<typeof api>['deliveryNotes']['deliver']>[0] | null
  >(null);
  const note = query.data;
  async function confirm(event: React.FormEvent) {
    event.preventDefault();
    if (!note || !action || busy) return;
    setBusy(true);
    setError('');
    const input = retryInput ?? {
      noteId: id,
      expectedRevision: note.revision,
      operationKey,
      reason,
    };
    try {
      const result = await api().deliveryNotes[action](input);
      if (!result.ok) {
        setError(result.error.message);
        setRetryInput(result.error.retryable ? input : null);
        return;
      }
      setAction(null);
      setRetryInput(null);
      setReason('');
      setOperationKey(crypto.randomUUID());
      await query.refetch();
    } catch (failure) {
      setError(errorMessage(failure));
      setRetryInput(input);
    } finally {
      setBusy(false);
    }
  }
  return createPortal(
    <Dialog
      title="Detalle del remito"
      onClose={onClose}
      busy={busy}
      wide
      className="receipt-dialog delivery-note-dialog"
    >
      {query.isPending && <PerlaLoading size="panel" label="Cargando remito…" />}
      {(query.isError || error) && (
        <p className="alert error no-print" role="alert">
          {error || errorMessage(query.error)}
        </p>
      )}
      {note && (
        <>
          <article className="receipt-preview receipt-a4 delivery-note-print">
            <header>
              <strong>{note.snapshot.businessName}</strong>
              <span>
                REMITO N.º {note.number} · {deliveryNoteLabels[note.kind]}
              </span>
              <span>DOCUMENTO INTERNO — NO VÁLIDO COMO FACTURA</span>
            </header>
            <p>
              {date(note.createdAt)} · Emitido por {note.actorName}
            </p>
            <p>
              <strong>{statuses[note.status]}</strong> ·{' '}
              {sourceStatuses[note.sourceStatus] ?? note.sourceStatus}
            </p>
            <p>
              Origen: {note.snapshot.origin}
              <br />
              Destino: {note.snapshot.destination}
              <br />
              {note.kind === 'PURCHASE' ? 'Proveedor' : 'Destinatario'}: {note.snapshot.recipient}
              {note.snapshot.address && (
                <>
                  <br />
                  Dirección: {note.snapshot.address}
                </>
              )}
            </p>
            <p>
              Documento de origen N.º {note.snapshot.sourceNumber} ·{' '}
              {date(note.snapshot.sourceDate)}
              {note.snapshot.reference && (
                <>
                  <br />
                  Referencia: {note.snapshot.reference}
                </>
              )}
            </p>
            {note.supersedesNumber && (
              <p>Reemplaza al remito anulado N.º {note.supersedesNumber}.</p>
            )}
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Artículo</th>
                  <th>Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {note.snapshot.items.map((item) => (
                  <tr key={item.sourceItemId}>
                    <td>{item.sku}</td>
                    <td>{item.name}</td>
                    <td>{formatStock(item.quantityBase, item.unit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {note.snapshot.note && <p>Observaciones: {note.snapshot.note}</p>}
            {note.deliveredAt && (
              <p>
                Entrega confirmada el {date(note.deliveredAt)} por {note.deliveredBy}.{' '}
                {note.deliveryReason}
              </p>
            )}
            {note.cancelledAt && (
              <p>
                ANULADO el {date(note.cancelledAt)} por {note.cancelledBy}. Motivo:{' '}
                {note.cancelReason}
              </p>
            )}
            <footer>
              <p>Recibí conforme: _____________________</p>
              <p>Aclaración / documento: _____________________</p>
              <small>Gestionado con Perla</small>
            </footer>
          </article>
          <div className="no-print">
            <p>
              Este remito documenta la operación de origen. Su emisión o anulación no modifica
              existencias, cobros ni saldos.
            </p>
            {note.kind !== 'SALE' && (
              <p>
                La recepción se registra y consulta en{' '}
                {note.kind === 'TRANSFER' ? 'Ubicaciones y traslados' : 'Compras'}.
              </p>
            )}
            {action && (
              <form onSubmit={(e) => void confirm(e)}>
                <p>
                  {action === 'cancel'
                    ? 'Se anula solamente el documento. Para revertir mercadería, usá la operación de origen.'
                    : 'Indicá quién recibió y cualquier observación de la entrega.'}
                </p>
                <label>
                  {action === 'cancel' ? 'Motivo de anulación' : 'Recibido por / constancia'}
                  <input
                    required
                    minLength={3}
                    maxLength={240}
                    value={reason}
                    disabled={busy || Boolean(retryInput)}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </label>
                <button className="button primary" disabled={busy}>
                  {busy ? 'Guardando…' : retryInput ? 'Reintentar confirmación' : 'Confirmar'}
                </button>
                <button
                  type="button"
                  className="button secondary"
                  disabled={busy || Boolean(retryInput)}
                  onClick={() => setAction(null)}
                >
                  Volver
                </button>
              </form>
            )}
          </div>
          <div className="dialog-footer no-print">
            <button className="button secondary" disabled={busy} onClick={onClose}>
              Cerrar
            </button>
            <button
              className="button secondary"
              disabled={busy || query.isFetching}
              onClick={() => window.print()}
            >
              Imprimir / guardar PDF
            </button>
            {!action && note.status !== 'CANCELLED' && (
              <>
                <button
                  className="button secondary"
                  onClick={() => {
                    setError('');
                    setAction('cancel');
                  }}
                >
                  Anular documento
                </button>
                {note.kind === 'SALE' &&
                  note.status === 'ISSUED' &&
                  note.sourceStatus === 'COMPLETED' && (
                    <button
                      className="button primary"
                      onClick={() => {
                        setError('');
                        setAction('deliver');
                      }}
                    >
                      Confirmar entrega
                    </button>
                  )}
              </>
            )}
          </div>
        </>
      )}
    </Dialog>,
    document.body,
  );
}
