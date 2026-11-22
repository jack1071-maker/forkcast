import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Forkcast's one fixed palette: deep navy background, bright aqua accents.
 * Text is always white or light blue on dark, or dark navy on aqua buttons.
 */
export const C = {
  bg: '#0B1426',
  card: '#142340',
  cardHi: '#1C2F55',
  text: '#FFFFFF',
  muted: '#9FB3D1',
  line: '#233A63',
  accent: '#2EE6D6',
  accentSoft: '#0F3B4A',
  onAccent: '#062126',
  over: '#FF8A5C',
  danger: '#FF6B7A',
  protein: '#FF7A9A',
  carbs: '#FFC857',
  fat: '#7AA7FF',
};

/** Tall, bold headline font (loaded in app/_layout.tsx). */
export const HEADLINE = 'Anton_400Regular';

export const R = { sm: 10, md: 16, lg: 24 };

// Haptics only exist on phones; on the web these quietly do nothing.
const onPhone = Platform.OS === 'ios' || Platform.OS === 'android';

export function tapBuzz() {
  if (onPhone) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function doneBuzz() {
  if (onPhone) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
