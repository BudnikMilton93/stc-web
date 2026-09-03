// Grilla generica para listados de ABM: cada pagina solo declara columnas
// (header, ancho, como renderizar la celda) y filas. El ancho de columnas se
// pasa como variable CSS --dg-columns, que hereda a .data-grid-head y a cada
// .data-grid-row (ver index.css) - asi no hace falta una clase por pagina
// para fijar grid-template-columns, y el media query mobile (que resetea
// grid-template-columns a 1fr) sigue pisando esta variable sin problema.
export function DataGrid({ columns, rows, getRowKey = (row) => row.id, ariaLabel, emptyMessage }) {
  if (!rows || rows.length === 0) {
    return <p className="muted-text">{emptyMessage}</p>
  }

  const dgColumns = columns.map((column) => column.width ?? 'minmax(120px, 1fr)').join(' ')

  return (
    <div className="data-grid-shell compact-shell">
      <div
        className="data-grid-table"
        role="table"
        aria-label={ariaLabel}
        style={{ '--dg-columns': dgColumns }}
      >
        <div className="data-grid-head" role="row">
          {columns.map((column) => (
            <span
              key={column.key}
              role="columnheader"
              style={column.align === 'center' ? { textAlign: 'center' } : undefined}
            >
              {column.header}
            </span>
          ))}
        </div>

        {rows.map((row) => (
          <article className="data-grid-row" role="row" key={getRowKey(row)}>
            {columns.map((column) => (
              <div
                key={column.key}
                className={[
                  'data-grid-cell',
                  column.primary ? 'data-grid-primary' : '',
                  column.actions ? 'data-grid-actions' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                role="cell"
                data-label={column.header}
                style={
                  column.align === 'center' ? { justifyContent: 'center', justifyItems: 'center' } : undefined
                }
              >
                {column.render(row)}
              </div>
            ))}
          </article>
        ))}
      </div>
    </div>
  )
}
