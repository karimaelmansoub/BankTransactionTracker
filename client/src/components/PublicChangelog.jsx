import { fmtDate, timeAgo } from '../utils.js';

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

export default function PublicChangelog({ history }) {
  if (!history.length) {
    return <p style={{ color: 'var(--muted)', fontSize: 13 }}>No checks recorded yet.</p>;
  }

  return (
    <div className="changelog">
      {history.map((h, i) => {
        const isChanged = h.status === 'Changed';
        const isError   = h.status === 'Error';
        const dotClass  = isChanged ? 'changed' : isError ? 'error' : '';
        const isLast    = i === history.length - 1;

        return (
          <div className="cl-entry" key={h.id}>
            <div className="cl-dot-col">
              <div className={`cl-dot ${dotClass}`} />
              {!isLast && <div className="cl-line" />}
            </div>
            <div className="cl-body">
              <div className="cl-header">
                {isChanged
                  ? <span className="badge badge-green" style={{ fontSize: 10 }}>Changed</span>
                  : isError
                  ? <span className="badge badge-red"   style={{ fontSize: 10 }}>Error</span>
                  : <span className="badge badge-gray"  style={{ fontSize: 10 }}>No change</span>}
                <span className="cl-time">{fmtDate(h.recorded_at)} · {timeAgo(h.recorded_at)}</span>
              </div>
              {h.detail && (
                <div
                  className={`cl-snippet${isChanged ? ' changed' : ''}`}
                  dangerouslySetInnerHTML={{ __html: escHtml(h.detail.substring(0, 200)) + (h.detail.length > 200 ? '…' : '') }}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
