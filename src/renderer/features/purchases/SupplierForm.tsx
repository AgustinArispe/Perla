import { useState, type FormEvent } from 'react';
import type { Supplier } from '../../../shared/purchases';
import { api, errorMessage, unwrap } from '../../api';
import { Dialog } from '../../components/Dialog';

export function SupplierForm({
  supplier,
  onClose,
  onSaved,
}: {
  supplier?: Supplier | undefined;
  onClose: () => void;
  onSaved: (supplier: Supplier) => void;
}) {
  const [name, setName] = useState(supplier?.name ?? '');
  const [phone, setPhone] = useState(supplier?.phone ?? '');
  const [more, setMore] = useState(
    Boolean(supplier?.contactName || supplier?.address || supplier?.notes),
  );
  const [contactName, setContactName] = useState(supplier?.contactName ?? '');
  const [address, setAddress] = useState(supplier?.address ?? '');
  const [notes, setNotes] = useState(supplier?.notes ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const saved = unwrap(
        await api().suppliers.save({
          ...(supplier ? { id: supplier.id, expectedRevision: supplier.revision } : {}),
          name,
          phone: phone.trim() || null,
          contactName: contactName.trim() || null,
          address: address.trim() || null,
          notes: notes.trim() || null,
        }),
      );
      onSaved(saved);
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog title={supplier ? 'Editar proveedor' : 'Nuevo proveedor'} onClose={onClose} busy={busy}>
      <form className="dialog-body supplier-form" onSubmit={(event) => void submit(event)}>
        <label className="field">
          <span>Nombre</span>
          <input
            data-dialog-focus
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>Teléfono</span>
          <input value={phone} onChange={(event) => setPhone(event.target.value)} />
        </label>
        <button className="button quiet" type="button" onClick={() => setMore((value) => !value)}>
          {more ? 'Ocultar datos de contacto y notas' : 'Datos de contacto y notas'}
        </button>
        {more && (
          <div className="supplier-more">
            <label className="field">
              <span>Contacto</span>
              <input value={contactName} onChange={(event) => setContactName(event.target.value)} />
            </label>
            <label className="field">
              <span>Dirección</span>
              <input value={address} onChange={(event) => setAddress(event.target.value)} />
            </label>
            <label className="field">
              <span>Notas</span>
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} />
            </label>
          </div>
        )}
        {error && (
          <div className="alert error" role="alert">
            {error}
          </div>
        )}
        <div className="dialog-actions">
          <button className="button secondary" type="button" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button className="button primary" type="submit" disabled={busy}>
            {busy ? 'Guardando…' : 'Guardar proveedor'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
