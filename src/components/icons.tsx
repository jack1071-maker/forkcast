import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

import { C } from '@/lib/ui';

/** Simple line icons (24×24 grid) drawn in one color, replacing emojis for a cleaner look. */
type P = { size?: number; color?: string; strokeWidth?: number };

function Base({ size = 24, color = C.text, strokeWidth = 1.8, children }: P & { children: React.ReactNode }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </Svg>
  );
}

/** Today tab: a 3/4 filled ring. */
export const RingIcon = (p: P) => (
  <Base {...p}>
    <Path d="M12 3a9 9 0 1 1-9 9" />
    <Path d="M3 12a9 9 0 0 1 9-9" opacity={0.35} />
  </Base>
);

export const CalendarIcon = (p: P) => (
  <Base {...p}>
    <Rect x={3.5} y={5} width={17} height={15.5} rx={3} />
    <Line x1={3.5} y1={10} x2={20.5} y2={10} />
    <Line x1={8} y1={3} x2={8} y2={7} />
    <Line x1={16} y1={3} x2={16} y2={7} />
  </Base>
);

export const TrendIcon = (p: P) => (
  <Base {...p}>
    <Path d="M3 17l5.5-5.5 4 4L21 7" />
    <Path d="M15 7h6v6" />
  </Base>
);

export const CameraIcon = (p: P) => (
  <Base {...p}>
    <Path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.8l1.4-2h4.6l1.4 2h1.8A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5z" />
    <Circle cx={12} cy={12.5} r={3.5} />
  </Base>
);

export const FlameIcon = (p: P) => (
  <Base {...p}>
    <Path d="M12 3c.5 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.2 1.2-3.6 2.4-4.6.2 1.8 1 2.8 2.1 3.1C11 9.5 11 6 12 3z" />
  </Base>
);

export const LockIcon = (p: P) => (
  <Base {...p}>
    <Rect x={5} y={10.5} width={14} height={10} rx={2.5} />
    <Path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
  </Base>
);

export const KeyIcon = (p: P) => (
  <Base {...p}>
    <Circle cx={8} cy={14} r={4} />
    <Path d="M11 11l9-9M16.5 5.5l2.5 2.5M14 8l2 2" />
  </Base>
);

export const CheckIcon = (p: P) => (
  <Base {...p}>
    <Path d="M5 12.5l4.5 4.5L19 7.5" />
  </Base>
);

export const AlertIcon = (p: P) => (
  <Base {...p}>
    <Circle cx={12} cy={12} r={9} />
    <Line x1={12} y1={7.5} x2={12} y2={13} />
    <Line x1={12} y1={16.5} x2={12} y2={16.6} />
  </Base>
);

export const CloseIcon = (p: P) => (
  <Base {...p}>
    <Line x1={6} y1={6} x2={18} y2={18} />
    <Line x1={18} y1={6} x2={6} y2={18} />
  </Base>
);

export const ChevronIcon = ({ dir = 'right', ...p }: P & { dir?: 'left' | 'right' }) => (
  <Base {...p}>
    <Path d={dir === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} />
  </Base>
);

export const PlusIcon = (p: P) => (
  <Base {...p}>
    <Line x1={12} y1={5} x2={12} y2={19} />
    <Line x1={5} y1={12} x2={19} y2={12} />
  </Base>
);

export const MinusIcon = (p: P) => (
  <Base {...p}>
    <Line x1={5} y1={12} x2={19} y2={12} />
  </Base>
);

export const ForkIcon = (p: P) => (
  <Base {...p}>
    <Path d="M8 3v5a4 4 0 0 0 8 0V3M12 3v18" />
  </Base>
);

export const BarcodeIcon = (p: P) => (
  <Base {...p}>
    <Path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
    <Path d="M7 8v8M10 8v8M13 8v8M16.5 8v8" />
  </Base>
);

/** Favorite star; `filled` paints it in. */
export const StarIcon = ({ filled, ...p }: P & { filled?: boolean }) => (
  <Base {...p}>
    <Path
      d="M12 3.5l2.6 5.3 5.9.9-4.25 4.1 1 5.8L12 16.9l-5.25 2.7 1-5.8L3.5 9.7l5.9-.9z"
      fill={filled ? p.color ?? C.text : 'none'}
    />
  </Base>
);

/** A glass of water; `level` (0 to 1) fills it from the bottom. */
export function GlassIcon({ level = 0, fill = C.protein, ...p }: P & { level?: number; fill?: string }) {
  // The glass narrows from 14 wide at the top (y 3.5) to about 10.6 at the bottom (y 19.7).
  const top = 19.7 - 14 * Math.max(0, Math.min(1, level));
  const inset = (y: number) => 5 + ((y - 3.5) / 16.2) * 1.7;
  const water = `M${inset(top)} ${top}H${24 - inset(top)}L${24 - inset(19.7)} 19.7H${inset(19.7)}z`;
  return (
    <Base {...p}>
      {level > 0 ? <Path d={water} fill={fill} stroke="none" /> : null}
      <Path d="M5 3.5h14l-1.7 16.2a1.5 1.5 0 0 1-1.5 1.3H8.2a1.5 1.5 0 0 1-1.5-1.3z" />
    </Base>
  );
}

/** Copy (two stacked sheets). */
export const CopyIcon = (p: P) => (
  <Base {...p}>
    <Rect x={8.5} y={8.5} width={12} height={12} rx={2.5} />
    <Path d="M15.5 8.5V6a2.5 2.5 0 0 0-2.5-2.5H6A2.5 2.5 0 0 0 3.5 6v7A2.5 2.5 0 0 0 6 15.5h2.5" />
  </Base>
);

/** Target / goal. */
export const TargetIcon = (p: P) => (
  <Base {...p}>
    <Circle cx={12} cy={12} r={8.5} />
    <Circle cx={12} cy={12} r={4.5} />
    <Circle cx={12} cy={12} r={0.8} />
  </Base>
);

/** Meal-time icons, used instead of food emojis in the log. */
export const SunriseIcon = (p: P) => (
  <Base {...p}>
    <Path d="M5 17a7 7 0 0 1 14 0" />
    <Line x1={2.5} y1={20} x2={21.5} y2={20} />
    <Path d="M12 3.5v3M4.6 8.6l2 2M19.4 8.6l-2 2" />
  </Base>
);

export const SunIcon = (p: P) => (
  <Base {...p}>
    <Circle cx={12} cy={12} r={4} />
    <Path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
  </Base>
);

export const MoonIcon = (p: P) => (
  <Base {...p}>
    <Path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
  </Base>
);

/** Late-night / between-meals snack. */
export const SnackIcon = (p: P) => (
  <Base {...p}>
    <Path d="M12 7c-4.5-2-8 1-7.5 5.5C5 17 8 21 10.5 20.5c.8-.2 1-.5 1.5-.5s.7.3 1.5.5C16 21 19 17 19.5 12.5 20 8 16.5 5 12 7z" />
    <Path d="M12 7c0-2 1-3.5 3-4" />
  </Base>
);

export const MEALS = ['Breakfast', 'Lunch', 'Snack', 'Dinner'] as const;
export type MealName = (typeof MEALS)[number];

/** A typical clock time for each meal, used when a food is moved to a different meal. */
export const MEAL_HOUR: Record<MealName, [number, number]> = {
  Breakfast: [8, 0],
  Lunch: [12, 30],
  Snack: [15, 30],
  Dinner: [19, 0],
};

/** Picks a meal-time icon and label from the hour the food was logged. */
export function mealFor(date: Date): { label: MealName; Icon: (p: P) => React.JSX.Element } {
  const h = date.getHours();
  if (h >= 5 && h < 11) return { label: 'Breakfast', Icon: SunriseIcon };
  if (h >= 11 && h < 15) return { label: 'Lunch', Icon: SunIcon };
  if (h >= 17 && h < 22) return { label: 'Dinner', Icon: MoonIcon };
  return { label: 'Snack', Icon: SnackIcon };
}
