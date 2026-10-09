import { useState } from 'react';
import { Icon } from '../../components/Icon';
import { PurchaseDraft } from './PurchaseDraft';
import { PurchaseHistory } from './PurchaseHistory';
import { SupplierList } from './SupplierList';

export function PurchaseWorkspace({
  initialView = 'receive',
  embedded = false,
  historyOnly = false,
  lotsEnabled = false,
  accountsEnabled = false,
}: {
  embedded?: boolean;
  initialView?: 'receive' | 'history' | 'suppliers';
  historyOnly?: boolean;
  lotsEnabled?: boolean;
  accountsEnabled?: boolean;
}) {
  const [view, setView] = useState(initialView);
  return (
    <>
      <div className="page-heading purchase-page-heading">
        <div>
          <h1>Compras</h1>
        </div>
        {!embedded && (
          <div className="purchase-tabs" role="tablist" aria-label="Secciones de compras">
            {!historyOnly && (
              <button
                className={view === 'receive' ? 'active' : ''}
                onClick={() => setView('receive')}
              >
                <Icon name="plus" size={18} /> Recibir
              </button>
            )}
            <button
              className={view === 'history' ? 'active' : ''}
              onClick={() => setView('history')}
            >
              <Icon name="history" size={18} /> Historial
            </button>
            {!historyOnly && (
              <button
                className={view === 'suppliers' ? 'active' : ''}
                onClick={() => setView('suppliers')}
              >
                <Icon name="users" size={18} /> Proveedores
              </button>
            )}
          </div>
        )}
      </div>
      {view === 'receive' ? (
        <PurchaseDraft lotsEnabled={lotsEnabled} />
      ) : view === 'history' ? (
        <PurchaseHistory accountsEnabled={accountsEnabled} />
      ) : (
        <SupplierList accountsEnabled={accountsEnabled} />
      )}
    </>
  );
}
