import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stream } from '../types/database.types';
import { getStreams, createStream, deleteStream } from '../services/bonusService';
import { supabase } from '../lib/supabaseClient';
import { LOGO_OPTIONS } from '../components/StreamIconRenderer';
import {
  Plus, Trash2, ArrowRight, ChevronDown, ChevronUp, Gift, Disc
} from 'lucide-react';

export const MainPage: React.FC = () => {
  const navigate = useNavigate();
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(true);

  const [streamNumber, setStreamNumber] = useState<number>(1);
  const [title, setTitle] = useState('');
  const [startBalance, setStartBalance] = useState<number>(0);
  const [creating, setCreating] = useState(false);

  const [showAllStreams, setShowAllStreams] = useState(false);

  const [selectedLogoId, setSelectedLogoId] = useState<string>('tv');

  const loadProfileIcon = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('stream_icon')
        .eq('id', user.id)
        .maybeSingle();

      if (data?.stream_icon) {
        setSelectedLogoId(data.stream_icon);
      }
    } catch (err) {
      console.error('Ошибка загрузки иконки профиля:', err);
    }
  };

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
    loadProfileIcon();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || creating) return;

    try {
      setCreating(true);
      const newStream = await createStream(title.trim(), streamNumber, startBalance);
      setTitle('');
      setStartBalance(0);

      if (newStream && newStream.id) {
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

  const latestStream = streams.length > 0 ? streams[0] : null;
  const olderStreams = streams.length > 1 ? streams.slice(1) : [];

  return (
    <div className="min-h-screen bg-[#09090B] text-[#E4E4E7] font-sans p-3 sm:p-8 overflow-x-hidden">
      <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">

        {/* Блок Bonus Buy */}
        <section className="bg-[#121215] border border-[#27272A] rounded-2xl p-4 sm:p-5 shadow-xl space-y-4 sm:space-y-6">

          <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
            <div className="flex items-center gap-2.5 text-[#FAFAFA] font-medium text-base">
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
                <Gift size={20} />
              </div>
              <h2 className="font-bold text-sm sm:text-base">Bonus Buy Panel</h2>
            </div>
          </div>

          <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end bg-[#18181B] p-3.5 sm:p-4 rounded-xl border border-[#27272A]">
            <div className="w-full sm:w-24">
              <label className="block text-[10px] font-mono text-[#A1A1AA] mb-1 uppercase">
                № Стрима
              </label>
              <input
                type="number"
                value={streamNumber}
                onChange={(e) => setStreamNumber(Number(e.target.value))}
                className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-2 sm:py-1.5 text-xs text-white focus:outline-none focus:border-[#52525B]"
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
                placeholder="Bonus Buy Marathon"
                className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-2 sm:py-1.5 text-xs text-white placeholder-[#52525B] focus:outline-none focus:border-[#52525B]"
                required
              />
            </div>

            <div className="w-full sm:w-32">
              <label className="block text-[10px] font-mono text-[#A1A1AA] mb-1 uppercase">
                Баланс ($)
              </label>
              <input
                type="number"
                value={startBalance}
                onChange={(e) => setStartBalance(Number(e.target.value))}
                placeholder="1000"
                className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-2 sm:py-1.5 text-xs text-white focus:outline-none focus:border-[#52525B]"
              />
            </div>

            <button
              type="submit"
              disabled={creating}
              className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold px-4 py-2 sm:py-1.5 rounded-xl text-xs transition flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50 cursor-pointer mt-1 sm:mt-0"
            >
              <Plus size={14} />
              {creating ? 'Создание...' : 'Создать'}
            </button>
          </form>

          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono text-[#A1A1AA] uppercase">Список всех стримов</span>
              {streams.length > 0 && (
                <span className="text-[10px] font-mono text-[#71717A]">
                  Всего: {streams.length}
                </span>
              )}
            </div>

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
                {latestStream && (
                  <div
                    onClick={() => handleOpenStream(latestStream.id)}
                    className="group bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] hover:border-[#3F3F46] rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 cursor-pointer transition"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 w-full sm:w-auto">
                      <span className="text-[11px] font-mono font-medium px-2 py-0.5 bg-[#09090B] border border-[#27272A] text-[#A1A1AA] rounded-md shrink-0">
                        #{latestStream.stream_number}
                      </span>
                      <span className="text-xs font-medium text-white transition truncate">
                        {latestStream.title}
                      </span>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto shrink-0 border-t sm:border-t-0 border-[#27272A] pt-2 sm:pt-0">
                      <button
                        type="button"
                        onClick={(e) => handleOpenStream(latestStream.id, e)}
                        className="text-xs bg-[#27272A] group-hover:bg-[#3F3F46] border border-[#3F3F46] text-white px-2.5 py-1 rounded-lg flex items-center justify-center gap-1 transition cursor-pointer flex-1 sm:flex-initial"
                      >
                        Открыть админку <ArrowRight size={11} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDelete(latestStream.id, e)}
                        className="p-1.5 text-[#71717A] hover:text-red-400 hover:bg-[#09090B] rounded-lg transition cursor-pointer shrink-0"
                        title="Удалить"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )}

                {olderStreams.length > 0 && (
                  <div className="space-y-2 pt-1">
                    {showAllStreams &&
                      olderStreams.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => handleOpenStream(s.id)}
                          className="group bg-[#18181B]/60 hover:bg-[#18181B] border border-[#27272A]/60 hover:border-[#3F3F46] rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 cursor-pointer transition"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 w-full sm:w-auto">
                            <span className="text-[11px] font-mono font-medium px-2 py-0.5 bg-[#09090B] border border-[#27272A] text-[#71717A] group-hover:text-[#A1A1AA] rounded-md shrink-0">
                              #{s.stream_number}
                            </span>
                            <span className="text-xs font-medium text-zinc-300 group-hover:text-white transition truncate">
                              {s.title}
                            </span>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto shrink-0 border-t sm:border-t-0 border-[#27272A] pt-2 sm:pt-0">
                            <button
                              type="button"
                              onClick={(e) => handleOpenStream(s.id, e)}
                              className="text-xs bg-[#27272A]/70 group-hover:bg-[#3F3F46] border border-[#3F3F46] text-zinc-300 group-hover:text-white px-2.5 py-1 rounded-lg flex items-center justify-center gap-1 transition cursor-pointer flex-1 sm:flex-initial"
                            >
                              Открыть админку <ArrowRight size={11} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDelete(s.id, e)}
                              className="p-1.5 text-[#71717A] hover:text-red-400 hover:bg-[#09090B] rounded-lg transition cursor-pointer shrink-0"
                              title="Удалить"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}

                    <button
                      type="button"
                      onClick={() => setShowAllStreams(!showAllStreams)}
                      className="w-full bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-[#A1A1AA] hover:text-white text-xs py-2 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer font-mono mt-1"
                    >
                      {showAllStreams ? (
                        <>
                          <ChevronUp size={14} />
                          <span>Свернуть список</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown size={14} />
                          <span>Показать остальные ({olderStreams.length})</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Блок Колеса */}
        <section className="bg-[#121215] border border-[#27272A] rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-[#FAFAFA] font-medium text-base">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
              <Disc size={22} className="animate-spin-slow" />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base">Интерактивное Колесо</h2>
              <p className="text-xs text-[#71717A]">Создание и запуск рулетки призов на стриме</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setTimeout(() => navigate('/wheel'), 0)}
            className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold px-5 py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider shrink-0"
          >
            ПЕРЕЙТИ К КОЛЕСУ <ArrowRight size={16} />
          </button>
        </section>
      </div>
    </div>
  );
};