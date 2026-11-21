import { useState, useEffect } from 'react';
import { Shield, Sword, Zap, Sparkles, Crosshair, HeartHandshake } from 'lucide-react';
import type { Hero, HeroRole } from '../types/draft';

interface HeroAvatarProps {
  hero: Hero;
  className?: string;
  imgClassName?: string;
  size?: 'sm' | 'md' | 'lg';
}

const ROLE_ICON: Record<HeroRole, typeof Shield> = {
  Tank: Shield,
  Fighter: Sword,
  Assassin: Zap,
  Mage: Sparkles,
  Marksman: Crosshair,
  Support: HeartHandshake,
};

const ROLE_GRADIENT: Record<HeroRole, string> = {
  Tank: 'from-amber-950/90 via-slate-900 to-slate-950 text-amber-300',
  Fighter: 'from-orange-950/90 via-slate-900 to-slate-950 text-orange-300',
  Assassin: 'from-rose-950/90 via-slate-900 to-slate-950 text-rose-300',
  Mage: 'from-sky-950/90 via-slate-900 to-slate-950 text-sky-300',
  Marksman: 'from-emerald-950/90 via-slate-900 to-slate-950 text-emerald-300',
  Support: 'from-teal-950/90 via-slate-900 to-slate-950 text-teal-300',
};

export function HeroAvatar({ hero, className = '', imgClassName = '', size = 'md' }: HeroAvatarProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [hero.image, hero.id]);

  const primaryRole = hero.roles[0] || 'Fighter';
  const Icon = ROLE_ICON[primaryRole] || Sword;
  const grad = ROLE_GRADIENT[primaryRole] || ROLE_GRADIENT.Fighter;
  const initials = hero.wikiName
    .split(/[\s-]+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  if (!hero.image || failed) {
    return (
      <div
        className={`relative flex flex-col items-center justify-center bg-gradient-to-br ${grad} select-none overflow-hidden ${className}`}
        aria-label={hero.name}
      >
        <Icon className={size === 'sm' ? 'w-3.5 h-3.5 opacity-70' : size === 'lg' ? 'w-6 h-6 opacity-75' : 'w-4 h-4 opacity-70'} />
        <span className={`font-display font-bold tracking-wider leading-none mt-0.5 ${size === 'sm' ? 'text-[10px]' : size === 'lg' ? 'text-base' : 'text-xs'}`}>
          {initials}
        </span>
      </div>
    );
  }

  return (
    <img
      src={hero.image}
      alt={hero.name}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`object-cover object-top select-none ${imgClassName} ${className}`}
    />
  );
}
