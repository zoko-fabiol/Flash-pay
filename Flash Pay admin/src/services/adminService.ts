import {
  doc,
  updateDoc,
  addDoc,
  collection,
  Timestamp,
  arrayUnion,
  deleteDoc,
  getDoc,
  increment,
  query,
  where,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import type { TransactionStatus, ProblemFlag } from '../types';

import { fileToBase64 } from '../lib/imageUtils';
import { emailService } from './emailService';

export const adminService = {
  /**
   * "Upload" a file by converting it to a compressed base64 DataURL.
   * The result is stored directly in Firestore — no Firebase Storage needed.
   */
  uploadFile: async (_path: string, file: File | Blob): Promise<string> => {
    const fileObj = file instanceof File ? file : new File([file], 'image.jpg', { type: 'image/jpeg' });
    const dataUrl = await fileToBase64(fileObj);
    console.log('[Storage] Image convertie en base64 pour Firestore.');
    return dataUrl;
  },

  /**
   * Update transaction status and record history
   */
  updateTransactionStatus: async (
    transactionId: string,
    newStatus: TransactionStatus,
    notes?: string
  ) => {
    const txRef = doc(db, 'transactions', transactionId);
    const adminId = auth.currentUser?.uid;

    await updateDoc(txRef, {
      status: newStatus,
      statusHistory: arrayUnion({
        status: newStatus,
        timestamp: Timestamp.now(),
        notes: notes || `Status updated to ${newStatus} by admin`
      })
    });

    const txDoc = await getDoc(txRef);
    if (txDoc.exists()) {
      const txData = txDoc.data();
      const userId = txData.userId;
      if (userId) {
        // Send notification to sub-collection for real-time updates
        await addDoc(collection(db, 'notifications', userId, 'items'), {
          title: newStatus === 'completed' 
            ? 'Transfert complété ✓' 
            : newStatus === 'failed' 
            ? 'Transfert non traité'
            : 'Mise à jour de votre transfert',
          body: newStatus === 'completed' 
            ? `Votre argent a bien été reçu par le destinataire. Merci!` 
            : newStatus === 'failed'
            ? `Malheureusement, ce transfert n'a pas pu être traité. ${notes || 'Veuillez contacter le support.'}`
            : `Votre transfert a été mis à jour. ${notes || ''}`,
          type: 'transaction_update',
          priority: (newStatus === 'completed' || newStatus === 'failed') ? 'high' : 'normal',
          read: false,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          link: `/transactions/${transactionId}`,
          data: { transactionId }
        });

        await addDoc(collection(db, 'notifications'), {
          userId,
          title: `Mise à jour de votre transfert`,
          message: `Votre transfert a été mis à jour. Statut: ${newStatus}. ${notes || ''}`,
          type: 'transaction_update',
          read: false,
          createdAt: Timestamp.now(),
          link: `/transactions/${transactionId}`,
          data: { transactionId }
        });

        // Referral Bonus Logic on First Completed Transfer
        if (newStatus === 'completed') {
          // Send Success Email
          const userRef = doc(db, 'users', userId);
          const userDoc = await getDoc(userRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.email) {
              try {
                const emailBody = emailService.getTransferSuccessTemplate({
                  amount: txData.amount,
                  currency: txData.currency || 'RUB',
                  recipientName: txData.recipientName || txData.receiverName || 'Bénéficiaire',
                  txId: transactionId.substring(0, 10).toUpperCase()
                });
                await emailService.sendEmail(userData.email, 'Votre transfert Flash Pay est réussi !', emailBody);
              } catch (emailErr) {
                console.error('Failed to send success email:', emailErr);
              }
            }

            // --- AWARD LOYALTY POINTS ---
            try {
              let amountInRUB = txData.amount;
              if (txData.currency && txData.currency !== 'RUB') {
                const ratesSnap = await getDocs(collection(db, 'exchange_rates'));
                const rates = ratesSnap.docs.map(d => d.data());
                const rateObj = rates.find(r => r.from === txData.currency && r.to === 'RUB');
                const rate = rateObj?.rate || (txData.currency === 'XAF' ? 0.1385 : 1);
                amountInRUB = txData.amount * rate;
              }
              
              const pointsToEarn = Math.floor(amountInRUB);
              if (pointsToEarn > 0) {
                await updateDoc(userRef, {
                  solde_points: increment(pointsToEarn),
                  updatedAt: Timestamp.now()
                });

                // Log points history
                await addDoc(collection(db, 'points_history'), {
                  userId,
                  amount: pointsToEarn,
                  type: 'earning',
                  reason: `Points de fidélité gagnés pour la transaction #${transactionId.slice(-6)}`,
                  timestamp: Timestamp.now()
                });

                // Notify user
                await addDoc(collection(db, 'notifications', userId, 'items'), {
                  title: 'Points de fidélité reçus ! 🎁',
                  body: `Vous avez gagné ${pointsToEarn} points de fidélité avec ce transfert.`,
                  type: 'points_earned',
                  priority: 'normal',
                  read: false,
                  createdAt: Timestamp.now(),
                  updatedAt: Timestamp.now()
                });
              }
            } catch (ptsErr) {
              console.error('Failed to award loyalty points:', ptsErr);
            }
            // ---------------------------

            const referrerId = userData.referredBy;
            
            if (referrerId && !userData.referralBonusOnTransferPaid) {
              // Check if this is the first completed transaction for this user
              const q = query(
                collection(db, 'transactions'),
                where('userId', '==', userId),
                where('status', '==', 'completed')
              );
              const txsSnapshot = await getDocs(q);
              
              // If this is the first one (including the one just updated)
              if (txsSnapshot.size <= 1) {
                // Fetch referral bonus amount from settings
                let bonusAmount = 500; // Default
                const settingsSnapshot = await getDocs(query(collection(db, 'settings')));
                if (!settingsSnapshot.empty) {
                  bonusAmount = settingsSnapshot.docs[0].data().referralBonusRUB || 500;
                }

                // Award RUB bonus to referrer
                const referrerRef = doc(db, 'users', referrerId);
                await updateDoc(referrerRef, {
                  solde_bonus: increment(bonusAmount), // Referral bonus in RUB
                  'referralStats.rewarded': increment(1),
                  referralRewards: arrayUnion({
                    referredUserId: userId,
                    amount: bonusAmount,
                    type: 'first_transfer',
                    awardedAt: Timestamp.now(),
                    transactionId
                  }),
                  updatedAt: Timestamp.now()
                });

                // Mark user as rewarded for transfer
                await updateDoc(userRef, {
                  referralBonusOnTransferPaid: true,
                  referralRewardedAt: Timestamp.now(),
                  updatedAt: Timestamp.now()
                });

                // Log bonus award
                await addDoc(collection(db, 'admin_logs'), {
                  adminId,
                  action: 'REFERRAL_BONUS_AWARDED',
                  details: { referrerId, referredUserId: userId, amount: bonusAmount, transactionId },
                  timestamp: Timestamp.now()
                });

                // Notify referrer
                await addDoc(collection(db, 'notifications'), {
                  userId: referrerId,
                  title: `Bonus de parrain reçu!`,
                  message: `Quelqu'un que vous aviez invité a envoyé son premier transfert. Vous avez reçu ${bonusAmount} RUB.`,
                  type: 'referral_bonus',
                  read: false,
                  createdAt: Timestamp.now(),
                  link: '/partners'
                });

                // Real-time sub-collection notification
                await addDoc(collection(db, 'notifications', referrerId, 'items'), {
                  title: `Bonus reçu! 💰`,
                  body: `Votre ami a envoyé son premier transfert. Vous avez reçu ${bonusAmount} RUB.`,
                  type: 'referral_bonus',
                  priority: 'high',
                  read: false,
                  createdAt: Timestamp.now(),
                  updatedAt: Timestamp.now(),
                  link: '/partners'
                });
              }
            }
          }
        }
      }
    }

    // Log action
    await addDoc(collection(db, 'admin_logs'), {
      adminId,
      action: 'UPDATE_TRANSACTION_STATUS',
      details: { transactionId, newStatus, notes },
      timestamp: Timestamp.now()
    });
  },

  /**
   * Report a problem for a transaction
   */
  reportProblem: async (
    transactionId: string,
    problem: Omit<ProblemFlag, 'reportedAt' | 'resolved'>
  ) => {
    const txRef = doc(db, 'transactions', transactionId);

    await updateDoc(txRef, {
      status: 'flagged_problem',
      problemFlags: arrayUnion({
        ...problem,
        reportedAt: Timestamp.now(),
        resolved: false
      })
    });

    // Notify user of flagged problem
    try {
      const txDoc = await getDoc(txRef);
      if (txDoc.exists()) {
        const userId = txDoc.data().userId;
        if (userId) {
          await addDoc(collection(db, 'notifications', userId, 'items'), {
            title: 'Alerte sur votre transfert ⚠️',
            body: `Un problème a été détecté. ${problem.description} Consultez les détails.`,
            type: 'transaction_problem',
            priority: 'high',
            read: false,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            link: `/transactions/${transactionId}`,
            data: { transactionId }
          });
        }
      }
    } catch (err) {
      console.error('Failed to notify user of flagged problem:', err);
    }
  },

  /**
   * Update exchange rate
   */
  updateExchangeRate: async (
    rateId: string,
    rate: number,
    margin: number
  ) => {
    const rateRef = doc(db, 'exchange_rates', rateId);

    await updateDoc(rateRef, {
      rate,
      margin,
      updatedAt: Timestamp.now(),
      updatedBy: auth.currentUser?.uid
    });
  },

  /**
   * Update KYC validation status
   */
  updateKYCStatus: async (userId: string, status: 'approved' | 'rejected', adminNote?: string) => {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      'kyc.status': status,
      'kyc.adminNote': adminNote,
      'kyc.validatedAt': Timestamp.now(),
      'kyc.validatedBy': auth.currentUser?.uid,
      statut_kyc: status === 'approved' ? 'Expert' : 'Rejected'
    });
  },

  approveKYC: async (kycRequestId: string, adminNote?: string) => {
    const requestRef = doc(db, 'kyc_requests', kycRequestId);
    const requestDoc = await getDoc(requestRef);
    if (!requestDoc.exists()) throw new Error('KYC request not found');

    const request = requestDoc.data() as any;
    const userId = request.userId;

    await updateDoc(requestRef, {
      status: 'approved',
      reviewedAt: Timestamp.now(),
      reviewedBy: auth.currentUser?.uid,
      approvedAt: Timestamp.now(),
      notes: adminNote || '',
      history: arrayUnion({
        action: 'approved',
        timestamp: Timestamp.now(),
        actor: auth.currentUser?.uid || 'admin',
      })
    });

    await updateDoc(doc(db, 'users', userId), {
      'kyc.status': 'approved',
      'kyc.approvedAt': Timestamp.now(),
      'kyc.reviewedAt': Timestamp.now(),
      'kyc.reviewedBy': auth.currentUser?.uid,
      'kyc.adminNote': adminNote || '',
      'kyc.rejectionReason': null,
      'kyc.rejectionCount': 0,
      'kyc.rejectionReasons': [],
      'kyc.nextEligibilityDate': null,
      'kyc.blocked': false,
      statut_kyc: 'Expert',
      'bonuses.available': increment(5000),
      updatedAt: Timestamp.now(),
    });

    await addDoc(collection(db, 'admin_logs'), {
      adminId: auth.currentUser?.uid,
      action: 'kyc_approved',
      targetUserId: userId,
      kycId: kycRequestId,
      notes: adminNote || '',
      timestamp: Timestamp.now(),
    });
  },

  rejectKYC: async (kycRequestId: string, rejectionReason: string, adminNote?: string) => {
    const requestRef = doc(db, 'kyc_requests', kycRequestId);
    const requestDoc = await getDoc(requestRef);
    if (!requestDoc.exists()) throw new Error('KYC request not found');

    const request = requestDoc.data() as any;
    const userId = request.userId;
    const currentRejectionCount = (request.rejectionCount || 0) + 1;
    const blocked = currentRejectionCount >= 3;
    const blockedUntil = blocked ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null;

    await updateDoc(requestRef, {
      status: 'rejected',
      reviewedAt: Timestamp.now(),
      reviewedBy: auth.currentUser?.uid,
      rejectionReason,
      rejectionCount: currentRejectionCount,
      blocked,
      blockedUntil: blockedUntil ? Timestamp.fromDate(blockedUntil) : null,
      notes: adminNote || '',
      history: arrayUnion({
        action: 'rejected',
        timestamp: Timestamp.now(),
        actor: auth.currentUser?.uid || 'admin',
        reason: rejectionReason,
      })
    });

    await updateDoc(doc(db, 'users', userId), {
      'kyc.status': 'rejected',
      'kyc.reviewedAt': Timestamp.now(),
      'kyc.reviewedBy': auth.currentUser?.uid,
      'kyc.rejectionReason': rejectionReason,
      'kyc.rejectionCount': currentRejectionCount,
      'kyc.rejectionReasons': arrayUnion(rejectionReason),
      'kyc.lastRejectionDate': Timestamp.now(),
      'kyc.nextEligibilityDate': blockedUntil ? Timestamp.fromDate(blockedUntil) : null,
      'kyc.blocked': blocked,
      statut_kyc: 'Rejected',
      updatedAt: Timestamp.now(),
    });

    await addDoc(collection(db, 'admin_logs'), {
      adminId: auth.currentUser?.uid,
      action: 'kyc_rejected',
      targetUserId: userId,
      kycId: kycRequestId,
      reason: rejectionReason,
      notes: adminNote || '',
      rejectionCount: currentRejectionCount,
      timestamp: Timestamp.now(),
    });
  },

  /**
   * Resolve a problem report
   */
  resolveProblemReport: async (reportId: string, resolution: string) => {
    const reportRef = doc(db, 'problem_reports', reportId);
    await updateDoc(reportRef, {
      status: 'resolved',
      resolutionNote: resolution,
      resolvedAt: Timestamp.now(),
      resolvedBy: auth.currentUser?.uid
    });

    // Notify user of resolution
    try {
      const reportDoc = await getDoc(reportRef);
      if (reportDoc.exists()) {
        const userId = reportDoc.data().userId;
        if (userId) {
          await addDoc(collection(db, 'notifications', userId, 'items'), {
            title: 'Demande traitée ✓',
            body: `Votre demande a été examinée et résolue. ${resolution}`,
            type: 'support_resolution',
            priority: 'normal',
            read: false,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            link: '/support'
          });
        }
      }
    } catch (err) {
      console.error('Failed to notify user of ticket resolution:', err);
    }
  },

  /**
   * Add or update a country configuration
   */
  saveCountry: async (id: string | null, data: any) => {
    if (id) {
      const ref = doc(db, 'countries', id);
      await updateDoc(ref, { ...data, updatedAt: Timestamp.now() });
    } else {
      await addDoc(collection(db, 'countries'), { ...data, createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
    }
  },

  /**
   * Add or update a Russian bank
   */
  saveBank: async (id: string | null, data: any) => {
    if (id) {
      const ref = doc(db, 'banks', id);
      await updateDoc(ref, { ...data, updatedAt: Timestamp.now() });
    } else {
      await addDoc(collection(db, 'banks'), { ...data, active: true, createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
    }
  },

  /**
   * Manage custom currency pairs
   */
  saveCustomRate: async (from: string, to: string, rate: number) => {
    await addDoc(collection(db, 'custom_rates'), {
      from,
      to,
      rate,
      updatedAt: Timestamp.now(),
      updatedBy: auth.currentUser?.uid
    });
  },

  updateCustomRate: async (id: string, rate: number) => {
    const rateRef = doc(db, 'custom_rates', id);
    await updateDoc(rateRef, {
      rate,
      updatedAt: Timestamp.now(),
      updatedBy: auth.currentUser?.uid
    });

    // Log action
    await addDoc(collection(db, 'admin_logs'), {
      adminId: auth.currentUser?.uid,
      action: 'UPDATE_CUSTOM_RATE',
      details: { id, rate },
      timestamp: Timestamp.now()
    });
  },

  deleteCustomRate: async (id: string) => {
    const rateRef = doc(db, 'custom_rates', id);
    await deleteDoc(rateRef);

    // Log action
    await addDoc(collection(db, 'admin_logs'), {
      adminId: auth.currentUser?.uid,
      action: 'DELETE_CUSTOM_RATE',
      details: { id },
      timestamp: Timestamp.now()
    });
  },

  deleteDocument: async (collectionName: string, id: string) => {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);

    // Log action
    await addDoc(collection(db, 'admin_logs'), {
      adminId: auth.currentUser?.uid,
      action: `DELETE_${collectionName.toUpperCase().slice(0, -1)}`,
      details: { id },
      timestamp: Timestamp.now()
    });
  },

  updateDailyLimit: async (
    dailyLimitRUB: number,
    referralBonusRUB: number = 500,
    standardLimitRUB: number = 20000,
    expertLimitRUB: number = 150000,
    notificationEmails: string[] = []
  ) => {
    const q = query(collection(db, 'settings'));
    const snapshot = await getDocs(q);
    
    const payload = {
      dailyLimitRUB,
      standardLimitRUB,
      expertLimitRUB,
      referralBonusRUB,
      notificationEmails,
      updatedAt: Timestamp.now(),
      updatedBy: auth.currentUser?.uid,
    };

    if (snapshot.empty) {
      await addDoc(collection(db, 'settings'), payload);
    } else {
      const settingsRef = doc(db, 'settings', snapshot.docs[0].id);
      await updateDoc(settingsRef, payload);
    }

    // Log action
    await addDoc(collection(db, 'admin_logs'), {
      adminId: auth.currentUser?.uid,
      action: 'UPDATE_SETTINGS',
      details: { dailyLimitRUB, standardLimitRUB, expertLimitRUB, referralBonusRUB, notificationEmails },
      timestamp: Timestamp.now()
    });
  },
};
