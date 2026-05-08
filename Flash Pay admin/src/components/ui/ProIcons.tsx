import React from 'react';

interface ProIconProps {
  size?: number;
  className?: string;
}

// Dashboard
export const DashboardProIcon: React.FC<ProIconProps> = ({ size = 24, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="3" y="3" width="8" height="8" stroke="currentColor" strokeWidth="2" rx="1" />
    <rect x="13" y="3" width="8" height="8" stroke="currentColor" strokeWidth="2" rx="1" />
    <rect x="3" y="13" width="8" height="8" stroke="currentColor" strokeWidth="2" rx="1" />
    <rect x="13" y="13" width="8" height="8" stroke="currentColor" strokeWidth="2" rx="1" />
  </svg>
);

// Transactions
export const TransactionsProIcon: React.FC<ProIconProps> = ({ size = 24, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M3 6h18M3 10h18M3 14h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// Users
export const UsersProIcon: React.FC<ProIconProps> = ({ size = 24, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
    <path d="M3 21c0-2.21 2.69-4 6-4s6 1.79 6 4" stroke="currentColor" strokeWidth="2" />
    <circle cx="17" cy="8" r="3" stroke="currentColor" strokeWidth="2" />
    <path d="M15 20c0-1.66 1.79-3 4-3s4 1.34 4 3" stroke="currentColor" strokeWidth="2" />
  </svg>
);

// KYC / Verification
export const KycProIcon: React.FC<ProIconProps> = ({ size = 24, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M9 12l2 2 4-4m7-1.5A9.5 9.5 0 1111.5 2a9.5 9.5 0 018.5 11.5z" stroke="currentColor" strokeWidth="2" />
  </svg>
);

// Settings
export const SettingsProIcon: React.FC<ProIconProps> = ({ size = 24, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
    <path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m5.08 5.08l4.24 4.24M1 12h6m6 0h6m-17.78 7.78l4.24-4.24m5.08-5.08l4.24-4.24" stroke="currentColor" strokeWidth="2" />
  </svg>
);

// Network/Globe
export const NetworkProIcon: React.FC<ProIconProps> = ({ size = 24, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
    <path d="M2 12h20M12 2a15.3 15.3 0 016 7M12 2a15.3 15.3 0 00-6 7M12 22a15.3 15.3 0 016-7M12 22a15.3 15.3 0 00-6-7" stroke="currentColor" strokeWidth="2" />
  </svg>
);

// Messages/Mail
export const MessagesProIcon: React.FC<ProIconProps> = ({ size = 24, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
    <path d="M2 4l10 8 10-8" stroke="currentColor" strokeWidth="2" />
  </svg>
);

// Trending
export const TrendingProIcon: React.FC<ProIconProps> = ({ size = 24, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" stroke="currentColor" strokeWidth="2" />
    <polyline points="23 6 23 12 17 12" stroke="currentColor" strokeWidth="2" />
  </svg>
);

// Problems/Alert
export const ProblemsProIcon: React.FC<ProIconProps> = ({ size = 24, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M12 2L2 20h20L12 2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <path d="M12 9v4M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// Logout
export const LogoutProIcon: React.FC<ProIconProps> = ({ size = 24, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M17 16l4-4m0 0l-4-4m4 4H7m6-12v2m0 12v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="2" y="5" width="10" height="14" rx="1" stroke="currentColor" strokeWidth="2" />
  </svg>
);

// Menu
export const MenuProIcon: React.FC<ProIconProps> = ({ size = 24, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// Close
export const CloseProIcon: React.FC<ProIconProps> = ({ size = 24, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// Plus
export const PlusProIcon: React.FC<ProIconProps> = ({ size = 24, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// Trash
export const TrashProIcon: React.FC<ProIconProps> = ({ size = 24, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" stroke="currentColor" strokeWidth="2" />
    <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// Edit
export const EditProIcon: React.FC<ProIconProps> = ({ size = 24, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" />
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15H9v-3L18.5 2.5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
  </svg>
);

// Check
export const CheckProIcon: React.FC<ProIconProps> = ({ size = 24, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Arrow Right
export const ArrowRightProIcon: React.FC<ProIconProps> = ({ size = 24, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Search
export const SearchProIcon: React.FC<ProIconProps> = ({ size = 24, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
    <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// Clock/History
export const HistoryProIcon: React.FC<ProIconProps> = ({ size = 24, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
    <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// Shield
export const ShieldProIcon: React.FC<ProIconProps> = ({ size = 24, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M12 1L3 5v7c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" stroke="currentColor" strokeWidth="2" />
  </svg>
);

// Lock
export const LockProIcon: React.FC<ProIconProps> = ({ size = 24, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
    <path d="M7 11V7a5 5 0 0110 0v4M12 15v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// CreditCard
export const CreditCardProIcon: React.FC<ProIconProps> = ({ size = 24, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
    <path d="M2 10h20" stroke="currentColor" strokeWidth="2" />
    <path d="M6 16h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// Dollar
export const DollarProIcon: React.FC<ProIconProps> = ({ size = 24, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M12 1v22M17 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Map Pin
export const MapPinProIcon: React.FC<ProIconProps> = ({ size = 24, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M12 1C8.13 1 5 4.13 5 8c0 5 7 12 7 12s7-7 7-12c0-3.87-3.13-7-7-7z" stroke="currentColor" strokeWidth="2" />
    <circle cx="12" cy="8" r="2" stroke="currentColor" strokeWidth="2" />
  </svg>
);

// Eye
export const EyeProIcon: React.FC<ProIconProps> = ({ size = 24, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" />
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
  </svg>
);

// Bell
export const BellProIcon: React.FC<ProIconProps> = ({ size = 24, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// File Text
export const FileTextProIcon: React.FC<ProIconProps> = ({ size = 24, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="2" />
    <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="2" />
    <line x1="12" y1="13" x2="4" y2="13" stroke="currentColor" strokeWidth="2" />
    <line x1="12" y1="17" x2="4" y2="17" stroke="currentColor" strokeWidth="2" />
  </svg>
);

// Smartphone
export const SmartphoneProIcon: React.FC<ProIconProps> = ({ size = 24, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="5" y="2" width="14" height="20" rx="2" stroke="currentColor" strokeWidth="2" />
    <path d="M12 19h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// Building
export const BuildingProIcon: React.FC<ProIconProps> = ({ size = 24, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M4 20V8a2 2 0 012-2h12a2 2 0 012 2v12M4 20h16M8 12h2M14 12h2M8 16h2M14 16h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Loader
export const LoaderProIcon: React.FC<ProIconProps> = ({ size = 24, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`${className} animate-spin`}>
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.3" />
    <path d="M12 2a10 10 0 010 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
