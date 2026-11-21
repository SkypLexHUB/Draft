export type TeamSide = 'blue' | 'red';

export type DraftActionType = 'ban' | 'pick';

export type HeroRole =
  | 'Tank'
  | 'Fighter'
  | 'Assassin'
  | 'Mage'
  | 'Marksman'
  | 'Support';

export type LaneName =
  | 'Dark Slayer'
  | 'Jungle'
  | 'Mid'
  | 'Abyssal Dragon'
  | 'Roam';

export type DraftFormatId =
  | 'tournament-8'
  | 'pro-10'
  | 'ranked-6'
  | 'ranked-4';

export interface Hero {
  id: string;
  name: string;
  wikiName: string;
  title: string;
  image: string;
  roleTh: string;
  roles: HeroRole[];
  traitTh: string;
  laneTh: string;
  lanes: LaneName[];
  releaseDate: string;
}

export interface DraftStep {
  stepNumber: number;
  side: TeamSide;
  type: DraftActionType;
  slotIndex: number; // 0-based index within that side's bans or picks
  phaseLabel: string;
}

export interface DraftFormat {
  id: DraftFormatId;
  name: string;
  shortName: string;
  bansPerSide: number;
  picksPerSide: number;
  description: string;
  steps: DraftStep[];
}

export interface SeriesGameRecord {
  id: string;
  gameNumber: number;
  formatId: DraftFormatId;
  blueTeamName: string;
  redTeamName: string;
  blueBans: (Hero | null)[];
  redBans: (Hero | null)[];
  bluePicks: (Hero | null)[];
  redPicks: (Hero | null)[];
  winner?: TeamSide | null;
  savedAt: string;
}

export type ActiveSlotTarget = {
  side: TeamSide;
  type: DraftActionType;
  slotIndex: number;
};
