export function LoadingSkeleton() {
  return (
    <div className="pf-container" aria-busy="true" aria-label="Loading...">
      <div className="pf-header">
        <div className="pf-skeleton" style={{ height: 28, width: '60%', marginBottom: 8 }} />
        <div className="pf-skeleton" style={{ height: 18, width: '80%' }} />
      </div>
      <div className="pf-fields">
        {[1, 2, 3].map((i) => (
          <div key={i} className="pf-field-wrapper">
            <div className="pf-skeleton" style={{ height: 16, width: '30%', marginBottom: 6 }} />
            <div className="pf-skeleton" style={{ height: 44 }} />
          </div>
        ))}
      </div>
      <div className="pf-skeleton" style={{ height: 48, marginTop: 8 }} />
    </div>
  )
}
