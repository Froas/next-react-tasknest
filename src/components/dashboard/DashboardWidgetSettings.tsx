'use client';

import React, { useState, type SetStateAction } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  GripVertical,
  Monitor,
  RotateCcw,
  Smartphone,
} from 'lucide-react';
import {
  DASHBOARD_WIDGETS,
  DashboardDevice,
  DashboardPreferences,
  DashboardWidgetArea,
  DashboardWidgetId,
  DashboardWidgetSize,
  moveDashboardWidget,
  reorderDashboardWidget,
  setDashboardWidgetSize,
  setDashboardWidgetVisibility,
} from '@/lib/dashboardPreferences';

interface DashboardWidgetSettingsProps {
  preferences: DashboardPreferences;
  setPreferences: React.Dispatch<SetStateAction<DashboardPreferences>>;
  onReset: () => void;
}

const SIZE_LABELS: Record<DashboardWidgetSize, string> = {
  compact: 'Compact',
  wide: 'Wide',
  full: 'Full',
};

export const DashboardWidgetSettings: React.FC<DashboardWidgetSettingsProps> = ({
  preferences,
  setPreferences,
  onReset,
}) => {
  const [device, setDevice] = useState<DashboardDevice>('desktop');
  const [draggedId, setDraggedId] = useState<DashboardWidgetId | null>(null);
  const profile = preferences[device];
  const hidden = new Set(profile.hiddenIds);

  const toggle = (id: DashboardWidgetId) => {
    setPreferences((current) => setDashboardWidgetVisibility(current, id, hidden.has(id), device));
  };

  const dropOn = (targetId: DashboardWidgetId) => {
    if (!draggedId) return;
    setPreferences((current) => reorderDashboardWidget(current, draggedId, targetId, device));
    setDraggedId(null);
  };

  const renderArea = (area: DashboardWidgetArea, title: string) => {
    const definitions = profile.orderedIds
      .map((id) => DASHBOARD_WIDGETS.find((widget) => widget.id === id))
      .filter((widget): widget is (typeof DASHBOARD_WIDGETS)[number] => widget?.area === area);
    return (
      <section className="space-y-2.5">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--tn-fg)' }}>{title}</h3>
          <p className="mt-0.5 text-xs" style={{ color: 'var(--tn-fg-muted)' }}>
            Drag to reorder, or use the arrow controls.
          </p>
        </div>
        <div className="space-y-2">
          {definitions.map((widget, index) => {
            const isHidden = hidden.has(widget.id);
            const size = profile.sizes[widget.id] ?? widget.defaultSize;
            return (
              <div
                key={widget.id}
                draggable
                onDragStart={(event) => {
                  setDraggedId(widget.id);
                  event.dataTransfer.effectAllowed = 'move';
                  event.dataTransfer.setData('text/plain', widget.id);
                }}
                onDragEnd={() => setDraggedId(null)}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = 'move';
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  dropOn(widget.id);
                }}
                className="flex flex-wrap items-center gap-2.5 rounded-xl p-2.5 transition"
                style={{
                  border: draggedId === widget.id ? '1px solid var(--tn-accent)' : 'var(--tn-line)',
                  background: 'var(--tn-card)',
                  opacity: isHidden ? 0.62 : draggedId === widget.id ? 0.72 : 1,
                }}
              >
                <GripVertical
                  size={18}
                  className="hidden shrink-0 cursor-grab text-muted-foreground md:block"
                  aria-hidden="true"
                />
                <button
                  type="button"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg"
                  style={{ background: 'var(--tn-bg)', color: isHidden ? 'var(--tn-fg-muted)' : 'var(--tn-accent)' }}
                  onClick={() => toggle(widget.id)}
                  aria-label={isHidden ? `Show ${widget.name}` : `Hide ${widget.name}`}
                >
                  {isHidden ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
                <span className="min-w-[160px] flex-1">
                  <strong className="block text-sm" style={{ color: 'var(--tn-fg)' }}>{widget.name}</strong>
                  <small className="block truncate" style={{ color: 'var(--tn-fg-muted)' }}>{widget.description}</small>
                </span>
                <label className="flex shrink-0 items-center gap-2 text-xs" style={{ color: 'var(--tn-fg-muted)' }}>
                  Size
                  <select
                    value={size}
                    onChange={(event) => setPreferences((current) => (
                      setDashboardWidgetSize(current, widget.id, event.target.value as DashboardWidgetSize, device)
                    ))}
                    className="filter-input min-w-[100px] py-1.5"
                    aria-label={`${widget.name} size`}
                  >
                    {widget.sizes.map((candidate) => (
                      <option key={candidate} value={candidate}>{SIZE_LABELS[candidate]}</option>
                    ))}
                  </select>
                </label>
                <span className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    className="grid h-8 w-8 place-items-center rounded-lg disabled:opacity-30"
                    style={{ border: 'var(--tn-line)', color: 'var(--tn-fg)' }}
                    disabled={index === 0}
                    onClick={() => setPreferences((current) => moveDashboardWidget(current, widget.id, -1, device))}
                    aria-label={`Move ${widget.name} up`}
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button
                    type="button"
                    className="grid h-8 w-8 place-items-center rounded-lg disabled:opacity-30"
                    style={{ border: 'var(--tn-line)', color: 'var(--tn-fg)' }}
                    disabled={index === definitions.length - 1}
                    onClick={() => setPreferences((current) => moveDashboardWidget(current, widget.id, 1, device))}
                    aria-label={`Move ${widget.name} down`}
                  >
                    <ArrowDown size={16} />
                  </button>
                </span>
              </div>
            );
          })}
        </div>
      </section>
    );
  };

  return (
    <div className="space-y-5">
      <div
        className="grid grid-cols-2 rounded-xl p-1"
        style={{ border: 'var(--tn-line)', background: 'var(--tn-surface-2, var(--tn-bg))' }}
        role="tablist"
        aria-label="Dashboard layout preset"
      >
        <DeviceTab active={device === 'desktop'} onClick={() => setDevice('desktop')} icon={<Monitor size={16} />} label="Desktop" />
        <DeviceTab active={device === 'mobile'} onClick={() => setDevice('mobile')} icon={<Smartphone size={16} />} label="Mobile" />
      </div>
      {renderArea('main', 'Main column')}
      {renderArea('sidebar', device === 'mobile' ? 'Below main content' : 'Sidebar')}
      <p className="text-xs" style={{ color: 'var(--tn-fg-muted)' }}>
        Both presets sync to your account. The matching preset activates automatically for this screen size.
      </p>
      <button type="button" className="btn btn-secondary w-full" onClick={onReset}>
        <RotateCcw size={16} /> Reset dashboard
      </button>
    </div>
  );
};

const DeviceTab: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}> = ({ active, onClick, icon, label }) => (
  <button
    type="button"
    role="tab"
    aria-selected={active}
    onClick={onClick}
    className="flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium"
    style={{
      color: active ? 'var(--tn-on-accent, var(--tn-fg))' : 'var(--tn-fg-muted)',
      background: active ? 'var(--tn-accent)' : 'transparent',
    }}
  >
    {icon} {label}
  </button>
);
