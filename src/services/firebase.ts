import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  updatePassword,
  type Auth,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
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
import { emailService } from './emailService';

// Firebase Configuration - Replace with your config
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCEffnRzBjjgyOh9IIUqmyqSd5jNJUQM_k",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "flash-pay-937d7.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "flash-pay-937d7",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "flash-pay-937d7.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "4504627700",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:4504627700:web:f1e63d7f9cc59b1b1af1a1",
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);

// Use the new Firestore cache API with HMR safety
export const db: Firestore = (() => {
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    });
  } catch (e) {
    return getFirestore(app);
  }
})();

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

    // --- Custom Email Verification via Google Apps Script ---
    try {
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store code in Firestore (Valid for 15 minutes)
      await setDoc(doc(db, 'verification_codes', user.uid), {
        code: verificationCode,
        email,
        expiresAt: Timestamp.fromDate(new Date(Date.now() + 15 * 60 * 1000)),
        createdAt: Timestamp.now()
      });

      // Send via GAS
      const htmlBody = emailService.getVerificationTemplate(verificationCode);
      await emailService.sendEmail(email, 'Code de vérification Flash Pay', htmlBody);
      
      console.log('Verification email sent via GAS');
    } catch (error) {
      console.error('Failed to send verification email via GAS:', error);
      // Fallback: standard firebase (will likely fail on Spark plan if customized)
      // await sendEmailVerification(user);
    }

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

  async updatePassword(newPassword: string) {
    if (!auth.currentUser) throw new Error('Utilisateur non connecté');
    await updatePassword(auth.currentUser, newPassword);
  },
};

// User Service
export const userService = {
  async getUserData(userId: string) {
    const userDoc = await getDoc(doc(db, 'users', userId));
    return userDoc.exists() ? userDoc.data() : null;
  },

  async savePushToken(userId: string, token: string) {
    await updateDoc(doc(db, 'users', userId), {
      fcmToken: token,
      pushEnabled: true,
      updatedAt: new Date(),
    });
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

  async requestAccountDeletion(userId: string) {
    await updateDoc(doc(db, 'users', userId), {
      deletionRequested: true,
      deletionRequestedAt: new Date(),
      status: 'inactive',
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

    const normalize = (value: string) => value.trim().toLowerCase().replace(/[^\w]/g, '');
    const departureCountry = normalize(formData.countryOfDeparture);
    const nationality = normalize(formData.nationality);
    const russianCountryNames = ['russie', 'russia', 'ru', 'russland', 'russland'];
    const russianNationalities = ['russe', 'russian', 'russe'];
    const isRussianCorridor = russianCountryNames.some(n => departureCountry.includes(n)) || russianNationalities.some(n => nationality.includes(n));

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

      const fileToDataUrl = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      };

      // Convert to Base64 directly
      if (files.idProof) {
        urls.idProof = files.idProof.type.startsWith('image/')
          ? await blobToBase64(await compressImage(files.idProof))
          : await fileToDataUrl(files.idProof);
      }

      if (files.selfie) {
        urls.selfie = files.selfie.type.startsWith('image/')
          ? await blobToBase64(await compressImage(files.selfie))
          : await fileToDataUrl(files.selfie);
      }

      if (files.addressProof) {
        urls.addressProof = files.addressProof.type.startsWith('image/')
          ? await blobToBase64(await compressImage(files.addressProof))
          : await fileToDataUrl(files.addressProof);
      }

      if (files.localProof) {
        urls.localProof = files.localProof.type.startsWith('image/')
          ? await blobToBase64(await compressImage(files.localProof))
          : await fileToDataUrl(files.localProof);
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

    // Fetch dynamic bonus amount from settings
    const settingsSnap = await getDocs(query(collection(db, 'settings'), limit(1)));
    let bonusAmount = 500; // Fallback
    if (!settingsSnap.empty) {
      bonusAmount = settingsSnap.docs[0].data().referralBonusRUB || 500;
    }

    const referralRecordRef = doc(collection(db, 'referrals'));
    const referralRecord = {
      id: referralRecordRef.id,
      referrerId: referrerDoc.id,
      referredUserId: newUserId,
      referralCode: normalizedCode,
      status: 'pending',
      bonusAmount: bonusAmount,
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

// ===== TRANSACTION CALCULATION & CREATION SERVICE =====
// Handles exchange rate snapshots, commission calculations, and complete transaction validation

export interface TransactionInput {
  transferType: 'russia-russia' | 'russia-africa' | 'africa-russia';
  amount: number;
  inputCurrency: string;
  outputCurrency: string;
  recipientOperator?: string;
  recipientName?: string;
  recipientPhone?: string;
  destinationCountry?: string;
  narration?: string;
}

export interface TransactionCalculation {
  exchangeRate: number;
  exchangeRateTimestamp: Timestamp;
  commissionPercentage: number;
  commissionAmount: number;
  amountAfterCommission: number;
  totalToPay: number;
  receivedAmount: number;
  isValid: boolean;
  errors: string[];
}

// Default fallback rates if not found in Firestore
const DEFAULT_RATES: { [key: string]: number } = {
  'RUB-XAF': 7.22,
  'XAF-RUB': 0.1385,
  'RUB-RUB': 1.0,
  'XAF-XAF': 1.0,
  'EUR-XAF': 655.957,
  'XAF-EUR': 0.001525,
  'EUR-RUB': 90.8,
  'RUB-EUR': 0.011011,
};

// Get current exchange rate from Firestore with fallback
async function getExchangeRateSnapshot(fromCurrency: string, toCurrency: string): Promise<{ rate: number; timestamp: Timestamp }> {
  // Same currency = no conversion
  if (fromCurrency === toCurrency) {
    return { rate: 1.0, timestamp: Timestamp.now() };
  }

  try {
    const q = query(
      collection(db, 'exchange_rates'),
      where('from', '==', fromCurrency),
      where('to', '==', toCurrency),
      limit(1)
    );
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const rateDoc = snapshot.docs[0].data();
      return { 
        rate: rateDoc.rate, 
        timestamp: Timestamp.now() 
      };
    }

    // Fallback to default rate if not found
    const fallbackKey = `${fromCurrency}-${toCurrency}`;
    const fallbackRate = DEFAULT_RATES[fallbackKey];
    
    if (fallbackRate) {
      console.warn(`Exchange rate ${fromCurrency} → ${toCurrency} not in Firestore, using default: ${fallbackRate}`);
      return { 
        rate: fallbackRate, 
        timestamp: Timestamp.now() 
      };
    }

    throw new Error(`No exchange rate found for ${fromCurrency} → ${toCurrency}`);
  } catch (error) {
    throw new Error(`Failed to get exchange rate: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Get applicable commission for transfer type and amount with destination specificity
async function getCommissionForAmount(
  transferType: 'russia-russia' | 'russia-africa' | 'africa-russia',
  amount: number,
  currency: string,
  destinationCountry?: string,
  destinationOperator?: string
): Promise<{ percentage: number; fixedAmount: number; feeType: 'percentage' | 'fixed'; id: string }> {
  try {
    const q = query(
      collection(db, 'commissions'),
      where('transferType', '==', transferType),
      where('currency', '==', currency)
    );
    const snapshot = await getDocs(q);

    // Find all rules that match the amount range
    const rules = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any))
      .filter(c => amount >= c.minAmount && amount <= c.maxAmount);

    if (rules.length === 0) {
      return { percentage: 0, fixedAmount: 0, feeType: 'percentage', id: 'default' };
    }

    // Sort by specificity: 
    // 1. Country + Operator
    // 2. Country only
    // 3. Generic (neither)
    let applicable = rules.find(c => c.destinationCountry === destinationCountry && c.destinationOperator === destinationOperator);
    if (!applicable) applicable = rules.find(c => c.destinationCountry === destinationCountry && !c.destinationOperator);
    if (!applicable) applicable = rules.find(c => !c.destinationCountry && !c.destinationOperator);

    if (!applicable) {
      return { percentage: 0, fixedAmount: 0, feeType: 'percentage', id: 'default' };
    }

    return { 
      percentage: applicable.percentage || 0,
      fixedAmount: applicable.fixedAmount || 0,
      feeType: applicable.feeType || 'percentage',
      id: applicable.id 
    };
  } catch (error) {
    console.error('Failed to get commission:', error);
    return { percentage: 0, fixedAmount: 0, feeType: 'percentage', id: 'default' };
  }
}

// Calculate complete transaction with all snapshots
export async function calculateTransactionRecap(transactionInput: TransactionInput): Promise<TransactionCalculation> {
  const errors: string[] = [];
  let isValid = true;

  try {
    // Get exchange rate snapshot
    const { rate: exchangeRate, timestamp: exchangeRateTimestamp } = 
      await getExchangeRateSnapshot(transactionInput.inputCurrency, transactionInput.outputCurrency);

    // Get commission for amount
    const { percentage: commissionPercentage, fixedAmount, feeType } = 
      await getCommissionForAmount(
        transactionInput.transferType,
        transactionInput.amount,
        transactionInput.inputCurrency,
        transactionInput.destinationCountry,
        transactionInput.recipientOperator
      );

    // Calculate commission amount
    const commissionAmount = feeType === 'fixed' 
      ? fixedAmount 
      : (transactionInput.amount * commissionPercentage) / 100;
      
    // The amount the recipient gets is now the BASE amount (before conversion)
    // The fees are ADDED on top for the sender to pay
    const amountAfterCommission = transactionInput.amount;
    const totalToPay = transactionInput.amount + commissionAmount;

    // Calculate received amount after conversion
    const receivedAmount = transactionInput.amount * exchangeRate;

    // Validate calculation
    if (exchangeRate <= 0) {
      errors.push('Invalid exchange rate');
      isValid = false;
    }
    if (transactionInput.amount <= 0) {
      errors.push('Base amount must be positive');
      isValid = false;
    }
    if (receivedAmount <= 0) {
      errors.push('Received amount must be positive');
      isValid = false;
    }

    return {
      exchangeRate,
      exchangeRateTimestamp,
      commissionPercentage,
      commissionAmount,
      amountAfterCommission,
      totalToPay,
      receivedAmount,
      isValid,
      errors,
    };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Unknown calculation error');
    return {
      exchangeRate: 0,
      exchangeRateTimestamp: Timestamp.now(),
      commissionPercentage: 0,
      commissionAmount: 0,
      amountAfterCommission: 0,
      totalToPay: 0,
      receivedAmount: 0,
      isValid: false,
      errors,
    };
  }
}

// Transaction Service with calculation integration
export const transactionService = {
  async createTransaction(userId: string, transactionData: any) {
    const docRef = await addDoc(collection(db, 'transactions'), {
      userId,
      ...transactionData,
      status: 'pending',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
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
      updatedAt: Timestamp.now(),
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
