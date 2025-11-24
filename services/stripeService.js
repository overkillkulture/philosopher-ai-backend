// ================================================================
// STRIPE SERVICE - Payment Processing & Subscription Management
// ================================================================
// Handles: Checkout, webhooks, subscriptions, usage enforcement
// Author: C1 (Mechanic) - Autonomous Work
// Date: 2025-11-24
// ================================================================

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// ================================================================
// PRICING CONFIGURATION
// ================================================================

const PRICING_TIERS = {
    free: {
        name: 'Free',
        price: 0,
        priceId: null, // No Stripe price ID for free tier
        features: {
            questionsPerMonth: 100,
            apiAccess: false,
            prioritySupport: false,
            advancedFeatures: false
        }
    },
    pro: {
        name: 'Pro',
        price: 29, // $29/month
        priceId: process.env.STRIPE_PRICE_ID_PRO, // Set in .env
        features: {
            questionsPerMonth: -1, // Unlimited
            apiAccess: true,
            prioritySupport: true,
            advancedFeatures: true
        }
    },
    enterprise: {
        name: 'Enterprise',
        price: 500, // $500/month
        priceId: process.env.STRIPE_PRICE_ID_ENTERPRISE, // Set in .env
        features: {
            questionsPerMonth: -1, // Unlimited
            apiAccess: true,
            prioritySupport: true,
            advancedFeatures: true,
            customDeployment: true,
            sso: true,
            sla: true
        }
    }
};

// ================================================================
// STRIPE INITIALIZATION CHECK
// ================================================================

function checkStripeConfiguration() {
    if (!process.env.STRIPE_SECRET_KEY) {
        console.warn('⚠️  WARNING: STRIPE_SECRET_KEY not configured');
        console.warn('   Stripe integration will not work');
        console.warn('   Set STRIPE_SECRET_KEY in .env file');
        return false;
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
        console.warn('⚠️  WARNING: STRIPE_WEBHOOK_SECRET not configured');
        console.warn('   Webhook signature verification will fail');
        console.warn('   Set STRIPE_WEBHOOK_SECRET in .env file');
    }

    return true;
}

// ================================================================
// CREATE CHECKOUT SESSION
// ================================================================

/**
 * Create a Stripe Checkout session for subscription
 * @param {Object} params - Checkout parameters
 * @param {string} params.userId - User ID
 * @param {string} params.userEmail - User email
 * @param {string} params.tier - Pricing tier (pro, enterprise)
 * @param {string} params.successUrl - Redirect URL on success
 * @param {string} params.cancelUrl - Redirect URL on cancel
 * @returns {Object} - Checkout session with URL
 */
async function createCheckoutSession({ userId, userEmail, tier, successUrl, cancelUrl }) {
    try {
        if (!checkStripeConfiguration()) {
            throw new Error('Stripe not configured');
        }

        const pricingTier = PRICING_TIERS[tier];
        if (!pricingTier) {
            throw new Error(`Invalid pricing tier: ${tier}`);
        }

        if (tier === 'free') {
            throw new Error('Cannot create checkout session for free tier');
        }

        if (!pricingTier.priceId) {
            throw new Error(`Stripe Price ID not configured for tier: ${tier}`);
        }

        // Create or retrieve Stripe customer
        let customer;
        try {
            const customers = await stripe.customers.list({
                email: userEmail,
                limit: 1
            });

            if (customers.data.length > 0) {
                customer = customers.data[0];
            } else {
                customer = await stripe.customers.create({
                    email: userEmail,
                    metadata: {
                        userId: userId
                    }
                });
            }
        } catch (error) {
            console.error('Error creating/retrieving Stripe customer:', error);
            throw error;
        }

        // Create checkout session
        const session = await stripe.checkout.sessions.create({
            customer: customer.id,
            payment_method_types: ['card'],
            line_items: [
                {
                    price: pricingTier.priceId,
                    quantity: 1,
                }
            ],
            mode: 'subscription',
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: {
                userId: userId,
                tier: tier
            },
            subscription_data: {
                metadata: {
                    userId: userId,
                    tier: tier
                }
            }
        });

        return {
            sessionId: session.id,
            url: session.url,
            customerId: customer.id
        };
    } catch (error) {
        console.error('Error creating checkout session:', error);
        throw error;
    }
}

// ================================================================
// CREATE CUSTOMER PORTAL SESSION
// ================================================================

/**
 * Create a Stripe Customer Portal session for subscription management
 * @param {string} customerId - Stripe customer ID
 * @param {string} returnUrl - URL to return to after portal
 * @returns {Object} - Portal session with URL
 */
async function createCustomerPortalSession(customerId, returnUrl) {
    try {
        if (!checkStripeConfiguration()) {
            throw new Error('Stripe not configured');
        }

        const session = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: returnUrl,
        });

        return {
            url: session.url
        };
    } catch (error) {
        console.error('Error creating customer portal session:', error);
        throw error;
    }
}

// ================================================================
// WEBHOOK HANDLER
// ================================================================

/**
 * Handle Stripe webhook events
 * @param {string} payload - Raw request body
 * @param {string} signature - Stripe signature header
 * @param {Function} onSubscriptionCreated - Callback for subscription created
 * @param {Function} onSubscriptionUpdated - Callback for subscription updated
 * @param {Function} onSubscriptionDeleted - Callback for subscription deleted
 * @param {Function} onPaymentSucceeded - Callback for payment succeeded
 * @param {Function} onPaymentFailed - Callback for payment failed
 * @returns {Object} - Event object
 */
async function handleWebhook(payload, signature, callbacks = {}) {
    try {
        if (!process.env.STRIPE_WEBHOOK_SECRET) {
            console.warn('⚠️  WARNING: Processing webhook without signature verification');
            console.warn('   Set STRIPE_WEBHOOK_SECRET for production');
        }

        let event;

        // Verify webhook signature
        if (process.env.STRIPE_WEBHOOK_SECRET) {
            try {
                event = stripe.webhooks.constructEvent(
                    payload,
                    signature,
                    process.env.STRIPE_WEBHOOK_SECRET
                );
            } catch (error) {
                console.error('⚠️  Webhook signature verification failed:', error.message);
                throw new Error('Webhook signature verification failed');
            }
        } else {
            // Parse without verification (development only)
            event = JSON.parse(payload);
        }

        console.log(`✅ Stripe webhook received: ${event.type}`);

        // Handle different event types
        switch (event.type) {
            case 'customer.subscription.created':
                if (callbacks.onSubscriptionCreated) {
                    await callbacks.onSubscriptionCreated(event.data.object);
                }
                break;

            case 'customer.subscription.updated':
                if (callbacks.onSubscriptionUpdated) {
                    await callbacks.onSubscriptionUpdated(event.data.object);
                }
                break;

            case 'customer.subscription.deleted':
                if (callbacks.onSubscriptionDeleted) {
                    await callbacks.onSubscriptionDeleted(event.data.object);
                }
                break;

            case 'invoice.payment_succeeded':
                if (callbacks.onPaymentSucceeded) {
                    await callbacks.onPaymentSucceeded(event.data.object);
                }
                break;

            case 'invoice.payment_failed':
                if (callbacks.onPaymentFailed) {
                    await callbacks.onPaymentFailed(event.data.object);
                }
                break;

            case 'checkout.session.completed':
                if (callbacks.onCheckoutCompleted) {
                    await callbacks.onCheckoutCompleted(event.data.object);
                }
                break;

            default:
                console.log(`ℹ️  Unhandled event type: ${event.type}`);
        }

        return event;
    } catch (error) {
        console.error('Error handling webhook:', error);
        throw error;
    }
}

// ================================================================
// SUBSCRIPTION HELPERS
// ================================================================

/**
 * Get subscription details from Stripe
 * @param {string} subscriptionId - Stripe subscription ID
 * @returns {Object} - Subscription details
 */
async function getSubscription(subscriptionId) {
    try {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        return subscription;
    } catch (error) {
        console.error('Error retrieving subscription:', error);
        throw error;
    }
}

/**
 * Cancel subscription
 * @param {string} subscriptionId - Stripe subscription ID
 * @param {boolean} immediately - Cancel immediately vs at period end
 * @returns {Object} - Updated subscription
 */
async function cancelSubscription(subscriptionId, immediately = false) {
    try {
        if (immediately) {
            const subscription = await stripe.subscriptions.del(subscriptionId);
            return subscription;
        } else {
            const subscription = await stripe.subscriptions.update(subscriptionId, {
                cancel_at_period_end: true
            });
            return subscription;
        }
    } catch (error) {
        console.error('Error canceling subscription:', error);
        throw error;
    }
}

/**
 * Update subscription (e.g., upgrade/downgrade)
 * @param {string} subscriptionId - Stripe subscription ID
 * @param {string} newPriceId - New Stripe price ID
 * @returns {Object} - Updated subscription
 */
async function updateSubscription(subscriptionId, newPriceId) {
    try {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);

        const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
            items: [{
                id: subscription.items.data[0].id,
                price: newPriceId,
            }],
            proration_behavior: 'create_prorations',
        });

        return updatedSubscription;
    } catch (error) {
        console.error('Error updating subscription:', error);
        throw error;
    }
}

/**
 * Get customer by ID
 * @param {string} customerId - Stripe customer ID
 * @returns {Object} - Customer details
 */
async function getCustomer(customerId) {
    try {
        const customer = await stripe.customers.retrieve(customerId);
        return customer;
    } catch (error) {
        console.error('Error retrieving customer:', error);
        throw error;
    }
}

/**
 * List customer subscriptions
 * @param {string} customerId - Stripe customer ID
 * @returns {Array} - List of subscriptions
 */
async function listCustomerSubscriptions(customerId) {
    try {
        const subscriptions = await stripe.subscriptions.list({
            customer: customerId,
            status: 'all'
        });
        return subscriptions.data;
    } catch (error) {
        console.error('Error listing customer subscriptions:', error);
        throw error;
    }
}

// ================================================================
// USAGE ENFORCEMENT
// ================================================================

/**
 * Check if user can make a request based on subscription tier
 * @param {Object} user - User object with subscription info
 * @param {number} currentUsageThisMonth - Current question count this month
 * @returns {Object} - { allowed: boolean, reason: string, limit: number }
 */
function checkUsageLimit(user, currentUsageThisMonth) {
    // Default to free tier if no subscription
    const tier = user.subscription_tier || 'free';
    const pricingTier = PRICING_TIERS[tier];

    if (!pricingTier) {
        return {
            allowed: false,
            reason: 'Invalid subscription tier',
            limit: 0
        };
    }

    const limit = pricingTier.features.questionsPerMonth;

    // Unlimited (-1) means always allowed
    if (limit === -1) {
        return {
            allowed: true,
            reason: 'Unlimited usage (Pro/Enterprise tier)',
            limit: -1,
            remaining: -1
        };
    }

    // Check if under limit
    if (currentUsageThisMonth < limit) {
        return {
            allowed: true,
            reason: 'Within usage limit',
            limit: limit,
            remaining: limit - currentUsageThisMonth,
            used: currentUsageThisMonth
        };
    }

    // Over limit
    return {
        allowed: false,
        reason: 'Monthly usage limit exceeded',
        limit: limit,
        remaining: 0,
        used: currentUsageThisMonth
    };
}

/**
 * Get tier features
 * @param {string} tier - Pricing tier
 * @returns {Object} - Features for that tier
 */
function getTierFeatures(tier) {
    const pricingTier = PRICING_TIERS[tier];
    return pricingTier ? pricingTier.features : PRICING_TIERS.free.features;
}

// ================================================================
// EXPORTS
// ================================================================

module.exports = {
    // Configuration
    PRICING_TIERS,
    checkStripeConfiguration,

    // Checkout & Portal
    createCheckoutSession,
    createCustomerPortalSession,

    // Webhooks
    handleWebhook,

    // Subscription Management
    getSubscription,
    cancelSubscription,
    updateSubscription,
    getCustomer,
    listCustomerSubscriptions,

    // Usage Enforcement
    checkUsageLimit,
    getTierFeatures
};
