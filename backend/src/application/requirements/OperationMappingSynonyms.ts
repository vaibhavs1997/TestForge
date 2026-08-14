// OperationMappingSynonyms - Domain-specific synonym expansion for API mapping
// Bridges the gap between requirement terminology and API operation naming

import type { RequirementEntity } from '../../domain/requirements/RequirementEntity';
import type { ApiOperationEntity } from '../../domain/api/ApiOperationEntity';
import { AIProviderResolutionService } from '../ai-provider/AIProviderResolutionService';
import type { AIProviderEntity } from '../../domain/ai-provider';

/**
 * Synonym groups for common testing/API terms.
 * Terms within each group are considered semantically equivalent for scoring purposes.
 */
const STATIC_SYNONYM_GROUPS: Record<string, string[]> = {
  // Account/User creation
  create_account: ['create account', 'register', 'signup', 'sign-up', 'sign up', 'new user', 'user creation', 'registration', 'enroll', 'onboard'],
  read_account: ['get account', 'fetch account', 'list users', 'view account', 'account details', 'user profile', 'retrieve user', 'show account'],
  update_account: ['update account', 'modify account', 'edit account', 'change account', 'account update', 'profile update'],
  delete_account: ['delete account', 'remove account', 'cancel account', 'deactivate account', 'account deletion'],

  // Authentication
  login: ['login', 'log in', 'sign in', 'signin', 'authenticate', 'auth', 'access', 'enter credentials'],
  logout: ['logout', 'log out', 'sign out', 'signout', 'end session', 'revoke token'],
  refresh_token: ['refresh token', 'renew token', 'extend session', 'get new token'],

  // Orders/Purchases
  create_order: ['create order', 'place order', 'new order', 'submit order', 'purchase', 'buy', 'checkout', 'order creation'],
  read_order: ['get order', 'fetch order', 'list orders', 'view order', 'order details', 'order history', 'retrieve order'],
  update_order: ['update order', 'modify order', 'edit order', 'change order', 'order update', 'amend order'],
  cancel_order: ['cancel order', 'delete order', 'remove order', 'void order', 'order cancellation'],

  // Products/Items
  create_product: ['create product', 'add product', 'new product', 'register product', 'product creation', 'add item', 'create item'],
  read_product: ['get product', 'fetch product', 'list products', 'view product', 'product details', 'product catalog', 'browse products'],
  update_product: ['update product', 'modify product', 'edit product', 'change product', 'product update'],
  delete_product: ['delete product', 'remove product', 'archive product', 'product deletion'],

  // Payments
  create_payment: ['create payment', 'make payment', 'process payment', 'new payment', 'pay', 'submit payment', 'charge'],
  read_payment: ['get payment', 'fetch payment', 'list payments', 'view payment', 'payment details', 'payment history'],
  refund: ['refund', 'reversal', 'chargeback', 'return payment', 'reverse payment'],

  // Search/Query
  search: ['search', 'find', 'query', 'lookup', 'filter', 'browse', 'explore', 'discover'],
};

/**
 * Generic synonym cache for dynamically learned synonyms.
 * Key: normalized term, Value: set of synonyms
 */
const dynamicSynonyms = new Map<string, Set<string>>();

/**
 * Add a new synonym relationship dynamically.
 */
export function addSynonym(term1: string, term2: string): void {
  const t1 = term1.toLowerCase().trim();
  const t2 = term2.toLowerCase().trim();
  
  if (!dynamicSynonyms.has(t1)) {
    dynamicSynonyms.set(t1, new Set());
  }
  dynamicSynonyms.get(t1)!.add(t2);
  
  if (!dynamicSynonyms.has(t2)) {
    dynamicSynonyms.set(t2, new Set());
  }
  dynamicSynonyms.get(t2)!.add(t1);
}

/**
 * Get all synonyms for a term (static + dynamic).
 */
function getAllSynonyms(term: string): string[] {
  const normalized = term.toLowerCase().trim();
  const synonyms = new Set<string>();
  
  // Check static groups
  for (const group of Object.values(STATIC_SYNONYM_GROUPS)) {
    if (group.includes(normalized)) {
      group.forEach(s => synonyms.add(s));
    }
  }
  
  // Check dynamic synonyms
  if (dynamicSynonyms.has(normalized)) {
    dynamicSynonyms.get(normalized)!.forEach(s => synonyms.add(s));
  }
  
  return Array.from(synonyms);
}

/**
 * Expand a requirement's text with synonyms to improve matching.
 * Returns the original text plus expanded synonym terms.
 */
export function expandRequirementWithSynonyms(requirement: RequirementEntity): string {
  const baseText = `${requirement.title} ${requirement.description || ''}`.toLowerCase();
  const expandedTerms: string[] = [];

  // Check each static synonym group
  for (const [concept, synonyms] of Object.entries(STATIC_SYNONYM_GROUPS)) {
    const matchedSynonyms = synonyms.filter((syn: string) => baseText.includes(syn));
    if (matchedSynonyms.length > 0) {
      expandedTerms.push(...synonyms);
    }
  }

  // Check dynamic synonyms for each word in the text
  const words = baseText.split(/\s+/);
  for (const word of words) {
    if (word.length > 2) {
      const dynamicSyns = getAllSynonyms(word);
      expandedTerms.push(...dynamicSyns);
    }
  }

  // Return base text + expanded terms (deduplicated)
  const expandedText = [...new Set([baseText, ...expandedTerms])].join(' ');
  return expandedText;
}

/**
 * Expand operation metadata with synonyms to improve matching.
 * Returns the original text plus expanded synonym terms.
 */
export function expandOperationWithSynonyms(operation: ApiOperationEntity): string {
  const baseText = `${operation.name} ${operation.path} ${operation.method} ${operation.description || ''}`.toLowerCase();
  const expandedTerms: string[] = [];

  // Check each static synonym group
  for (const [concept, synonyms] of Object.entries(STATIC_SYNONYM_GROUPS)) {
    const matchedSynonyms = synonyms.filter((syn: string) => baseText.includes(syn));
    if (matchedSynonyms.length > 0) {
      expandedTerms.push(...synonyms);
    }
  }

  // Check dynamic synonyms for each word in the text
  const words = baseText.split(/\s+/);
  for (const word of words) {
    if (word.length > 2) {
      const dynamicSyns = getAllSynonyms(word);
      expandedTerms.push(...dynamicSyns);
    }
  }

  const expandedText = [...new Set([baseText, ...expandedTerms])].join(' ');
  return expandedText;
}

/**
 * Check if a requirement and operation are synonymically related.
 * Returns true if they share any synonym group.
 */
export function areSynonymicallyRelated(
  requirement: RequirementEntity,
  operation: ApiOperationEntity,
): boolean {
  const reqText = `${requirement.title} ${requirement.description || ''}`.toLowerCase();
  const opText = `${operation.name} ${operation.path} ${operation.method} ${operation.description || ''}`.toLowerCase();

  for (const [concept, synonyms] of Object.entries(STATIC_SYNONYM_GROUPS)) {
    const reqHasSynonym = synonyms.some((syn: string) => reqText.includes(syn));
    const opHasSynonym = synonyms.some((syn: string) => opText.includes(syn));
    if (reqHasSynonym && opHasSynonym) {
      return true;
    }
  }

  return false;
}

/**
 * Get synonym-based reasoning for a match.
 */
export function getSynonymReasoning(
  requirement: RequirementEntity,
  operation: ApiOperationEntity,
): string[] {
  const reasons: string[] = [];
  const reqText = `${requirement.title} ${requirement.description || ''}`.toLowerCase();
  const opText = `${operation.name} ${operation.path} ${operation.method} ${operation.description || ''}`.toLowerCase();

  for (const [concept, synonyms] of Object.entries(STATIC_SYNONYM_GROUPS)) {
    const reqSynonyms = synonyms.filter((syn: string) => reqText.includes(syn));
    const opSynonyms = synonyms.filter((syn: string) => opText.includes(syn));
    if (reqSynonyms.length > 0 && opSynonyms.length > 0) {
      reasons.push(
        `Synonym match: "${reqSynonyms[0]}" ↔ "${opSynonyms[0]}" (both mean ${concept.replace(/_/g, ' ')})`
      );
    }
  }

  return reasons;
}

export default {
  expandRequirementWithSynonyms,
  expandOperationWithSynonyms,
  areSynonymicallyRelated,
  getSynonymReasoning,
};