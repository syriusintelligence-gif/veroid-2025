/**
 * Stripe Plans Configuration
 * 
 * This file defines all available pricing plans for the Vero iD platform.
 * Plans are organized into two categories:
 * 1. Subscription Plans (monthly recurring)
 * 2. Overage Packages (one-time purchases)
 * 
 * PRODUCTION Price IDs - Updated 2026-02-25
 */

import { Plan } from '@/types/stripe';

/**
 * Monthly Subscription Plans
 * These plans provide recurring monthly credits for content authentication
 */
export const getSubscriptionPlans = (): Plan[] => [
  {
    id: 'free',
    name: 'Vero iD - Free',
    priceId: '', // Free plan has no Stripe price ID
    price: 0,
    currency: 'BRL',
    interval: 'month',
    credits: 5,
    features: [
      '5 autenticações por mês',
      'Verificação básica de conteúdo',
      'Suporte por email',
      'Armazenamento de 1GB',
    ],
    type: 'subscription',
    popular: false,
  },
  {
    id: 'creator',
    name: 'Vero iD - Creator',
    priceId: 'price_1T4gcAJc1p4mhrHNwOvzI8D8',
    price: 29.90,
    currency: 'BRL',
    interval: 'month',
    credits: 50,
    features: [
      '50 autenticações por mês',
      'Verificação avançada',
      'Suporte prioritário',
      'Armazenamento de 5GB',
      'Analytics básicos',
    ],
    type: 'subscription',
    popular: true,
  },
  {
    id: 'creator-pro',
    name: 'Vero iD - Creator Pro',
    priceId: 'price_1T4gijJc1p4mhrHNW3h3Ajzl',
    price: 79.90,
    currency: 'BRL',
    interval: 'month',
    credits: 150,
    features: [
      '150 autenticações por mês',
      'Verificação premium',
      'Suporte 24/7',
      'Armazenamento de 20GB',
      'Analytics avançados',
      'API de integração',
    ],
    type: 'subscription',
    popular: false,
  },
  {
    id: 'creator-elite',
    name: 'Vero iD - Creator Elite',
    priceId: 'price_1T4gmTJc1p4mhrHNuHS9xGN2',
    price: 139.90,
    currency: 'BRL',
    interval: 'month',
    credits: 350,
    features: [
      '350 autenticações por mês',
      'Verificação enterprise',
      'Suporte dedicado 24/7',
      'Armazenamento ilimitado',
      'Analytics completos',
      'API ilimitada',
      'White label',
      'Gerente de conta',
    ],
    type: 'subscription',
    popular: false,
  },
];

/**
 * Overage Packages (One-time purchases)
 * These packages provide additional credits that can be used alongside any subscription plan
 * Valid for 30 days after purchase
 */
export const getPackagePlans = (): Plan[] => [
  {
    id: 'package-10',
    name: 'Pacote 10',
    priceId: 'price_1T4gpIJc1p4mhrHNJL1tt3UY',
    price: 9.90,
    currency: 'BRL',
    interval: 'one_time',
    credits: 10,
    features: [
      '10 autenticações extras',
      'Válido por 30 dias',
      'Pode ser usado com qualquer plano',
      'Sem compromisso',
    ],
    type: 'package',
    popular: false,
  },
  {
    id: 'package-20',
    name: 'Pacote 20',
    priceId: 'price_1T4grUJc1p4mhrHNFJAl6Y4T',
    price: 19.90,
    currency: 'BRL',
    interval: 'one_time',
    credits: 20,
    features: [
      '20 autenticações extras',
      'Válido por 30 dias',
      'Pode ser usado com qualquer plano',
      'Sem compromisso',
      'Economia de 5%',
    ],
    type: 'package',
    popular: true,
  },
  {
    id: 'package-50',
    name: 'Pacote 50',
    priceId: 'price_1T4gu0Jc1p4mhrHNg8LhOIrJ',
    price: 49.90,
    currency: 'BRL',
    interval: 'one_time',
    credits: 50,
    features: [
      '50 autenticações extras',
      'Válido por 30 dias',
      'Pode ser usado com qualquer plano',
      'Sem compromisso',
      'Economia de 10%',
    ],
    type: 'package',
    popular: false,
  },
];

/**
 * Get all plans (subscriptions + packages)
 */
export const getAllPlans = (): Plan[] => [
  ...getSubscriptionPlans(),
  ...getPackagePlans(),
];

/**
 * Get a specific plan by ID
 */
export const getPlanById = (planId: string): Plan | undefined => {
  return getAllPlans().find(plan => plan.id === planId);
};

/**
 * Get a specific plan by Stripe Price ID
 */
export const getPlanByPriceId = (priceId: string): Plan | undefined => {
  return getAllPlans().find(plan => plan.priceId === priceId);
};