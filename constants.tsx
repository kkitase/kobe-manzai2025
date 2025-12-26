
import { ComedyStyle, PresetCharacter } from './types';

export const DUO_PRESETS = [
  { name: 'ダウンタウン風', style: ComedyStyle.SHABEKURI, description: '鋭いボケと圧のあるツッコミ。' },
  { name: 'サンドウィッチマン風', style: ComedyStyle.CONTE, description: '設定の作り込みと、聞き取りやすいツッコミ。' },
  { name: 'かまいたち風', style: ComedyStyle.SYSTEM, description: '屁理屈や独自のロジックで追い詰める構成。' },
  { name: 'ジャルジャル風', style: ComedyStyle.SURREAL, description: 'シュールな設定の繰り返しと展開。' },
  { name: 'ミルクボーイ風', style: ComedyStyle.SYSTEM, description: '特定のフレーズを繰り返すシステム漫才。' },
];

export const CHARACTER_PRESETS: PresetCharacter[] = [
  { 
    id: 'veteran', 
    name: 'ベテラン風師匠', 
    image: 'https://picsum.photos/seed/veteran/400/600',
    description: '落ち着きのある、伝統的な衣装のキャラクター'
  },
  { 
    id: 'rookie', 
    name: '若手期待の星', 
    image: 'https://picsum.photos/seed/rookie/400/600',
    description: 'エネルギッシュなスーツ姿の若手キャラクター'
  }
];
