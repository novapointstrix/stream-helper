import React, { useEffect, useState } from 'react';
import { Stream } from '../types/database.types';
import { getStreams, createStream } from '../services/bonusService';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Tv } from 'lucide-react';

export const HistoryPage: React.FC = () => {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [title, setTitle] = useState('');
  const [number, setNumber] = useState(128);
  const navigate = useNavigate();

  const loadData = async () => {
    const list = await getStreams();
    setStreams(list);
    if (list.length > 0) {
      setNumber(list[0].stream_number + 1);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const created = await createStream(title, Number(number));
    navigate(`/admin/streams/${created.id}`);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto text-white space-y-6">
      <h1 className="text-2xl font-black">Управление Стримами</h1>

      <form onSubmit={handleCreate} className="bg-[#120507]/80 border border-red-900/40 rounded-3xl p-6 flex flex-wrap items-center gap-4">
        <div className="w-32">
          <label className="text-xs text-red-300/60 font-medium block mb-1">Номер стрима</label>
          <input
            type="number"
            value={number}
            onChange={(e) => setNumber(Number(e.target.value))}
            className="w-full bg-[#080203] border border-red-800/40 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
          />
        </div>

        <div className="flex-1 min-w-[200px]">
          <label className="text-xs text-red-300/60 font-medium block mb-1">Название стрима</label>
          <input
            type="text"
            placeholder="Охота за выигрышем x1000"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-[#080203] border border-red-800/40 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
          />
        </div>

        <button
          type="submit"
          className="mt-5 bg-red-700 hover:bg-red-600 text-white font-bold px-6 py-2.5 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(220,38,38,0.4)]"
        >
          <Plus size={18} />
          Создать Новый Стрим
        </button>
      </form>

      <div className="grid gap-3">
        {streams.map((s) => (
          <div key={s.id} className="bg-[#120507]/80 border border-red-900/40 rounded-2xl p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-950/60 rounded-xl border border-red-800/40 text-red-400">
                <Tv size={20} />
              </div>
              <div>
                <span className="text-xs font-bold text-red-400">🍔 BONUS BUY #{s.stream_number}</span>
                <h3 className="text-lg font-extrabold text-white">{s.title}</h3>
                <span className="text-xs text-red-300/40">{s.date}</span>
              </div>
            </div>

            <Link
              to={`/admin/streams/${s.id}`}
              className="bg-red-950/60 hover:bg-red-900/80 border border-red-800/40 text-red-200 text-xs font-bold px-5 py-2.5 rounded-xl transition"
            >
              Открыть Дашборд
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};