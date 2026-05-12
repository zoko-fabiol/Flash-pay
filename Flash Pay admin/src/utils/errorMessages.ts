/**
 * Convert Firebase error codes and messages into user-friendly French/English messages
 */

export const translateFirebaseError = (error: any): string => {
  const errorCode = error?.code || error?.message || '';
  const message = error?.message || '';

  // Auth errors
  if (errorCode.includes('auth/invalid-credential') || message.includes('auth/invalid-credential')) {
    return 'Email ou mot de passe incorrect. Veuillez réessayer.';
  }
  if (errorCode.includes('auth/user-not-found')) {
    return 'Cet email n\'existe pas. Veuillez vérifier vos identifiants.';
  }
  if (errorCode.includes('auth/wrong-password')) {
    return 'Mot de passe incorrect. Veuillez réessayer.';
  }
  if (errorCode.includes('auth/too-many-requests')) {
    return 'Trop de tentatives. Veuillez réessayer plus tard.';
  }
  if (errorCode.includes('auth/network-request-failed')) {
    return 'Problème de connexion. Veuillez vérifier votre internet.';
  }

  // Firestore errors
  if (errorCode.includes('permission-denied')) {
    return 'Vous n\'avez pas l\'autorisation d\'accéder à cette ressource.';
  }

  // If we have a message that looks like an error code
  if (typeof message === 'string' && message.includes('(') && message.includes(')')) {
    return 'Une erreur est survenue lors de l\'authentification.';
  }

  return message || 'Une erreur est survenue. Veuillez réessayer.';
};
