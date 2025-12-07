import { OFFERS } from "./scrape.ts";

export type Offer = keyof typeof OFFERS;

/**
 * Options of command
 */
export interface Options {
  /**
   * Path to output directory
   */
  dir: string;
  /**
   * Only likely stores
   */
  likely: boolean;
  /**
   * Types of offers to save
   */
  offers: Offer[];
}

/**
 * Store
 *
 * - doesn't exist if address is missing
 */
export interface Store {
  id: number;
  address?: string;
}

/**
 * Brochures
 *
 * - including local offers if store address is present
 */
export interface Brochures {
  address?: string;
  brochures: Brochure[];
}

/**
 * Brochure
 */
export interface Brochure {
  id: string;
  url: string;
}
