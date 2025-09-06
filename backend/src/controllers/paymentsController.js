const { razorpay, stripe } = require('../lib/payments');
const supabaseAdmin = require('../lib/supabase');
const crypto = require('crypto');

exports.createPayment = async (req, res, next) => {
  try {
    const { provider, plan, amount, currency = 'INR' } = req.body;
    const userId = req.user.id;

    if (provider === 'razorpay') {
      const options = { amount: amount * 100, currency, receipt: `receipt_${Date.now()}` };
      const order = await razorpay.orders.create(options);
      return res.json({ orderId: order.id, ...order });
    }
    if (provider === 'stripe') {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount * 100,
        currency: currency.toLowerCase(),
        metadata: { userId, plan }
      });
      return res.json({ clientSecret: paymentIntent.client_secret });
    }
    res.status(400).json({ error: 'Invalid payment provider' });
  } catch (err) {
    next(err);
  }
};

exports.verifyPayment = async (req, res, next) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const secret = process.env.RAZORPAY_KEY_SECRET;

    const shasum = crypto.createHmac('sha256', secret).update(req.body).digest('hex');

    if (signature !== shasum) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const payload = JSON.parse(req.body.toString());
    const paymentEntity = payload.payload.payment.entity;

    if (paymentEntity.status === 'captured') {
      const userId = paymentEntity.notes.userId || paymentEntity.metadata?.userId;
      const amount = paymentEntity.amount / 100;
      const currency = paymentEntity.currency.toUpperCase();
      const plan = paymentEntity.notes.plan || paymentEntity.metadata?.plan || null;

      await supabaseAdmin.from('payments').insert({
        user_id: userId,
        amount,
        currency,
        plan,
        payment_status: paymentEntity.status
      });

      if (plan && userId) {
        await supabaseAdmin.from('users_app').update({ plan }).eq('id', userId);
      }
    }

    res.json({ status: 'ok' });
  } catch (err) {
    next(err);
  }
};
