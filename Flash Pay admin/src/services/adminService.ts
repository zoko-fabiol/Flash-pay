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
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import type { TransactionStatus, ProblemFlag } from '../types';

import { fileToBase64 } from '../lib/imageUtils';

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
        await addDoc(collection(db, 'notifications'), {
          userId,
          title: `Mise à jour de votre transfert`,
          message: `Votre transfert #${transactionId.slice(-6)} est passé au statut : ${newStatus}. ${notes || ''}`,
          type: 'transaction_update',
          read: false,
          createdAt: Timestamp.now(),
          link: '/transactions'
        });
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

    const userDoc = await getDoc(doc(db, 'users', userId));
    const userData = userDoc.data() as any;
    const referrerId = userData?.referredBy;

    if (referrerId && userData?.referralStatus !== 'rewarded') {
      const referralQuery = query(
        collection(db, 'referrals'),
        where('referredUserId', '==', userId),
        where('referrerId', '==', referrerId)
      );
      const referralSnapshot = await getDocs(referralQuery);

      if (!referralSnapshot.empty) {
        const referralDoc = referralSnapshot.docs[0];
        await updateDoc(doc(db, 'referrals', referralDoc.id), {
          status: 'rewarded',
          rewardedAt: Timestamp.now(),
          rewardReason: 'kyc_approved',
        });

        await updateDoc(doc(db, 'users', referrerId), {
          solde_bonus: increment(500),
          'referralStats.rewarded': increment(1),
          'referralStats.pending': increment(-1),
          referralRewards: arrayUnion({
            referredUserId: userId,
            amount: 500,
            type: 'kyc_approved',
            awardedAt: Timestamp.now(),
          }),
          updatedAt: Timestamp.now(),
        });

        await updateDoc(doc(db, 'users', userId), {
          referralStatus: 'rewarded',
          referralRewardedAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      }
    }

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

  updateDailyLimit: async (dailyLimitRUB: number, referralBonusRUB: number = 500) => {
    const q = query(collection(db, 'settings'));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      // Create new settings document
      await addDoc(collection(db, 'settings'), {
        dailyLimitRUB,
        referralBonusRUB,
        updatedAt: Timestamp.now(),
        updatedBy: auth.currentUser?.uid,
      });
    } else {
      // Update existing settings document
      const settingsRef = doc(db, 'settings', snapshot.docs[0].id);
      await updateDoc(settingsRef, {
        dailyLimitRUB,
        referralBonusRUB,
        updatedAt: Timestamp.now(),
        updatedBy: auth.currentUser?.uid,
      });
    }

    // Log action
    await addDoc(collection(db, 'admin_logs'), {
      adminId: auth.currentUser?.uid,
      action: 'UPDATE_SETTINGS',
      details: { dailyLimitRUB, referralBonusRUB },
      timestamp: Timestamp.now()
    });
  },
};
