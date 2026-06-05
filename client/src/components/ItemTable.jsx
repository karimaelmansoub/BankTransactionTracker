import { useState } from 'react';
import { statusBadge, timeAgo, intervalLabel } from '../utils.js';

const TERMINAL = ['Payee credited', 'Failed'];

export default function ItemTable({ items, selectedId, onSelect, onStart, onStop, onCheck, onDelete }) {
  const [checking, setChecking] = useState(null);

  async function handleCheck(e, id) {
    e.stopPropagation();
    setChecking(id);
    await onCheck(id);
    setChecking(null);
  }

  if (!items.length) {
    return (
      <div className="table-wrap">
        <table><thead><tr>
          <th>TYPE</th><th>IDENTIFIER / URL</th><th>AMOUNT</th>
          <th>STATUS</th><th>CHECKED</th><th>EVERY</th><th>JOB</th><th>ACTIONS</th>
        </tr></thead>
        <tbody><tr><td colSpan={8} className="empty-row">No tracked items yet. Add one above.</td></tr></tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table>
        <thead><tr>
          <th>TYPE</th><th>IDENTIFIER / URL</th><th>AMOUNT</th>
          <th>STATUS</th><th>CHECKED</th><th>EVERY</th><th>JOB</th><th>ACTIONS</th>
        </tr></thead>
        <tbody>
          {items.map(item => {
            const isTerminal = item.category === 'uetr' && TERMINAL.includes(item.status);
            return (
              <tr
                key={item.id}
                className={item.id === selectedId ? 'selected' : ''}
                onClick={() => onSelect(item.id)}
              >
                <td><span className={`chip chip-${item.category}`}>{item.category === 'uetr' ? 'UETR' : 'Public'}</span></td>
                <td>
                  <div className="ident-main">{item.identifier}</div>
                  {(item.bank || item.note) && (
                    <div className="ident-sub">{[item.bank, item.note].filter(Boolean).join(' · ')}</div>
                  )}
                </td>
                <td>{item.amount != null ? `${item.amount.toFixed(2)} ${item.currency || 'AUD'}` : '–'}</td>
                <td dangerouslySetInnerHTML={{ __html: statusBadge(item.status) }} />
                <td>{timeAgo(item.last_checked_at)}</td>
                <td>{intervalLabel(item.interval_minutes)}</td>
                <td>
                  {item.is_running
                    ? <span className="job-dot active">Running</span>
                    : isTerminal
                    ? <span className="job-dot" style={{ color: 'var(--success)' }}>Complete</span>
                    : <span className="job-dot">Stopped</span>}
                </td>
                <td>
                  <div className="actions" onClick={e => e.stopPropagation()}>
                    {item.is_running
                      ? <button className="btn-sm" onClick={() => onStop(item.id)}>Stop</button>
                      : !isTerminal && <button className="btn-sm start" onClick={() => onStart(item.id)}>Start</button>}
                    <button className="btn-sm" onClick={e => handleCheck(e, item.id)} disabled={checking === item.id}>
                      {checking === item.id ? '…' : 'Check'}
                    </button>
                    <button className="btn-sm danger" onClick={e => { e.stopPropagation(); onDelete(item.id); }}>Delete</button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
