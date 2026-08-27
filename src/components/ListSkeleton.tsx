// Placeholder de carregamento pra listas em formato .list-row — evita o
// "Carregando..." em texto puro enquanto os dados reais não chegam.
export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="list-row">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="skeleton skeleton-line w-60" />
            <div className="skeleton skeleton-line sm w-40" style={{ marginTop: 9 }} />
          </div>
          <div className="skeleton skeleton-block" style={{ width: 86, height: 32, flexShrink: 0 }} />
        </div>
      ))}
    </div>
  )
}
