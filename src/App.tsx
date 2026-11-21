import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  BookmarkPlus,
  RefreshCw,
  RotateCcw,
  ShieldBan,
  Volume2,
  VolumeX,
} from 'lucide-react';
import bundledHeroes from './data/heroes.json';
import { DEFAULT_SLOT_LANES, DRAFT_FORMATS } from './data/draftFormats';
import type {
  ActiveSlotTarget,
  DraftFormatId,
  Hero,
  LaneName,
  SeriesGameRecord,
  TeamSide,
} from './types/draft';
import { TeamPanel } from './components/TeamPanel';
import { HeroPool } from './components/HeroPool';
import { RulesView } from './components/RulesView';
import { HistoryView } from './components/HistoryView';
import { playDraftCue } from './utils/sound';

type AppTab = 'draft' | 'rules' | 'history';

interface DraftSnapshot {
  blueBans: (Hero | null)[];
  redBans: (Hero | null)[];
  bluePicks: (Hero | null)[];
  redPicks: (Hero | null)[];
  stepIndex: number;
}

const STORAGE_KEY_HISTORY = 'rov_draft_series_2026_v1';

function createEmptySlots(count: number): (Hero | null)[] {
  return Array.from({ length: count }, () => null);
}

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('draft');

  // Hero catalog state (instant initial load from snapshot + background sync from /api/heroes)
  const [heroes, setHeroes] = useState<Hero[]>(bundledHeroes as Hero[]);
  const [heroesLoading, setHeroesLoading] = useState(false);
  const [syncingWiki, setSyncingWiki] = useState(false);
  const [heroSourceNote, setHeroSourceNote] = useState<string>('Arena of Valor Thailand Wiki');

  // Draft Configuration
  const [formatId, setFormatId] = useState<DraftFormatId>('tournament-8');
  const format = DRAFT_FORMATS[formatId];

  // Team metadata
  const [blueTeamName, setBlueTeamName] = useState('BLUE SIDE · ทีมฟ้า');
  const [redTeamName, setRedTeamName] = useState('RED SIDE · ทีมแดง');
  const [bluePickLanes, setBluePickLanes] = useState<LaneName[]>([...DEFAULT_SLOT_LANES]);
  const [redPickLanes, setRedPickLanes] = useState<LaneName[]>([...DEFAULT_SLOT_LANES]);

  // Draft slots & undo stack
  const [blueBans, setBlueBans] = useState<(Hero | null)[]>(() =>
    createEmptySlots(DRAFT_FORMATS['tournament-8'].bansPerSide)
  );
  const [redBans, setRedBans] = useState<(Hero | null)[]>(() =>
    createEmptySlots(DRAFT_FORMATS['tournament-8'].bansPerSide)
  );
  const [bluePicks, setBluePicks] = useState<(Hero | null)[]>(() => createEmptySlots(5));
  const [redPicks, setRedPicks] = useState<(Hero | null)[]>(() => createEmptySlots(5));
  const [stepIndex, setStepIndex] = useState(0);
  const [historyStack, setHistoryStack] = useState<DraftSnapshot[]>([]);
  const [manualTarget, setManualTarget] = useState<ActiveSlotTarget | null>(null);

  // Global Ban-Pick Series State
  const [globalBanEnabled, setGlobalBanEnabled] = useState(true);
  const [currentGameNumber, setCurrentGameNumber] = useState(1);
  const [seriesRecords, setSeriesRecords] = useState<SeriesGameRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_HISTORY);
      return saved ? (JSON.parse(saved) as SeriesGameRecord[]) : [];
    } catch {
      return [];
    }
  });

  // UX & Timer settings
  const [timerSeconds, setTimerSeconds] = useState<number | null>(45);
  const [timeRemaining, setTimeRemaining] = useState<number>(45);
  const [timerRunning, setTimerRunning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [confirmBeforeLock, setConfirmBeforeLock] = useState(false);

  // Persist series records
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(seriesRecords));
    } catch {
      // Ignore storage quota errors
    }
  }, [seriesRecords]);

  // Sync heroes from backend /api/heroes (which parses arena-of-valor.fandom.com/th/wiki/ฮีโร่)
  const syncHeroes = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) {
      setSyncingWiki(true);
    } else {
      setHeroesLoading(false);
    }
    try {
      const res = await fetch(`/api/heroes${forceRefresh ? '?refresh=1' : ''}`);
      if (!res.ok) return;
      const data = (await res.json()) as {
        source: string;
        count: number;
        heroes: Hero[];
      };
      if (Array.isArray(data.heroes) && data.heroes.length > 0) {
        setHeroes(data.heroes);
        setHeroSourceNote(
          data.source === 'wiki-live'
            ? `ซิงค์ล่าสุดจาก Wiki (${data.count} ฮีโร่)`
            : `ข้อมูลจาก Wiki (${data.count} ฮีโร่)`
        );
      }
    } catch {
      // Keep bundled snapshot if offline
    } finally {
      setHeroesLoading(false);
      setSyncingWiki(false);
    }
  }, []);

  useEffect(() => {
    syncHeroes(false);
  }, [syncHeroes]);

  const currentStep = stepIndex < format.steps.length ? format.steps[stepIndex] : null;
  const isComplete = stepIndex >= format.steps.length;

  // Countdown Timer Effect
  useEffect(() => {
    if (!timerRunning || timerSeconds === null || isComplete || manualTarget) return;
    const id = window.setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          playDraftCue('tick', soundEnabled);
          setTimerRunning(false);
          return 0;
        }
        if (prev <= 6) {
          playDraftCue('tick', soundEnabled);
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [timerRunning, timerSeconds, isComplete, manualTarget, soundEnabled]);

  // Compute Global Ban-Pick lockouts from previous games in the series (games < currentGameNumber)
  const { blueGlobalBannedIds, redGlobalBannedIds } = useMemo(() => {
    const blueSet = new Set<string>();
    const redSet = new Set<string>();
    if (!globalBanEnabled || currentGameNumber === 7) {
      return { blueGlobalBannedIds: blueSet, redGlobalBannedIds: redSet };
    }
    for (const rec of seriesRecords) {
      if (rec.gameNumber < currentGameNumber) {
        rec.bluePicks.forEach((h) => {
          if (h) blueSet.add(h.id);
        });
        rec.redPicks.forEach((h) => {
          if (h) redSet.add(h.id);
        });
      }
    }
    return { blueGlobalBannedIds: blueSet, redGlobalBannedIds: redSet };
  }, [globalBanEnabled, currentGameNumber, seriesRecords]);

  const pushSnapshot = useCallback(() => {
    setHistoryStack((prev) => [
      ...prev,
      {
        blueBans: [...blueBans],
        redBans: [...redBans],
        bluePicks: [...bluePicks],
        redPicks: [...redPicks],
        stepIndex,
      },
    ]);
  }, [blueBans, redBans, bluePicks, redPicks, stepIndex]);

  const resetBoard = useCallback(
    (nextFormatId: DraftFormatId = formatId) => {
      const targetFmt = DRAFT_FORMATS[nextFormatId];
      setBlueBans(createEmptySlots(targetFmt.bansPerSide));
      setRedBans(createEmptySlots(targetFmt.bansPerSide));
      setBluePicks(createEmptySlots(5));
      setRedPicks(createEmptySlots(5));
      setStepIndex(0);
      setHistoryStack([]);
      setManualTarget(null);
      setTimerRunning(false);
      if (timerSeconds !== null) setTimeRemaining(timerSeconds);
    },
    [formatId, timerSeconds]
  );

  const handleFormatChange = (nextId: DraftFormatId) => {
    setFormatId(nextId);
    resetBoard(nextId);
  };

  const handleSelectHero = (hero: Hero) => {
    const target: ActiveSlotTarget | null = manualTarget
      ? manualTarget
      : currentStep
        ? { side: currentStep.side, type: currentStep.type, slotIndex: currentStep.slotIndex }
        : null;

    if (!target) return;

    pushSnapshot();

    if (target.side === 'blue' && target.type === 'ban') {
      setBlueBans((prev) => prev.map((h, i) => (i === target.slotIndex ? hero : h)));
    } else if (target.side === 'red' && target.type === 'ban') {
      setRedBans((prev) => prev.map((h, i) => (i === target.slotIndex ? hero : h)));
    } else if (target.side === 'blue' && target.type === 'pick') {
      setBluePicks((prev) => prev.map((h, i) => (i === target.slotIndex ? hero : h)));
    } else if (target.side === 'red' && target.type === 'pick') {
      setRedPicks((prev) => prev.map((h, i) => (i === target.slotIndex ? hero : h)));
    }

    if (manualTarget) {
      playDraftCue(target.type, soundEnabled);
      setManualTarget(null);
      return;
    }

    const nextIdx = stepIndex + 1;
    setStepIndex(nextIdx);
    if (nextIdx >= format.steps.length) {
      playDraftCue('complete', soundEnabled);
      setTimerRunning(false);
    } else {
      playDraftCue(target.type, soundEnabled);
      if (timerSeconds !== null) {
        setTimeRemaining(timerSeconds);
        setTimerRunning(true);
      }
    }
  };

  const handleUndo = () => {
    if (historyStack.length === 0) return;
    const prev = historyStack[historyStack.length - 1];
    setBlueBans(prev.blueBans);
    setRedBans(prev.redBans);
    setBluePicks(prev.bluePicks);
    setRedPicks(prev.redPicks);
    setStepIndex(prev.stepIndex);
    setHistoryStack((s) => s.slice(0, -1));
    setManualTarget(null);
    if (timerSeconds !== null) {
      setTimeRemaining(timerSeconds);
    }
  };

  const handleClearSlot = (side: TeamSide, type: 'ban' | 'pick', slotIndex: number) => {
    pushSnapshot();
    if (side === 'blue' && type === 'ban') {
      setBlueBans((prev) => prev.map((h, i) => (i === slotIndex ? null : h)));
    } else if (side === 'red' && type === 'ban') {
      setRedBans((prev) => prev.map((h, i) => (i === slotIndex ? null : h)));
    } else if (side === 'blue' && type === 'pick') {
      setBluePicks((prev) => prev.map((h, i) => (i === slotIndex ? null : h)));
    } else if (side === 'red' && type === 'pick') {
      setRedPicks((prev) => prev.map((h, i) => (i === slotIndex ? null : h)));
    }
    setManualTarget({ side, type, slotIndex });
  };

  const handleSwapSides = () => {
    pushSnapshot();
    const prevBlueName = blueTeamName;
    const prevBlueBans = blueBans;
    const prevBluePicks = bluePicks;
    const prevBlueLanes = bluePickLanes;

    setBlueTeamName(redTeamName === 'RED SIDE · ทีมแดง' ? 'BLUE SIDE · ทีมฟ้า' : redTeamName);
    setRedTeamName(prevBlueName === 'BLUE SIDE · ทีมฟ้า' ? 'RED SIDE · ทีมแดง' : prevBlueName);
    setBlueBans(redBans);
    setRedBans(prevBlueBans);
    setBluePicks(redPicks);
    setRedPicks(prevBluePicks);
    setBluePickLanes(redPickLanes);
    setRedPickLanes(prevBlueLanes);
  };

  const handleSaveGameToSeries = () => {
    const newRecord: SeriesGameRecord = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      gameNumber: currentGameNumber,
      formatId,
      blueTeamName,
      redTeamName,
      blueBans: [...blueBans],
      redBans: [...redBans],
      bluePicks: [...bluePicks],
      redPicks: [...redPicks],
      savedAt: new Date().toISOString(),
    };
    setSeriesRecords((prev) => {
      const withoutSameGame = prev.filter((r) => r.gameNumber !== currentGameNumber);
      return [...withoutSameGame, newRecord].sort((a, b) => a.gameNumber - b.gameNumber);
    });

    if (currentGameNumber < 7) {
      setCurrentGameNumber((g) => g + 1);
      resetBoard(formatId);
    }
  };

  const handleLoadRecord = (record: SeriesGameRecord) => {
    setFormatId(record.formatId);
    setCurrentGameNumber(record.gameNumber);
    setBlueTeamName(record.blueTeamName);
    setRedTeamName(record.redTeamName);
    setBlueBans(record.blueBans);
    setRedBans(record.redBans);
    setBluePicks(record.bluePicks);
    setRedPicks(record.redPicks);
    setStepIndex(DRAFT_FORMATS[record.formatId].steps.length);
    setHistoryStack([]);
    setManualTarget(null);
    setActiveTab('draft');
  };

  const activeTarget: ActiveSlotTarget | null =
    !manualTarget && currentStep
      ? {
          side: currentStep.side,
          type: currentStep.type,
          slotIndex: currentStep.slotIndex,
        }
      : null;

  return (
    <div className="min-h-screen flex flex-col bg-[#080B12] text-slate-100">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-30 border-b border-slate-800/90 bg-[#080B12]/95 backdrop-blur-sm">
        <div className="max-w-[1480px] mx-auto px-4 lg:px-6 h-14 flex items-center justify-between gap-8">
          {/* Zone 1: Single text element wordmark */}
          <button
            type="button"
            onClick={() => setActiveTab('draft')}
            className="font-display text-xl font-bold tracking-wide text-white whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-2"
          >
            <ShieldBan className="w-5 h-5 text-amber-400" />
            <span>RoV Draft Arena 2026</span>
          </button>

          {/* Zone 2: Concise single-line nav links */}
          <nav aria-label="เมนูหลัก" className="flex items-center gap-6 text-sm font-medium">
            <button
              type="button"
              onClick={() => setActiveTab('draft')}
              className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'draft'
                  ? 'border-amber-400 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              กระดานดราฟต์
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('rules')}
              className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'rules'
                  ? 'border-amber-400 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              กฎการแบน 2026
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'history'
                  ? 'border-amber-400 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              ประวัติแมตช์ ({seriesRecords.length})
            </button>
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => {
                resetBoard();
                setActiveTab('draft');
              }}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              เริ่มดราฟต์ใหม่
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-[1480px] w-full mx-auto px-4 lg:px-6 py-4">
        {activeTab === 'draft' && (
          <div className="space-y-4">
            {/* Workspace Control Strip */}
            <div className="rounded-xl border border-slate-800/90 bg-[#0D121D] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
              {/* Draft Format Selector */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-slate-400 mr-1 whitespace-nowrap">โหมดดราฟต์:</span>
                <div className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-[#080B12] border border-slate-800">
                  {(Object.keys(DRAFT_FORMATS) as DraftFormatId[]).map((id) => {
                    const fmt = DRAFT_FORMATS[id];
                    const active = formatId === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => handleFormatChange(id)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          active
                            ? 'bg-slate-800 text-white'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {fmt.shortName}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Global Ban-Pick & Utility Controls */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Global BP Toggle */}
                <button
                  type="button"
                  onClick={() => setGlobalBanEnabled((v) => !v)}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    globalBanEnabled
                      ? 'border-amber-500/60 bg-amber-950/35 text-amber-300'
                      : 'border-slate-800 bg-[#080B12] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Global BP: {globalBanEnabled ? 'เปิด' : 'ปิด'}
                </button>

                {/* Game Number Selector (Bo7) */}
                {globalBanEnabled && (
                  <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-[#080B12] border border-slate-800">
                    {[1, 2, 3, 4, 5, 6, 7].map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => {
                          setCurrentGameNumber(g);
                          resetBoard(formatId);
                        }}
                        title={
                          g === 7
                            ? 'Game 7: รีเซ็ต Global Ban ทั้งหมด (Ultimate Battle)'
                            : `เกมที่ ${g} ในซีรีส์`
                        }
                        className={`px-2 py-1 rounded text-[11px] font-mono-tabular font-semibold transition-colors cursor-pointer ${
                          currentGameNumber === g
                            ? g === 7
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-slate-800 text-white'
                            : 'text-slate-500 hover:text-slate-200'
                        }`}
                      >
                        G{g}
                      </button>
                    ))}
                  </div>
                )}

                {/* Timer Duration */}
                <select
                  value={timerSeconds === null ? 'off' : String(timerSeconds)}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'off') {
                      setTimerSeconds(null);
                      setTimerRunning(false);
                    } else {
                      const sec = Number(val);
                      setTimerSeconds(sec);
                      setTimeRemaining(sec);
                    }
                  }}
                  aria-label="ตั้งเวลาดราฟต์ต่อรอบ"
                  className="bg-[#080B12] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="off">เวลา: ปิด</option>
                  <option value="30">เวลา: 30 วินาที</option>
                  <option value="45">เวลา: 45 วินาที</option>
                  <option value="60">เวลา: 60 วินาที</option>
                </select>

                {/* Swap Sides */}
                <button
                  type="button"
                  onClick={handleSwapSides}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-800 bg-[#080B12] hover:border-slate-600 text-xs text-slate-300 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  title="สลับฝั่ง Blue / Red"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  สลับฝั่ง
                </button>

                {/* Save Game to Series */}
                <button
                  type="button"
                  onClick={handleSaveGameToSeries}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-800 bg-[#080B12] hover:border-slate-600 text-xs text-slate-300 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  title="บันทึกผลดราฟต์นี้เข้าซีรีส์"
                >
                  <BookmarkPlus className="w-3.5 h-3.5" />
                  บันทึกเกม
                </button>

                {/* Sync Wiki */}
                <button
                  type="button"
                  onClick={() => syncHeroes(true)}
                  disabled={syncingWiki}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-800 bg-[#080B12] hover:border-slate-600 text-xs text-slate-300 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
                  title="ดึงข้อมูลฮีโร่ล่าสุดจาก Arena of Valor Thailand Wiki"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingWiki ? 'animate-spin' : ''}`} />
                  ซิงค์ Wiki
                </button>

                {/* Sound Toggle */}
                <button
                  type="button"
                  onClick={() => setSoundEnabled((v) => !v)}
                  className="p-1.5 rounded-lg border border-slate-800 bg-[#080B12] text-slate-300 hover:text-white cursor-pointer"
                  aria-label={soundEnabled ? 'ปิดเสียงเอฟเฟกต์' : 'เปิดเสียงเอฟเฟกต์'}
                  title={soundEnabled ? 'ปิดเสียง' : 'เปิดเสียง'}
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
                </button>
              </div>
            </div>

            {/* Game 7 Reset Info Line */}
            {globalBanEnabled && currentGameNumber === 7 && (
              <div className="px-4 py-2 rounded-lg border border-amber-500/40 bg-amber-950/25 text-xs text-amber-300 flex items-center justify-between gap-2">
                <span>
                  Game 7 Ultimate Battle: ระบบ Global Ban-Pick ถูกรีเซ็ตตามกติกาการแข่งขัน สามารถเลือกฮีโร่ทุกตัวที่เคยใช้ในเกม 1–6 ได้อีกครั้ง
                </span>
              </div>
            )}

            {/* 3-Column Draft Broadcast Board: Blue Left | Hero Pool Center | Red Right */}
            <div className="grid grid-cols-2 md:grid-cols-[220px_minmax(0,1fr)_220px] lg:grid-cols-[265px_minmax(0,1fr)_265px] xl:grid-cols-[305px_minmax(0,1fr)_305px] gap-3.5 items-stretch">
              <div className="order-1 col-span-1">
                <TeamPanel
                  side="blue"
                  teamName={blueTeamName}
                  onTeamNameChange={setBlueTeamName}
                  bans={blueBans}
                  picks={bluePicks}
                  pickLanes={bluePickLanes}
                  onPickLaneChange={(idx, lane) =>
                    setBluePickLanes((prev) => prev.map((l, i) => (i === idx ? lane : l)))
                  }
                  activeTarget={activeTarget}
                  manualTarget={manualTarget}
                  onSelectSlotTarget={setManualTarget}
                  onClearSlot={handleClearSlot}
                  globalBannedCount={blueGlobalBannedIds.size}
                  isFirstPick={true}
                />
              </div>

              <div className="order-3 col-span-2 md:order-2 md:col-span-1 min-w-0">
                <HeroPool
                  heroes={heroes}
                  loading={heroesLoading}
                  format={format}
                  currentStep={currentStep}
                  currentStepIndex={stepIndex}
                  totalSteps={format.steps.length}
                  isComplete={isComplete}
                  manualTarget={manualTarget}
                  onCancelManualTarget={() => setManualTarget(null)}
                  blueBans={blueBans}
                  redBans={redBans}
                  bluePicks={bluePicks}
                  redPicks={redPicks}
                  globalBanEnabled={globalBanEnabled}
                  currentGameNumber={currentGameNumber}
                  blueGlobalBannedIds={blueGlobalBannedIds}
                  redGlobalBannedIds={redGlobalBannedIds}
                  onSelectHero={handleSelectHero}
                  onUndo={handleUndo}
                  canUndo={historyStack.length > 0}
                  timerSeconds={timerSeconds}
                  timeRemaining={timeRemaining}
                  timerRunning={timerRunning}
                  onToggleTimerRunning={() => setTimerRunning((r) => !r)}
                  onSaveGameToSeries={handleSaveGameToSeries}
                  confirmBeforeLock={confirmBeforeLock}
                  onToggleConfirmMode={() => setConfirmBeforeLock((v) => !v)}
                />
              </div>

              <div className="order-2 md:order-3">
                <TeamPanel
                  side="red"
                  teamName={redTeamName}
                  onTeamNameChange={setRedTeamName}
                  bans={redBans}
                  picks={redPicks}
                  pickLanes={redPickLanes}
                  onPickLaneChange={(idx, lane) =>
                    setRedPickLanes((prev) => prev.map((l, i) => (i === idx ? lane : l)))
                  }
                  activeTarget={activeTarget}
                  manualTarget={manualTarget}
                  onSelectSlotTarget={setManualTarget}
                  onClearSlot={handleClearSlot}
                  globalBannedCount={redGlobalBannedIds.size}
                  isFirstPick={false}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'rules' && (
          <RulesView
            onSelectFormatAndGo={(id) => {
              handleFormatChange(id);
              setActiveTab('draft');
            }}
          />
        )}

        {activeTab === 'history' && (
          <HistoryView
            records={seriesRecords}
            onLoadRecord={handleLoadRecord}
            onDeleteRecord={(id) =>
              setSeriesRecords((prev) => prev.filter((r) => r.id !== id))
            }
            onClearAll={() => setSeriesRecords([])}
          />
        )}
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-800/80 py-3 px-4 lg:px-6 text-xs text-slate-500">
        <div className="max-w-[1480px] mx-auto flex flex-wrap items-center justify-between gap-2">
          <span>
            RoV Draft Arena 2026 · {heroSourceNote}
          </span>
          <a
            href="https://arena-of-valor.fandom.com/th/wiki/%E0%B8%AE%E0%B8%B5%E0%B9%82%E0%B8%A3%E0%B9%88"
            target="_blank"
            rel="noreferrer"
            className="hover:text-slate-300 transition-colors underline underline-offset-2"
          >
            อ้างอิงรายชื่อและรูปภาพฮีโร่: Arena of Valor Thailand Wiki
          </a>
        </div>
      </footer>
    </div>
  );
}
