import { useState } from 'react';
import toolheadsData from '../data/toolheads.json';
import hotendsData from '../data/hotends.json';
import extrudersData from '../data/extruders.json';
import probesData from '../data/probes.json';
import { useSwipe } from './useSwipe';

const communityPicks = toolheadsData.toolheads.filter((t) => t.configurator);

function findDetail(name, catalog, nameKey = 'name') {
  const lower = name.toLowerCase();
  return catalog.find((item) => item[nameKey].toLowerCase() === lower);
}

function formatList(items) {
  if (!items) return [];
  if (typeof items === 'string') return items === 'unknown' ? [] : [items];
  return Array.isArray(items)
    ? items.filter((i) => i !== 'unknown' && i !== 'other' && i !== 'NA')
    : [];
}

const mountingPatternMap = new Map(
  [...new Set(extrudersData.extruders.map((e) => e.mounting_pattern))].map(
    (p) => [p.toLowerCase(), p]
  )
);

const extruderNameSet = new Set(
  extrudersData.extruders.map((e) => e.name.toLowerCase())
);

function getOfficialExtruders(extruderNames) {
  const formatted = formatList(extruderNames);
  const official = [];
  const seen = new Set();

  for (const name of formatted) {
    const lowerName = name.toLowerCase();
    if (extruderNameSet.has(lowerName) && !seen.has(lowerName)) {
      official.push(name);
      seen.add(lowerName);
    }
  }
  return official;
}

function getExpandedExtruders(extruderNames) {
  const official = getOfficialExtruders(extruderNames);
  const officialLower = new Set(official.map((n) => n.toLowerCase()));
  const expanded = [];
  const seen = new Set([...officialLower]);

  // Collect mounting patterns from official extruders
  const patterns = new Set();
  for (const name of official) {
    const ext = extrudersData.extruders.find(
      (e) => e.name.toLowerCase() === name.toLowerCase()
    );
    if (ext && ext.mounting_pattern !== 'other') {
      patterns.add(ext.mounting_pattern);
    }
  }

  // Also check if any listed name is itself a mounting pattern name
  for (const name of formatList(extruderNames)) {
    const matched = mountingPatternMap.get(name.toLowerCase());
    if (matched && matched !== 'other') patterns.add(matched);
  }

  for (const ext of extrudersData.extruders) {
    const extLower = ext.name.toLowerCase();
    if (!seen.has(extLower) && patterns.has(ext.mounting_pattern)) {
      expanded.push(ext.name);
      seen.add(extLower);
    }
  }
  return expanded;
}

const hotendNameSet = new Set(
  hotendsData.hotends.map((h) => h.name.toLowerCase())
);

function getOfficialHotends(hotendNames) {
  return formatList(hotendNames);
}

const ALWAYS_COMPATIBLE_HOTENDS = ['dragon sf', 'dragon hf', 'tz2.0', 'tz 3.0/4.0', 'red lizard k1 hf'];

function getExpandedHotends(hotendNames) {
  const official = formatList(hotendNames);
  const officialLower = new Set(official.map((n) => n.toLowerCase()));

  const expanded = [];
  const seen = new Set([...officialLower]);

  // Only expand Bambu-mount hotends when Bambu X1/P1 is explicitly listed.
  const hasBambuX1P1 = officialLower.has('bambu x1/p1');

  if (hasBambuX1P1) {
    for (const hotend of hotendsData.hotends) {
      const hLower = hotend.name.toLowerCase();
      if (!seen.has(hLower) && hotend.mounting_pattern?.some((p) => p.toLowerCase() === 'bambu')) {
        expanded.push(hotend.name);
        seen.add(hLower);
      }
    }
  }

  // Check if any always-compatible hotend is in official list
  const hasAlwaysCompatible = official.some((n) =>
    ALWAYS_COMPATIBLE_HOTENDS.includes(n.toLowerCase())
  );

  if (hasAlwaysCompatible) {
    for (const acName of ALWAYS_COMPATIBLE_HOTENDS) {
      if (!seen.has(acName)) {
        const detail = hotendsData.hotends.find((h) => h.name.toLowerCase() === acName);
        if (detail) {
          expanded.push(detail.name);
          seen.add(acName);
        }
      }
    }
  }

  return expanded;
}

function getExpandedProbes(probeNames) {
  const official = formatList(probeNames);
  const officialLower = new Set(official.map((n) => n.toLowerCase()));

  const expanded = [];
  const seen = new Set([...officialLower]);

  // Always include Z-Probe Membrane
  if (!seen.has('z-probe membrane')) {
    const detail = probesData.probes.find((p) => p.name.toLowerCase() === 'z-probe membrane');
    if (detail) {
      expanded.push(detail.name);
      seen.add('z-probe membrane');
    }
  }

  // If any touch probe is listed, add rest of touch probes
  const hasTouchProbe = official.some((n) => {
    const detail = findDetail(n, probesData.probes);
    return detail?.type === 'touch';
  });

  if (hasTouchProbe) {
    for (const probe of probesData.probes) {
      if (probe.type === 'touch' && !seen.has(probe.name.toLowerCase())) {
        expanded.push(probe.name);
        seen.add(probe.name.toLowerCase());
      }
    }
  }

  // If Klicky or Klicky PCB is listed, include the other
  const hasKlicky = officialLower.has('klicky');
  const hasKlickyPCB = officialLower.has('klicky pcb');

  if (hasKlicky && !hasKlickyPCB && !seen.has('klicky pcb')) {
    const detail = probesData.probes.find((p) => p.name.toLowerCase() === 'klicky pcb');
    if (detail) {
      expanded.push(detail.name);
      seen.add('klicky pcb');
    }
  }
  if (hasKlickyPCB && !hasKlicky && !seen.has('klicky')) {
    const detail = probesData.probes.find((p) => p.name.toLowerCase() === 'klicky');
    if (detail) {
      expanded.push(detail.name);
      seen.add('klicky');
    }
  }

  return expanded;
}

function fanDisplayValue(value) {
  if (!value) return '';
  return Array.isArray(value) ? value.join(' / ') : value;
}

function isGitHubUrl(url) {
  return typeof url === 'string' && url.toLowerCase().includes('github');
}

function isUnknownValue(value) {
  return typeof value === 'string' && value.trim().toLowerCase() === 'unknown';
}

function toKnownList(value) {
  const list = Array.isArray(value) ? value : value ? [value] : [];
  return list.filter((item) => !isUnknownValue(item));
}

function getDisplayHotendType(detail) {
  if (!detail) return null;
  if (detail.hotend_type && !isUnknownValue(detail.hotend_type)) return detail.hotend_type;

  // Backward-compatible fallback for existing data where flow_rate stores SF/HF/UHF class.
  if (
    typeof detail.flow_rate === 'string' &&
    ['sf', 'hf', 'uhf'].includes(detail.flow_rate.toLowerCase())
  ) {
    return detail.flow_rate.toUpperCase();
  }

  return null;
}

function getDisplayFlowRate(detail) {
  if (!detail) return null;

  // New-format flow rate value.
  if (typeof detail.flow_rate === 'string' && !isUnknownValue(detail.flow_rate)) {
    const typeOnly = ['sf', 'hf', 'uhf'].includes(detail.flow_rate.toLowerCase());
    if (!typeOnly) return detail.flow_rate;
  }

  // Fallback: derive from description text like "max flow ~25 mm3/s".
  const description = typeof detail.description === 'string' ? detail.description : '';
  const primary = description.match(/(?:max flow|targeting)\s*~\s*([0-9]+(?:\.[0-9]+)?)\s*mm3\/s/i);
  if (primary) return `~${primary[1]} mm3/s`;

  const secondary = description.match(/([0-9]+(?:\.[0-9]+)?)\s*mm3\/s/i);
  if (secondary) return `${secondary[1]} mm3/s`;

  return null;
}

function HardwareCard({ name, detail, accentColor, isSelected, onSelect }) {
  const isTopPick = detail?.top_pick === true;
  const colors = {
    blue: { border: '#3b82f6', bg: '#eff6ff', dot: '#3b82f6', label: '#2563eb', bgAlpha: 'rgba(59,130,246,0.08)' },
    green: { border: '#22c55e', bg: '#f0fdf4', dot: '#22c55e', label: '#16a34a', bgAlpha: 'rgba(34,197,94,0.08)' },
    purple: { border: '#a855f7', bg: '#faf5ff', dot: '#a855f7', label: '#9333ea', bgAlpha: 'rgba(168,85,247,0.08)' },
  };
  const c = colors[accentColor] || colors.blue;
  const nozzleCompatibility = toKnownList(detail?.nozzle_compatibility);
  const mountingPatterns = toKnownList(detail?.mounting_pattern);
  const hotendType = getDisplayHotendType(detail);
  const flowRate = getDisplayFlowRate(detail);
  const showMeltzone = detail?.meltzone_length && !isUnknownValue(detail.meltzone_length);
  const showLength = detail?.length && !isUnknownValue(detail.length);
  const showFilamentSensor = detail?.filament_sensor && !isUnknownValue(detail.filament_sensor);

  const mountAndLength = [];
  if (mountingPatterns.length > 0) {
    mountAndLength.push(`Mount: ${mountingPatterns.join(', ')}`);
  }
  if (showLength) {
    mountAndLength.push(`Length: ${detail.length}`);
  }

  return (
    <div
      onClick={onSelect ? () => onSelect(name) : undefined}
      style={{
        border: isSelected ? `2px solid ${c.border}` : '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '12px 16px',
        marginBottom: '8px',
        backgroundColor: isSelected ? c.bgAlpha : 'var(--sl-color-bg-nav)',
        cursor: onSelect ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: detail ? '6px' : 0 }}>
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: isSelected ? c.dot : 'var(--sl-color-gray-5)',
            flexShrink: 0,
            transition: 'background-color 0.2s ease',
          }}
        />
        <strong style={{ fontSize: '0.95rem', color: isSelected ? c.label : 'var(--sl-color-white)' }}>
          {detail ? (
            <a
              href={detail.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: isSelected ? c.label : 'var(--sl-color-white)', textDecoration: 'none' }}
              onClick={(e) => e.stopPropagation()}
            >
              {detail.name}
            </a>
          ) : (
            name
          )}
        </strong>
        {isTopPick && (
          <span
            style={{
              fontSize: '0.65rem',
              padding: '2px 6px',
              borderRadius: '4px',
              backgroundColor: '#fffbeb',
              color: '#b45309',
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}
          >
            ⭐ Top Pick
          </span>
        )}
        {hotendType && (
          <span
            style={{
              fontSize: '0.7rem',
              padding: '2px 6px',
              borderRadius: '4px',
              backgroundColor: c.bg,
              color: c.label,
              fontWeight: 600,
              marginLeft: 'auto',
            }}
          >
            {hotendType}
          </span>
        )}
        {detail?.type && !isUnknownValue(detail.type) && (
          <span
            style={{
              fontSize: '0.7rem',
              padding: '2px 6px',
              borderRadius: '4px',
              backgroundColor: c.bg,
              color: c.label,
              fontWeight: 600,
              marginLeft: 'auto',
            }}
          >
            {detail.type}
          </span>
        )}
        {detail?.gear_type && !isUnknownValue(detail.gear_type) && (
          <span
            style={{
              fontSize: '0.7rem',
              padding: '2px 6px',
              borderRadius: '4px',
              backgroundColor: c.bg,
              color: c.label,
              fontWeight: 600,
              marginLeft: 'auto',
            }}
          >
            {detail.gear_type}
          </span>
        )}
        {onSelect && (
          <span
            style={{
              fontSize: '0.72rem',
              padding: '2px 8px',
              borderRadius: '12px',
              backgroundColor: isSelected ? c.border : 'transparent',
              color: isSelected ? '#fff' : 'var(--sl-color-gray-3)',
              border: isSelected ? 'none' : '1px solid var(--sl-color-gray-5)',
              fontWeight: 600,
              marginLeft: hotendType || detail?.type || detail?.gear_type ? '4px' : 'auto',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            {isSelected ? '✓' : 'Select'}
          </span>
        )}
      </div>
      {detail?.description && (
        <p
          style={{
            margin: 0,
            fontSize: '0.8rem',
            color: 'var(--sl-color-gray-3)',
            lineHeight: 1.4,
            paddingLeft: '16px',
          }}
        >
          {detail.description}
        </p>
      )}
      {flowRate && (
        <p
          style={{
            margin: '4px 0 0 0',
            fontSize: '0.75rem',
            color: 'var(--sl-color-gray-4)',
            paddingLeft: '16px',
          }}
        >
          Flow: {flowRate}
        </p>
      )}
      {mountAndLength.length > 0 && (
        <p
          style={{
            margin: '4px 0 0 0',
            fontSize: '0.75rem',
            color: 'var(--sl-color-gray-4)',
            paddingLeft: '16px',
          }}
        >
          {mountAndLength.join(' · ')}
        </p>
      )}
      {showMeltzone && (
        <p
          style={{
            margin: '4px 0 0 0',
            fontSize: '0.75rem',
            color: 'var(--sl-color-gray-4)',
            paddingLeft: '16px',
          }}
        >
          Meltzone: {detail.meltzone_length}
        </p>
      )}
      {nozzleCompatibility.length > 0 && (
        <p
          style={{
            margin: '4px 0 0 0',
            fontSize: '0.75rem',
            color: 'var(--sl-color-gray-4)',
            paddingLeft: '16px',
          }}
        >
          Nozzle: {nozzleCompatibility.join(', ')}
        </p>
      )}
      {showFilamentSensor && (
        <p
          style={{
            margin: '4px 0 0 0',
            fontSize: '0.75rem',
            color: 'var(--sl-color-gray-4)',
            paddingLeft: '16px',
          }}
        >
          Filament Sensor: {detail.filament_sensor}
        </p>
      )}
    </div>
  );
}

function HardwareSection({ title, officialItems, expandedItems, catalog, accentColor, selectedItem, onSelect }) {
  const [showExpanded, setShowExpanded] = useState(false);
  const officialList = typeof officialItems === 'object' && Array.isArray(officialItems) ? officialItems : formatList(officialItems);
  const expandedList = expandedItems || [];
  const borderColor = accentColor === 'blue' ? '#3b82f6' : accentColor === 'green' ? '#22c55e' : '#a855f7';

  const visibleOfficial = selectedItem
    ? officialList.filter((name) => name === selectedItem)
    : officialList;
  const visibleExpanded = selectedItem
    ? expandedList.filter((name) => name === selectedItem)
    : expandedList;

  return (
    <div style={{ flex: '1', minWidth: '280px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
          borderBottom: `2px solid ${borderColor}`,
          paddingBottom: '6px',
        }}
      >
        <h3
          style={{
            fontSize: '1.1rem',
            fontWeight: 700,
            color: 'var(--sl-color-white)',
            margin: 0,
          }}
        >
          {title} ({officialList.length}{expandedList.length > 0 ? ` + ${expandedList.length}` : ''})
        </h3>
        {selectedItem && onSelect && (
          <button
            onClick={() => onSelect(null)}
            style={{
              fontSize: '0.75rem',
              padding: '2px 8px',
              borderRadius: '12px',
              border: '1px solid var(--sl-color-gray-5)',
              backgroundColor: 'transparent',
              color: 'var(--sl-color-gray-3)',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            ✕ Clear
          </button>
        )}
      </div>
      {visibleOfficial.length > 0 ? (
        visibleOfficial.map((name) => (
          <HardwareCard
            key={name}
            name={name}
            detail={findDetail(name, catalog)}
            accentColor={accentColor}
            isSelected={selectedItem === name}
            onSelect={onSelect}
          />
        ))
      ) : officialList.length === 0 ? (
        <p style={{ color: 'var(--sl-color-gray-4)', fontStyle: 'italic', fontSize: '0.9rem' }}>
          Compatibility data not yet available
        </p>
      ) : null}
      {!selectedItem && expandedList.length > 0 && (
        <button
          onClick={() => setShowExpanded(!showExpanded)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            width: '100%',
            padding: '8px 12px',
            marginTop: '4px',
            marginBottom: '8px',
            border: `1px solid var(--sl-color-gray-5)`,
            borderRadius: '6px',
            backgroundColor: 'transparent',
            color: 'var(--sl-color-gray-3)',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <span style={{
            display: 'inline-block',
            transition: 'transform 0.2s ease',
            transform: showExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
          }}>
            ▶
          </span>
          {showExpanded ? 'Hide' : 'See'} {expandedList.length} more compatible options
        </button>
      )}
      {visibleExpanded.length > 0 && (selectedItem || showExpanded) && (
        <div style={{ opacity: 0.85 }}>
          {visibleExpanded.map((name) => (
            <HardwareCard
              key={name}
              name={name}
              detail={findDetail(name, catalog)}
              accentColor={accentColor}
              isSelected={selectedItem === name}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CarouselArrow({ direction, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label={direction === 'left' ? 'Previous toolhead' : 'Next toolhead'}
      style={{
        position: 'absolute',
        top: '50%',
        [direction === 'left' ? 'left' : 'right']: '0px',
        transform: 'translateY(-50%)',
        zIndex: 10,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--sl-color-gray-3)',
        transition: 'color 0.2s ease',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--sl-color-white)')}
      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--sl-color-gray-3)')}
    >
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {direction === 'left' ? (
          <polyline points="15 18 9 12 15 6" />
        ) : (
          <polyline points="9 6 15 12 9 18" />
        )}
      </svg>
    </button>
  );
}

function ToolheadCard({ toolhead, position, isSelected, onSelect, onClick }) {
  const isCenter = position === 'center';
  const isLeft = position === 'left';
  const isRight = position === 'right';

  const translateX = isCenter ? '0%' : isLeft ? '-60%' : '60%';
  const scale = isCenter ? 1 : 0.82;
  const opacity = isCenter ? 1 : 0.4;
  const zIndex = isCenter ? 5 : 2;

  return (
    <div
      onClick={onClick}
      style={{
        position: 'absolute',
        top: 0,
        left: '50%',
        width: '100%',
        maxWidth: '420px',
        transform: `translateX(-50%) translateX(${translateX}) scale(${scale})`,
        opacity,
        zIndex,
        transition: 'all 0.4s cubic-bezier(0.25, 0.1, 0.25, 1)',
        cursor: 'pointer',
        pointerEvents: isCenter ? 'auto' : 'auto',
      }}
    >
      <div
        style={{
          borderRadius: '12px',
          border: isSelected && isCenter
            ? '3px solid #2E8B57'
            : '2px solid var(--sl-color-gray-5)',
          padding: '16px',
          backgroundColor: isSelected && isCenter
            ? 'var(--sl-color-bg-nav)'
            : 'var(--sl-color-bg-sidebar)',
          boxShadow: isSelected && isCenter
            ? '0 4px 12px rgba(46, 139, 87, 0.3)'
            : isCenter
              ? '0 2px 8px rgba(0,0,0,0.15)'
              : 'none',
        }}
      >
        <img
          src={toolhead.image}
          alt={toolhead.name}
          loading="lazy"
          decoding="async"
          style={{
            width: '100%',
            height: '220px',
            objectFit: 'contain',
            objectPosition: 'center',
            backgroundColor: 'var(--sl-color-bg-nav)',
            borderRadius: '8px',
            marginBottom: '12px',
          }}
        />
        <h3
          style={{
            fontSize: '1.2rem',
            fontWeight: 700,
            marginBottom: '8px',
            color: 'var(--sl-color-white)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {toolhead.title || toolhead.name}
          {toolhead.top_pick && (
            <span
              style={{
                fontSize: '0.65rem',
                padding: '2px 8px',
                borderRadius: '4px',
                backgroundColor: '#fffbeb',
                color: '#b45309',
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}
            >
              ⭐ Top Pick
            </span>
          )}
        </h3>
        <p
          style={{
            fontSize: '0.9rem',
            color: 'var(--sl-color-gray-3)',
            marginBottom: '8px',
            lineHeight: 1.5,
          }}
        >
          {toolhead.description}
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <a
            href={toolhead.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#2E8B57',
              fontSize: '0.85rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {isGitHubUrl(toolhead.url) ? 'View on GitHub →' : 'View Webpage →'}
          </a>
          {isCenter && (
            <span
              onClick={(e) => { e.stopPropagation(); onSelect(); }}
              style={{
                fontSize: '0.8rem',
                padding: '4px 12px',
                borderRadius: '16px',
                backgroundColor: isSelected ? '#2E8B57' : 'transparent',
                color: isSelected ? '#fff' : 'var(--sl-color-gray-3)',
                border: isSelected ? 'none' : '1px solid var(--sl-color-gray-5)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {isSelected ? '✓ Selected' : 'Click to select'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ToolheadBuilder() {
  const [selectedName, setSelectedName] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedExtruder, setSelectedExtruder] = useState(null);
  const [selectedHotend, setSelectedHotend] = useState(null);
  const [selectedProbe, setSelectedProbe] = useState(null);
  const total = communityPicks.length;

  const clearComponentSelections = () => {
    setSelectedExtruder(null);
    setSelectedHotend(null);
    setSelectedProbe(null);
  };

  const goLeft = () => {
    setActiveIndex((prev) => (prev - 1 + total) % total);
    clearComponentSelections();
  };
  const goRight = () => {
    setActiveIndex((prev) => (prev + 1) % total);
    clearComponentSelections();
  };

  const swipeHandlers = useSwipe(goRight, goLeft);

  const leftIndex = (activeIndex - 1 + total) % total;
  const rightIndex = (activeIndex + 1) % total;

  const toolheadEntry = selectedName
    ? communityPicks.find((t) => t.name === selectedName)
    : null;

  const handleCardClick = (index) => {
    if (index === activeIndex) {
      const name = communityPicks[activeIndex].name;
      const isDeselecting = selectedName === name;
      setSelectedName(isDeselecting ? null : name);
      if (isDeselecting) {
        clearComponentSelections();
      }
    } else {
      setActiveIndex(index);
      clearComponentSelections();
    }
  };

  const handleToolheadSelect = (toolheadName) => {
    const isDeselecting = selectedName === toolheadName;
    setSelectedName(isDeselecting ? null : toolheadName);
    if (isDeselecting) {
      clearComponentSelections();
    }
  };

  const makeToggleHandler = (current, setter) => (name) =>
    setter(name === current ? null : name);

  // Build the "Selected Hardware" table rows
  const selectedHardwareRows = [];

  if (toolheadEntry) {
    selectedHardwareRows.push({
      component: 'Toolhead',
      selection: toolheadEntry.title || toolheadEntry.name,
      url: toolheadEntry.url || null,
    });
    if (selectedExtruder) {
      const detail = findDetail(selectedExtruder, extrudersData.extruders);
      selectedHardwareRows.push({
        component: 'Extruder',
        selection: selectedExtruder,
        url: detail?.url || null,
      });
    }
    if (selectedHotend) {
      const detail = findDetail(selectedHotend, hotendsData.hotends);
      selectedHardwareRows.push({
        component: 'Hotend',
        selection: selectedHotend,
        url: detail?.url || null,
      });
    }
    if (selectedProbe) {
      const detail = findDetail(selectedProbe, probesData.probes);
      selectedHardwareRows.push({
        component: 'Probe',
        selection: selectedProbe,
        url: detail?.url || null,
      });
    }
    if (toolheadEntry.hotend_fan && !isUnknownValue(toolheadEntry.hotend_fan)) {
      selectedHardwareRows.push({
        component: 'Hotend Fan',
        selection: fanDisplayValue(toolheadEntry.hotend_fan),
        url: null,
      });
    }
    if (toolheadEntry.part_cooling_fan && !isUnknownValue(toolheadEntry.part_cooling_fan)) {
      selectedHardwareRows.push({
        component: 'Part Cooling Fan',
        selection: fanDisplayValue(toolheadEntry.part_cooling_fan),
        url: null,
      });
    }
  }

  return (
    <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Toolhead carousel */}
      <div
        {...swipeHandlers}
        style={{
          position: 'relative',
          height: '480px',
          marginBottom: '32px',
          overflow: 'hidden',
          padding: '0 40px',
          touchAction: 'pan-y',
        }}
      >
        <CarouselArrow direction="left" onClick={goLeft} />
        <CarouselArrow direction="right" onClick={goRight} />

        {communityPicks.map((toolhead, i) => {
          let position = null;
          if (i === activeIndex) position = 'center';
          else if (i === leftIndex) position = 'left';
          else if (i === rightIndex) position = 'right';
          else return null;

          return (
            <ToolheadCard
              key={toolhead.name}
              toolhead={toolhead}
              position={position}
              isSelected={selectedName === toolhead.name}
              onSelect={() => handleToolheadSelect(toolhead.name)}
              onClick={() => handleCardClick(i)}
            />
          );
        })}
      </div>

      {/* Dot indicators */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '32px' }}>
        {communityPicks.map((_, i) => (
          <button
            key={i}
            onClick={() => setActiveIndex(i)}
            style={{
              width: i === activeIndex ? '24px' : '8px',
              height: '8px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: i === activeIndex ? '#2E8B57' : 'var(--sl-color-gray-5)',
              cursor: 'pointer',
              padding: 0,
              transition: 'all 0.3s ease',
            }}
          />
        ))}
      </div>

      {/* Compatible hardware display */}
      {toolheadEntry && (
        <>
          <div
            style={{
              padding: '24px',
              borderRadius: '12px',
              border: '1px solid var(--sl-color-gray-5)',
              backgroundColor: 'var(--sl-color-bg-sidebar)',
              marginBottom: '24px',
            }}
          >
            <h2
              style={{
                fontSize: '1.4rem',
                fontWeight: 700,
                marginBottom: '24px',
                color: 'var(--sl-color-white)',
              }}
            >
              Compatible Hardware for {selectedName}
            </h2>
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              <HardwareSection
                title="Extruders"
                officialItems={getOfficialExtruders(toolheadEntry.extruders)}
                expandedItems={getExpandedExtruders(toolheadEntry.extruders)}
                catalog={extrudersData.extruders}
                accentColor="blue"
                selectedItem={selectedExtruder}
                onSelect={makeToggleHandler(selectedExtruder, setSelectedExtruder)}
              />
              <HardwareSection
                title="Hotends"
                officialItems={getOfficialHotends(toolheadEntry.hotend)}
                expandedItems={getExpandedHotends(toolheadEntry.hotend)}
                catalog={hotendsData.hotends}
                accentColor="green"
                selectedItem={selectedHotend}
                onSelect={makeToggleHandler(selectedHotend, setSelectedHotend)}
              />
              <HardwareSection
                title="Probes"
                officialItems={formatList(toolheadEntry.probe)}
                expandedItems={getExpandedProbes(toolheadEntry.probe)}
                catalog={probesData.probes}
                accentColor="purple"
                selectedItem={selectedProbe}
                onSelect={makeToggleHandler(selectedProbe, setSelectedProbe)}
              />
            </div>
          </div>

          {/* Toolhead Info (static, non-selectable) */}
          {(() => {
            const showHotendFan = toolheadEntry.hotend_fan && !isUnknownValue(toolheadEntry.hotend_fan);
            const showCoolingFan = toolheadEntry.part_cooling_fan && !isUnknownValue(toolheadEntry.part_cooling_fan);
            const showCutter = toolheadEntry.filament_cutter && !isUnknownValue(toolheadEntry.filament_cutter);
            if (!showHotendFan && !showCoolingFan && !showCutter) return null;
            return (
              <div
                style={{
                  padding: '24px',
                  borderRadius: '12px',
                  border: '1px solid var(--sl-color-gray-5)',
                  backgroundColor: 'var(--sl-color-bg-sidebar)',
                  marginBottom: '24px',
                }}
              >
                <h2
                  style={{
                    fontSize: '1.2rem',
                    fontWeight: 700,
                    marginBottom: '16px',
                    color: 'var(--sl-color-white)',
                    borderBottom: '2px solid #f97316',
                    paddingBottom: '6px',
                  }}
                >
                  Toolhead Info
                </h2>
                <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                  {showHotendFan && (
                    <div style={{ minWidth: '140px' }}>
                      <p style={{ margin: '0 0 4px 0', fontSize: '0.8rem', color: 'var(--sl-color-gray-4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Hotend Fan
                      </p>
                      <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--sl-color-white)', fontWeight: 600 }}>
                        {fanDisplayValue(toolheadEntry.hotend_fan)}
                      </p>
                    </div>
                  )}
                  {showCoolingFan && (
                    <div style={{ minWidth: '160px' }}>
                      <p style={{ margin: '0 0 4px 0', fontSize: '0.8rem', color: 'var(--sl-color-gray-4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Part Cooling Fan
                      </p>
                      <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--sl-color-white)', fontWeight: 600 }}>
                        {fanDisplayValue(toolheadEntry.part_cooling_fan)}
                      </p>
                    </div>
                  )}
                  {showCutter && (
                    <div style={{ minWidth: '140px' }}>
                      <p style={{ margin: '0 0 4px 0', fontSize: '0.8rem', color: 'var(--sl-color-gray-4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Filament Cutter
                      </p>
                      <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--sl-color-white)', fontWeight: 600 }}>
                        {toolheadEntry.filament_cutter}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Selected Hardware table */}
          {selectedHardwareRows.length > 0 && (
            <div
              style={{
                padding: '24px',
                borderRadius: '12px',
                border: '1px solid var(--sl-color-gray-5)',
                backgroundColor: 'var(--sl-color-bg-sidebar)',
              }}
            >
              <h2
                style={{
                  fontSize: '1.2rem',
                  fontWeight: 700,
                  marginBottom: '16px',
                  color: 'var(--sl-color-white)',
                  borderBottom: '2px solid #2E8B57',
                  paddingBottom: '6px',
                }}
              >
                Selected Hardware
              </h2>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr>
                    {['Component', 'Selection', 'Link'].map((col) => (
                      <th
                        key={col}
                        style={{
                          textAlign: 'left',
                          padding: '8px 12px',
                          borderBottom: '1px solid var(--sl-color-gray-5)',
                          color: 'var(--sl-color-gray-3)',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selectedHardwareRows.map((row, idx) => (
                    <tr
                      key={row.component}
                      style={{
                        backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.03)',
                      }}
                    >
                      <td style={{ padding: '10px 12px', color: 'var(--sl-color-gray-3)', fontWeight: 600 }}>
                        {row.component}
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--sl-color-white)', fontWeight: 500 }}>
                        {row.selection}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {row.url ? (
                          <a
                            href={row.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#2E8B57', fontWeight: 600, textDecoration: 'none', fontSize: '0.85rem' }}
                          >
                            View →
                          </a>
                        ) : (
                          <span style={{ color: 'var(--sl-color-gray-5)', fontStyle: 'italic', fontSize: '0.85rem' }}>
                            No Link Available
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
