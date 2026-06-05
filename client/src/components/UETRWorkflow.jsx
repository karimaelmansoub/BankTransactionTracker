import { timeAgo, fmtDate } from '../utils.js';

const TERMINAL = ['Payee credited', 'Failed'];

export default function UETRWorkflow({ history, item }) {
  if (!history.length) {
    return <p style={{ color: 'var(--muted)', fontSize: 13 }}>No history yet — click Check now or wait for the next scheduled check.</p>;
  }

  return (
    <div className="workflow">
      {history.map((h, i) => {
        const isTerm = TERMINAL.includes(h.status);
        const isFirst = i === 0;
        const dotClass = isTerm
          ? (h.status === 'Failed' ? 'failed' : 'terminal')
          : isFirst ? 'current' : 'done';

        return (
          <div className="wf-step" key={h.id}>
            <div className={`wf-dot ${dotClass}`} />
            <div className="wf-status">{h.status}</div>
            <div className="wf-meta">
              {h.bank_update_time && `Bank update: ${h.bank_update_time} · `}
              Recorded {timeAgo(h.recorded_at)}
              <span style={{ color: '#ccc' }}> · {fmtDate(h.recorded_at)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
