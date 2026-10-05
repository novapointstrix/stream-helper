import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BonusBuy, Stream } from '../types/database.types';
import { getBonusesByStreamId, deleteBonusBuy, saveBonusBuy, getStreams, getStreamById, updateStream, setActiveBonus } from '../services/bonusService';
import { QuickAddBonusForm } from '../components/admin/QuickAddBonusForm';
import { calculateMetrics, formatCurrency, formatMultiplier } from '../lib/utils';
import { Copy, Trash2, Check, Edit3, Save, Play, Square } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [streams, setStreams] = useState<Stream[]>([]);
  const [currentStream, setCurrentStream] = useState<Stream | null>(null);
  const [bonuses, setBonuses] = useState<BonusBuy[]>([]);
  const [copied, setCopied] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editNumber, setEditNumber] = useState<number>(0);

  const loadData = async () => {
    const allStreams = await getStreams();
    setStreams(allStreams);

    const activeStreamId = id || (allStreams[0] ? allStreams[0].id : 'demo-127');
    const stream = await getStreamById(activeStreamId);

    if (stream) {
      setCurrentStream(stream);
      setEditTitle(stream.title);
      setEditNumber(stream.stream_number);
      const data = await getBonusesByStreamId(stream.id);
      setBonuses(data);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleSaveStreamInfo = async () => {
    if (!currentStream) return;
    const updated = await updateStream(currentStream.id, {
      title: editTitle,
      stream_number: Number(editNumber) || 0,
    });
    if (updated) {
      setCurrentStream(updated);
      setIsEditing(false);
      loadData();
    }
  };

  const handleStartPlaying = async (bonusId: string) => {
    if (!currentStream) return;
    await setActiveBonus(currentStream.id, bonusId);
    loadData();
  };

  const handleStopPlaying = async () => {
    if (!currentStream) return;
    await setActiveBonus(currentStream.id, null);
    loadData();
  };

  const metrics = calculateMetrics(bonuses);

  const copyObsUrl = () => {
    if (!currentStream) return;
    const url = `${window.location.origin}/overlay/${currentStream.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInlineWinChange = async (bonus: BonusBuy, winVal: string) => {
    const win = winVal !== '' ? Number(winVal) : null;
    await saveBonusBuy({ ...bonus, win_amount: win });
    if (currentStream) {
      const data = await getBonusesByStreamId(currentStream.id);
      setBonuses(data);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 text-white">
      <div className="flex items-center justify-between bg-[#120507]/90 border border-red-900/40 p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <span className="text-xs text-red-300/60 font-semibold">Выберите стрим:</span>
          <select
            value={currentStream?.id || ''}
            onChange={(e) => navigate(`/admin/streams/${e.target.value}`)}
            className="bg-[#080203] border border-red-800/40 rounded-xl px-4 py-2 text-sm text-white font-bold focus:outline-none focus:border-red-500 cursor-pointer"
          >
            {streams.map((s) => (
              <option key={s.id} value={s.id}>
                BONUS BUY #{s.stream_number} — {s.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#120507]/80 border border-red-900/40 p-6 rounded-3xl backdrop-blur-xl">
        <div className="flex-1">
          {isEditing ? (
            <div className="flex flex-wrap items-center gap-3 mt-1">
              <div>
                <label className="text-[10px] text-red-300/60 block">Номер</label>
                <input
                  type="number"
                  value={editNumber}
                  onChange={(e) => setEditNumber(Number(e.target.value))}
                  className="w-24 bg-[#080203] border border-red-800/40 rounded-xl px-3 py-1 text-sm font-bold text-red-400"
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="text-[10px] text-red-300/60 block">Название стрима</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-[#080203] border border-red-800/40 rounded-xl px-3 py-1 text-sm font-bold text-white"
                />
              </div>
              <button
                onClick={handleSaveStreamInfo}
                className="mt-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-1.5 rounded-xl text-xs flex items-center gap-1 cursor-pointer"
              >
                <Save size={14} /> Сохранить
              </button>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-red-400 bg-red-950/60 px-3 py-1 rounded-full border border-red-800/40">
                  🍔 BONUS BUY #{currentStream?.stream_number}
                </span>
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-red-400/60 hover:text-red-300 text-xs flex items-center gap-1 font-medium transition"
                >
                  <Edit3 size={14} /> Редактировать
                </button>
              </div>
              <h1 className="text-2xl font-black mt-2 text-white">{currentStream?.title}</h1>
            </div>
          )}
        </div>

        <button
          onClick={copyObsUrl}
          className="bg-red-950/60 hover:bg-red-900/80 border border-red-800/40 text-red-200 text-xs font-semibold px-4 py-2.5 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(220,38,38,0.15)]"
        >
          {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
          {copied ? 'Скопировано!' : 'CКОПИРОВАТЬ OBS ССЫЛКУ'}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Всего куплено', val: metrics.totalBuys, icon: '📦' },
          { label: 'Затрачено', val: formatCurrency(metrics.totalSpent), icon: '💸' },
          { label: 'Выигрыш', val: formatCurrency(metrics.totalWin), icon: '💰' },
          { label: 'Профит', val: formatCurrency(metrics.profit), color: metrics.profit >= 0 ? 'text-emerald-400' : 'text-rose-400', icon: '📈' },
          { label: 'Средний X', val: formatMultiplier(metrics.avgMultiplier), icon: '⚡' },
          { label: 'ЛУЧШИЙ X', val: metrics.bestX ? formatMultiplier(metrics.bestX.multiplier) : '—', icon: '👑' },
        ].map((item, idx) => (
          <div key={idx} className="bg-[#120507]/60 border border-red-900/30 rounded-2xl p-3 text-center relative overflow-hidden">
            <div className="text-xs mb-1">{item.icon}</div>
            <div className="text-[10px] font-bold text-red-300/50 uppercase tracking-wider">{item.label}</div>
            <div className={`text-sm font-black mt-1 ${item.color || 'text-white'}`}>{item.val}</div>
          </div>
        ))}
      </div>

      {currentStream && <QuickAddBonusForm streamId={currentStream.id} onAdded={loadData} />}

      <div className="bg-[#120507]/80 border border-red-900/40 rounded-3xl p-6 overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-red-900/30 text-red-300/50 text-xs font-bold uppercase">
              <th className="py-3 px-2">#</th>
              <th className="py-3 px-2">Фаза игры</th>
              <th className="py-3 px-2">Слот</th>
              <th className="py-3 px-2">Игрок (Ник)</th>
              <th className="py-3 px-2">Цена</th>
              <th className="py-3 px-2">Выигрыш</th>
              <th className="py-3 px-2">X</th>
              <th className="py-3 px-2 text-right">Удалить</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-red-950/40">
            {bonuses.map((b) => {
              const isPlaying = b.status === 'playing' || currentStream?.active_bonus_id === b.id;

              return (
                <tr key={b.id} className={isPlaying ? 'bg-amber-500/10' : ''}>
                  <td className="py-3 px-2 font-bold text-red-400">#{b.position}</td>
                  <td className="py-3 px-2">
                    {isPlaying ? (
                      <button
                        onClick={handleStopPlaying}
                        className="bg-amber-500/20 border border-amber-500/50 text-amber-300 text-xs font-bold px-3 py-1 rounded-lg flex items-center gap-1 cursor-pointer animate-pulse"
                      >
                        <Square size={12} className="fill-amber-300" /> Снять выбор
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStartPlaying(b.id)}
                        className="bg-red-950/60 hover:bg-red-800 border border-red-800/40 text-red-300 text-xs font-semibold px-3 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition"
                      >
                        <Play size={12} className="fill-red-300" /> Начать бонус бай
                      </button>
                    )}
                  </td>
                  <td className="py-3 px-2 font-semibold text-white">{b.slot_name}</td>
                  <td className="py-3 px-2 text-red-300/90 font-bold">{b.provider}</td>
                  <td className="py-3 px-2 font-medium">{formatCurrency(b.buy_amount)}</td>
                  <td className="py-3 px-2">
                    <input
                      type="number"
                      defaultValue={b.win_amount !== null ? b.win_amount : ''}
                      placeholder="—"
                      onBlur={(e) => handleInlineWinChange(b, e.target.value)}
                      className="w-28 bg-[#080203] border border-red-800/40 rounded-lg px-2 py-1 text-sm text-white"
                    />
                  </td>
                  <td className="py-3 px-2 font-bold text-red-300">{formatMultiplier(b.multiplier)}</td>
                  <td className="py-3 px-2 text-right">
                    <button onClick={async () => { if (currentStream) { await deleteBonusBuy(b.id, currentStream.id); loadData(); } }} className="text-red-400/50 hover:text-rose-400">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};