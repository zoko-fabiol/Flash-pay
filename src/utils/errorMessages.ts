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
    return 'Cet email n\'existe pas. Veuillez créer un compte.';
  }
  if (errorCode.includes('auth/wrong-password')) {
    return 'Mot de passe incorrect. Veuillez réessayer.';
  }
  if (errorCode.includes('auth/email-already-in-use')) {
    return 'Cet email est déjà utilisé. Veuillez vous connecter ou utiliser un autre email.';
  }
  if (errorCode.includes('auth/weak-password')) {
    return 'Le mot de passe doit contenir au moins 6 caractères.';
  }
  if (errorCode.includes('auth/invalid-email')) {
    return 'Email invalide. Veuillez entrer une adresse email valide.';
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
  if (errorCode.includes('not-found')) {
    return 'Ressource non trouvée.';
  }
  if (errorCode.includes('already-exists')) {
    return 'Cette ressource existe déjà.';
  }

  // Generic Firebase errors
  if (errorCode.includes('Firebase:')) {
    // Extract the actual error message from Firebase error format
    const match = message.match(/Firebase: (.+)\./);
    if (match) {
      return translateFirebaseError({ code: match[1] });
    }
  }

  // If we have a message that looks like an error code
  if (typeof message === 'string' && message.includes('(') && message.includes(')')) {
    return 'Une erreur est survenue. Veuillez réessayer.';
  }

  // Return message as-is if it's already user-friendly (starts with capital, no slashes)
  if (typeof message === 'string' && !message.includes('/') && message.length > 5) {
    return message;
  }

  return 'Une erreur est survenue. Veuillez réessayer.';
};
