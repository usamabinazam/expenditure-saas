'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navigation from '@/components/Navigation';
import { createClient } from '@/lib/supabase/client';
import { PLANS } from '@/lib/subscription';

// ⚠️ Apna Easypaisa number yahan daalo
const EASYPAISA_NUMBER = '0348-9443339';
const EASYPAISA_NAME = 'Usama Azam';
const WHATSAPP_NUMBER = '923429852419'; // 92 ke saath, bina +

// Discount amounts per plan (if referred)
const REFERRAL_DISCOUNTS = {
  basic_monthly: 50,
  basic_yearly: 500,
  multi_monthly: 100,
  multi_yearly: 1000,
};

export default function PricingClient({ 
  userEmail, 
  userId, 
  currentSubscription,
  isReferred,
  hasUsedDiscount,
  referrerEmail,
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [billingCycle, setBillingCycle] = useState('yearly');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [transactionId, setTransactionId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const isExpired = searchParams?.get('expired') === 'true';

  const discountActive = isReferred && !hasUsedDiscount;

  const getDiscountedPrice = (plan) => {
    if (!discountActive) return plan.price;
    const discount = REFERRAL_DISCOUNTS[plan.id] || 0;
    return Math.max(0, plan.price - discount);
  };

  const getDiscount = (plan) => discountActive ? (REFERRAL_DISCOUNTS[plan.id] || 0) : 0;

  const basicPlan = billingCycle === 'monthly' ? PLANS.basic_monthly : PLANS.basic_yearly;
  const multiPlan = billingCycle === 'monthly' ? PLANS.multi_monthly : PLANS.multi_yearly;

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
    setSubmitted(false);
    setTransactionId('');
  };

  const handleSubmitPayment = async () => {
    if (!transactionId.trim()) {
      alert('⚠️ Transaction ID ya reference daalein');
      return;
    }

    setSubmitting(true);

    const discountAmount = getDiscount(selectedPlan);
    const finalPrice = getDiscountedPrice(selectedPlan);

    const { error: reqError } = await supabase.from('payment_requests').insert({
      user_id: userId,
      plan: selectedPlan.id,
      amount: finalPrice,
      payment_method: 'easypaisa',
      transaction_id: transactionId.trim(),
      status: 'pending',
      notes: discountAmount > 0 
        ? `Original: Rs.${selectedPlan.price}, Referral discount: Rs.${discountAmount}, Paid: Rs.${finalPrice}` 
        : null,
    });

    if (reqError) {
      alert('Error: ' + reqError.message);
      setSubmitting(false);
      return;
    }

    await supabase.from('subscriptions').upsert({
      user_id: userId,
      plan: selectedPlan.id,
      status: 'pending',
      payment_method: 'easypaisa',
      payment_reference: transactionId.trim(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    if (discountActive) {
      await supabase
        .from('referrals')
        .update({ 
          discount_applied: discountAmount,
          referee_plan: selectedPlan.id,
        })
        .eq('referee_id', userId)
        .eq('status', 'pending');
    }

    setSubmitting(false);
    setSubmitted(true);
  };

  const finalPrice = selectedPlan ? getDiscountedPrice(selectedPlan) : 0;
  const discountAmt = selectedPlan ? getDiscount(selectedPlan) : 0;

  const whatsappLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    `Assalam o Alaikum! Maine payment ki hai.\nPlan: ${selectedPlan?.name}\nAmount: Rs. ${finalPrice}${discountAmt > 0 ? ` (Referral discount: Rs. ${discountAmt})` : ''}\nEmail: ${userEmail}\nTransaction ID: ${transactionId}`
  )}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation userEmail={userEmail} />

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Expired warning banner */}
        {isExpired && (
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="text-3xl">🔒</div>
              <div>
                <div className="font-bold text-red-900">Subscription Khatam Ho Gaya!</div>
                <div className="text-sm text-red-800 mt-1">
                  Naye statements banane ke liye renew karein. Aapke purane statements safe hain.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Referral discount banner */}
        {discountActive && (
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg p-5 mb-6 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="text-4xl">🎁</div>
              <div className="flex-1">
                <div className="font-bold text-white text-lg">
                  Referral Discount Active!
                </div>
                <div className="text-sm text-emerald-50 mt-1">
                  {referrerEmail ? `${referrerEmail} ne aapko invite kiya hai. ` : ''}
                  First payment pe special discount milega — neeche dekhein!
                </div>
              </div>
            </div>
          </div>
        )}

        {isReferred && hasUsedDiscount && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6 text-sm text-blue-800">
            ℹ️ Aapka referral discount already use ho chuka hai. Future payments pe normal price.
          </div>
        )}

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Apna Plan Chunein</h1>
          <p className="text-gray-600">Rs. 10/day se bhi sasta — ek chai ki keemat!</p>
        </div>

        {/* Billing toggle */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-lg shadow p-1 inline-flex">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-md font-medium transition ${
                billingCycle === 'monthly' ? 'bg-emerald-600 text-white' : 'text-gray-600'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-2 rounded-md font-medium transition ${
                billingCycle === 'yearly' ? 'bg-emerald-600 text-white' : 'text-gray-600'
              }`}
            >
              Yearly <span className="text-xs">(2 months free)</span>
            </button>
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* ============================================================
              BASIC PLAN
              - Monthly: AFFORDABLE badge (orange)
              - Yearly: POPULAR badge (emerald)
              ============================================================ */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-emerald-500 relative">
            {billingCycle === 'yearly' && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-xs px-3 py-1 rounded-full font-bold whitespace-nowrap shadow-md">
                ⭐ POPULAR
              </div>
            )}
            {billingCycle === 'monthly' && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs px-3 py-1 rounded-full font-bold whitespace-nowrap shadow-md">
                💰 AFFORDABLE
              </div>
            )}
            <h3 className="text-xl font-bold text-gray-800">{basicPlan.name}</h3>
            <div className="my-4">
              {discountActive ? (
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-emerald-600">
                      Rs. {getDiscountedPrice(basicPlan).toLocaleString()}
                    </span>
                    <span className="text-gray-500">
                      /{billingCycle === 'monthly' ? 'month' : 'year'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-gray-400 line-through">
                      Rs. {basicPlan.price.toLocaleString()}
                    </span>
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">
                      🎁 Save Rs. {getDiscount(basicPlan)}
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  <span className="text-4xl font-bold text-emerald-600">
                    Rs. {basicPlan.price.toLocaleString()}
                  </span>
                  <span className="text-gray-500">
                    /{billingCycle === 'monthly' ? 'month' : 'year'}
                  </span>
                </>
              )}
            </div>
            {basicPlan.badge && (
              <div className="text-sm text-emerald-700 font-medium mb-2">✨ {basicPlan.badge}</div>
            )}
            <ul className="space-y-2 text-sm text-gray-600 my-4">
              <li>✅ 1 School</li>
              <li>✅ Unlimited statements</li>
              <li>✅ PDF generation</li>
              <li>✅ All sections (Pays, Allowances, Non-Salary)</li>
            </ul>
            <button
              onClick={() => handleSelectPlan(basicPlan)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg"
            >
              Select Plan
            </button>
          </div>

          {/* ============================================================
              MULTI-SCHOOL PLAN
              - Both Monthly & Yearly: COMING SOON badge (purple)
              - Button still works (per user requirement)
              ============================================================ */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs px-3 py-1 rounded-full font-bold whitespace-nowrap shadow-md">
              🚧 COMING SOON
            </div>
            <h3 className="text-xl font-bold text-gray-800">{multiPlan.name}</h3>
            <div className="my-4">
              {discountActive ? (
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-gray-800">
                      Rs. {getDiscountedPrice(multiPlan).toLocaleString()}
                    </span>
                    <span className="text-gray-500">
                      /{billingCycle === 'monthly' ? 'month' : 'year'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-gray-400 line-through">
                      Rs. {multiPlan.price.toLocaleString()}
                    </span>
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">
                      🎁 Save Rs. {getDiscount(multiPlan)}
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  <span className="text-4xl font-bold text-gray-800">
                    Rs. {multiPlan.price.toLocaleString()}
                  </span>
                  <span className="text-gray-500">
                    /{billingCycle === 'monthly' ? 'month' : 'year'}
                  </span>
                </>
              )}
            </div>
            {multiPlan.badge && (
              <div className="text-sm text-emerald-700 font-medium mb-2">✨ {multiPlan.badge}</div>
            )}
            <ul className="space-y-2 text-sm text-gray-600 my-4">
              <li>✅ Up to 5 Schools</li>
              <li>✅ Unlimited statements</li>
              <li>✅ PDF generation</li>
              <li>✅ Priority support</li>
            </ul>
            <button
              onClick={() => handleSelectPlan(multiPlan)}
              className="w-full bg-gray-800 hover:bg-gray-900 text-white font-bold py-3 rounded-lg"
            >
              Select Plan
            </button>
          </div>
        </div>

        {/* Payment Instructions */}
        {selectedPlan && !submitted && (
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-blue-300">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              💳 Payment Instructions - {selectedPlan.name}
            </h3>

            <div className="bg-blue-50 rounded-lg p-4 mb-4">
              <div className="text-sm space-y-2">
                {discountAmt > 0 && (
                  <>
                    <div className="flex justify-between text-gray-500">
                      <span>Original Price:</span>
                      <span className="line-through">Rs. {selectedPlan.price.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-red-600 font-medium">
                      <span>🎁 Referral Discount:</span>
                      <span>- Rs. {discountAmt.toLocaleString()}</span>
                    </div>
                    <div className="border-t pt-2"></div>
                  </>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600 font-semibold">Amount to Pay:</span>
                  <span className="font-bold text-2xl text-emerald-600">
                    Rs. {finalPrice.toLocaleString()}
                  </span>
                </div>
                <div className="border-t pt-2 mt-2">
                  <div className="font-bold text-emerald-700 mb-1">📱 Easypaisa Details:</div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Number:</span>
                    <span className="font-mono font-bold">{EASYPAISA_NUMBER}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name:</span>
                    <span className="font-medium">{EASYPAISA_NAME}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 text-sm text-yellow-800">
              <strong>Steps:</strong>
              <ol className="list-decimal pl-5 mt-2 space-y-1">
                <li>Upar diye number pe <strong>Rs. {finalPrice}</strong> Easypaisa karein</li>
                <li>Transaction ID / reference niche daalein</li>
                <li>"Submit" karein</li>
                <li>WhatsApp pe screenshot bhejein (faster activation)</li>
                <li>Admin verify karke account activate karega (usually 1-2 hours)</li>
              </ol>
            </div>

            <label className="block text-sm font-medium text-gray-700 mb-1">
              Transaction ID / Reference *
            </label>
            <input
              type="text"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              placeholder="Easypaisa transaction ID daalein"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4"
            />

            <div className="flex gap-3">
              <button
                onClick={() => setSelectedPlan(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitPayment}
                disabled={submitting}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-lg disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Payment'}
              </button>
            </div>
          </div>
        )}

        {/* Success message */}
        {submitted && (
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-emerald-300 text-center">
            <div className="text-5xl mb-4">✅</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Payment Submitted!</h3>
            <p className="text-gray-600 mb-4">
              Aapki payment verify ho rahi hai. Admin 1-2 ghante mein activate karega.
            </p>
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg"
            >
              📱 WhatsApp pe Screenshot Bhejein (Faster!)
            </a>
            <div className="mt-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-gray-600 underline"
              >
                Dashboard pe wapas jaayein
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
