'use strict';

const db = require('./db');
const { notify } = require('./discord-notify');

// Config — à personnaliser
const WALLET_ADDRESS = process.env.STAKK_WALLET || 'THdqcivWRapvpLSZEaAfff9TCfaQcCtXZ9'; // Adresse TRC20 USDC
const PRICING = {
  // montant USDC → jours d'abonnement
  1.5: 7,
  3: 15,
  5: 30,
  9: 60,
  13: 90,
  24: 180,
  40: 365,
};
const CURRENCY = 'USDC';
const NETWORK = 'TRC20';
// Contrat USDC TRC20 (Circle) — utilisé pour le deep link Trust Wallet (asset c195_t<contract>)
const USDC_CONTRACT = 'TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8';

function getPricing() {
  return Object.entries(PRICING)
    .map(([amount, days]) => ({ amount: parseFloat(amount), days, currency: CURRENCY, network: NETWORK }))
    .sort((a, b) => a.days - b.days);
}

function createPaymentRequest(userId, amount) {
  const days = PRICING[amount];
  if (!days) throw new Error('Invalid amount. Valid: ' + Object.keys(PRICING).join(', '));

  // Montant unique avec 6 décimales pour identifier le paiement (collision quasi impossible)
  const uniqueAmount = parseFloat(amount) + parseFloat((Math.random() * 0.09 + 0.01).toFixed(6));

  const result = db.createPayment.run(userId, WALLET_ADDRESS, uniqueAmount, CURRENCY, NETWORK);
  const payment = db.getPaymentById.get(result.lastInsertRowid);

  db.addLog.run('payment_created', `User ${userId} requested ${uniqueAmount} ${CURRENCY} for ${days} days`);

  const user = db.getUserById.get(userId);
  notify({
    title: 'Paiement en attente',
    description: `**${user?.username || 'user#' + userId}** a généré une demande de paiement`,
    color: 'blue',
    fields: [
      { name: 'Montant', value: `${uniqueAmount} ${CURRENCY}`, inline: true },
      { name: 'Durée', value: `${days} jours`, inline: true },
      { name: 'Réseau', value: NETWORK, inline: true },
    ],
  });

  return {
    id: payment.id,
    wallet: WALLET_ADDRESS,
    amount: uniqueAmount,
    currency: CURRENCY,
    network: NETWORK,
    days,
    // QR code data : deep link Trust Wallet qui pré-remplit l'asset USDC TRC20 + le montant.
    // Quand on scanne, Trust Wallet ouvre directement le form d'envoi USDC (et non TRX par défaut).
    // Les autres wallets qui ne comprennent pas le lien afficheront l'URL — le user garde
    // toujours l'option "Copier l'adresse" pour saisir le paiement à la main.
    qrData: `https://link.trustwallet.com/send?address=${WALLET_ADDRESS}&asset=c195_t${USDC_CONTRACT}&amount=${uniqueAmount}`,
  };
}

function confirmPaymentManual(paymentId, amountReceived, txHash) {
  const payment = db.getPaymentById.get(paymentId);
  if (!payment) throw new Error('Payment not found');
  if (payment.status === 'confirmed') throw new Error('Already confirmed');

  // Calculer les jours en fonction du montant reçu
  const baseAmount = Math.floor(amountReceived);
  const days = PRICING[baseAmount] || Math.floor(amountReceived / 5) * 7;

  db.confirmPayment.run(amountReceived, days, txHash || '', paymentId);

  // Créditer l'abonnement
  const user = db.getUserById.get(payment.user_id);
  const now = Math.floor(Date.now() / 1000);
  const currentExpiry = Math.max(user.sub_expires || 0, now);
  const newExpiry = currentExpiry + days * 24 * 3600;
  db.updateSub.run(newExpiry, payment.user_id);

  db.addLog.run('payment_confirmed', `Payment #${paymentId}: ${amountReceived} ${CURRENCY} → ${days} days for user ${user.username}`);

  notify({
    title: 'Paiement confirmé',
    description: `**${user.username}** a payé son abonnement`,
    color: 'green',
    fields: [
      { name: 'Montant reçu', value: `${amountReceived} ${CURRENCY}`, inline: true },
      { name: 'Crédit', value: `${days} jours`, inline: true },
      { name: 'Nouvelle expiration', value: new Date(newExpiry * 1000).toLocaleString('fr-FR'), inline: false },
      { name: 'TX Hash', value: txHash ? txHash.slice(0, 20) + '...' : 'manuel', inline: false },
    ],
  });

  return { days, newExpiry, username: user.username };
}

function getUserPayments(userId) {
  return db.getPaymentsByUser.all(userId);
}

function getPendingPayments() {
  return db.getPendingPayments.all();
}

module.exports = { getPricing, createPaymentRequest, confirmPaymentManual, getUserPayments, getPendingPayments, WALLET_ADDRESS };
