import * as functions from 'firebase-functions';

export function buildNotificationForTransaction(tx: any) {
  return {
    title: 'Transaction Updated',
    body: `Your transfer ${tx.id} is now ${tx.status}`,
    data: { type: 'transaction', id: tx.id, status: tx.status },
  };
}

export function buildNotificationForKyc(kyc: any) {
  return {
    title: 'KYC Update',
    body: `KYC ${kyc.id} status: ${kyc.status}`,
    data: { type: 'kyc', id: kyc.id, status: kyc.status },
  };
}

export function buildNotificationForReferral(ref: any) {
  return {
    title: 'Referral Reward',
    body: `You earned a referral reward: ${ref.amount}`,
    data: { type: 'referral', id: ref.id, amount: String(ref.amount) },
  };
}
