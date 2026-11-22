import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Forkcast's look: pure black, graphite cards, ice-white text and buttons.
 * Color is saved for the data itself: green = on target, red = over, one color per macro.
 */
export const C = {
  bg: '#000000',
  card: '#111214',
  cardHi: '#1C1D21',
  text: '#FFFFFF',
  muted: '#8B8F97',
  line: '#26282D',
  /** Buttons, selected chips, links. */
  accent: '#FFFFFF',
  accentSoft: '#1C1D21',
  /** Text on top of an accent (white) button. */
  onAccent: '#000000',
  /** On target (rings, calendar days, bars). */
  good: '#2FD573',
  over: '#FF5A5F',
  danger: '#FF5A5F',
  protein: '#5AA9FF',
  carbs: '#FFB547',
  fat: '#B98CFF',
};

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
