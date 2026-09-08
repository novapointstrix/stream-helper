import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stream } from '../types/database.types';
import { getStreams, createStream, deleteStream } from '../services/bonusService';
import { WheelHistory } from '../components/wheel/WheelHistory';
import { Plus, Trash2, ArrowRight, Tv, Disc, History } from 'lucide-react';

export const HistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(true);

  // Состояния для создания стрима
  const [streamNumber, setStreamNumber] = useState<number>(1);
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);

  const loadStreams = async () => {
    try {
      setLoading(true);
      const data = await getStreams();
      const loadedStreams = data || [];
      setStreams(loadedStreams);

      if (loadedStreams.length > 0) {
        const maxNum = Math.max(...loadedStreams.map((s) => s.stream_number || 0));
        setStreamNumber(maxNum + 1);
      } else {
        setStreamNumber(1);
      }
    } catch (err) {
      console.error('Ошибка загрузки стримов:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStreams();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || creating) return;

    try {
      setCreating(true);
      const newStream = await createStream(title.trim(), streamNumber);
      setTitle('');

      if (newStream && newStream.id) {
        // Безопасная асинхронная навигация на dashboard
        setTimeout(() => {
          navigate(`/dashboard/${newStream.id}`);
        }, 0);
      } else {
        await loadStreams();
      }
    } catch (err) {
      console.error('Ошибка создания стрима:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm('Удалить этот стрим?')) return;
    try {
      await deleteStream(id);
      await loadStreams();
    } catch (err) {
      console.error('Ошибка удаления:', err);
    }
  };

  const handleOpenStream = (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setTimeout(() => {
      navigate(`/dashboard/${id}`);
    }, 0);
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-[#E4E4E7] font-sans p-4 sm:p-8">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* БЛОК 1: Bonus Buy Panel */}
        <section className="bg-[#121215] border border-[#27272A] rounded-2xl p-5 shadow-xl space-y-6">
          <div className="flex items-center gap-2 text-[#FAFAFA] font-medium text-base border-b border-[#27272A] pb-3">
            <Tv size={18} className="text-amber-500" />
            <h2>Bonus Buy Panel</h2>
          </div>

          {/* Форма создания стрима */}
          <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3 items-end bg-[#18181B] p-4 rounded-xl border border-[#27272A]">
            <div className="w-full sm:w-28">
              <label className="block text-[10px] font-mono text-[#A1A1AA] mb-1 uppercase">
                № Стрима
              </label>
              <input
                type="number"
                value={streamNumber}
                onChange={(e) => setStreamNumber(Number(e.target.value))}
                className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#52525B]"
                required
              />
            </div>

            <div className="flex-1 w-full">
              <label className="block text-[10px] font-mono text-[#A1A1AA] mb-1 uppercase">
                Название стрима
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Например: Bonus Buy Marathon"
                className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-1.5 text-xs text-white placeholder-[#52525B] focus:outline-none focus:border-[#52525B]"
                required
              />
            </div>

            <button
              type="submit"
              disabled={creating}
              className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold px-4 py-1.5 rounded-xl text-xs transition flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50 cursor-pointer"
            >
              <Plus size={14} />
              {creating ? 'Создание...' : 'Создать'}
            </button>
          </form>

          {/* Список стримов */}
          <div>
            <div className="text-xs font-mono text-[#A1A1AA] uppercase mb-3">Список всех стримов</div>

            {loading ? (
              <div className="text-center py-6 text-[#A1A1AA] text-xs font-mono">
                Загрузка данных...
              </div>
            ) : streams.length === 0 ? (
              <div className="text-center py-6 text-[#52525B] text-xs">
                Нет созданных стримов
              </div>
            ) : (
              <div className="space-y-2">
                {streams.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => handleOpenStream(s.id)}
                    className="group bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] hover:border-[#3F3F46] rounded-xl p-3 flex items-center justify-between cursor-pointer transition"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-mono font-medium px-2 py-0.5 bg-[#09090B] border border-[#27272A] text-[#A1A1AA] rounded-md">
                        #{s.stream_number}
                      </span>
                      <span className="text-xs font-medium text-white transition">
                        {s.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => handleOpenStream(s.id, e)}
                        className="text-xs bg-[#27272A] group-hover:bg-[#3F3F46] border border-[#3F3F46] text-white px-2.5 py-1 rounded-lg flex items-center gap-1 transition cursor-pointer"
                      >
                        Открыть админку <ArrowRight size={11} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDelete(s.id, e)}
                        className="p-1 text-[#71717A] hover:text-red-400 hover:bg-[#09090B] rounded-lg transition cursor-pointer"
                        title="Удалить"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* БЛОК 2: Интерактивное Колесо */}
        <section className="bg-[#121215] border border-[#27272A] rounded-2xl p-5 shadow-xl flex items-center justify-between">
          <div className="flex items-center gap-3 text-[#FAFAFA] font-medium text-base">
            <Disc size={22} className="text-amber-500" />
            <div>
              <h2 className="font-bold">Интерактивное Колесо</h2>
              <p className="text-xs text-[#71717A]">Создание и запуск рулетки призов на стриме</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setTimeout(() => navigate('/wheel'), 0)}
            className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold px-5 py-2.5 rounded-xl text-xs transition flex items-center gap-2 cursor-pointer uppercase tracking-wider shrink-0"
          >
            ПЕРЕЙТИ К КОЛЕСУ <ArrowRight size={16} />
          </button>
        </section>
      </div>
    </div>
  );
};