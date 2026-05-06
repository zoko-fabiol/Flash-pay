import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  type Auth,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  addDoc,
  query,
  where,
  getDocs,
  limit,
  arrayUnion,
  type Firestore,
  Timestamp,
  increment,
} from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';

// Firebase Configuration - Replace with your config
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDemoKey",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "flashpay-demo.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "flashpay-demo",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "flashpay-demo.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789:web:abcdef123456",
};

const app = initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage = getStorage(app);

// Auth Service
export const authService = {
  async signup(email: string, password: string, userData: { nom: string; tel: string; ref?: string }) {
    if (userData.ref?.trim()) {
      const normalizedCode = userData.ref.trim().toUpperCase();
      const referrerQuery = query(collection(db, 'users'), where('referralCode', '==', normalizedCode), limit(1));
      const referrerSnapshot = await getDocs(referrerQuery);

      if (referrerSnapshot.empty) {
        throw new Error('Code de parrainage invalide');
      }
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    const referralCode = await generateUniqueReferralCode();
    
    // Store user data in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      id: user.uid,
      email,
      nom: userData.nom,
      tel: userData.tel,
      referralCode,
      referredBy: null,
      referralStatus: 'none',
      referralStats: {
        invited: 0,
        rewarded: 0,
        pending: 0,
      },
      statut_kyc: 'Standard',
      kyc: {
        status: 'not_started',
        rejectionCount: 0,
        rejectionReasons: [],
      },
      solde_bonus: 0,
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      referredUsers: [],
      referralRewards: [],
    });

    if (userData.ref) {
      await userService.applyReferralCode(user.uid, userData.ref);
    }

    // Send verification email
    await sendEmailVerification(user);

    return user;
  },

  async sendVerificationEmail(user: FirebaseUser) {
    await sendEmailVerification(user);
  },

  async login(email: string, password: string) {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  },

  async logout() {
    await signOut(auth);
  },

  onAuthStateChanged(callback: (user: FirebaseUser | null) => void) {
    return onAuthStateChanged(auth, callback);
  },
};

// User Service
export const userService = {
  async getUserData(userId: string) {
    const userDoc = await getDoc(doc(db, 'users', userId));
    return userDoc.exists() ? userDoc.data() : null;
  },

  async getUserById(userId: string) {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) throw new Error('User not found');
    return { id: userDoc.id, ...userDoc.data() };
  },

  async updateUserProfile(userId: string, updates: any) {
    await updateDoc(doc(db, 'users', userId), {
      ...updates,
      updatedAt: new Date(),
    });
  },

  async validateKYCSubmission(payload: {
    formData: {
      firstName: string;
      lastName: string;
      dateOfBirth: string;
      nationality: string;
      address: string;
      city: string;
      postalCode: string;
      idNumber: string;
      idType: string;
      countryOfDeparture: string;
    };
    files: {
      idProof?: File | null;
      selfie?: File | null;
      addressProof?: File | null;
      localProof?: File | null;
    };
  }) {
    const { formData, files } = payload;
    const errors: string[] = [];

    const requiredTextFields: Array<keyof typeof formData> = [
      'firstName',
      'lastName',
      'dateOfBirth',
      'nationality',
      'address',
      'city',
      'postalCode',
      'idNumber',
      'countryOfDeparture',
    ];

    for (const field of requiredTextFields) {
      if (!String(formData[field] || '').trim()) {
        errors.push(`Le champ ${field} est obligatoire.`);
      }
    }

    const normalize = (value: string) => value.trim().toLowerCase();
    const departureCountry = normalize(formData.countryOfDeparture);
    const nationality = normalize(formData.nationality);
    const isRussianCorridor = departureCountry === 'russie' || departureCountry === 'russia' || nationality === 'russe' || nationality === 'russian';

    if (!files.idProof) errors.push('La pièce d’identité est obligatoire.');
    if (!files.selfie) errors.push('Le selfie de vérification est obligatoire.');
    if (!files.addressProof) errors.push('La preuve d’adresse est obligatoire.');

    if (!isRussianCorridor && !files.localProof) {
      errors.push('Un document local est requis pour le pays de départ sélectionné.');
    }

    const normalizedIdType = normalize(formData.idType);
    if (!['passport', 'nationalid', 'drivinglicense'].includes(normalizedIdType)) {
      errors.push('Le type de pièce d’identité est invalide.');
    }

    return {
      ok: errors.length === 0,
      errors,
      isRussianCorridor,
      requiresLocalDocument: !isRussianCorridor,
    };
  },

  // ===== NEW: KYC Document Upload with Compression =====
  async uploadKYCDocuments(userId: string, payload: {
    formData: {
      firstName: string;
      lastName: string;
      dateOfBirth: string;
      nationality: string;
      address: string;
      city: string;
      postalCode: string;
      idNumber: string;
      idType: string;
      countryOfDeparture: string;
    };
    files: {
      idProof?: File | null;
      selfie?: File | null;
      addressProof?: File | null;
      localProof?: File | null;
    };
  }): Promise<Record<string, string>> {
    const validation = await this.validateKYCSubmission(payload);
    if (!validation.ok) {
      throw new Error(validation.errors[0]);
    }

    // Rate limiting check
    await this.checkKYCRateLimit(userId);

    const { formData, files } = payload;
    const urls: Record<string, string> = {};
    const timestamp = Date.now();

    try {
      const blobToBase64 = (blob: Blob): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      };

      // Convert to Base64 directly
      if (files.idProof) {
        const compressed = await compressImage(files.idProof);
        urls.idProof = await blobToBase64(compressed);
      }

      if (files.selfie) {
        const compressed = await compressImage(files.selfie);
        urls.selfie = await blobToBase64(compressed);
      }

      if (files.addressProof) {
        const compressed = await compressImage(files.addressProof);
        urls.addressProof = await blobToBase64(compressed);
      }

      if (files.localProof) {
        const compressed = await compressImage(files.localProof);
        urls.localProof = await blobToBase64(compressed);
      }

      // Create KYC request document
      const kycRequest = {
        userId,
        email: (await this.getUserData(userId))?.email,
        fullName: (await this.getUserData(userId))?.nom,
        formData: {
          ...formData,
          normalizedNationality: formData.nationality.trim().toLowerCase(),
          normalizedCountryOfDeparture: formData.countryOfDeparture.trim().toLowerCase(),
        },
        documents: {
          idProof: { url: urls.idProof || '', uploadedAt: Timestamp.now() },
          selfie: { url: urls.selfie || '', uploadedAt: Timestamp.now() },
          addressProof: { url: urls.addressProof || '', uploadedAt: Timestamp.now() },
          localProof: files.localProof ? { url: urls.localProof || '', uploadedAt: Timestamp.now() } : null,
        },
        status: 'pending',
        workflowStatus: 'pending',
        corridor: validation.isRussianCorridor ? 'russia' : 'international',
        submittedAt: Timestamp.now(),
        history: [{
          action: 'submitted',
          timestamp: Timestamp.now(),
          actor: userId,
        }],
      };

      const docRef = await addDoc(collection(db, 'kyc_requests'), kycRequest);

      // Update user KYC status
      const userData = await this.getUserData(userId);
      const rejectionCount = userData?.kyc?.rejectionCount || 0;

      await updateDoc(doc(db, 'users', userId), {
        'kyc.status': 'pending',
        'kyc.submittedAt': Timestamp.now(),
        'kyc.rejectionCount': rejectionCount,
        'kyc.rejectionReasons': userData?.kyc?.rejectionReasons || [],
        'kyc.reviewedAt': null,
        'kyc.reviewedBy': null,
        'kyc.rejectionReason': null,
        'kyc.blocked': false,
        'kyc.nextEligibilityDate': null,
        'kyc.requestId': docRef.id,
        statut_kyc: 'Pending', // Legacy field
        updatedAt: new Date(),
      });

      await addDoc(collection(db, 'admin_logs'), {
        action: 'kyc_submitted',
        targetUserId: userId,
        kycId: docRef.id,
        corridor: kycRequest.corridor,
        requiresLocalDocument: validation.requiresLocalDocument,
        timestamp: Timestamp.now(),
      });

      await addDoc(collection(db, 'notifications'), {
        userId,
        type: 'kyc',
        event: 'submitted',
        title: 'KYC soumis',
        message: validation.isRussianCorridor
          ? 'Votre dossier KYC pour le corridor Russie est en attente de vérification.'
          : 'Votre dossier KYC est en attente de vérification.',
        status: 'unread',
        createdAt: Timestamp.now(),
        kycId: docRef.id,
      });

      return urls;
    } catch (error) {
      console.error('KYC upload error:', error);
      throw new Error('Document upload failed');
    }
  },

  // ===== NEW: Rate limiting (max 3 uploads per 24h) =====
  async checkKYCRateLimit(userId: string) {
    const today = new Date().toDateString();
    const limitKey = `kyc_limit_${userId}_${today}`;

    // In production, use Redis. For now, check Firestore
    const limitDoc = await getDoc(doc(db, 'kyc_limits', limitKey));
    const count = limitDoc.exists() ? limitDoc.data().count : 0;

    if (count >= 3) {
      throw new Error('Too many KYC submission attempts. Please try again tomorrow.');
    }

    // Increment counter
    await setDoc(doc(db, 'kyc_limits', limitKey), {
      count: count + 1,
      userId,
      createdAt: Timestamp.now(),
    });
  },

  // ===== NEW: KYC Rejection Workflow =====
  async rejectKYC(
    kycId: string,
    rejectionReason: string,
    adminId: string,
    adminNotes: string = ''
  ) {
    const kycDoc = await getDoc(doc(db, 'kyc_requests', kycId));
    if (!kycDoc.exists()) throw new Error('KYC request not found');

    const kyc = kycDoc.data();
    const userId = kyc.userId;
    const userData = await this.getUserData(userId);
    const rejectionCount = (userData?.kyc?.rejectionCount || 0) + 1;

    // Prepare updates
    const kycUpdates: any = {
      status: 'rejected',
      rejectionReason,
      rejectionCount,
      reviewedAt: Timestamp.now(),
      reviewedBy: adminId,
      history: [...(kyc.history || []), {
        action: 'rejected',
        timestamp: Timestamp.now(),
        actor: adminId,
        reason: rejectionReason,
      }],
    };

    const userUpdates: any = {
      'kyc.status': 'rejected',
      'kyc.rejectionReason': rejectionReason,
      'kyc.rejectionCount': rejectionCount,
      'kyc.lastRejectionDate': Timestamp.now(),
      'kyc.reviewedAt': Timestamp.now(),
      'kyc.reviewedBy': adminId,
      statut_kyc: 'Rejected',
    };

    // If 3+ rejections, block for 7 days
    if (rejectionCount >= 3) {
      const sevenDaysLater = new Date();
      sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
      userUpdates['kyc.nextEligibilityDate'] = Timestamp.fromDate(sevenDaysLater);
      kycUpdates.blocked = true;
      kycUpdates.blockedUntil = Timestamp.fromDate(sevenDaysLater);
    }

    // Update both documents
    await updateDoc(doc(db, 'kyc_requests', kycId), kycUpdates);
    await updateDoc(doc(db, 'users', userId), userUpdates);

    // Log action (audit trail)
    await addDoc(collection(db, 'admin_logs'), {
      adminId,
      action: 'kyc_rejected',
      targetUserId: userId,
      reason: rejectionReason,
      rejectionCount,
      rejectionCountTotal: rejectionCount,
      notes: adminNotes,
      timestamp: Timestamp.now(),
      kycId,
    });

    await addDoc(collection(db, 'notifications'), {
      userId,
      type: 'kyc',
      event: 'rejected',
      title: 'KYC rejeté',
      message: `Votre dossier KYC a été rejeté: ${rejectionReason}`,
      status: 'unread',
      createdAt: Timestamp.now(),
      kycId,
    });
  },

  // ===== NEW: KYC Approval Workflow =====
  async approveKYC(kycId: string, adminId: string, adminNotes: string = '') {
    const kycDoc = await getDoc(doc(db, 'kyc_requests', kycId));
    if (!kycDoc.exists()) throw new Error('KYC request not found');

    const kyc = kycDoc.data();
    const userId = kyc.userId;

    // Update KYC request
    await updateDoc(doc(db, 'kyc_requests', kycId), {
      status: 'approved',
      approvedAt: Timestamp.now(),
      approvedBy: adminId,
      history: [...(kyc.history || []), {
        action: 'approved',
        timestamp: Timestamp.now(),
        actor: adminId,
      }],
    });

    // Update user
    await updateDoc(doc(db, 'users', userId), {
      'kyc.status': 'approved',
      'kyc.approvedAt': Timestamp.now(),
      'kyc.level': 'expert',
      'kyc.reviewedAt': Timestamp.now(),
      'kyc.reviewedBy': adminId,
      statut_kyc: 'Expert',
      'bonuses.available': increment(5000), // KYC bonus
      updatedAt: new Date(),
    });

    // Log action
    await addDoc(collection(db, 'admin_logs'), {
      adminId,
      action: 'kyc_approved',
      targetUserId: userId,
      notes: adminNotes,
      timestamp: Timestamp.now(),
      kycId,
    });

    await addDoc(collection(db, 'notifications'), {
      userId,
      type: 'kyc',
      event: 'approved',
      title: 'KYC approuvé',
      message: 'Votre dossier KYC a été approuvé. Vos limites ont été augmentées.',
      status: 'unread',
      createdAt: Timestamp.now(),
      kycId,
    });

    // Add bonus to history
    await updateDoc(doc(db, 'users', userId), {
      'bonuses.history': [
        {
          type: 'kyc_bonus',
          amount: 5000,
          status: 'active',
          expiryDate: Timestamp.fromDate(new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)), // 60 days
          createdAt: Timestamp.now(),
        }
      ]
    });
  },

  // ===== LEGACY: uploadKYC (keeping for backward compatibility) =====
  async uploadKYC(userId: string, kycData: any) {
    await updateDoc(doc(db, 'users', userId), {
      ...kycData,
      kyc: {
        ...(kycData.kyc || {}),
        status: 'pending',
        submittedAt: Timestamp.now(),
      },
      statut_kyc: 'Pending',
      updatedAt: new Date(),
    });
  },

  async getReferralData(userId: string) {
    const userDoc = await getDoc(doc(db, 'users', userId));
    const data = userDoc.data();
    const referralQuery = query(collection(db, 'referrals'), where('referrerId', '==', userId));
    const referralSnapshot = await getDocs(referralQuery);
    const referrals = referralSnapshot.docs.map((item) => ({ id: item.id, ...(item.data() as any) }));

    const rewarded = referrals.filter((referral) => referral.status === 'rewarded');
    const pending = referrals.filter((referral) => referral.status === 'pending');

    return {
      referralCode: data?.referralCode,
      referredUsers: data?.referredUsers || [],
      totalBonus: data?.solde_bonus || 0,
      invitedCount: referrals.length,
      rewardedCount: rewarded.length,
      pendingCount: pending.length,
      referrals,
    };
  },

  async applyReferralCode(newUserId: string, referralCode: string) {
    const normalizedCode = referralCode.trim().toUpperCase();
    if (!normalizedCode) return { applied: false, reason: 'empty' };

    const currentUserDoc = await getDoc(doc(db, 'users', newUserId));
    const currentUser = currentUserDoc.data();
    if (currentUser?.referredBy) {
      return { applied: false, reason: 'already_applied' };
    }

    const referrerQuery = query(collection(db, 'users'), where('referralCode', '==', normalizedCode), limit(1));
    const referrerSnapshot = await getDocs(referrerQuery);
    if (referrerSnapshot.empty) {
      throw new Error('Code de parrainage invalide');
    }

    const referrerDoc = referrerSnapshot.docs[0];
    if (referrerDoc.id === newUserId) {
      throw new Error('Vous ne pouvez pas utiliser votre propre code');
    }

    const referralRecordRef = doc(collection(db, 'referrals'));
    const referralRecord = {
      id: referralRecordRef.id,
      referrerId: referrerDoc.id,
      referredUserId: newUserId,
      referralCode: normalizedCode,
      status: 'pending',
      bonusAmount: 500,
      createdAt: Timestamp.now(),
      rewardedAt: null,
      rewardReason: null,
    };

    await setDoc(referralRecordRef, referralRecord);
    await updateDoc(doc(db, 'users', newUserId), {
      referredBy: referrerDoc.id,
      referralCodeUsed: normalizedCode,
      referralStatus: 'pending',
      referralAppliedAt: Timestamp.now(),
      updatedAt: new Date(),
    });

    await updateDoc(doc(db, 'users', referrerDoc.id), {
      referredUsers: arrayUnion(newUserId),
      'referralStats.invited': increment(1),
      'referralStats.pending': increment(1),
      updatedAt: new Date(),
    });

    return { applied: true, referrerId: referrerDoc.id, referralRecordId: referralRecordRef.id };
  },

  async rewardReferralAfterKyc(userId: string, rewardAmount = 500) {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) return { rewarded: false, reason: 'user_not_found' };

    const user = userDoc.data() as any;
    const referrerId = user.referredBy;
    if (!referrerId) return { rewarded: false, reason: 'no_referrer' };
    if (user.referralStatus === 'rewarded') return { rewarded: false, reason: 'already_rewarded' };

    const referralQuery = query(
      collection(db, 'referrals'),
      where('referredUserId', '==', userId),
      where('referrerId', '==', referrerId),
      limit(1)
    );
    const referralSnapshot = await getDocs(referralQuery);
    if (referralSnapshot.empty) return { rewarded: false, reason: 'referral_record_missing' };

    const referralDoc = referralSnapshot.docs[0];
    await updateDoc(doc(db, 'referrals', referralDoc.id), {
      status: 'rewarded',
      rewardedAt: Timestamp.now(),
      rewardReason: 'kyc_approved',
    });

    await updateDoc(doc(db, 'users', referrerId), {
      solde_bonus: increment(rewardAmount),
      'referralStats.rewarded': increment(1),
      'referralStats.pending': increment(-1),
      'referralRewards': arrayUnion({
        referredUserId: userId,
        amount: rewardAmount,
        type: 'kyc_approved',
        awardedAt: Timestamp.now(),
      }),
      updatedAt: new Date(),
    });

    await updateDoc(doc(db, 'users', userId), {
      referralStatus: 'rewarded',
      referralRewardedAt: Timestamp.now(),
      updatedAt: new Date(),
    });

    return { rewarded: true, referrerId, referralRecordId: referralDoc.id };
  },
};

// KYC Service
export const kycService = {
  async getKYCRequests(status?: 'pending' | 'approved' | 'rejected') {
    let q;
    if (status) {
      q = query(
        collection(db, 'kyc_requests'),
        where('status', '==', status)
      );
    } else {
      q = query(collection(db, 'kyc_requests'));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as any),
    })) as any[];
  },

  async getKYCStatus(userId: string) {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return {
        status: 'not_started',
        rejectionCount: 0,
        isBlocked: false,
      };
    }

    const userData = userDoc.data();
    const kyc = userData?.kyc || {};
    const now = Date.now();
    const legacyStatus = userData?.statut_kyc === 'Pending'
      ? 'pending'
      : userData?.statut_kyc === 'Expert'
        ? 'approved'
        : userData?.statut_kyc === 'Rejected'
          ? 'rejected'
          : 'not_started';

    const isBlocked = kyc.nextEligibilityDate && 
      kyc.nextEligibilityDate.toMillis?.() > now;

    return {
      status: isBlocked ? 'blocked' : (kyc.status || legacyStatus),
      rejectionCount: kyc.rejectionCount || 0,
      isBlocked,
      blockedUntil: kyc.nextEligibilityDate?.toMillis?.(),
      livenessScore: kyc.livenessScore,
      lastSubmitted: kyc.submittedAt?.toMillis?.(),
      rejectionReasons: kyc.rejectionReasons || [],
    };
  },

  async approveKYC(kycId: string, userId: string, adminNotes: string = '') {
    const kycDoc = await getDoc(doc(db, 'kyc_requests', kycId));
    if (!kycDoc.exists()) throw new Error('KYC request not found');

    const kyc = kycDoc.data();

    // Update KYC request
    await updateDoc(doc(db, 'kyc_requests', kycId), {
      status: 'approved',
      approvedAt: Timestamp.now(),
      history: [...(kyc.history || []), {
        action: 'approved',
        timestamp: Timestamp.now(),
        actor: 'admin',
      }],
    });

    // Update user
    await updateDoc(doc(db, 'users', userId), {
      'kyc.status': 'approved',
      'kyc.approvedAt': Timestamp.now(),
      'kyc.level': 'expert',
      statut_kyc: 'Expert',
      updatedAt: new Date(),
    });

    // Log action
    await addDoc(collection(db, 'admin_logs'), {
      action: 'kyc_approved',
      targetUserId: userId,
      notes: adminNotes,
      timestamp: Timestamp.now(),
      kycId,
    });
  },

  async rejectKYC(kycId: string, userId: string, rejectionReason: string) {
    const kycDoc = await getDoc(doc(db, 'kyc_requests', kycId));
    if (!kycDoc.exists()) throw new Error('KYC request not found');

    const kyc = kycDoc.data();
    const userData = await userService.getUserData(userId);
    const rejectionCount = (userData?.kyc?.rejectionCount || 0) + 1;

    // Prepare updates
    const kycUpdates: any = {
      status: 'rejected',
      rejectionReason,
      rejectionCount,
      reviewedAt: Timestamp.now(),
      history: [...(kyc.history || []), {
        action: 'rejected',
        timestamp: Timestamp.now(),
        actor: 'admin',
        reason: rejectionReason,
      }],
    };

    const userUpdates: any = {
      'kyc.status': 'rejected',
      'kyc.rejectionReason': rejectionReason,
      'kyc.rejectionCount': rejectionCount,
      'kyc.lastRejectionDate': Timestamp.now(),
      'kyc.rejectionReasons': [...(userData?.kyc?.rejectionReasons || []), rejectionReason],
      statut_kyc: 'Rejected',
    };

    // If 3+ rejections, block for 7 days
    if (rejectionCount >= 3) {
      const sevenDaysLater = new Date();
      sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
      userUpdates['kyc.nextEligibilityDate'] = Timestamp.fromDate(sevenDaysLater);
      kycUpdates.blocked = true;
      kycUpdates.blockedUntil = Timestamp.fromDate(sevenDaysLater);
    }

    // Update both documents
    await updateDoc(doc(db, 'kyc_requests', kycId), kycUpdates);
    await updateDoc(doc(db, 'users', userId), userUpdates);

    // Log action
    await addDoc(collection(db, 'admin_logs'), {
      action: 'kyc_rejected',
      targetUserId: userId,
      reason: rejectionReason,
      rejectionCount,
      timestamp: Timestamp.now(),
      kycId,
    });
  },
};

// Transaction Service
export const transactionService = {
  async createTransaction(userId: string, transactionData: any) {
    const docRef = await addDoc(collection(db, 'transactions'), {
      userId,
      ...transactionData,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return docRef.id;
  },

  async getTransactions(userId: string) {
    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data());
  },

  async updateTransactionStatus(transactionId: string, status: string) {
    await updateDoc(doc(db, 'transactions', transactionId), {
      status,
      updatedAt: new Date(),
    });
  },
};

// ===== Helper Functions =====

// Compress image before upload (max 5MB)
export async function compressImage(file: File): Promise<Blob> {
  // Validate file size first
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('File size exceeds 5MB limit');
  }

  // Validate MIME type
  const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
  if (!validTypes.includes(file.type)) {
    throw new Error('Invalid image format. Use JPG or PNG.');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          'image/jpeg',
          0.85 // 85% quality
        );
      };
      img.onerror = () => reject(new Error('Failed to load image'));
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
  });
}

function generateReferralCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

async function generateUniqueReferralCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateReferralCode();
    const codeQuery = query(collection(db, 'users'), where('referralCode', '==', code), limit(1));
    const snapshot = await getDocs(codeQuery);
    if (snapshot.empty) return code;
  }

  return `${generateReferralCode()}${Date.now().toString(36).slice(-2).toUpperCase()}`;
}
