import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("fr-TN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function formatDateInput(date: Date | string | null | undefined): string {
  if (!date) return "";
  return new Date(date).toISOString().split("T")[0];
}

/**
 * Format court : "5 janv. 2024" (jour numérique, mois abrégé).
 * Null-safe : retourne "" pour une date absente.
 */
export function formatDateShort(date: Date | string | null | undefined): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString("fr-TN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format long : "5 janvier 2024" (jour numérique, mois en toutes lettres).
 * Null-safe : retourne "" pour une date absente. Usage : documents légaux
 * (lettres de change, aperçus d'effets).
 */
export function formatDateLong(date: Date | string | null | undefined): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString("fr-TN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Format date + heure : "05 janv. 2024 14:30" (mois abrégé, heure 24h).
 * Null-safe : retourne "" pour une date absente. Usage : journaux de mouvements.
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getCurrentYear(): number {
  return new Date().getFullYear();
}
