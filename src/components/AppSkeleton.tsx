/**
 * Shape of the worklog card while the saved settings (and so the language) load. Only language-neutral text (the
 * product name, the entry number) is real; everything translatable is a placeholder, so the language never flips.
 */
export function AppSkeleton() {
    const field = (col: string) => (
        <div className={col}>
            <span className="placeholder col-4 mb-2" />
            <span className="placeholder skeleton-field" />
        </div>
    )
    return (
        <div className="card placeholder-glow" aria-busy="true">
            <div className="card-header">
                <h2 className="card-title strong">VelociTempo</h2>
                <div className="card-actions">
                    <span className="btn disabled placeholder" style={{ width: '5.5rem' }} />
                </div>
            </div>
            <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="text-secondary fw-medium">#1</span>
                    <span className="btn disabled placeholder" style={{ width: '4.5rem' }} />
                </div>
                <div className="row g-3">
                    {field('col-sm-6 col-md-3')}
                    {field('col-sm-6 col-md-5')}
                    {field('col-md-4')}
                    {field('col-12')}
                    {field('col-6 col-md-3')}
                    {field('col-6 col-md-3')}
                    {field('col-sm-8 col-md-4')}
                    {field('col-sm-4 col-md-2')}
                </div>
            </div>
            <div className="card-footer d-flex align-items-center justify-content-between">
                <span className="placeholder col-3" />
                <span className="btn btn-primary disabled placeholder" style={{ width: '5rem' }} />
            </div>
        </div>
    )
}
