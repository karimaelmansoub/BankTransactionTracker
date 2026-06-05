import { useState } from 'react';

const api = (path, opts = {}) =>
  fetch(path, { headers: { 'Content-Type': 'application/json' }, ...opts }).then(r => r.json());

export default function AddForm({ onAdded }) {
  const [open, setOpen]       = useState(true);
  const [category, setCategory] = useState('uetr');
  const [identifier, setIdentifier] = useState('');
  const [bank, setBank]       = useState('');
  const [amount, setAmount]   = useState('');
  const [currency, setCurrency] = useState('AUD');
  const [note, setNote]       = useState('');
  const [interval, setInterval] = useState(5);
  const [startNow, setStartNow] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const isUETR = category === 'uetr';

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!identifier.trim()) { setError(isUETR ? 'Please enter a UETR.' : 'Please enter a URL.'); return; }
    setLoading(true);
    try {
      const result = await api('/api/items', {
        method: 'POST',
        body: JSON.stringify({
          category, identifier: identifier.trim(),
          bank: bank.trim() || undefined,
          amount: amount ? parseFloat(amount) : undefined,
          currency, note: note.trim() || undefined,
          interval_minutes: +interval,
          start_immediately: startNow,
        }),
      });
      if (result.error) { setError(result.error); return; }
      setIdentifier(''); setBank(''); setAmount(''); setNote('');
      onAdded(result);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="card">
      <div className="card-header" onClick={() => setOpen(o => !o)}>
        <h2>Track a new target</h2>
        <span style={{ color: 'var(--muted)', fontSize: 13 }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <form onSubmit={submit} style={{ marginTop: 16 }}>
          <p className="subtitle">Choose a search type, enter a UETR or URL, and set a check interval.</p>

          <div className="form-row">
            <div className="form-group">
              <label>Search category</label>
              <select value={category} onChange={e => setCategory(e.target.value)}>
                <option value="uetr">UETR Search (CommBank)</option>
                <option value="public">Public Search (any URL)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Check frequency</label>
              <select value={interval} onChange={e => setInterval(+e.target.value)}>
                <option value={1}>Every 1 minute</option>
                <option value={2}>Every 2 minutes</option>
                <option value={5}>Every 5 minutes</option>
                <option value={10}>Every 10 minutes</option>
                <option value={60}>Every 1 hour</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>{isUETR ? 'UETR (payment reference)' : 'URL to monitor'}</label>
            <input
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              placeholder={isUETR ? 'b236767d-4827-4c89-b405-d1fd0bdfd998' : 'https://example.com/page-to-watch'}
            />
            <span className="field-hint">
              {isUETR
                ? "Must be a UUID. Polls CommBank's payment tracker."
                : 'Any public URL. Detects when page content changes.'}
            </span>
          </div>

          {isUETR && (
            <div className="form-row">
              <div className="form-group">
                <label>Bank name (optional)</label>
                <input value={bank} onChange={e => setBank(e.target.value)} placeholder="e.g. CommBank" />
              </div>
              <div className="form-group">
                <label>Amount (optional)</label>
                <div className="amount-input">
                  <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" step="0.01" min="0" />
                  <select value={currency} onChange={e => setCurrency(e.target.value)}>
                    {['AUD','USD','EUR','GBP'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Note (optional)</label>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="Internal reference / memo" />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Adding…' : 'Add & track'}
            </button>
            <label className="checkbox-label">
              <input type="checkbox" checked={startNow} onChange={e => setStartNow(e.target.checked)} />
              Start checking immediately
            </label>
          </div>
          {error && <div className="form-error">{error}</div>}
        </form>
      )}
    </div>
  );
}
