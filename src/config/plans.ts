/**
 * Stripe Plans Configuration
 * 
 * This file contains all available plans with their Stripe Price IDs.
 * Price IDs are loaded from environment variables for security.
 * 
 * IMPORTANT: Make sure all VITE_STRIPE_PRICE_ID_* variables are set in .env.local
 */

import { Plan, PlanType } from '@/types/stripe';

/**
 * Get environment variable with fallback
 */
const getEnvVar = (key: string): string => {
  const value = import.meta.env[key];
  if (!value) {
    console.error(`Missing environment variable: ${key}`);
    return '';
  }
  return value;
};

/**
 * All Available Plans
 * Includes monthly subscriptions and one-time overage packages
 */
export const PLANS: Plan[] = [
  // FREE PLAN
  {
    id: 'vero-id-free',
    name: 'Vero iD Free',
    description: 'Plano gratuito para começar',
    price: 0,
    currency: 'BRL',
    interval: 'month',
    stripePriceId: getEnvVar('VITE_STRIPE_PRICE_ID_VERO_ID_FREE'),
    type: PlanType.FREE,
    maxProfiles: 10, // 10 autenticações/mês
    features: [
      '10 autenticações de conteúdo por mês'
    ]
  },

  // CREATOR PLAN
  {
    id: 'vero-id-creator',
    name: 'Vero iD Creator',
    description: 'Ideal para criadores de conteúdo',
    price: 29.90,
    currency: 'BRL',
    interval: 'month',
    stripePriceId: getEnvVar('VITE_STRIPE_PRICE_ID_VERO_ID_CREATOR'),
    type: PlanType.SUBSCRIPTION,
    maxProfiles: 50, // 50 autenticações/mês
    features: [
      '50 autenticações de conteúdo por mês'
    ]
  },

  // CREATOR PRO PLAN
  {
    id: 'vero-id-creator-pro',
    name: 'Vero iD Creator Pro',
    description: 'Para profissionais que precisam de mais',
    price: 79.90,
    currency: 'BRL',
    interval: 'month',
    stripePriceId: getEnvVar('VITE_STRIPE_PRICE_ID_VERO_ID_CREATOR_PRO'),
    type: PlanType.SUBSCRIPTION,
    popular: true,
    maxProfiles: 150, // 150 autenticações/mês
    features: [
      '150 autenticações de conteúdo por mês'
    ]
  },

  // CREATOR ELITE PLAN
  {
    id: 'vero-id-creator-elite',
    name: 'Vero iD Creator Elite',
    description: 'O melhor para empresas e influencers',
    price: 139.90,
    currency: 'BRL',
    interval: 'month',
    stripePriceId: getEnvVar('VITE_STRIPE_PRICE_ID_VERO_ID_CREATOR_ELITE'),
    type: PlanType.SUBSCRIPTION,
    maxProfiles: 350, // 350 autenticações/mês
    features: [
      '350 autenticações de conteúdo por mês'
    ]
  },

  // OVERAGE PACKAGE 10
  {
    id: 'vero-id-pacote-10',
    name: 'Pacote 10 Autenticações',
    description: 'Compra avulsa de autenticações extras',
    price: 9.90,
    currency: 'BRL',
    interval: null,
    stripePriceId: getEnvVar('VITE_STRIPE_PRICE_ID_VERO_ID_PACOTE_10'),
    type: PlanType.PACKAGE,
    maxProfiles: 10, // 10 autenticações avulsas
    features: [
      '10 autenticações de conteúdo',
      'Válido por 30 dias'
    ]
  },

  // OVERAGE PACKAGE 20
  {
    id: 'vero-id-pacote-20',
    name: 'Pacote 20 Autenticações',
    description: 'Compra avulsa de autenticações extras',
    price: 19.90,
    currency: 'BRL',
    interval: null,
    stripePriceId: getEnvVar('VITE_STRIPE_PRICE_ID_VERO_ID_PACOTE_20'),
    type: PlanType.PACKAGE,
    maxProfiles: 20, // 20 autenticações avulsas
    popular: true,
    features: [
      '20 autenticações de conteúdo',
      'Válido por 30 dias'
    ]
  },

  // OVERAGE PACKAGE 50
  {
    id: 'vero-id-pacote-50',
    name: 'Pacote 50 Autenticações',
    description: 'Compra avulsa de autenticações extras',
    price: 49.90,
    currency: 'BRL',
    interval: null,
    stripePriceId: getEnvVar('VITE_STRIPE_PRICE_ID_VERO_ID_PACOTE_50'),
    type: PlanType.PACKAGE,
    maxProfiles: 50, // 50 autenticações avulsas
    features: [
      '50 autenticações de conteúdo',
      'Válido por 30 dias'
    ]
  }
];

/**
 * Get plan by ID
 */
export const getPlanById = (planId: string): Plan | undefined => {
  return PLANS.find(plan => plan.id === planId);
};

/**
 * Get plan by Stripe Price ID
 */
export const getPlanByPriceId = (priceId: string): Plan | undefined => {
  return PLANS.find(plan => plan.stripePriceId === priceId);
};

/**
 * Get subscription plans only
 */
export const getSubscriptionPlans = (): Plan[] => {
  return PLANS.filter(plan => 
    plan.type === PlanType.SUBSCRIPTION || plan.type === PlanType.FREE
  );
};

/**
 * Get overage packages only
 */
export const getPackagePlans = (): Plan[] => {
  return PLANS.filter(plan => plan.type === PlanType.PACKAGE);
};

/**
 * Format price for display
 */
export const formatPrice = (price: number, currency: string = 'BRL'): string => {
  if (price === 0) return 'Grátis';
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency
  }).format(price);
};

/**
 * Calculate cost per authentication
 */
export const getCostPerAuthentication = (plan: Plan): string => {
  if (plan.price === 0 || !plan.maxProfiles) return 'Grátis';
  
  const costPerAuth = plan.price / plan.maxProfiles;
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: plan.currency
  }).format(costPerAuth);
};