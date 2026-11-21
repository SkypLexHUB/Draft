import { useState } from 'react';
import { Copy, Check, Trash2, Upload } from 'lucide-react';
import type { SeriesGameRecord } from '../types/draft';
import { DRAFT_FORMATS } from '../data/draftFormats';
import { HeroAvatar } from './HeroAvatar';

interface HistoryViewProps {
  records: SeriesGameRecord[];
  onLoadRecord: (record: SeriesGameRecord) => void;
  onDeleteRecord: (id: string) => void;
  onClearAll: () => void;
}

export function HistoryView({
  records,
  onLoadRecord,
  onDeleteRecord,
  onClearAll,
}: HistoryViewProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopySummary = async (record: SeriesGameRecord) => {
    const fmt = DRAFT_FORMATS[record.formatId];
    const text = [
      `RoV Draft — Game ${record.gameNumber} (${fmt.shortName})`,
      `${record.blueTeamName} (Blue):`,
      `  Ban: ${record.blueBans.map((h) => h?.name || '-').join(', ')}`,
      `  Pick: ${record.bluePicks.map((h) => h?.name || '-').join(', ')}`,
      `${record.redTeamName} (Red):`,
      `  Ban: ${record.redBans.map((h) => h?.name || '-').join(', ')}`,
      `  Pick: ${record.redPicks.map((h) => h?.name || '-').join(', ')}`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(record.id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      // Clipboard fallback not required
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-2">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-white tracking-wide">
            ประวัติการดราฟต์และซีรีส์ (Match History)
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            บันทึกผลการแบน-เลือกจากแต่ละเกมในซีรีส์ Global Ban-Pick เพื่อวิเคราะห์และคัดลอกแชร์ให้ทีม
          </p>
        </div>

        {records.length > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-rose-500/40 bg-rose-950/30 hover:bg-rose-950/60 text-xs font-medium text-rose-300 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            ล้างประวัติทั้งหมด
          </button>
        )}
      </div>

      {records.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-[#0D121D] p-12 text-center space-y-2">
          <p className="text-base font-medium text-slate-200">ยังไม่มีประวัติการดราฟต์ที่บันทึกไว้</p>
          <p className="text-sm text-slate-400">
            เมื่อดราฟต์จบในกระดานหลัก สามารถกด &quot;บันทึกเกมเข้าซีรีส์&quot; เพื่อเก็บข้อมูลไว้เปรียบเทียบและใช้ Global Ban-Pick ต่อเนื่องได้ทันที
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {records.map((rec) => {
            const fmt = DRAFT_FORMATS[rec.formatId];
            return (
              <div
                key={rec.id}
                className="rounded-xl border border-slate-800 bg-[#0D121D] p-5 space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-3 text-sm">
                    <span className="font-display text-lg font-bold text-amber-400">
                      GAME {rec.gameNumber}
                    </span>
                    <span className="text-slate-500">·</span>
                    <span className="text-slate-300">{fmt.shortName}</span>
                    <span className="text-slate-500">·</span>
                    <span className="text-xs text-slate-400 tabular-nums">
                      {new Date(rec.savedAt).toLocaleString('th-TH')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopySummary(rec)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/70 hover:bg-slate-800 text-xs text-slate-200 cursor-pointer"
                    >
                      {copiedId === rec.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          คัดลอกแล้ว
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          คัดลอกสรุป
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => onLoadRecord(rec)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-medium text-white cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      โหลดลงกระดาน
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteRecord(rec.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 cursor-pointer"
                      aria-label="ลบรายการนี้"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Blue summary */}
                  <div className="space-y-2.5">
                    <p className="font-display text-base font-bold text-sky-400">
                      {rec.blueTeamName}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] text-slate-500 w-9">BAN</span>
                      {rec.blueBans.map((h, i) => (
                        <div
                          key={i}
                          className="w-9 h-9 rounded-md border border-slate-800 bg-[#080B12] overflow-hidden flex items-center justify-center"
                          title={h?.name || '-'}
                        >
                          {h ? (
                            <HeroAvatar hero={h} size="sm" className="w-full h-full grayscale opacity-70" />
                          ) : (
                            <span className="text-[10px] text-slate-600">-</span>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] text-slate-500 w-9">PICK</span>
                      {rec.bluePicks.map((h, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-1.5 pr-2 rounded-md border border-sky-900/60 bg-sky-950/25 overflow-hidden"
                        >
                          <div className="w-8 h-8 bg-[#080B12] shrink-0">
                            {h && <HeroAvatar hero={h} size="sm" className="w-full h-full" />}
                          </div>
                          <span className="text-xs text-slate-200 max-w-[85px] truncate">
                            {h?.wikiName || '-'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Red summary */}
                  <div className="space-y-2.5">
                    <p className="font-display text-base font-bold text-rose-400">
                      {rec.redTeamName}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] text-slate-500 w-9">BAN</span>
                      {rec.redBans.map((h, i) => (
                        <div
                          key={i}
                          className="w-9 h-9 rounded-md border border-slate-800 bg-[#080B12] overflow-hidden flex items-center justify-center"
                          title={h?.name || '-'}
                        >
                          {h ? (
                            <HeroAvatar hero={h} size="sm" className="w-full h-full grayscale opacity-70" />
                          ) : (
                            <span className="text-[10px] text-slate-600">-</span>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] text-slate-500 w-9">PICK</span>
                      {rec.redPicks.map((h, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-1.5 pr-2 rounded-md border border-rose-900/60 bg-rose-950/25 overflow-hidden"
                        >
                          <div className="w-8 h-8 bg-[#080B12] shrink-0">
                            {h && <HeroAvatar hero={h} size="sm" className="w-full h-full" />}
                          </div>
                          <span className="text-xs text-slate-200 max-w-[85px] truncate">
                            {h?.wikiName || '-'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
