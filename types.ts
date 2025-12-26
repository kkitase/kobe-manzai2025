
export enum ComedyStyle {
  SHABEKURI = 'しゃべくり漫才',
  CONTE = 'コント漫才',
  SYSTEM = 'システム漫才',
  SURREAL = 'シュール'
}

export enum ScriptLength {
  SHORT = '1分',
  MEDIUM = '3分',
  LONG = '5分'
}

export enum ToneType {
  BOKE_HEAVY = 'ボケ多め',
  SURREAL = 'シュール',
  CLASSIC = '王道',
  FAST_PACED = 'テンポ重視'
}

export interface ManzaiLine {
  id: string;
  role: 'Boke' | 'Tsukkomi' | 'Action';
  text: string;
}

export interface ManzaiScript {
  title: string;
  duoStyle: string;
  content: ManzaiLine[];
}

export interface PresetCharacter {
  id: string;
  name: string;
  image: string;
  description: string;
}
