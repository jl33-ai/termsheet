import { writable } from 'svelte/store';
import type { Company } from '$lib/types';

export type CompanyBasic = Pick<Company, 'id' | 'name' | 'slug'>;

// Global source of truth for companies in the admin UI
export const companies = writable<CompanyBasic[]>([]);

// Refresh helper to sync from the API
export async function refreshCompanies() {
  try {
    const res = await fetch('/api/companies');
    if (!res.ok) throw new Error('Failed to load companies');
    const data = await res.json();
    companies.set(Array.isArray(data?.companies) ? data.companies : []);
  } catch {
    companies.set([]);
  }
}

