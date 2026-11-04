/**
 * Optional Google Gemini Integration
 * Uses @google/genai SDK with Cortex Hospital PMS Tool Calling
 */

import { GoogleGenAI } from "@google/genai";

const apiKey =
  process.env.GEMINI_API_KEY ||
  process.env.GOOGLE_GENAI_API_KEY ||
  process.env.GOOGLE_API_KEY;

export function getGeminiClient(): GoogleGenAI | null {
  if (!apiKey || apiKey.trim() === "") {
    return null;
  }
  return new GoogleGenAI({ apiKey });
}

export function isGeminiEnabled(): boolean {
  return Boolean(apiKey && apiKey.trim().length > 0);
}

