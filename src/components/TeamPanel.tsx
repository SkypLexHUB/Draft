import { useState } from 'react';
import { Ban, Check, Pencil, X } from 'lucide-react';
import type { ActiveSlotTarget, Hero, HeroRole, LaneName, TeamSide } from '../types/draft';
import { DEFAULT_SLOT_LANES } from '../data/draftFormats';
import { HeroAvatar } from './HeroAvatar';

interface TeamPanelProps {
  side: TeamSide;
  teamName: string;
  onTeamNameChange: (name: string) => void;
  bans: (Hero | null)[];
  picks: (Hero | null)[];
  pickLanes: LaneName[];
  onPickLaneChange: (slotIndex: number, lane: LaneName) => void;
  activeTarget: ActiveSlotTarget | null;
  manualTarget: ActiveSlotTarget | null;
  onSelectSlotTarget: (target: ActiveSlotTarget) => void;
  onClearSlot: (side: TeamSide, type: 'ban' | 'pick', slotIndex: number) => void;
  globalBannedCount: number;
  isFirstPick: boolean;
}

const ROLE_LABELS_TH: { role: HeroRole; label: string }[] = [
  { role: 'Tank', label: 'แทงค์' },
  { role: 'Fighter', label: 'ไฟต์' },
  { role: 'Assassin', label: 'แอส' },
  { role: 'Mage', label: 'เมจ' },
  { role: 'Marksman', label: 'แครี่' },
  { role: 'Support', label: 'ซัพ' },
];

export function TeamPanel({
  side,
  teamName,
  onTeamNameChange,
  bans,
  picks,
  pickLanes,
  onPickLaneChange,
  activeTarget,
  manualTarget,
  onSelectSlotTarget,
  onClearSlot,
  globalBannedCount,
  isFirstPick,
}: TeamPanelProps) {
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(teamName);

  const isBlue = side === 'blue';
  const sideColorText = isBlue ? 'text-sky-400' : 'text-rose-400';
  const sideHeaderBg = isBlue
    ? 'bg-gradient-to-r from-sky-950/80 via-[#0E1628] to-[#0D121D]'
    : 'bg-gradient-to-l from-rose-950/80 via-[#22111B] to-[#0D121D]';
  const sideFrameBorder = isBlue
    ? 'border-sky-500/25'
    : 'border-rose-500/25';
  const activeBorder = isBlue
    ? 'border-sky-400 ring-1 ring-sky-400/50 bg-sky-950/40'
    : 'border-rose-400 ring-1 ring-rose-400/50 bg-rose-950/40';
  const manualBorder = 'border-amber-400 ring-1 ring-amber-400/45 bg-amber-950/25';

  const commitName = () => {
    const trimmed = draftName.trim();
    if (trimmed) {
      onTeamNameChange(trimmed);
    } else {
      setDraftName(teamName);
    }
    setEditingName(false);
  };

  const roleCounts = ROLE_LABELS_TH.map(({ role, label }) => {
    const count = picks.filter((h) => h && h.roles.includes(role)).length;
    return { role, label, count };
  });

  const pickedCount = picks.filter(Boolean).length;
  const bannedCount = bans.filter(Boolean).length;

  return (
    <aside
      aria-label={isBlue ? 'ฝั่งสีฟ้า (Blue Side)' : 'ฝั่งสีแดง (Red Side)'}
      className={`flex flex-col bg-[#0D121D] border ${sideFrameBorder} rounded-xl overflow-hidden h-full`}
    >
      {/* Team Header */}
      <div className={`px-3.5 py-2.5 border-b border-slate-800/90 ${sideHeaderBg}`}>
        <div className={`flex items-center justify-between gap-2 ${!isBlue ? 'flex-row-reverse' : ''}`}>
          {editingName ? (
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <input
                type="text"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitName();
                  if (e.key === 'Escape') {
                    setDraftName(teamName);
                    setEditingName(false);
                  }
                }}
                maxLength={24}
                autoFocus
                className="w-full bg-[#080B12] border border-slate-700 rounded-md px-2 py-1 text-sm font-semibold text-white focus:outline-none focus:border-sky-400"
              />
              <button
                type="button"
                onClick={commitName}
                className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                aria-label="บันทึกชื่อทีม"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setDraftName(teamName);
                setEditingName(true);
              }}
              className={`group flex items-center gap-1.5 min-w-0 cursor-pointer ${!isBlue ? 'flex-row-reverse text-right' : 'text-left'}`}
              title="คลิกเพื่อแก้ไขชื่อทีม"
            >
              <span className={`font-display text-lg font-bold tracking-wide truncate ${sideColorText}`}>
                {teamName}
              </span>
              <Pencil className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </button>
          )}

          <span className="text-[11px] font-medium text-slate-400 whitespace-nowrap shrink-0">
            {isFirstPick ? 'First Pick' : 'Counter Pick'}
          </span>
        </div>

        <div className={`mt-1 flex items-center gap-2 text-[11px] text-slate-400 tabular-nums ${!isBlue ? 'justify-end' : ''}`}>
          <span>แบน {bannedCount}/{bans.length}</span>
          <span aria-hidden="true">·</span>
          <span>เลือก {pickedCount}/5</span>
          {globalBannedCount > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-amber-400">G-Ban {globalBannedCount}</span>
            </>
          )}
        </div>
      </div>

      {/* Ban Slots */}
      <div className="px-3 py-2.5 border-b border-slate-800/80 bg-[#0A0F18]">
        <div className={`flex items-center justify-between mb-1.5 ${!isBlue ? 'flex-row-reverse' : ''}`}>
          <span className="text-[11px] font-medium text-slate-400">
            แบนฝั่ง{isBlue ? 'ฟ้า' : 'แดง'} ({bans.length})
          </span>
          <span className="text-[10px] text-slate-500">คลิกช่องเพื่อแก้ไข</span>
        </div>
        <div
          className={`grid gap-1.5 ${
            bans.length === 5
              ? 'grid-cols-5'
              : bans.length === 4
                ? 'grid-cols-4'
                : bans.length === 3
                  ? 'grid-cols-3'
                  : 'grid-cols-2'
          }`}
        >
          {bans.map((hero, idx) => {
            const isStepActive =
              activeTarget?.side === side &&
              activeTarget?.type === 'ban' &&
              activeTarget?.slotIndex === idx;
            const isManualActive =
              manualTarget?.side === side &&
              manualTarget?.type === 'ban' &&
              manualTarget?.slotIndex === idx;

            return (
              <div key={idx} className="relative group">
                <button
                  type="button"
                  onClick={() => onSelectSlotTarget({ side, type: 'ban', slotIndex: idx })}
                  className={`w-full aspect-square rounded-lg border transition-all duration-150 overflow-hidden flex flex-col items-center justify-center relative cursor-pointer ${
                    isManualActive
                      ? manualBorder
                      : isStepActive
                        ? activeBorder
                        : 'border-slate-800 bg-[#111827]/80 hover:border-slate-600'
                  }`}
                  title={hero ? `${hero.name} (คลิกเพื่อเปลี่ยนตัวแบน B${idx + 1})` : `แบนช่อง B${idx + 1}`}
                >
                  {hero ? (
                    <>
                      <HeroAvatar
                        hero={hero}
                        size="sm"
                        className="w-full h-full grayscale opacity-60"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent flex flex-col justify-between p-1">
                        <div className="flex justify-between items-start">
                          <span className="font-mono-tabular text-[9px] font-semibold text-rose-300 bg-black/70 px-1 rounded">
                            B{idx + 1}
                          </span>
                          <Ban className="w-3 h-3 text-rose-400" />
                        </div>
                        <span className="text-[9px] font-medium text-slate-100 truncate w-full text-center leading-tight">
                          {hero.wikiName}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-0.5 text-slate-500">
                      <Ban className={`w-3.5 h-3.5 ${isStepActive ? sideColorText : 'text-slate-600'}`} />
                      <span className="font-mono-tabular text-[10px] font-medium">B{idx + 1}</span>
                    </div>
                  )}
                </button>
                {hero && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClearSlot(side, 'ban', idx);
                    }}
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:bg-rose-600 hover:border-rose-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    aria-label={`ลบแบนช่อง B${idx + 1}`}
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Pick Slots (Mirrored for Blue vs Red so both sides face the center hero pool) */}
      <div className="p-2.5 flex-1 flex flex-col justify-between gap-2">
        {picks.map((hero, idx) => {
          const isStepActive =
            activeTarget?.side === side &&
            activeTarget?.type === 'pick' &&
            activeTarget?.slotIndex === idx;
          const isManualActive =
            manualTarget?.side === side &&
            manualTarget?.type === 'pick' &&
            manualTarget?.slotIndex === idx;

          const currentLane = pickLanes[idx] || DEFAULT_SLOT_LANES[idx];

          return (
            <div
              key={idx}
              className={`relative rounded-lg border transition-all duration-150 flex-1 flex items-center ${
                isManualActive
                  ? manualBorder
                  : isStepActive
                    ? activeBorder
                    : 'border-slate-800/90 bg-[#111726]/75 hover:border-slate-700'
              }`}
            >
              <div
                onClick={() => onSelectSlotTarget({ side, type: 'pick', slotIndex: idx })}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectSlotTarget({ side, type: 'pick', slotIndex: idx });
                  }
                }}
                className={`w-full flex items-center gap-2.5 p-2 cursor-pointer ${
                  !isBlue ? 'flex-row-reverse text-right' : ''
                }`}
              >
                {/* Portrait Box */}
                <div
                  className={`w-12 h-12 lg:w-14 lg:h-14 rounded-lg overflow-hidden border bg-[#0A0E17] shrink-0 relative flex items-center justify-center ${
                    isStepActive
                      ? isBlue
                        ? 'border-sky-400'
                        : 'border-rose-400'
                      : 'border-slate-700/80'
                  }`}
                >
                  {hero ? (
                    <HeroAvatar hero={hero} size="md" className="w-full h-full" />
                  ) : (
                    <span className={`font-display text-base font-bold ${isStepActive ? sideColorText : 'text-slate-600'}`}>
                      P{idx + 1}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className={`flex items-center justify-between gap-1.5 ${!isBlue ? 'flex-row-reverse' : ''}`}>
                    <span className={`font-mono-tabular text-[11px] font-semibold ${isBlue ? 'text-sky-400/90' : 'text-rose-400/90'}`}>
                      {isBlue ? 'B' : 'R'}{idx + 1}
                    </span>
                    <select
                      value={currentLane}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => onPickLaneChange(idx, e.target.value as LaneName)}
                      aria-label={`เลือกตำแหน่งเลนช่อง P${idx + 1}`}
                      className={`bg-transparent text-[11px] text-slate-400 hover:text-slate-200 focus:outline-none cursor-pointer ${
                        !isBlue ? 'text-left' : 'text-right'
                      }`}
                    >
                      {DEFAULT_SLOT_LANES.map((lane) => (
                        <option key={lane} value={lane} className="bg-[#0F172A] text-slate-100">
                          {lane}
                        </option>
                      ))}
                    </select>
                  </div>

                  {hero ? (
                    <>
                      <p className="text-sm font-semibold text-white truncate mt-0.5 leading-snug">
                        {hero.name}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {hero.roleTh}
                      </p>
                    </>
                  ) : (
                    <p className={`text-xs mt-1 truncate ${isStepActive ? `${sideColorText} font-medium` : 'text-slate-500'}`}>
                      {isManualActive
                        ? 'กำลังเลือกกำหนดช่องนี้'
                        : isStepActive
                          ? 'กำลังเลือกตัวละคร...'
                          : 'รอเลือกฮีโร่'}
                    </p>
                  )}
                </div>

                {hero && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClearSlot(side, 'pick', idx);
                    }}
                    className="p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-slate-800/80 transition-colors cursor-pointer shrink-0"
                    aria-label={`ล้างตัวละครช่อง P${idx + 1}`}
                    title="ล้างช่องนี้"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Role Composition Summary */}
      <div className="px-3 py-2 border-t border-slate-800/80 bg-[#0A0F18] grid grid-cols-3 gap-x-2 gap-y-0.5 text-[11px] text-slate-400 tabular-nums">
        {roleCounts.map((rc) => (
          <span
            key={rc.role}
            className={`truncate ${rc.count > 0 ? 'text-slate-200 font-medium' : 'text-slate-500'}`}
          >
            {rc.label} {rc.count}
          </span>
        ))}
      </div>
    </aside>
  );
}
