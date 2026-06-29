interface ErrorStateProps {
  error: Error
  retryable: boolean
  onRetry: () => void
}

export function ErrorState({ error, retryable, onRetry }: ErrorStateProps) {
  return (
    <div className="pf-container">
      <div className="pf-error-state">
        <div className="pf-error-icon" aria-hidden="true">⚠️</div>
        <h2 className="pf-error-title">Something went wrong</h2>
        <p className="pf-error-message">{error.message}</p>
        {retryable && (
          <button className="pf-btn" onClick={onRetry}>
            Try again
          </button>
        )}
      </div>
    </div>
  )
}
