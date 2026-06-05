import { useState } from 'react';
import { statusBadge, timeAgo, fmtDate, intervalLabel } from '../utils.js';
import UETRWorkflow from './UETRWorkflow.jsx';
import PublicChangelog from './PublicChangelog.jsx';

const TERMINAL = ['Payee credited', 'Failed'];

export default function DetailPane({ detail, onStart, onStop, onCheck }) {
  const { item, history } = detail;
  const [checking, setChecking] = useState(false);

  const isTerminal = item.category === 'uetr' && TERMINAL.includes(item.status);
  const isRunning  = !!item.is_running;

  async function handleCheck() {
    setChecking(true);
    await onCheck(item.id);
    setChecking(false);
  }

  return (
    <div className="detail-inner">
      <div className="detail-id">{item.identifier}</div>

      <div className="detail-badges">
        <span dangerouslySetInnerHTML={{ __html: statusBadge(item.status) }} />
        <span className="badge badge-gray">{isRunning ? 'Running' : isTerminal ? 'Complete' : 'Stopped'}</span>
        <span className={`chip chip-${item.category}`}>{item.category === 'uetr' ? 'UETR' : 'Public'}</span>
      </div>

      {isTerminal && (
        <div className={`terminal-banner ${item.status === 'Payee credited' ? 'success' : 'failed'}`}>
          <span className="icon">{item.status === 'Payee credited' ? '✅' : '❌'}</span>
          <div>
            <div>{item.status}</div>
            <div style={{ fontWeight: 400, fontSize: 12, marginTop: 2 }}>
              Tracking completed · {fmtDate(item.last_changed_at)}
            </div>
          </div>
        </div>
      )}

      <div className="detail-actions">
        {isRunning
          ? <button className="btn btn-gray" onClick={() => onStop(item.id)}>⏹ Stop</button>
          : !isTerminal && <button className="btn btn-primary" onClick={() => onStart(item.id)}>▶ Start tracking</button>}
        <button className="btn btn-outline" onClick={handleCheck} disabled={checking}>
          {checking ? 'Checking…' : '↻ Check now'}
        </button>
      </div>

      <div className="meta-grid">
        {item.bank   && <div className="meta-field"><label>Bank</label><div className="val">{item.bank}</div></div>}
        {item.amount != null && <div className="meta-field"><label>Amount</label><div className="val">{item.amount} {item.currency || 'AUD'}</div></div>}
        <div className="meta-field"><label>Frequency</label><div className="val">{intervalLabel(item.interval_minutes)}</div></div>
        <div className="meta-field"><label>Records</label><div className="val">{history.length}</div></div>
        <div className="meta-field"><label>Added</label><div className="val">{fmtDate(item.created_at)}</div></div>
        <div className="meta-field"><label>Last checked</label><div className="val">{fmtDate(item.last_checked_at)}</div></div>
        <div className="meta-field"><label>Last update</label><div className="val">{fmtDate(item.last_changed_at)}</div></div>
        {item.note && <div className="meta-field"><label>Note</label><div className="val">{item.note}</div></div>}
        <div className="meta-field full-col">
          <label>URL</label>
          <div className="val">
            <a className="url-link" href={item.url} target="_blank" rel="noopener noreferrer">{item.url}</a>
          </div>
        </div>
      </div>

      <div className="section-title">
        {item.category === 'uetr'
          ? `STATUS WORKFLOW (${history.length} events)`
          : `CHANGE LOG (${history.length} checks)`}
      </div>

      {item.category === 'uetr'
        ? <UETRWorkflow history={history} item={item} />
        : <PublicChangelog history={history} />}
    </div>
  );
}
