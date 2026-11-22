import * as ImageManipulator from 'expo-image-manipulator';
import { FunctionsHttpError } from '@supabase/supabase-js';

import { Macros } from './food';
import { cloudEnabled, ensureSignedIn, supabase } from './supabase';

export type FoodGuess = Macros & {
  name: string;
  emoji: string;
  /** True when this is a sample meal (the app was built without the AI server). */
  demo: boolean;
  confidence?: 'low' | 'medium' | 'high';
};

/** A problem we can show to the person as-is. */
export class AnalyzeError extends Error {}

/**
 * Turns a food photo into a calorie/macro estimate.
 * The photo is shrunk, then sent to our Supabase Edge Function ("analyze-food"),
 * which checks the daily limits and asks Claude. The Claude API key never lives in the app.
 */
export async function analyzePhoto(uri: string): Promise<FoodGuess> {
  if (!cloudEnabled || !supabase) return sampleMeal();

  // Smaller photo = faster upload and a cheaper AI call. 1024 px wide is plenty to see food.
  let image: string | undefined;
  try {
    const small = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1024 } }], {
      compress: 0.7,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    });
    image = small.base64;
  } catch {
    throw new AnalyzeError("Couldn't read that photo. Try another one.");
  }
  if (!image) throw new AnalyzeError("Couldn't read that photo. Try another one.");

  try {
    await ensureSignedIn();
  } catch {
    throw new AnalyzeError("Can't reach Forkcast's server. Check your internet, or add the food by hand.");
  }

  const { data, error } = await supabase.functions.invoke('analyze-food', {
    body: { image, mediaType: 'image/jpeg' },
  });

  if (error) {
    // The server sends a friendly "message" with every error (daily limit reached, etc.).
    if (error instanceof FunctionsHttpError) {
      const body = await error.context.json().catch(() => null);
      throw new AnalyzeError(body?.message ?? 'Something went wrong. Please try again.');
    }
    throw new AnalyzeError("Can't reach Forkcast's server. Check your internet, or add the food by hand.");
  }
  if (!data?.isFood) throw new AnalyzeError(data?.message ?? "That doesn't look like food. Try another photo.");

  return {
    name: data.name,
    emoji: data.emoji,
    calories: data.calories,
    protein: data.protein,
    carbs: data.carbs,
    fat: data.fat,
    confidence: data.confidence,
    demo: false,
  };
}

/** Stand-in used only when the app has no Supabase settings (e.g. a fresh copy of the code). */
async function sampleMeal(): Promise<FoodGuess> {
  await new Promise((r) => setTimeout(r, 1200));
  const pick = SAMPLES[Math.floor(Math.random() * SAMPLES.length)];
  return { ...pick, demo: true };
}

const SAMPLES: Omit<FoodGuess, 'demo'>[] = [
  { name: 'Grilled chicken salad', emoji: '🥗', calories: 420, protein: 38, carbs: 18, fat: 22 },
  { name: 'Pepperoni pizza (2 slices)', emoji: '🍕', calories: 610, protein: 26, carbs: 68, fat: 26 },
  { name: 'Avocado toast with egg', emoji: '🥑', calories: 390, protein: 15, carbs: 34, fat: 22 },
  { name: 'Burrito bowl', emoji: '🌯', calories: 680, protein: 36, carbs: 78, fat: 22 },
  { name: 'Greek yogurt with berries', emoji: '🫐', calories: 220, protein: 18, carbs: 28, fat: 4 },
];
