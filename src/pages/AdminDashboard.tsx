import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Stream, BonusBuy } from '../types/database.types';
import { ThemeId, WidgetThemeTokens } from '../types/theme';
import {
  getStreamById,
  getBonusesByStreamId,
  updateStream,
} from '../services/bonusService';
import { supabase } from '../lib/supabaseClient';
import { QuickAddBonusForm } from '../components/admin/QuickAddBonusForm';
import { BonusList } from '../components/admin/BonusList';
import { WidgetStyleSelector } from '../components/admin/WidgetStyleSelector';
import { Edit2, Check, Copy, ExternalLink, ArrowLeft, Palette, LogOut, Plus } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { id: paramId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [stream, setStream] = useState<Stream | null>(null);
  const [activeStreamId, setActiveStreamId] = useState<string | null>(paramId || null);
  const [bonuses, setBonuses] = useState<BonusBuy[]>([]);
  const [loading, setLoading] = useState(true);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');

  const [isEditingBalance, setIsEditingBalance] = useState(false);
  const [startBalanceInput, setStartBalanceInput] = useState<number>(0);

  const [widgetStyle, setWidgetStyle] = useState<ThemeId>('classic');
  const [customTokens, setCustomTokens] = useState<Partial<WidgetThemeTokens> | undefined>();
  const [showStyleSelector, setShowStyleSelector] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchOrCreateActiveStream = async (): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: latestStream, error } = await supabase
        .from('streams')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Ошибка запроса активного стрима:', error);
      }

      if (latestStream) {
        return latestStream.id;
      }

      const { data: newStream, error: createError } = await supabase
        .from('streams')
        .insert([{ title: 'Новый Bonus Buy', stream_number: 1, user_id: user.id, start_balance: 0 }])
        .select()
        .single();

      if (createError) throw createError;
      return newStream ? newStream.id : null;
    } catch (err) {
      console.error('Ошибка при поиске/создании сессии:', err);
      return null;
    }
  };

  const loadData = useCallback(async () => {
    try {
      let targetId = paramId || activeStreamId;

      if (!targetId) {
        targetId = await fetchOrCreateActiveStream();
        if (targetId) setActiveStreamId(targetId);
      }

      if (!targetId) {
        setStream(null);
        setLoading(false);
        return;
      }

      const fetchedStream = await getStreamById(targetId);

      if (!fetchedStream) {
        setStream(null);
        setLoading(false);
        return;
      }

      setStream(fetchedStream);
      setTitleInput(fetchedStream.title);
      setStartBalanceInput(fetchedStream.start_balance || 0);

      if (fetchedStream.widget_style) {
        setWidgetStyle(fetchedStream.widget_style as ThemeId);
      }
      if (fetchedStream.custom_tokens) {
        setCustomTokens(fetchedStream.custom_tokens as Partial<WidgetThemeTokens>);
      }

      const fetchedBonuses = await getBonusesByStreamId(targetId);
      setBonuses(fetchedBonuses || []);
    } catch (err) {
      console.error('Ошибка при загрузке дашборда:', err);
    } finally {
      setLoading(false);
    }
  }, [paramId, activeStreamId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const targetId = paramId || activeStreamId;
    if (!targetId) return;

    const channel = supabase
      .channel(`admin_bonuses_realtime_${targetId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bonus_buys',
          filter: `stream_id=eq.${targetId}`,
        },
        () => {
          getBonusesByStreamId(targetId).then((data) => {
            if (data) setBonuses(data);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [paramId, activeStreamId]);

  const handleCreateNewStream = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const nextNumber = stream ? (stream.stream_number || 0) + 1 : 1;
      const { data: newStream, error } = await supabase
        .from('streams')
        .insert([{ title: `Bonus Buy #${nextNumber}`, stream_number: nextNumber, user_id: user.id, start_balance: 0 }])
        .select()
        .single();

      if (error) throw error;
      if (newStream) {
        setActiveStreamId(newStream.id);
        setTimeout(() => {
          navigate(`/dashboard/${newStream.id}`);
        }, 0);
      }
    } catch (err) {
      console.error('Ошибка создания новой сессии:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTitle = async () => {
    const currentId = activeStreamId || paramId;
    if (!currentId || !titleInput.trim()) return;
    try {
      await updateStream(currentId, { title: titleInput.trim() });
      setStream((prev) => (prev ? { ...prev, title: titleInput.trim() } : null));
      setIsEditingTitle(false);
    } catch (err) {
      console.error('Ошибка сохранения названия:', err);
    }
  };

  const handleSaveStartBalance = async () => {
    const currentId = activeStreamId || paramId;
    if (!currentId) return;
    try {
      await updateStream(currentId, { start_balance: startBalanceInput });
      setStream((prev) => (prev ? { ...prev, start_balance: startBalanceInput } : null));
      setIsEditingBalance(false);
    } catch (err) {
      console.error('Ошибка сохранения начального баланса:', err);
    }
  };

  const handleStyleChange = (newStyle: ThemeId) => {
    setWidgetStyle(newStyle);
  };

  const handleCustomTokensChange = (newTokens: Partial<WidgetThemeTokens> | undefined) => {
    setCustomTokens(newTokens);
  };

  const handleSaveStyle = async () => {
    const currentId = activeStreamId || paramId;
    if (!currentId) return;
    try {
      await updateStream(currentId, {
        widget_style: widgetStyle,
        custom_tokens: customTokens,
      });
      await loadData();
    } catch (err) {
      console.error('Ошибка сохранения стиля:', err);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = '/login';
    } catch (err) {
      console.error('Ошибка выхода:', err);
    }
  };

  const currentStreamId = activeStreamId || paramId;

  const copyOverlayLink = () => {
    if (!currentStreamId) return;
    const overlayUrl = `${window.location.origin}/overlay/${currentStreamId}`;
    navigator.clipboard.writeText(overlayUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const startBalance = Number(stream?.start_balance || 0);
  const totalSpent = bonuses.reduce((acc, b) => acc + (Number(b.buy_cost ?? b.buy_amount) || 0), 0);
  const totalWon = bonuses.reduce((acc, b) => acc + (Number(b.win_amount) || 0), 0);
  const profit = totalWon - totalSpent;
  const currentBalance = startBalance + profit;

  const avgX =
    bonuses.length > 0
      ? (bonuses.reduce((acc, b) => acc + (Number(b.multiplier) || 0), 0) / bonuses.length).toFixed(1)
      : '0';

  const formattedBonuses = bonuses.map((b) => ({
    ...b,
    widget_style: b.widget_style || widgetStyle,
    custom_tokens: b.custom_tokens || customTokens,
  }));

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center text-[#E4E4E7]">
        <div className="text-center space-y-3">
          <div className="w-6 h-6 border-2 border-[#27272A] border-t-amber-500 rounded-full animate-spin mx-auto" />
          <p className="text-xs text-[#A1A1AA] font-mono">Загрузка данных панели...</p>
        </div>
      </div>
    );
  }

  if (!stream || !currentStreamId) {
    return (
      <div className="min-h-screen bg-[#09090B] flex flex-col items-center justify-center text-[#E4E4E7] p-4">
        <div className="bg-[#121215] border border-[#27272A] p-8 rounded-2xl max-w-md w-full text-center space-y-4">
          <h2 className="text-base font-semibold text-white">Нет активных сессий Bonus Buy</h2>
          <p className="text-[#A1A1AA] text-xs">
            Создайте первую сессию для отслеживания покупок бонусов и вывода оверлея на стрим.
          </p>
          <button
            type="button"
            onClick={handleCreateNewStream}
            className="w-full bg-amber-500 hover:bg-amber-600 text-black font-extrabold py-2.5 rounded-xl text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer"
          >
            <Plus size={16} /> Создать новую сессию
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#09090B] text-[#E4E4E7] font-sans relative">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-5 pb-24">

        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#121215] border border-[#27272A] rounded-2xl p-4 shadow-xl">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setTimeout(() => navigate('/'), 0)}
              className="p-2 bg-[#18181B] border border-[#27272A] rounded-xl text-[#A1A1AA] hover:text-white transition cursor-pointer"
              title="На главную"
            >
              <ArrowLeft size={16} />
            </button>

            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  className="bg-[#09090B] border border-[#3F3F46] rounded-xl px-3 py-1 text-xs text-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleSaveTitle}
                  className="p-1.5 bg-[#27272A] border border-[#3F3F46] text-white rounded-xl hover:bg-[#3F3F46] cursor-pointer"
                >
                  <Check size={14} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <h1 className="text-base font-medium text-white">{stream.title}</h1>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-[#18181B] text-[#A1A1AA] border border-[#27272A] rounded-md">
                  #{stream.stream_number}
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditingTitle(true)}
                  className="text-[#71717A] hover:text-[#A1A1AA] p-1 transition cursor-pointer"
                >
                  <Edit2 size={13} />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleCreateNewStream}
              className="bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition shadow-md shadow-amber-500/10 cursor-pointer"
            >
              <Plus size={14} /> Новая сессия
            </button>

            <button
              type="button"
              onClick={() => setShowStyleSelector(!showStyleSelector)}
              className={`text-xs font-medium px-3 py-1.5 rounded-xl flex items-center gap-1.5 border transition cursor-pointer ${showStyleSelector
                  ? 'bg-[#27272A] border-[#3F3F46] text-white'
                  : 'bg-[#18181B] border-[#27272A] text-[#A1A1AA] hover:text-white'
                }`}
            >
              <Palette size={13} />
              Стиль виджета
            </button>

            <button
              type="button"
              onClick={copyOverlayLink}
              className="bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-[#E4E4E7] text-xs font-medium px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
            >
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              {copied ? 'Скопировано' : 'OBS ссылка'}
            </button>

            <Link
              to={`/overlay/${currentStreamId}`}
              target="_blank"
              className="bg-[#27272A] hover:bg-[#3F3F46] border border-[#3F3F46] text-white text-xs font-medium px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition"
            >
              <ExternalLink size={13} /> Оверлей
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-[#71717A] hover:text-white p-2 rounded-xl transition cursor-pointer"
              title="Выход"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>

        {showStyleSelector && (
          <div className="bg-[#121215] border border-[#27272A] rounded-2xl p-4 shadow-xl">
            <WidgetStyleSelector
              selectedStyle={widgetStyle}
              customTokens={customTokens}
              onChangeStyle={handleStyleChange}
              onChangeCustomTokens={handleCustomTokensChange}
              onSave={handleSaveStyle}
              onClose={() => setShowStyleSelector(false)}
              previewBonuses={formattedBonuses}
            />
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-[#121215] border border-[#27272A] p-3.5 rounded-2xl">
            <div className="flex items-center justify-between text-[10px] text-[#71717A] font-mono uppercase tracking-wider">
              <span>Старт Баланс</span>
              <button onClick={() => setIsEditingBalance(true)} className="hover:text-white transition cursor-pointer">
                <Edit2 size={10} />
              </button>
            </div>
            {isEditingBalance ? (
              <div className="flex items-center gap-1 mt-0.5">
                <input
                  type="number"
                  value={startBalanceInput}
                  onChange={(e) => setStartBalanceInput(Number(e.target.value))}
                  className="w-full bg-[#09090B] border border-[#3F3F46] rounded-md px-1.5 py-0.5 text-xs text-white"
                />
                <button onClick={handleSaveStartBalance} className="p-1 bg-[#27272A] text-white rounded-md">
                  <Check size={12} />
                </button>
              </div>
            ) : (
              <div className="text-lg font-semibold text-white mt-0.5">${startBalance.toLocaleString()}</div>
            )}
          </div>

          <div className="bg-[#121215] border border-[#27272A] p-3.5 rounded-2xl">
            <div className="text-[10px] text-[#71717A] font-mono uppercase tracking-wider">Текущий Баланс</div>
            <div className={`text-lg font-semibold mt-0.5 ${currentBalance >= startBalance ? 'text-emerald-400' : 'text-rose-400'}`}>
              ${currentBalance.toLocaleString()}
            </div>
          </div>

          <div className="bg-[#121215] border border-[#27272A] p-3.5 rounded-2xl">
            <div className="text-[10px] text-[#71717A] font-mono uppercase tracking-wider">Затрачено</div>
            <div className="text-lg font-semibold text-[#E4E4E7] mt-0.5">${totalSpent.toLocaleString()}</div>
          </div>

          <div className="bg-[#121215] border border-[#27272A] p-3.5 rounded-2xl">
            <div className="text-[10px] text-[#71717A] font-mono uppercase tracking-wider">Профит</div>
            <div className={`text-lg font-semibold mt-0.5 ${profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              ${profit.toLocaleString()}
            </div>
          </div>

          <div className="bg-[#121215] border border-[#27272A] p-3.5 rounded-2xl">
            <div className="text-[10px] text-[#71717A] font-mono uppercase tracking-wider">Средний X</div>
            <div className="text-lg font-semibold text-white mt-0.5">{avgX}x</div>
          </div>
        </div>

        <div className="bg-[#121215] border border-[#27272A] rounded-2xl p-4">
          <QuickAddBonusForm
            streamId={currentStreamId}
            onBonusAdded={loadData}
            onAdded={loadData}
          />
        </div>

        <div className="bg-[#121215] border border-[#27272A] rounded-2xl p-4">
          <BonusList bonuses={formattedBonuses} onBonusUpdated={loadData} />
        </div>

      </div>
    </div>
  );
};