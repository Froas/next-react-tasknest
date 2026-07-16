'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { hashJourneySeed } from '@/lib/journeyMap';
import { JOURNEY_THEME_IDS, JOURNEY_THEMES } from '@/lib/journeyThemes';
import { JourneyThemeId } from '@/lib/types';
import { JourneyEnvironment } from './JourneyEnvironment';
import styles from './JourneyThemeSelector.module.css';

interface JourneyThemeSelectorProps {
 value: JourneyThemeId;
 onChange: (themeId: JourneyThemeId) => void;
 disabled?: boolean;
 compact?: boolean;
 showLivePreview?: boolean;
}

const routePath = (themeId: JourneyThemeId) => JOURNEY_THEMES[themeId].route
 .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
 .join(' ');

export const JourneyThemeSelector: React.FC<JourneyThemeSelectorProps> = ({
 value,
 onChange,
 disabled = false,
 compact = false,
 showLivePreview = true,
}) => {
 const selected = JOURNEY_THEMES[value];
 const previewSeed = hashJourneySeed(`journey-theme-preview:${selected.id}`);

 return (
 <fieldset className={styles.selector} disabled={disabled}>
 <legend>Journey Theme</legend>
 <p className={styles.help}>Changes only the visual journey. Goal data, progress, milestones, and character stay unchanged.</p>
 <div className={compact ? styles.compactGrid : styles.grid}>
 {JOURNEY_THEME_IDS.map((themeId) => {
 const theme = JOURNEY_THEMES[themeId];
 const active = themeId === value;
 return (
 <button
 key={theme.id}
 type="button"
 className={styles.card}
 data-selected={active}
 aria-pressed={active}
 onClick={() => onChange(theme.id)}
 disabled={disabled}
 >
 <span
 className={styles.preview}
 style={{ backgroundImage: `url(${theme.previewUrl})` }}
 aria-hidden="true"
 />
 <span className={styles.cardCopy}>
 <strong>{theme.name}</strong>
 {!compact && <small>{theme.description}</small>}
 </span>
 {active && <span className={styles.check}><Check size={14} /></span>}
 </button>
 );
 })}
 </div>

 {showLivePreview && (
 <div className={styles.livePreview} aria-label={`${selected.name} live route preview`}>
 <svg viewBox="0 0 1200 720" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
 <JourneyEnvironment
 theme={selected}
 seed={previewSeed}
 route={selected.route}
 profile={{ milestoneCount: 4, taskCount: 12, effort: 18 }}
 />
 <path d={routePath(selected.id)} fill="none" stroke={selected.palette.path} strokeWidth="10" strokeDasharray="3 18" strokeLinecap="round" />
 {selected.route.filter((_, index) => index % 2 === 0).map((point, index, points) => (
 <g key={`${point.x}:${point.y}`}>
 <circle cx={point.x} cy={point.y} r="20" fill={selected.palette.markerSurface} stroke={index === points.length - 1 ? selected.palette.current : selected.palette.locked} strokeWidth="6" />
 <circle cx={point.x} cy={point.y} r="6" fill={index === points.length - 1 ? selected.palette.current : selected.palette.locked} />
 </g>
 ))}
 </svg>
 <span className={styles.liveLabel}><strong>{selected.name}</strong><small>{selected.direction} route · live preview</small></span>
 </div>
 )}
 </fieldset>
 );
};
