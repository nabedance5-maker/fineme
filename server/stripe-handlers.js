/**
 * stripe-handlers.js
 * Express routes for internal Stripe webhook callbacks + admin billing API
 * Mount: app.use('/internal', require('./stripe-handlers'))
 *        app.use('/api/billing', require('./stripe-handlers').billingRouter)
 */
const express = require('express');
const dbModule = require('./db');

// ---- Internal router (called by Next.js webhook handler) ----
const internalRouter = express.Router();

function authInternal(req, res, next) {
  const key = req.headers['x-internal-key'] || '';
  if (process.env.INTERNAL_API_KEY && key !== process.env.INTERNAL_API_KEY) {
    return res.status(403).json({ error: 'forbidden' });
  }
  next();
}

// POST /internal/subscriptions/upsert
internalRouter.post('/subscriptions/upsert', authInternal, (req, res) => {
  const db = dbModule.open();
  const {
    providerId, stripeSubscriptionId, stripeCustomerId,
    status, currentPeriodStart, currentPeriodEnd, amount,
  } = req.body;

  const now = new Date().toISOString();

  // providers テーブルの subscriptionStatus を更新
  db.run(
    `UPDATE providers SET stripeSubscriptionId=?, subscriptionStatus=?, stripeCustomerId=? WHERE id=?`,
    [stripeSubscriptionId, status, stripeCustomerId, providerId]
  );

  // subscriptions テーブルに upsert
  db.run(
    `INSERT INTO subscriptions
       (providerId, stripeSubscriptionId, stripeCustomerId, status, currentPeriodStart, currentPeriodEnd, amount, createdAt, updatedAt)
     VALUES (?,?,?,?,?,?,?,?,?)
     ON CONFLICT(stripeSubscriptionId) DO UPDATE SET
       status=excluded.status,
       currentPeriodStart=excluded.currentPeriodStart,
       currentPeriodEnd=excluded.currentPeriodEnd,
       amount=excluded.amount,
       updatedAt=excluded.updatedAt`,
    [providerId, stripeSubscriptionId, stripeCustomerId, status,
     currentPeriodStart, currentPeriodEnd, amount, now, now]
  );

  res.json({ ok: true });
});

// POST /internal/payments/record
internalRouter.post('/payments/record', authInternal, (req, res) => {
  const db = dbModule.open();
  const {
    providerId, stripeInvoiceId, stripePaymentIntentId,
    amount, currency, status, paidAt,
  } = req.body;

  const now = new Date().toISOString();

  db.run(
    `INSERT OR IGNORE INTO payments
       (providerId, stripePaymentIntentId, stripeInvoiceId, amount, currency, status, paidAt, createdAt)
     VALUES (?,?,?,?,?,?,?,?)`,
    [providerId, stripePaymentIntentId || '', stripeInvoiceId, amount, currency || 'jpy', status, paidAt, now]
  );

  // 支払成功 → 紹介報酬レコードを生成（紹介者がいれば）
  if (status === 'paid') {
    const yearMonth = now.slice(0, 7); // YYYY-MM
    db.get(
      `SELECT referredByProviderId FROM providers WHERE id=?`,
      [providerId],
      (err, row) => {
        if (err || !row || !row.referredByProviderId) return;
        db.run(
          `INSERT OR IGNORE INTO referral_rewards
             (referrerProviderId, referredProviderId, rewardAmount, status, periodYearMonth, createdAt)
           VALUES (?,?,500,'pending',?,?)`,
          [row.referredByProviderId, providerId, yearMonth, now]
        );
      }
    );
  }

  res.json({ ok: true });
});

// ---- Billing Admin API ----
const billingRouter = express.Router();

// GET /api/billing/providers  → サブスク一覧（管理画面用）
billingRouter.get('/providers', (req, res) => {
  const db = dbModule.open();
  db.all(
    `SELECT p.id, p.displayName, p.email, p.category,
            p.subscriptionStatus, p.billingStartDate, p.planAmount,
            p.stripeCustomerId, p.stripeSubscriptionId,
            p.createdAt,
            ref.displayName AS referrerName
     FROM providers p
     LEFT JOIN providers ref ON ref.id = p.referredByProviderId
     ORDER BY p.createdAt DESC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    }
  );
});

// GET /api/billing/payments  → 決済履歴（管理画面用）
billingRouter.get('/payments', (req, res) => {
  const db = dbModule.open();
  db.all(
    `SELECT pay.*, p.displayName AS providerName, p.email AS providerEmail
     FROM payments pay
     LEFT JOIN providers p ON p.id = pay.providerId
     ORDER BY pay.createdAt DESC
     LIMIT 200`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    }
  );
});

// GET /api/billing/referrals  → 紹介報酬一覧（管理画面用）
billingRouter.get('/referrals', (req, res) => {
  const db = dbModule.open();
  db.all(
    `SELECT rr.*,
            ref.displayName AS referrerName, ref.email AS referrerEmail,
            red.displayName AS referredName, red.email AS referredEmail
     FROM referral_rewards rr
     LEFT JOIN providers ref ON ref.id = rr.referrerProviderId
     LEFT JOIN providers red ON red.id = rr.referredProviderId
     ORDER BY rr.createdAt DESC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    }
  );
});

// GET /api/billing/summary  → KPIサマリ
billingRouter.get('/summary', (req, res) => {
  const db = dbModule.open();
  db.get(
    `SELECT
       COUNT(*) AS totalProviders,
       SUM(CASE WHEN subscriptionStatus='active' THEN 1 ELSE 0 END) AS activeSubscriptions,
       SUM(CASE WHEN subscriptionStatus='trialing' THEN 1 ELSE 0 END) AS trialingProviders,
       SUM(CASE WHEN subscriptionStatus='active' THEN planAmount ELSE 0 END) AS mrr
     FROM providers`,
    [],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });

      db.get(
        `SELECT SUM(rewardAmount) AS totalPendingRewards FROM referral_rewards WHERE status='pending'`,
        [],
        (err2, row2) => {
          res.json({
            totalProviders: row?.totalProviders || 0,
            activeSubscriptions: row?.activeSubscriptions || 0,
            trialingProviders: row?.trialingProviders || 0,
            mrr: row?.mrr || 0,
            pendingReferralRewards: row2?.totalPendingRewards || 0,
          });
        }
      );
    }
  );
});

module.exports = { internalRouter, billingRouter };
