import { Macros } from './food';

export type FoodGuess = Macros & { name: string; emoji: string; demo: boolean };

/**
 * Turns a food photo into a calorie/macro estimate.
 *
 * FOR NOW this is a stand-in that returns a sample meal after a short pause,
 * so the whole snap → review → add flow can be built and tested.
 * Next step: send the photo to a Supabase Edge Function that calls Claude.
 * (The Claude API key will live on the server, never inside the app.)
 */
export async function analyzePhoto(_base64: string | null | undefined): Promise<FoodGuess> {
  await new Promise((r) => setTimeout(r, 1400));
  const pick = SAMPLES[Math.floor(Math.random() * SAMPLES.length)];
  return { ...pick, demo: true };
}

const SAMPLES: Omit<FoodGuess, 'demo'>[] = [
  { name: 'Grilled chicken salad', emoji: '🥗', calories: 420, protein: 38, carbs: 18, fat: 22 },
  { name: 'Pepperoni pizza (2 slices)', emoji: '🍕', calories: 610, protein: 26, carbs: 68, fat: 26 },
  { name: 'Avocado toast with egg', emoji: '🥑', calories: 390, protein: 15, carbs: 34, fat: 22 },
  { name: 'Burrito bowl', emoji: '🌯', calories: 680, protein: 36, carbs: 78, fat: 22 },
  { name: 'Greek yogurt with berries', emoji: '🫐', calories: 220, protein: 18, carbs: 28, fat: 4 },
  { name: 'Cheeseburger and fries', emoji: '🍔', calories: 950, protein: 35, carbs: 92, fat: 48 },
];
