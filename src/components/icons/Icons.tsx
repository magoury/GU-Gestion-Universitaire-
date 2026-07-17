// src/components/icons/Icons.tsx
// ──────────────────────────────────────────────────────────────
// Icônes SVG minimalistes en style outline (style Heroicons).
// strokeWidth: 1.5, s'adapte au currentColor et prend w-5 h-5 par défaut.
// ──────────────────────────────────────────────────────────────

import React from 'react';

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  direction?: 'left' | 'right' | 'up' | 'down';
}

const baseSvgClasses = "w-5 h-5 stroke-current fill-none";

export function HomeIcon({ className = "", ...props }: IconProps) {
  return (
    <svg className={`${baseSvgClasses} ${className}`} viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

export function StudentsIcon({ className = "", ...props }: IconProps) {
  return (
    <svg className={`${baseSvgClasses} ${className}`} viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
    </svg>
  );
}

export function TeachersIcon({ className = "", ...props }: IconProps) {
  return (
    <svg className={`${baseSvgClasses} ${className}`} viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function NotesIcon({ className = "", ...props }: IconProps) {
  return (
    <svg className={`${baseSvgClasses} ${className}`} viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

export function MoneyIcon({ className = "", ...props }: IconProps) {
  return (
    <svg className={`${baseSvgClasses} ${className}`} viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

export function LibraryIcon({ className = "", ...props }: IconProps) {
  return (
    <svg className={`${baseSvgClasses} ${className}`} viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
    </svg>
  );
}

export function BellIcon({ className = "", ...props }: IconProps) {
  return (
    <svg className={`${baseSvgClasses} ${className}`} viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

export function SearchIcon({ className = "", ...props }: IconProps) {
  return (
    <svg className={`${baseSvgClasses} ${className}`} viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

export function SettingsIcon({ className = "w-5 h-5", ...props }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" 
      viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" 
      className={className} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.43l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 0 1 0-.255c.007-.378-.138-.75-.43-.991l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}

export function AlertIcon({ className = "", ...props }: IconProps) {
  return (
    <svg className={`${baseSvgClasses} ${className}`} viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

export function ClockIcon({ className = "", ...props }: IconProps) {
  return (
    <svg className={`${baseSvgClasses} ${className}`} viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

export function LogoutIcon({ className = "", ...props }: IconProps) {
  return (
    <svg className={`${baseSvgClasses} ${className}`} viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

export function HelpIcon({ className = "", ...props }: IconProps) {
  return (
    <svg className={`${baseSvgClasses} ${className}`} viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

export function PlusIcon({ className = "w-5 h-5", ...props }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" 
      viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" 
      className={className} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

export function FileIcon({ className = "", ...props }: IconProps) {
  return (
    <svg className={`${baseSvgClasses} ${className}`} viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

export function CheckIcon({ className = "", ...props }: IconProps) {
  return (
    <svg className={`${baseSvgClasses} ${className}`} viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function TrashIcon({ className = "", ...props }: IconProps) {
  return (
    <svg className={`${baseSvgClasses} ${className}`} viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

export function RefreshIcon({ className = "", ...props }: IconProps) {
  return (
    <svg className={`${baseSvgClasses} ${className}`} viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
    </svg>
  );
}

export function BookIcon({ className = "", ...props }: IconProps) {
  return (
    <svg className={`${baseSvgClasses} ${className}`} viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

export function ChevronIcon({ className = "", direction = "right", ...props }: IconProps) {
  return (
    <svg className={`${baseSvgClasses} ${className}`} viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      {direction === "left" && <polyline points="15 18 9 12 15 6" />}
      {direction === "right" && <polyline points="9 18 15 12 9 6" />}
      {direction === "up" && <polyline points="18 15 12 9 6 15" />}
      {direction === "down" && <polyline points="6 9 12 15 18 9" />}
    </svg>
  );
}

export function BuildingIcon({ className = "w-5 h-5", ...props }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" 
      viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" 
      className={className} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21h10.5V18a1.5 1.5 0 0 0-1.5-1.5h-7.5A1.5 1.5 0 0 0 6.75 18v3Z" />
    </svg>
  );
}

export function TeacherIcon({ className = "", ...props }: IconProps) {
  return (
    <svg className={`${baseSvgClasses} ${className}`} viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 11h3" />
      <path d="M21 9v4" />
      <path d="M22 3h-6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h6Z" />
    </svg>
  );
}

export function ParentIcon({ className = "", ...props }: IconProps) {
  return (
    <svg className={`${baseSvgClasses} ${className}`} viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <circle cx="19" cy="8" r="3" />
    </svg>
  );
}

// ── NOUVELLES ICÔNES SUPER ADMIN ──

export function AnalyticsIcon({ className = "w-5 h-5", ...props }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" 
      viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" 
      className={className} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
    </svg>
  );
}

export function UniversitiesIcon({ className = "w-5 h-5", ...props }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" 
      viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" 
      className={className} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21h10.5V18a1.5 1.5 0 0 0-1.5-1.5h-7.5A1.5 1.5 0 0 0 6.75 18v3Z" />
    </svg>
  );
}

export function UsersIcon({ className = "w-5 h-5", ...props }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" 
      viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" 
      className={className} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A11.386 11.386 0 0 1 8.625 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </svg>
  );
}

export function EyeIcon({ className = "w-5 h-5", ...props }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" 
      viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" 
      className={className} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}

export function ArrowLeftIcon({ className = "w-5 h-5", ...props }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" 
      viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" 
      className={className} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
    </svg>
  );
}

export function DotsVerticalIcon({ className = "w-5 h-5", ...props }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" 
      viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" 
      className={className} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
    </svg>
  );
}

export function ShieldIcon({ className = "w-5 h-5", ...props }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" 
      viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" 
      className={className} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.286Z" />
    </svg>
  );
}

export function CheckCircleIcon({ className = "w-5 h-5", ...props }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" 
      viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" 
      className={className} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

export function TrendingUpIcon({ className = "w-5 h-5", ...props }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" 
      viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" 
      className={className} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.5 4.5 7.5-7.5M19.5 8.25h3v3" />
    </svg>
  );
}

export function GlobeIcon({ className = "w-5 h-5", ...props }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" 
      viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" 
      className={className} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A11.952 11.952 0 0 1 12 13.5c-2.998 0-5.74-1.1-7.843-2.918m0 0A8.959 8.959 0 0 0 3 12c0 .778.099 1.533.284 2.253" />
    </svg>
  );
}

// Renommer / exporter avec des alias si nécessaire
export { UniversitiesIcon as BuildingIcon2 };
