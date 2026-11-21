import { useMemo, useState } from 'react';
import {
  Search,
  RotateCcw,
  Pause,
  Play,
  Ban,
  CheckCircle2,
  EyeOff,
  Eye,
  Lock,
  BookmarkPlus,
} from 'lucide-react';
import type {
  ActiveSlotTarget,
  DraftFormat,
  DraftStep,
  Hero,
  HeroRole,
  LaneName,
  TeamSide,
} from '../types/draft';
import { LANE_OPTIONS, ROLE_OPTIONS } from '../data/draftFormats';
import { HeroAvatar } from './HeroAvatar';

interface HeroPoolProps {
  heroes: Hero[];
  loading: boolean;
  format: DraftFormat;
  currentStep: DraftStep | null;
  currentStepIndex: number;
  totalSteps: number;
  isComplete: boolean;
  manualTarget: ActiveSlotTarget | null;
  onCancelManualTarget: () => void;
  blueBans: (Hero | null)[];
  redBans: (Hero | null)[];
  bluePicks: (Hero | null)[];
  redPicks: (Hero | null)[];
  globalBanEnabled: boolean;
  currentGameNumber: number;
  blueGlobalBannedIds: Set<string>;
  redGlobalBannedIds: Set<string>;
  onSelectHero: (hero: Hero) => void;
  onUndo: () => void;
  canUndo: boolean;
  timerSeconds: number | null;
  timeRemaining: number;
  timerRunning: boolean;
  onToggleTimerRunning: () => void;
  onSaveGameToSeries: () => void;
  confirmBeforeLock: boolean;
  onToggleConfirmMode: () => void;
}

export function HeroPool({
  heroes,
  loading,
  format,
  currentStep,
  currentStepIndex,
  totalSteps,
  isComplete,
  manualTarget,
  onCancelManualTarget,
  blueBans,
  redBans,
  bluePicks,
  redPicks,
  globalBanEnabled,
  currentGameNumber,
  blueGlobalBannedIds,
  redGlobalBannedIds,
  onSelectHero,
  onUndo,
  canUndo,
  timerSeconds,
  timeRemaining,
  timerRunning,
  onToggleTimerRunning,
  onSaveGameToSeries,
  confirmBeforeLock,
  onToggleConfirmMode,
}: HeroPoolProps) {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<HeroRole | 'All'>('All');
  const [laneFilter, setLaneFilter] = useState<LaneName | 'All'>('All');
  const [hideUsed, setHideUsed] = useState(false);
  const [stagedHero, setStagedHero] = useState<Hero | null>(null);
  const [hoveredHero, setHoveredHero] = useState<Hero | null>(null);

  const activeSide: TeamSide | null = manualTarget
    ? manualTarget.side
    : currentStep?.side || null;
  const activeType = manualTarget ? manualTarget.type : currentStep?.type || null;
  const isGame7Reset = globalBanEnabled && currentGameNumber === 7;

  const usageMap = useMemo(() => {
    const map = new Map<
      string,
      { status: 'blue-ban' | 'red-ban' | 'blue-pick' | 'red-pick'; label: string }
    >();
    blueBans.forEach((h, i) => {
      if (h) map.set(h.id, { status: 'blue-ban', label: `BAN ฟ้า #${i + 1}` });
    });
    redBans.forEach((h, i) => {
      if (h) map.set(h.id, { status: 'red-ban', label: `BAN แดง #${i + 1}` });
    });
    bluePicks.forEach((h, i) => {
      if (h) map.set(h.id, { status: 'blue-pick', label: `BLUE P${i + 1}` });
    });
    redPicks.forEach((h, i) => {
      if (h) map.set(h.id, { status: 'red-pick', label: `RED P${i + 1}` });
    });
    return map;
  }, [blueBans, redBans, bluePicks, redPicks]);

  const filteredHeroes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return heroes.filter((hero) => {
      if (q) {
        const match =
          hero.name.toLowerCase().includes(q) ||
          hero.wikiName.toLowerCase().includes(q) ||
          hero.title.toLowerCase().includes(q) ||
          hero.roleTh.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (roleFilter !== 'All' && !hero.roles.includes(roleFilter)) return false;
      if (laneFilter !== 'All' && !hero.lanes.includes(laneFilter)) return false;
      if (hideUsed && usageMap.has(hero.id)) return false;
      return true;
    });
  }, [heroes, search, roleFilter, laneFilter, hideUsed, usageMap]);

  const isGloballyBlockedForActivePick = (heroId: string): boolean => {
    if (!globalBanEnabled || isGame7Reset) return false;
    if (activeType !== 'pick' || !activeSide) return false;
    return activeSide === 'blue'
      ? blueGlobalBannedIds.has(heroId)
      : redGlobalBannedIds.has(heroId);
  };

  const handleTileClick = (hero: Hero) => {
    if (usageMap.has(hero.id)) return;
    if (isGloballyBlockedForActivePick(hero.id)) return;
    if (!manualTarget && isComplete) return;

    if (confirmBeforeLock && !manualTarget) {
      if (stagedHero?.id === hero.id) {
        onSelectHero(hero);
        setStagedHero(null);
      } else {
        setStagedHero(hero);
      }
      return;
    }

    onSelectHero(hero);
    setStagedHero(null);
  };

  const handleConfirmStaged = () => {
    if (!stagedHero) return;
    onSelectHero(stagedHero);
    setStagedHero(null);
  };

  const previewHero = hoveredHero || stagedHero;

  return (
    <section
      aria-label="คลังฮีโร่ตรงกลางสำหรับเลือกและแบน"
      className="flex flex-col bg-[#0D121D] border border-slate-800/90 rounded-xl overflow-hidden h-full"
    >
      {/* Active Phase & Turn Broadcast Header */}
      <div className="px-4 py-2.5 border-b border-slate-800/90 bg-[#0B101B]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            {manualTarget ? (
              <div className="flex items-center gap-2">
                <span className="font-display text-lg font-bold text-amber-400">
                  แก้ไขช่อง: ฝั่ง{manualTarget.side === 'blue' ? 'ฟ้า' : 'แดง'}{' '}
                  {manualTarget.type === 'ban'
                    ? `B${manualTarget.slotIndex + 1}`
                    : `P${manualTarget.slotIndex + 1}`}
                </span>
                <button
                  type="button"
                  onClick={onCancelManualTarget}
                  className="text-xs px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer whitespace-nowrap"
                >
                  กลับสู่ลำดับปกติ
                </button>
              </div>
            ) : isComplete ? (
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-display text-lg font-bold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  ดราฟต์ครบสมบูรณ์ทั้งสองฝั่งแล้ว
                </span>
                {globalBanEnabled && (
                  <button
                    type="button"
                    onClick={onSaveGameToSeries}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <BookmarkPlus className="w-3.5 h-3.5" />
                    บันทึกเกม {currentGameNumber} และเริ่มเกมถัดไป
                  </button>
                )}
              </div>
            ) : currentStep ? (
              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                <span
                  className={`font-display text-xl font-bold tracking-wide ${
                    currentStep.side === 'blue' ? 'text-sky-400' : 'text-rose-400'
                  }`}
                >
                  {currentStep.side === 'blue' ? 'ฝั่งฟ้า (BLUE)' : 'ฝั่งแดง (RED)'}
                </span>
                <span className="text-sm font-semibold text-white">
                  {currentStep.type === 'ban'
                    ? `กำลังแบนตัวที่ ${currentStep.slotIndex + 1}`
                    : `กำลังเลือกตัวที่ ${currentStep.slotIndex + 1}`}
                </span>
                <span className="text-xs text-slate-400 tabular-nums">
                  ({currentStepIndex + 1}/{totalSteps} · {currentStep.phaseLabel})
                </span>
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {timerSeconds !== null && !isComplete && !manualTarget && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#111827] border border-slate-800">
                <span
                  className={`font-mono-tabular text-xs font-bold w-7 text-center ${
                    timeRemaining <= 10 ? 'text-rose-400' : 'text-amber-400'
                  }`}
                >
                  {timeRemaining}s
                </span>
                <button
                  type="button"
                  onClick={onToggleTimerRunning}
                  className="p-0.5 rounded text-slate-400 hover:text-white cursor-pointer"
                  aria-label={timerRunning ? 'หยุดเวลาชั่วคราว' : 'เริ่มนับเวลา'}
                >
                  {timerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-700 bg-[#121928] hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none text-xs font-medium text-slate-200 transition-colors cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              ย้อนกลับ
            </button>
          </div>
        </div>

        {/* Step Sequence Progress Bar */}
        <div
          className="mt-2.5 grid gap-1"
          style={{ gridTemplateColumns: `repeat(${format.steps.length}, minmax(0, 1fr))` }}
        >
          {format.steps.map((step, i) => {
            const done = i < currentStepIndex;
            const current = i === currentStepIndex && !isComplete;
            const colorClass =
              step.side === 'blue'
                ? current
                  ? 'bg-sky-400'
                  : done
                    ? 'bg-sky-600/80'
                    : 'bg-slate-800'
                : current
                  ? 'bg-rose-400'
                  : done
                    ? 'bg-rose-600/80'
                    : 'bg-slate-800';
            return (
              <div
                key={step.stepNumber}
                title={`${step.stepNumber}. ${step.side === 'blue' ? 'Blue' : 'Red'} ${step.type.toUpperCase()} ${step.slotIndex + 1}`}
                className={`h-1.5 rounded-full transition-colors ${colorClass}`}
              />
            );
          })}
        </div>
      </div>

      {/* Search & Role Filters */}
      <div className="px-3.5 py-2.5 border-b border-slate-800/80 bg-[#0D121D] space-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="relative flex-1 min-w-[150px]">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อฮีโร่..."
              className="w-full bg-[#080B12] border border-slate-800 focus:border-sky-500 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none"
            />
          </div>

          <select
            value={laneFilter}
            onChange={(e) => setLaneFilter(e.target.value as LaneName | 'All')}
            aria-label="กรองตามเลน"
            className="bg-[#080B12] border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 cursor-pointer"
          >
            {LANE_OPTIONS.map((l) => (
              <option key={l.id} value={l.id} className="bg-[#0D121D]">
                {l.labelTh}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setHideUsed((v) => !v)}
            className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              hideUsed
                ? 'border-sky-500/60 bg-sky-950/50 text-sky-300'
                : 'border-slate-800 bg-[#080B12] text-slate-400 hover:text-slate-200'
            }`}
          >
            {hideUsed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            ซ่อนตัวใช้แล้ว
          </button>

          <button
            type="button"
            onClick={onToggleConfirmMode}
            className={`inline-flex items-center px-2 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              confirmBeforeLock
                ? 'border-amber-500/60 bg-amber-950/40 text-amber-300'
                : 'border-slate-800 bg-[#080B12] text-slate-400 hover:text-slate-200'
            }`}
          >
            {confirmBeforeLock ? 'กดยืนยัน' : 'คลิกล็อกทันที'}
          </button>
        </div>

        {/* Role Filter Segmented Buttons */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-[#080B12] border border-slate-800/80 rounded-lg">
          {ROLE_OPTIONS.map((opt) => {
            const active = roleFilter === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setRoleFilter(opt.id)}
                className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  active ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {opt.labelTh}
              </button>
            );
          })}
          <span className="ml-auto pr-1.5 text-[11px] text-slate-500 tabular-nums whitespace-nowrap">
            {filteredHeroes.length}/{heroes.length}
          </span>
        </div>
      </div>

      {/* Confirmation Banner if confirmBeforeLock is enabled and hero is staged */}
      {confirmBeforeLock && stagedHero && !manualTarget && !isComplete && currentStep && (
        <div className="px-3.5 py-2 border-b border-amber-500/30 bg-amber-950/25 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <HeroAvatar hero={stagedHero} size="sm" className="w-8 h-8 rounded-md border border-amber-400/50 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{stagedHero.name}</p>
              <p className="text-[11px] text-slate-300 truncate">{stagedHero.roleTh} · {stagedHero.laneTh}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setStagedHero(null)}
              className="px-2.5 py-1 rounded-lg border border-slate-700 text-xs text-slate-300 hover:text-white cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleConfirmStaged}
              className={`px-3 py-1 rounded-lg text-xs font-semibold text-white cursor-pointer whitespace-nowrap ${
                currentStep.type === 'ban'
                  ? 'bg-rose-600 hover:bg-rose-500'
                  : currentStep.side === 'blue'
                    ? 'bg-sky-600 hover:bg-sky-500'
                    : 'bg-rose-600 hover:bg-rose-500'
              }`}
            >
              {currentStep.type === 'ban' ? 'ยืนยันแบน' : 'ยืนยันเลือก'}
            </button>
          </div>
        </div>
      )}

      {/* Hero Grid */}
      <div className="flex-1 p-3 overflow-y-auto max-h-[520px] md:max-h-[calc(100vh-305px)] min-h-[360px]">
        {loading ? (
          <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2">
            {Array.from({ length: 28 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square rounded-lg bg-slate-800/50 animate-pulse"
              />
            ))}
          </div>
        ) : filteredHeroes.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center px-4">
            <p className="text-sm font-medium text-slate-300">ไม่พบฮีโร่ที่ตรงกับเงื่อนไข</p>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setRoleFilter('All');
                setLaneFilter('All');
                setHideUsed(false);
              }}
              className="mt-2.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 cursor-pointer"
            >
              ล้างตัวกรองทั้งหมด
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-1.5">
            {filteredHeroes.map((hero) => {
              const usage = usageMap.get(hero.id);
              const globalBlocked = isGloballyBlockedForActivePick(hero.id);
              const usedByBlueBefore = globalBanEnabled && !isGame7Reset && blueGlobalBannedIds.has(hero.id);
              const usedByRedBefore = globalBanEnabled && !isGame7Reset && redGlobalBannedIds.has(hero.id);
              const isStaged = stagedHero?.id === hero.id;
              const disabled = Boolean(usage) || globalBlocked || (!manualTarget && isComplete);

              return (
                <button
                  key={hero.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleTileClick(hero)}
                  onMouseEnter={() => setHoveredHero(hero)}
                  onMouseLeave={() => setHoveredHero(null)}
                  className={`group relative flex flex-col rounded-lg border overflow-hidden transition-transform duration-150 text-left ${
                    isStaged
                      ? 'border-amber-400 ring-2 ring-amber-400/50 scale-[1.02]'
                      : disabled
                        ? 'border-slate-800/70 opacity-45 cursor-not-allowed'
                        : 'border-slate-800/90 bg-[#111827] hover:border-slate-500 hover:-translate-y-0.5 cursor-pointer'
                  }`}
                >
                  <div className="relative aspect-square w-full bg-[#090D16] overflow-hidden">
                    <HeroAvatar
                      hero={hero}
                      size="md"
                      className={`w-full h-full ${usage || globalBlocked ? 'grayscale' : ''}`}
                    />

                    {usage && (
                      <div className="absolute inset-0 bg-black/65 flex flex-col items-center justify-center p-1">
                        {usage.status.includes('ban') && (
                          <Ban className="w-4 h-4 text-rose-400 mb-0.5" />
                        )}
                        <span
                          className={`font-mono-tabular text-[9px] font-bold px-1 py-0.5 rounded ${
                            usage.status === 'blue-pick'
                              ? 'bg-sky-600/90 text-white'
                              : usage.status === 'red-pick'
                                ? 'bg-rose-600/90 text-white'
                                : 'bg-slate-900/90 text-rose-300 border border-rose-500/40'
                          }`}
                        >
                          {usage.label}
                        </span>
                      </div>
                    )}

                    {!usage && (usedByBlueBefore || usedByRedBefore) && (
                      <div
                        className={`absolute top-1 right-1 flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-mono-tabular font-semibold ${
                          globalBlocked
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-slate-950/85 text-amber-300 border border-amber-500/40'
                        }`}
                        title="ถูกเลือกไปแล้วในเกมก่อนหน้า (Global Ban-Pick)"
                      >
                        <Lock className="w-2.5 h-2.5" />
                        <span>
                          {usedByBlueBefore && usedByRedBefore
                            ? 'B·R'
                            : usedByBlueBefore
                              ? 'B'
                              : 'R'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="px-1 py-1 bg-[#0C111C] border-t border-slate-800/80">
                    <p className="text-[10px] font-medium text-slate-100 truncate text-center leading-tight">
                      {hero.name}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Hero Inspector Bar */}
      <div className="px-3.5 py-2 border-t border-slate-800/80 bg-[#0A0F18] flex items-center justify-between gap-2 text-xs text-slate-400 min-h-[36px]">
        {previewHero ? (
          <div className="flex items-center gap-2 min-w-0 truncate">
            <span className="font-semibold text-slate-100">{previewHero.name}</span>
            {previewHero.title && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-slate-400 truncate">{previewHero.title}</span>
              </>
            )}
            <span aria-hidden="true">·</span>
            <span className="text-sky-300">{previewHero.roleTh}</span>
            <span aria-hidden="true">·</span>
            <span>{previewHero.laneTh}</span>
          </div>
        ) : (
          <span className="truncate">
            ชี้ที่รูปฮีโร่เพื่อดูตำแหน่ง · คลิกเลือก/แบนเข้าช่องฝั่งที่กำลังเดินรอบ
          </span>
        )}
      </div>
    </section>
  );
}
