import React, { useState } from 'react';
import { Competition, Team } from '../types';

interface TeamCrestProps {
  team?: Team;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
  title?: string;
}

const SIZE_MAP = {
  xs: { box: 'w-6 h-6', text: 'text-[9px]', svg: 24 },
  sm: { box: 'w-8 h-8', text: 'text-[10px]', svg: 32 },
  md: { box: 'w-11 h-11', text: 'text-xs', svg: 44 },
  lg: { box: 'w-16 h-16', text: 'text-sm', svg: 64 },
  xl: { box: 'w-20 h-20', text: 'text-base', svg: 80 },
};

export const TeamCrest: React.FC<TeamCrestProps> = ({
  team,
  name,
  size = 'md',
  className = '',
  onClick,
  title,
}) => {
  const [imgError, setImgError] = useState(false);

  const displayName = team?.name || name || 'Squadra';
  const shortCode =
    team?.shortCode ||
    displayName
      .replace(/[^a-zA-Z]/g, '')
      .slice(0, 3)
      .toUpperCase() ||
    'CLB';
  const primary = team?.primaryColor || '#0284c7';
  const secondary = team?.secondaryColor || '#ffffff';
  const style = team?.crestStyle || 'stripes';
  const dims = SIZE_MAP[size];

  const hasValidLogo = Boolean(team?.logoUrl && !imgError);
  const clipId = `shield-${(team?.id || displayName).replace(/[^a-zA-Z0-9]/g, '')}-${size}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;

  return (
    <div
      onClick={onClick}
      title={title || displayName}
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${
        dims.box
      } ${onClick ? 'cursor-pointer group' : ''} ${className}`}
    >
      {hasValidLogo ? (
        <div className="w-full h-full flex items-center justify-center p-0.5 rounded-lg bg-white/95 dark:bg-slate-800/90 shadow-sm border border-slate-200/80 dark:border-slate-700/80 overflow-hidden transition-transform group-hover:scale-105">
          <img
            src={team!.logoUrl}
            alt={displayName}
            className="w-full h-full object-contain drop-shadow-sm"
            onError={() => setImgError(true)}
          />
        </div>
      ) : (
        <svg
          viewBox="0 0 64 72"
          className="w-full h-full drop-shadow-sm transition-transform group-hover:scale-105"
        >
          <defs>
            <clipPath id={clipId}>
              <path d="M8 6 L32 2 L56 6 L56 34 C56 52 32 68 32 68 C32 68 8 52 8 34 Z" />
            </clipPath>
          </defs>

          {/* Shield Background & Pattern */}
          <g clipPath={`url(#${clipId})`}>
            <rect x="0" y="0" width="64" height="72" fill={primary} />

            {style === 'stripes' && (
              <>
                <rect x="14" y="0" width="9" height="72" fill={secondary} />
                <rect x="32" y="0" width="9" height="72" fill={secondary} />
                <rect x="50" y="0" width="9" height="72" fill={secondary} />
              </>
            )}

            {style === 'halves' && <rect x="32" y="0" width="32" height="72" fill={secondary} />}

            {style === 'hoops' && (
              <>
                <rect x="0" y="16" width="64" height="12" fill={secondary} />
                <rect x="0" y="40" width="64" height="12" fill={secondary} />
              </>
            )}

            {style === 'diagonal' && (
              <polygon points="0,56 56,0 64,0 64,16 16,64 0,64" fill={secondary} />
            )}

            {/* Top subtle gloss */}
            <path d="M0 0 L64 0 L64 26 L0 18 Z" fill="rgba(255,255,255,0.16)" />

            {/* Center Banner for 3-letter Code */}
            <rect x="6" y="23" width="52" height="19" fill="rgba(15, 23, 42, 0.82)" />
            <line x1="6" y1="23" x2="58" y2="23" stroke="rgba(255,255,255,0.45)" strokeWidth="1" />
            <line x1="6" y1="42" x2="58" y2="42" stroke="rgba(255,255,255,0.45)" strokeWidth="1" />
          </g>

          {/* Shield Outer Metallic Border */}
          <path
            d="M8 6 L32 2 L56 6 L56 34 C56 52 32 68 32 68 C32 68 8 52 8 34 Z"
            fill="none"
            stroke="#cbd5e1"
            strokeWidth="3"
          />
          <path
            d="M8 6 L32 2 L56 6 L56 34 C56 52 32 68 32 68 C32 68 8 52 8 34 Z"
            fill="none"
            stroke="#0f172a"
            strokeWidth="1"
            opacity="0.35"
          />

          {/* Club Monogram */}
          <text
            x="32"
            y="36.5"
            textAnchor="middle"
            fill="#ffffff"
            fontSize="13.5"
            fontWeight="800"
            fontFamily="Segoe UI, Inter, sans-serif"
            letterSpacing="0.6"
          >
            {shortCode.slice(0, 3)}
          </text>
        </svg>
      )}
    </div>
  );
};

interface CompetitionBadgeProps {
  competition?: Competition;
  name?: string;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
}

export const CompetitionBadge: React.FC<CompetitionBadgeProps> = ({
  competition,
  name,
  size = 'sm',
  showName = true,
}) => {
  const [imgError, setImgError] = useState(false);
  const compName = competition?.name || name || 'Competizione';
  const color = competition?.accentColor || '#0284c7';
  const hasLogo = Boolean(competition?.logoUrl && !imgError);

  const iconSize = size === 'sm' ? 'w-5 h-5' : size === 'md' ? 'w-7 h-7' : 'w-10 h-10';

  return (
    <div className="inline-flex items-center gap-2">
      <div
        className={`${iconSize} rounded-md flex items-center justify-center shrink-0 overflow-hidden shadow-xs border border-slate-200/80 dark:border-slate-700/80`}
        style={{ backgroundColor: hasLogo ? '#ffffff' : color }}
      >
        {hasLogo ? (
          <img
            src={competition!.logoUrl}
            alt={compName}
            className="w-full h-full object-contain p-0.5"
            onError={() => setImgError(true)}
          />
        ) : (
          <span className="text-[10px] font-extrabold text-white tracking-tighter">
            {(competition?.shortName || compName.slice(0, 2)).toUpperCase()}
          </span>
        )}
      </div>
      {showName && (
        <span className="font-semibold text-slate-800 dark:text-slate-100 truncate">
          {compName}
        </span>
      )}
    </div>
  );
};
