import { useState, useEffect, useCallback } from 'react';
import AddForm from './components/AddForm.jsx';
import ItemTable from './components/ItemTable.jsx';
import DetailPane from './components/DetailPane.jsx';

const api = (path, opts = {}) =>
  fetch(path, { headers: { 'Content-Type': 'application/json' }, ...opts }).then(r => r.json());

export default function App() {
  const [stats, setStats]       = useState({ tracked: '–', running: '–', credited: '–', errors: '–' });
  const [items, setItems]       = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail]     = useState(null); // { item, history }

  const loadStats = useCallback(async () => {
    const s = await api('/api/stats');
    setStats(s);
  }, []);

  const loadItems = useCallback(async () => {
    const rows = await api('/api/items');
    setItems(Array.isArray(rows) ? rows : []);
  }, []);

  const loadDetail = useCallback(async (id) => {
    if (!id) return;
    const d = await api(`/api/items/${id}`);
    setDetail(d);
  }, []);

  const loadAll = useCallback(async () => {
    await Promise.all([loadStats(), loadItems()]);
    if (selectedId) await loadDetail(selectedId);
  }, [loadStats, loadItems, loadDetail, selectedId]);

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { const t = setInterval(loadAll, 20000); return () => clearInterval(t); }, [loadAll]);

  const selectRow = useCallback(async (id) => {
    setSelectedId(id);
    const d = await api(`/api/items/${id}`);
    setDetail(d);
  }, []);

  const handleStart = async (id) => { await api(`/api/items/${id}/start`, { method: 'POST' }); loadAll(); };
  const handleStop  = async (id) => { await api(`/api/items/${id}/stop`,  { method: 'POST' }); loadAll(); };
  const handleCheck = async (id) => {
    const d = await api(`/api/items/${id}/check`, { method: 'POST' });
    setDetail(d);
    loadAll();
  };
  const handleDelete = async (id) => {
    if (!confirm('Delete this item and all its history?')) return;
    await api(`/api/items/${id}`, { method: 'DELETE' });
    if (selectedId === id) { setSelectedId(null); setDetail(null); }
    loadAll();
  };
  const handleAdded = async (item) => {
    await loadAll();
    selectRow(item.id);
  };

  return (
    <>
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon">⬡</span>
            <span>Bank<strong>TransactionTracker</strong></span>
          </div>
        </div>
      </header>

      <div className="main">
        {/* Stats */}
        <div className="stats-grid">
          {[
            { label: 'TRACKED',           value: stats.tracked,  cls: '' },
            { label: 'RUNNING',           value: stats.running,  cls: 'green' },
            { label: 'CREDITED / CHANGED',value: stats.credited, cls: '' },
            { label: 'ERRORS',            value: stats.errors,   cls: '' },
          ].map(s => (
            <div className="stat-card" key={s.label}>
              <div className="stat-label">{s.label}</div>
              <div className={`stat-value ${s.cls}`}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Add form */}
        <AddForm onAdded={handleAdded} />

        {/* Split workspace */}
        <div className="workspace">
          <div className="table-panel">
            <div className="panel-header">
              <h2>Tracked payments</h2>
              <p className="subtitle">Click a row to view details. Background jobs keep running when this panel is closed.</p>
            </div>
            <ItemTable
              items={items}
              selectedId={selectedId}
              onSelect={selectRow}
              onStart={handleStart}
              onStop={handleStop}
              onCheck={handleCheck}
              onDelete={handleDelete}
            />
          </div>

          <div className="detail-pane">
            {detail
              ? <DetailPane
                  detail={detail}
                  onStart={handleStart}
                  onStop={handleStop}
                  onCheck={handleCheck}
                />
              : <div className="detail-empty">
                  <div className="detail-empty-icon">☰</div>
                  <p>Click a row to view details</p>
                </div>
            }
          </div>
        </div>
      </div>
    </>
  );
}
