import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Forkcast's look (inspired by Ro's calm, light style): warm off-white background, white cards,
 * near-black text and buttons, and soft pastels for the data.
 */
export const C = {
  bg: '#F6F5F2',
  card: '#FFFFFF',
  /** Inputs, icon tiles, secondary buttons. */
  cardHi: '#F0EEEA',
  text: '#141414',
  muted: '#6F6C67',
  /** Borders and empty ring/bar tracks. */
  line: '#E7E4DF',
  /** Buttons, selected chips, links. */
  accent: '#141414',
  accentSoft: '#EFEDE8',
  /** Text on top of an accent (black) button. */
  onAccent: '#FFFFFF',
  /** The calorie ring. */
  ring: '#8E9FE0',
  /** On target (calendar days, bars). */
  good: '#9CCBA6',
  goodText: '#3F7A4E',
  /** Over the goal. */
  over: '#F4A486',
  overText: '#B5563A',
  danger: '#C44D36',
  protein: '#8FB8EE',
  carbs: '#F2CC6B',
  fat: '#C3A9EE',
  /** Favorite star (a deeper butter, readable on white). */
  star: '#B8901F',
  /** Water glasses. */
  water: '#8FB8EE',
};

/** Color for a day's result (see dayResult in lib/food.ts). */
export function resultColor(result: 'good' | 'missed' | 'pending' | 'empty') {
  return result === 'good' ? C.good : result === 'missed' ? C.over : result === 'pending' ? C.ring : 'transparent';
}

/**
 * Fonts (loaded in app/_layout.tsx). Custom fonts ignore `fontWeight`, so each weight is its own family.
 * Headlines and big numbers: Barlow Condensed. Everything else: Inter.
 */
export const F = {
  head: 'BarlowCondensed_700Bold',
  headSemi: 'BarlowCondensed_600SemiBold',
  body: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semi: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
};

/** Kept so older imports still work. */
export const HEADLINE = F.head;

export const R = { sm: 10, md: 14, lg: 20 };

// Haptics only exist on phones; on the web these quietly do nothing.
const onPhone = Platform.OS === 'ios' || Platform.OS === 'android';

export function tapBuzz() {
  if (onPhone) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function doneBuzz() {
  if (onPhone) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
