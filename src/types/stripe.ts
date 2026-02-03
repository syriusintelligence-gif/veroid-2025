/**
 * Stripe Integration Types
 * 
 * This file contains all TypeScript types and interfaces for Stripe integration.
 * It includes plan definitions, subscription status, and payment-related types.
 */

/**
 * Plan Type Enum
 * Defines the different types of plans available
 */
export enum PlanType {
  FREE = 'free',
  SUBSCRIPTION = 'subscription',
  PACKAGE = 'package'
}

/**
 * Subscription Status Enum
 * Defines possible subscription statuses from Stripe
 */
export enum SubscriptionStatus {
  ACTIVE = 'active',
  CANCELED = 'canceled',
  INCOMPLETE = 'incomplete',
  INCOMPLETE_EXPIRED = 'incomplete_expired',
  PAST_DUE = 'past_due',
  TRIALING = 'trialing',
  UNPAID = 'unpaid'
}

/**
 * Plan Interface
 * Defines the structure of a subscription or package plan
 */
export interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval?: 'month' | 'year' | null; // null for one-time packages
  stripePriceId: string;
  features: string[];
  type: PlanType;
  popular?: boolean;
  maxProfiles?: number; // For packages
}

/**
 * User Subscription Interface
 * Defines the structure of a user's subscription in the database
 */
export interface UserSubscription {
  id: string;
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId?: string;
  stripePriceId: string;
  status: SubscriptionStatus;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Checkout Session Data
 * Data required to create a Stripe Checkout session
 */
export interface CheckoutSessionData {
  priceId: string;
  userId: string;
  userEmail: string;
  successUrl: string;
  cancelUrl: string;
}

/**
 * Webhook Event Data
 * Structure of data received from Stripe webhooks
 */
export interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: any;
  };
}