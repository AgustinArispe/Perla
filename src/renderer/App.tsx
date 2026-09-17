import { useQuery } from '@tanstack/react-query';
import { SystemHealthResultSchema } from '../shared/contracts';

const modules = [
  ['01', 'Caja', 'Escaneo, cantidades, descuentos y cobro.'],
  ['02', 'Productos', 'Catálogo, precios y ventas por peso.'],
  ['03', 'Stock', 'Ingresos, ajustes y alertas de reposición.'],
  ['04', 'Ventas', 'Histórico y detalle de cada operación.'],
  ['05', 'Resumen', 'Ventas del mes, productos y medios de pago.'],
  ['06', 'Configuración', 'Datos del comercio y copias de seguridad.'],
];

export function App() {
  const desktop = Boolean(window.bocha);
  const status = useQuery({
    queryKey: ['system-status'],
    queryFn: async () => {
      const result = SystemHealthResultSchema.parse(await window.bocha!.system.health());
      if (!result.ok) throw new Error(result.error.message);
      return result.value;
    },
    enabled: desktop,
    retry: false,
  });
  return (
    <div className="shell">
      <header className="header">
        <div className="brand">
          <span className="brand-mark">B.</span>
          <div>
            <strong>El Bocha</strong>
            <span>Control del almacén</span>
          </div>
        </div>
        <span className="tag">Entorno de desarrollo</span>
      </header>
      <main>
        <div className="intro">
          <span className="eyebrow">EL BOCHA POS / 0.1</span>
          <h1>Todo listo para empezar.</h1>
          <p>Base del sistema preparada. Los módulos se desarrollarán por etapas.</p>
        </div>
        <section className="status" aria-label="Estado del entorno">
          <div className="status-dot" />
          <div>
            <strong>
              {!desktop
                ? 'Vista previa en navegador'
                : status.isError
                  ? 'No se pudo verificar la base de datos'
                  : status.isPending
                    ? 'Verificando los datos…'
                    : 'Base de datos conectada'}
            </strong>
            <p>
              {!desktop
                ? 'La conexión a los datos está disponible en la aplicación de escritorio.'
                : status.data
                  ? `SQLite ${status.data.sqliteVersion} · Esquema ${status.data.schemaVersion} · Datos locales`
                  : status.isError
                    ? 'Reiniciá la aplicación para verificar la conexión.'
                    : 'Preparando la aplicación local.'}
            </p>
          </div>
          <span className="tag">{desktop ? 'Escritorio' : 'Web'}</span>
        </section>
        <section className="modules" aria-label="Módulos planificados">
          {modules.map(([number, title, description]) => (
            <article key={number}>
              <span className="module-number">{number}</span>
              <h2>{title}</h2>
              <p>{description}</p>
              <span className="planned">Pendiente de desarrollo</span>
            </article>
          ))}
        </section>
      </main>
      <footer>
        El Bocha · Sistema de control interno<span>Desarrollado por Agustín Arispe</span>
      </footer>
    </div>
  );
}
