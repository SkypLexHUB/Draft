import { DRAFT_FORMATS } from '../data/draftFormats';
import type { DraftFormatId } from '../types/draft';

interface RulesViewProps {
  onSelectFormatAndGo: (formatId: DraftFormatId) => void;
}

export function RulesView({ onSelectFormatAndGo }: RulesViewProps) {
  const formats = Object.values(DRAFT_FORMATS);

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-2">
      <div className="border-b border-slate-800 pb-5">
        <h1 className="font-display text-3xl font-bold text-white tracking-wide">
          ระบบการแบนและดราฟตัวละคร RoV (2026)
        </h1>
        <p className="mt-2 text-sm text-slate-300 leading-relaxed max-w-3xl">
          สรุปโครงสร้างการแบน-เลือกฮีโร่ในเกม RoV (Arena of Valor) ประจำปี 2026 ทั้งในโหมดแรงค์ปกติ
          แรงค์ระดับสูง และโหมดการแข่งขัน Pro League (RPL / AIC) ที่ใช้งานระบบ Global Ban-Pick
        </p>
      </div>

      {/* Global Ban-Pick Section */}
      <section className="rounded-xl border border-slate-800 bg-[#0D121D] p-6 space-y-4">
        <h2 className="font-display text-2xl font-bold text-amber-400">
          01. กติกา Global Ban-Pick (Bo3 / Bo5 / Bo7)
        </h2>
        <div className="grid md:grid-cols-3 gap-6 text-sm text-slate-300 leading-relaxed">
          <div className="space-y-1.5">
            <h3 className="font-semibold text-white">ห้ามทีมเดิมหยิบซ้ำในซีรีส์</h3>
            <p className="text-slate-400">
              ฮีโร่ที่ทีมของคุณเลือกเล่นไปแล้วในเกมก่อนหน้าของซีรีส์เดียวกัน จะถูกล็อกไม่ให้ทีมของคุณเลือกซ้ำได้อีกในเกมถัดไป
            </p>
          </div>
          <div className="space-y-1.5">
            <h3 className="font-semibold text-white">แยกผลตามฝั่งทีม (ไม่ล็อกข้ามทีม)</h3>
            <p className="text-slate-400">
              หากทีมฟ้าใช้ Murad ไปแล้วในเกมที่ 1 ทีมแดงยังคงสามารถหยิบ Murad ในเกมที่ 2 ได้ตามปกติ (ตราบใดที่ทีมแดงยังไม่เคยใช้)
            </p>
          </div>
          <div className="space-y-1.5">
            <h3 className="font-semibold text-white">Game 7 Ultimate Battle Reset</h3>
            <p className="text-slate-400">
              ในแมตช์ตัดสิน Best-of-7 (สกอร์ 3–3) เกมที่ 7 จะรีเซ็ต Global Ban ทั้งหมด ทำให้ทุกทีมหยิบฮีโร่ที่เคยใช้ได้อีกครั้ง
            </p>
          </div>
        </div>
      </section>

      {/* Format Breakdown */}
      <section className="space-y-4">
        <h2 className="font-display text-2xl font-bold text-white">
          02. ลำดับการแบน-เลือกในแต่ละรูปแบบ
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          {formats.map((fmt) => (
            <div
              key={fmt.id}
              className="rounded-xl border border-slate-800 bg-[#0D121D] p-5 flex flex-col justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-xl font-bold text-white">{fmt.name}</h3>
                  <span className="text-xs text-slate-400 tabular-nums whitespace-nowrap">
                    แบนฝั่งละ {fmt.bansPerSide} ตัว
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{fmt.description}</p>

                <div className="pt-2 flex flex-wrap gap-1.5">
                  {fmt.steps.map((s) => (
                    <span
                      key={s.stepNumber}
                      className={`font-mono-tabular text-[11px] px-2 py-0.5 rounded border ${
                        s.side === 'blue'
                          ? s.type === 'ban'
                            ? 'border-sky-800/70 bg-sky-950/30 text-sky-300'
                            : 'border-sky-500/60 bg-sky-900/50 text-white font-semibold'
                          : s.type === 'ban'
                            ? 'border-rose-800/70 bg-rose-950/30 text-rose-300'
                            : 'border-rose-500/60 bg-rose-900/50 text-white font-semibold'
                      }`}
                    >
                      {s.side === 'blue' ? 'B' : 'R'}·{s.type === 'ban' ? 'Ban' : 'Pick'}
                      {s.slotIndex + 1}
                    </span>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onSelectFormatAndGo(fmt.id)}
                className="self-start px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-white transition-colors cursor-pointer"
              >
                ใช้รูปแบบนี้ในกระดานดราฟต์
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
