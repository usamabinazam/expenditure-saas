// ============================================================
// SUBSCRIPTION HELPER FUNCTIONS
// Yeh trial/active/expired logic handle karta hai
// ============================================================

// Plan details
export const PLANS = {
  basic_monthly: {
    id: 'basic_monthly',
    name: 'Basic Monthly',
    price: 300,
    duration_days: 30,
    schools: 1,
    label: 'Rs. 300/month',
  },
  basic_yearly: {
    id: 'basic_yearly',
    name: 'Basic Yearly',
    price: 3000,
    duration_days: 365,
    schools: 1,
    label: 'Rs. 3,000/year',
    badge: '2 Months Free',
  },
  multi_monthly: {
    id: 'multi_monthly',
    name: 'Multi-School Monthly',
    price: 750,
    duration_days: 30,
    schools: 5,
    label: 'Rs. 750/month',
  },
  multi_yearly: {
    id: 'multi_yearly',
    name: 'Multi-School Yearly',
    price: 7500,
    duration_days: 365,
    schools: 5,
    label: 'Rs. 7,500/year',
    badge: '2 Months Free',
  },
};

// Get subscription status info
export function getSubscriptionInfo(subscription) {
  if (!subscription) {
    return {
      status: 'none',
      isActive: false,
      isTrial: false,
      isExpired: true,
      daysLeft: 0,
      message: 'No subscription found',
    };
  }

  const now = new Date();
  const { status } = subscription;

  // TRIAL
  if (status === 'trial') {
    const trialEnd = new Date(subscription.trial_ends_at);
    const daysLeft = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));

    if (daysLeft <= 0) {
      return {
        status: 'expired',
        isActive: false,
        isTrial: false,
        isExpired: true,
        daysLeft: 0,
        message: 'Trial khatam ho gaya. Upgrade karein.',
      };
    }

    return {
      status: 'trial',
      isActive: true,
      isTrial: true,
      isExpired: false,
      daysLeft,
      message: `Trial: ${daysLeft} din baaki`,
    };
  }

  // PENDING (payment submitted, waiting for admin)
  if (status === 'pending') {
    return {
      status: 'pending',
      isActive: true,
      isTrial: false,
      isExpired: false,
      daysLeft: null,
      message: 'Payment verify ho rahi hai...',
    };
  }

  // ACTIVE
  if (status === 'active') {
    const expiresAt = new Date(subscription.expires_at);
    const daysLeft = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));

    if (daysLeft <= 0) {
      return {
        status: 'expired',
        isActive: false,
        isTrial: false,
        isExpired: true,
        daysLeft: 0,
        message: 'Subscription khatam. Renew karein.',
      };
    }

    return {
      status: 'active',
      isActive: true,
      isTrial: false,
      isExpired: false,
      daysLeft,
      message: `Active: ${daysLeft} din baaki`,
    };
  }

  // EXPIRED
  return {
    status: 'expired',
    isActive: false,
    isTrial: false,
    isExpired: true,
    daysLeft: 0,
    message: 'Subscription expired. Renew karein.',
  };
}

// ============================================================
// SMART EXPIRY CALCULATION
// 
// Priority order for base date:
// 1. Active subscription expiry (future) → extend from there
// 2. Trial end date (future) → trial ke baqi din PRESERVE
// 3. Now → fresh start
//
// Examples:
// - User trial day 2 (5 din baqi) leta yearly plan
//   → Expiry: trial_end + 365 din (5 din save!)
// - User active subscription day 60 (200 din baqi) renew karta
//   → Expiry: current expiry + new days (200 din save!)
// - Expired user renew karta
//   → Expiry: ab se duration days
// ============================================================
export function calculateNewExpiry(currentExpiry, durationDays, trialEndsAt = null) {
  const now = new Date();
  let baseDate = now;

  // Priority 1: Active subscription (future expiry)
  if (currentExpiry) {
    const existing = new Date(currentExpiry);
    if (existing > now) {
      baseDate = existing;
    }
  }

  // Priority 2: Trial chal raha hai aur expiry purani hai
  // (Trial ke baqi din save karo - fair to user)
  if (trialEndsAt) {
    const trialEnd = new Date(trialEndsAt);
    if (trialEnd > baseDate) {
      baseDate = trialEnd;
    }
  }

  // Add the plan duration
  const newExpiry = new Date(baseDate);
  newExpiry.setDate(newExpiry.getDate() + durationDays);
  return newExpiry.toISOString();
}

// Format date nicely
export function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
