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
    // Date / Type / Work location / ORWH: a label left of plain text.
    const choice = () => (
        <div className="col-6 col-md-auto d-flex gap-2" style={{ minWidth: '10rem' }}>
            <span className="placeholder col-4" />
            <span className="placeholder col-5" />
        </div>
    )
    return (
        <div className="card placeholder-glow" aria-busy="true">
            <div className="card-header">
                <h2 className="card-title strong">VelociTempo</h2>
                <div className="card-actions">
                    <span className="btn btn-icon disabled placeholder" />
                </div>
            </div>
            <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="text-secondary fw-medium">#1</span>
                    <span className="btn disabled placeholder" style={{ width: '4.5rem' }} />
                </div>
                <div className="row g-3">
                    {field('col-sm-6 col-md-3')}
                    {field('col-sm-6 col-md')}
                    {field('col-6 col-md-2')}
                    {field('col-6 col-md-2')}
                    <div className="w-100 mt-0" />
                    {choice()}
                    {choice()}
                    {choice()}
                    {choice()}
                </div>
            </div>
            <div className="card-footer d-flex align-items-center justify-content-between">
                <span className="placeholder col-3" />
                <span className="btn btn-primary disabled placeholder" style={{ width: '5rem' }} />
            </div>
        </div>
    )
}
