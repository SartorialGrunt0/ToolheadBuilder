import { useState, useEffect, useMemo } from 'react';
import toolheadsData from '../data/toolheads.json';
import hotendsData from '../data/hotends.json';
import extrudersData from '../data/extruders.json';
import probesData from '../data/probes.json';
import { useSwipe } from './useSwipe';

const activeToolheads = toolheadsData.toolheads.filter((t) => t.configurator);

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

function isGitHubUrl(url) {
  return typeof url === 'string' && url.toLowerCase().includes('github');
}

const ALWAYS_COMPATIBLE_HOTENDS = ['dragon sf', 'dragon hf', 'tz2.0', 'tz 3.0/4.0', 'red lizard k1 hf'];

const mountingPatternMap = new Map(
  [...new Set(extrudersData.extruders.map((e) => e.mounting_pattern))].map(
    (p) => [p.toLowerCase(), p]
  )
);

function getExpandedExtruders(extruderNames) {
  const official = formatList(extruderNames);
  const officialLower = new Set(official.map((n) => n.toLowerCase()));
  const expanded = [];
  const seen = new Set([...officialLower]);

  const patterns = new Set();
  for (const name of official) {
    const ext = extrudersData.extruders.find(
      (e) => e.name.toLowerCase() === name.toLowerCase()
    );
    if (ext && ext.mounting_pattern !== 'other') {
      patterns.add(ext.mounting_pattern);
    }
  }

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

function getExpandedHotends(hotendNames) {
  const official = formatList(hotendNames);
  const officialLower = new Set(official.map((n) => n.toLowerCase()));

  const expanded = [];
  const seen = new Set([...officialLower]);

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

  if (!seen.has('z-probe membrane')) {
    const detail = probesData.probes.find((p) => p.name.toLowerCase() === 'z-probe membrane');
    if (detail) {
      expanded.push(detail.name);
      seen.add('z-probe membrane');
    }
  }

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

function buildExtendedNameSet(toolheads, fieldGetter, getExpandedFn) {
  const set = new Set();
  for (const th of toolheads) {
    const val = fieldGetter(th);
    const list = Array.isArray(val) ? val : val ? [val] : [];
    for (const name of list) {
      if (typeof name === 'string' && name.toLowerCase() !== 'unknown' && name.toLowerCase() !== 'na') {
        set.add(name.toLowerCase());
      }
    }
    const expanded = getExpandedFn(list);
    for (const name of expanded) {
      set.add(name.toLowerCase());
    }
  }
  return set;
}

const extruderNamesInToolheads = buildExtendedNameSet(activeToolheads, (t) => t.extruders, getExpandedExtruders);
const hotendNamesInToolheads = buildExtendedNameSet(activeToolheads, (t) => t.hotend, getExpandedHotends);
const probeNamesInToolheads = buildExtendedNameSet(activeToolheads, (t) => t.probe, getExpandedProbes);

const allAvailableExtruders = extrudersData.extruders.filter((e) =>
  extruderNamesInToolheads.has(e.name.toLowerCase())
);
const allAvailableHotends = hotendsData.hotends.filter((h) =>
  hotendNamesInToolheads.has(h.name.toLowerCase())
);
const allAvailableProbes = probesData.probes.filter((p) =>
  probeNamesInToolheads.has(p.name.toLowerCase())
);

function matchesComponent(list, name) {
  const nameList = Array.isArray(list) ? list : list ? [list] : [];
  const lower = name.toLowerCase();
  return nameList.some((item) => typeof item === 'string' && item.toLowerCase() === lower);
}

function matchesComponentExtended(list, name, getExpandedFn) {
  if (matchesComponent(list, name)) return true;
  const expanded = getExpandedFn(list);
  return expanded.some((item) => item.toLowerCase() === name.toLowerCase());
}

function matchesFan(fanField, fanValue) {
  if (!fanField || fanField === 'unknown') return false;
  const vals = Array.isArray(fanField) ? fanField : [fanField];
  return vals.includes(fanValue);
}

/* ------- Cross-filtering: compute viable items per column ------- */
function getViableToolheads(selections) {
  return activeToolheads.filter((th) => {
    if (selections.extruder && !matchesComponentExtended(th.extruders, selections.extruder, getExpandedExtruders)) return false;
    if (selections.hotend && !matchesComponentExtended(th.hotend, selections.hotend, getExpandedHotends)) return false;
    if (selections.probe && !matchesComponentExtended(th.probe, selections.probe, getExpandedProbes)) return false;
    if (selections.hotendFan && !matchesFan(th.hotend_fan, selections.hotendFan)) return false;
    if (selections.partCoolingFan && !matchesFan(th.part_cooling_fan, selections.partCoolingFan)) return false;
    return true;
  });
}

function getViableNames(toolheads, fieldGetter, getExpandedFn) {
  const set = new Set();
  for (const th of toolheads) {
    const val = fieldGetter(th);
    const list = Array.isArray(val) ? val : val ? [val] : [];
    for (const name of list) {
      if (typeof name === 'string' && name.toLowerCase() !== 'unknown' && name.toLowerCase() !== 'na') {
        set.add(name.toLowerCase());
      }
    }
    if (getExpandedFn) {
      const expanded = getExpandedFn(list);
      for (const name of expanded) {
        set.add(name.toLowerCase());
      }
    }
  }
  return set;
}

function getViableFanValues(toolheads, fanField) {
  const set = new Set();
  for (const th of toolheads) {
    const val = th[fanField];
    if (!val || val === 'unknown') continue;
    const vals = Array.isArray(val) ? val : [val];
    for (const v of vals) set.add(v);
  }
  return set;
}

/* ------- UI Sub-components ------- */

const HOTEND_FAN_OPTIONS = ['2510', '3007', '3010', '4010'];
const PART_COOLING_FAN_OPTIONS = ['3010', '3515', '3628', '4010', '4020', '5015', '5020', 'CPAP'];

function CompactTile({ name, isSelected, onClick, accentColor }) {
  const colors = {
    blue: { border: '#3b82f6', bg: '#eff6ff', text: '#2563eb' },
    green: { border: '#22c55e', bg: '#f0fdf4', text: '#16a34a' },
    purple: { border: '#a855f7', bg: '#faf5ff', text: '#9333ea' },
    orange: { border: '#f97316', bg: '#fff7ed', text: '#ea580c' },
    teal: { border: '#14b8a6', bg: '#f0fdfa', text: '#0d9488' },
  };
  const c = colors[accentColor] || colors.blue;

  return (
    <button
      onClick={onClick}
      style={{
        padding: '4px 8px',
        borderRadius: '5px',
        border: isSelected ? `2px solid ${c.border}` : '1px solid var(--sl-color-gray-5)',
        backgroundColor: isSelected ? c.bg : 'var(--sl-color-bg-nav)',
        color: isSelected ? c.text : 'var(--sl-color-white)',
        fontSize: '0.75rem',
        fontWeight: isSelected ? 700 : 500,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        lineHeight: '1.3',
        margin: 0,
        textAlign: 'left',
        wordBreak: 'break-word',
      }}
    >
      {name}
    </button>
  );
}

function DetailCard({ item, accentColor, type }) {
  const colors = {
    blue: { border: '#3b82f6', bg: 'rgba(59,130,246,0.08)', label: '#2563eb', bgAlpha: 'rgba(59,130,246,0.13)' },
    green: { border: '#22c55e', bg: 'rgba(34,197,94,0.08)', label: '#16a34a', bgAlpha: 'rgba(34,197,94,0.13)' },
    purple: { border: '#a855f7', bg: 'rgba(168,85,247,0.08)', label: '#9333ea', bgAlpha: 'rgba(168,85,247,0.13)' },
  };
  const c = colors[accentColor] || colors.blue;

  if (!item) return null;

  const badge = item.gear_type || item.hotend_type || item.type || null;
  const isTopPick = item?.top_pick === true;

  const specs = [];
  if (type === 'extruder') {
    if (item.mounting_pattern) specs.push({ label: 'Mount', value: item.mounting_pattern });
    if (item.gear_type) specs.push({ label: 'Gear', value: item.gear_type });
    if (item.filament_sensor && item.filament_sensor !== 'unknown') specs.push({ label: 'Sensor', value: item.filament_sensor });
  } else if (type === 'hotend') {
    if (item.hotend_type) specs.push({ label: 'Type', value: item.hotend_type });
    if (item.flow_rate) specs.push({ label: 'Flow', value: item.flow_rate });
    if (item.length) specs.push({ label: 'Length', value: item.length });
    if (item.nozzle_compatibility) specs.push({ label: 'Nozzles', value: Array.isArray(item.nozzle_compatibility) ? item.nozzle_compatibility.join(', ') : item.nozzle_compatibility });
  } else if (type === 'probe') {
    if (item.type) specs.push({ label: 'Type', value: item.type });
  }

  return (
    <div
      style={{
        marginTop: '8px',
        padding: '10px 12px',
        borderRadius: '8px',
        border: `1px solid ${c.border}`,
        backgroundColor: c.bg,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
        <strong style={{ fontSize: '0.9rem', color: c.label }}>{item.name}</strong>
        {isTopPick && (
          <span style={{ fontSize: '0.6rem', padding: '1px 5px', borderRadius: '4px', backgroundColor: '#fffbeb', color: '#b45309', fontWeight: 700 }}>
            ⭐ Top Pick
          </span>
        )}
        {badge && (
          <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '4px', backgroundColor: c.bgAlpha, color: c.label, fontWeight: 600 }}>
            {badge}
          </span>
        )}
      </div>
      {item.description && (
        <p style={{ margin: '0 0 6px 0', fontSize: '0.75rem', color: 'var(--sl-color-gray-3)', lineHeight: 1.4 }}>
          {item.description}
        </p>
      )}
      {specs.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
          {specs.map((s) => (
            <span key={s.label} style={{ fontSize: '0.68rem', color: 'var(--sl-color-gray-3)' }}>
              <strong style={{ color: 'var(--sl-color-gray-2)' }}>{s.label}:</strong> {s.value}
            </span>
          ))}
        </div>
      )}
      {item.url && (
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: c.label, fontSize: '0.75rem', fontWeight: 600, textDecoration: 'none' }}
        >
          {isGitHubUrl(item.url) ? 'View on GitHub →' : 'View Webpage →'}
        </a>
      )}
    </div>
  );
}

function ComponentColumn({ title, items, viableNames, selected, onSelect, accentColor, type, detailCatalog }) {
  const colors = {
    blue: { border: '#3b82f6' },
    green: { border: '#22c55e' },
    purple: { border: '#a855f7' },
    orange: { border: '#f97316' },
    teal: { border: '#14b8a6' },
  };
  const c = colors[accentColor] || colors.blue;

  const selectedDetail = selected ? findDetail(selected, detailCatalog) : null;

  return (
    <div style={{ minWidth: 0 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '8px',
          borderBottom: `2px solid ${c.border}`,
          paddingBottom: '4px',
        }}
      >
        <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--sl-color-white)', margin: 0 }}>
          {title}
        </h3>
        {selected && (
          <button
            onClick={() => onSelect(null)}
            style={{
              fontSize: '0.65rem',
              padding: '1px 6px',
              borderRadius: '10px',
              border: '1px solid var(--sl-color-gray-5)',
              backgroundColor: 'transparent',
              color: 'var(--sl-color-gray-3)',
              cursor: 'pointer',
              fontWeight: 600,
              margin: 0,
            }}
          >
            ✕
          </button>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxHeight: '320px', overflowY: 'auto' }}>
        {items.map((item) => {
          const isViable = viableNames.has(item.name.toLowerCase());
          const isSel = selected === item.name;
          if (!isViable && !isSel) return null;
          return (
            <CompactTile
              key={item.name}
              name={item.name}
              isSelected={isSel}
              onClick={() => {
                if (isSel) onSelect(null);
                else onSelect(item.name);
              }}
              accentColor={accentColor}
            />
          );
        })}
      </div>
      {selectedDetail && (
        <DetailCard item={selectedDetail} accentColor={accentColor} type={type} />
      )}
    </div>
  );
}

function FanColumn({ title, options, viableValues, selected, onSelect, accentColor }) {
  const colors = {
    orange: { border: '#f97316', active: '#f97316', activeBg: 'rgba(249,115,22,0.13)', activeText: '#ea580c' },
    teal: { border: '#14b8a6', active: '#14b8a6', activeBg: 'rgba(20,184,166,0.13)', activeText: '#0d9488' },
  };
  const c = colors[accentColor] || colors.orange;

  return (
    <div style={{ minWidth: 0 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '8px',
          borderBottom: `2px solid ${c.border}`,
          paddingBottom: '4px',
        }}
      >
        <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--sl-color-white)', margin: 0 }}>
          {title}
        </h3>
        {selected && (
          <button
            onClick={() => onSelect(null)}
            style={{
              fontSize: '0.65rem',
              padding: '1px 6px',
              borderRadius: '10px',
              border: '1px solid var(--sl-color-gray-5)',
              backgroundColor: 'transparent',
              color: 'var(--sl-color-gray-3)',
              cursor: 'pointer',
              fontWeight: 600,
              margin: 0,
            }}
          >
            ✕
          </button>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {options.map((opt) => {
          const isActive = selected === opt;
          const isViable = viableValues.has(opt);
          if (!isViable && !isActive) return null;
          return (
            <button
              key={opt}
              onClick={() => {
                if (isActive) onSelect(null);
                else onSelect(opt);
              }}
              style={{
                padding: '4px 8px',
                borderRadius: '5px',
                border: isActive ? `2px solid ${c.active}` : '1px solid var(--sl-color-gray-5)',
                backgroundColor: isActive ? c.activeBg : 'var(--sl-color-bg-nav)',
                color: isActive ? c.activeText : 'var(--sl-color-gray-3)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                lineHeight: '1.3',
                margin: 0,
                textAlign: 'left',
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CarouselArrow({ direction, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === 'left' ? 'Previous toolhead' : 'Next toolhead'}
      style={{
        position: 'absolute',
        top: '50%',
        [direction === 'left' ? 'left' : 'right']: '0px',
        transform: 'translateY(-50%)',
        zIndex: 10,
        background: 'none',
        border: 'none',
        cursor: disabled ? 'default' : 'pointer',
        padding: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: disabled ? 'var(--sl-color-gray-6)' : 'var(--sl-color-gray-3)',
        transition: 'color 0.2s ease',
      }}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.color = 'var(--sl-color-white)';
      }}
      onMouseLeave={(e) => {
        if (!disabled) e.currentTarget.style.color = 'var(--sl-color-gray-3)';
      }}
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
        pointerEvents: 'auto',
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

function NoCompatibleCard() {
  return (
    <div
      style={{
        borderRadius: '12px',
        border: '2px solid var(--sl-color-gray-5)',
        padding: '16px',
        backgroundColor: 'var(--sl-color-bg-sidebar)',
        maxWidth: '420px',
        margin: '0 auto',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: '100%',
          height: '220px',
          backgroundColor: 'var(--sl-color-bg-nav)',
          borderRadius: '8px',
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{ fontSize: '3rem', opacity: 0.3 }}>🔧</span>
      </div>
      <h3
        style={{
          fontSize: '1.2rem',
          fontWeight: 700,
          marginBottom: '8px',
          color: 'var(--sl-color-gray-3)',
          fontStyle: 'italic',
        }}
      >
        No compatible toolheads
      </h3>
      <p style={{ fontSize: '0.9rem', color: 'var(--sl-color-gray-4)', lineHeight: 1.5 }}>
        No active toolheads match all of your selected components. Try changing your selections.
      </p>
    </div>
  );
}

/* ------- Main component ------- */

export default function ToolheadRebuilder() {
  const [selectedExtruder, setSelectedExtruder] = useState(null);
  const [selectedHotend, setSelectedHotend] = useState(null);
  const [selectedProbe, setSelectedProbe] = useState(null);
  const [selectedHotendFan, setSelectedHotendFan] = useState(null);
  const [selectedPartCoolingFan, setSelectedPartCoolingFan] = useState(null);
  const [selectedToolheadName, setSelectedToolheadName] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const filteredToolheads = useMemo(() => getViableToolheads({
    extruder: selectedExtruder, hotend: selectedHotend, probe: selectedProbe,
    hotendFan: selectedHotendFan, partCoolingFan: selectedPartCoolingFan,
  }), [selectedExtruder, selectedHotend, selectedProbe, selectedHotendFan, selectedPartCoolingFan]);

  const viableExtruderNames = useMemo(() => {
    const ths = getViableToolheads({
      extruder: null, hotend: selectedHotend, probe: selectedProbe,
      hotendFan: selectedHotendFan, partCoolingFan: selectedPartCoolingFan,
    });
    return getViableNames(ths, (t) => t.extruders, getExpandedExtruders);
  }, [selectedHotend, selectedProbe, selectedHotendFan, selectedPartCoolingFan]);

  const viableHotendNames = useMemo(() => {
    const ths = getViableToolheads({
      extruder: selectedExtruder, hotend: null, probe: selectedProbe,
      hotendFan: selectedHotendFan, partCoolingFan: selectedPartCoolingFan,
    });
    return getViableNames(ths, (t) => t.hotend, getExpandedHotends);
  }, [selectedExtruder, selectedProbe, selectedHotendFan, selectedPartCoolingFan]);

  const viableProbeNames = useMemo(() => {
    const ths = getViableToolheads({
      extruder: selectedExtruder, hotend: selectedHotend, probe: null,
      hotendFan: selectedHotendFan, partCoolingFan: selectedPartCoolingFan,
    });
    return getViableNames(ths, (t) => t.probe, getExpandedProbes);
  }, [selectedExtruder, selectedHotend, selectedHotendFan, selectedPartCoolingFan]);

  const viableHotendFanValues = useMemo(() => {
    const ths = getViableToolheads({
      extruder: selectedExtruder, hotend: selectedHotend, probe: selectedProbe,
      hotendFan: null, partCoolingFan: selectedPartCoolingFan,
    });
    return getViableFanValues(ths, 'hotend_fan');
  }, [selectedExtruder, selectedHotend, selectedProbe, selectedPartCoolingFan]);

  const viablePartCoolingFanValues = useMemo(() => {
    const ths = getViableToolheads({
      extruder: selectedExtruder, hotend: selectedHotend, probe: selectedProbe,
      hotendFan: selectedHotendFan, partCoolingFan: null,
    });
    return getViableFanValues(ths, 'part_cooling_fan');
  }, [selectedExtruder, selectedHotend, selectedProbe, selectedHotendFan]);

  const total = filteredToolheads.length;

  useEffect(() => {
    setActiveIndex(0);
  }, [selectedExtruder, selectedHotend, selectedProbe, selectedHotendFan, selectedPartCoolingFan]);

  useEffect(() => {
    if (!selectedToolheadName) return;
    const stillAvailable = filteredToolheads.some((th) => th.name === selectedToolheadName);
    if (!stillAvailable) setSelectedToolheadName(null);
  }, [filteredToolheads, selectedToolheadName]);

  const safeIndex = total > 0 ? Math.min(activeIndex, total - 1) : 0;
  const goLeft = () => setActiveIndex((prev) => (prev - 1 + total) % total);
  const goRight = () => setActiveIndex((prev) => (prev + 1) % total);

  const swipeHandlers = useSwipe(goRight, goLeft);

  const leftIndex = total > 1 ? (safeIndex - 1 + total) % total : null;
  const rightIndex = total > 1 ? (safeIndex + 1) % total : null;

  const handleCardClick = (index) => {
    if (index === safeIndex) {
      const name = filteredToolheads[safeIndex].name;
      setSelectedToolheadName((prev) => (prev === name ? null : name));
    } else {
      setActiveIndex(index);
    }
  };

  const handleToolheadSelect = (toolheadName) => {
    setSelectedToolheadName((prev) => (prev === toolheadName ? null : toolheadName));
  };

  const selectedToolheadEntry = selectedToolheadName
    ? filteredToolheads.find((th) => th.name === selectedToolheadName)
    : null;

  const selectedHardwareRows = [];
  if (selectedToolheadEntry) {
    selectedHardwareRows.push({
      component: 'Toolhead',
      selection: selectedToolheadEntry.title || selectedToolheadEntry.name,
      url: selectedToolheadEntry.url || null,
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

    if (selectedToolheadEntry.hotend_fan && selectedToolheadEntry.hotend_fan !== 'unknown') {
      selectedHardwareRows.push({
        component: 'Hotend Fan',
        selection: Array.isArray(selectedToolheadEntry.hotend_fan)
          ? selectedToolheadEntry.hotend_fan.join(' / ')
          : selectedToolheadEntry.hotend_fan,
        url: null,
      });
    }

    if (selectedToolheadEntry.part_cooling_fan && selectedToolheadEntry.part_cooling_fan !== 'unknown') {
      selectedHardwareRows.push({
        component: 'Part Cooling Fan',
        selection: Array.isArray(selectedToolheadEntry.part_cooling_fan)
          ? selectedToolheadEntry.part_cooling_fan.join(' / ')
          : selectedToolheadEntry.part_cooling_fan,
        url: null,
      });
    }
  }

  return (
    <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Component columns */}
      <div
        style={{
          padding: '16px',
          borderRadius: '12px',
          border: '1px solid var(--sl-color-gray-5)',
          backgroundColor: 'var(--sl-color-bg-sidebar)',
          marginBottom: '24px',
          overflowX: 'auto',
        }}
      >
        <h2
          style={{
            fontSize: '1.2rem',
            fontWeight: 700,
            marginBottom: '16px',
            color: 'var(--sl-color-white)',
          }}
        >
          Select Your Components
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '12px',
          alignItems: 'start',
        }}>
          <ComponentColumn
            title="Extruder"
            items={allAvailableExtruders}
            viableNames={viableExtruderNames}
            selected={selectedExtruder}
            onSelect={setSelectedExtruder}
            accentColor="blue"
            type="extruder"
            detailCatalog={extrudersData.extruders}
          />
          <ComponentColumn
            title="Hotend"
            items={allAvailableHotends}
            viableNames={viableHotendNames}
            selected={selectedHotend}
            onSelect={setSelectedHotend}
            accentColor="green"
            type="hotend"
            detailCatalog={hotendsData.hotends}
          />
          <ComponentColumn
            title="Probe"
            items={allAvailableProbes}
            viableNames={viableProbeNames}
            selected={selectedProbe}
            onSelect={setSelectedProbe}
            accentColor="purple"
            type="probe"
            detailCatalog={probesData.probes}
          />
          <FanColumn
            title="Hotend Fan"
            options={HOTEND_FAN_OPTIONS}
            viableValues={viableHotendFanValues}
            selected={selectedHotendFan}
            onSelect={setSelectedHotendFan}
            accentColor="orange"
          />
          <FanColumn
            title="Part Cooling"
            options={PART_COOLING_FAN_OPTIONS}
            viableValues={viablePartCoolingFanValues}
            selected={selectedPartCoolingFan}
            onSelect={setSelectedPartCoolingFan}
            accentColor="teal"
          />
        </div>
      </div>

      {/* Compatible toolheads label */}
      <h2
        style={{
          fontSize: '1.2rem',
          fontWeight: 700,
          marginBottom: '12px',
          color: 'var(--sl-color-white)',
        }}
      >
        Compatible Toolheads
        {total > 0 && (
          <span
            style={{
              marginLeft: '12px',
              fontSize: '1rem',
              fontWeight: 400,
              color: 'var(--sl-color-gray-3)',
            }}
          >
            ({total} found)
          </span>
        )}
      </h2>

      {total === 0 ? (
        <NoCompatibleCard />
      ) : (
        <>
          <p style={{ color: 'var(--sl-color-gray-3)', marginTop: '-4px', marginBottom: '14px', fontSize: '0.9rem' }}>
            Select a toolhead from the carousel to generate your final hardware table.
          </p>

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
            <CarouselArrow direction="left" onClick={goLeft} disabled={total <= 1} />
            <CarouselArrow direction="right" onClick={goRight} disabled={total <= 1} />

            {filteredToolheads.map((toolhead, i) => {
              let position = null;
              if (i === safeIndex) position = 'center';
              else if (i === leftIndex) position = 'left';
              else if (i === rightIndex) position = 'right';
              else return null;

              return (
                <ToolheadCard
                  key={toolhead.name}
                  toolhead={toolhead}
                  position={position}
                  isSelected={selectedToolheadName === toolhead.name}
                  onSelect={() => handleToolheadSelect(toolhead.name)}
                  onClick={() => handleCardClick(i)}
                />
              );
            })}
          </div>

          {/* Dot indicators */}
          {total > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '32px' }}>
              {filteredToolheads.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveIndex(i)}
                  style={{
                    width: i === safeIndex ? '24px' : '8px',
                    height: '8px',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: i === safeIndex ? '#2E8B57' : 'var(--sl-color-gray-5)',
                    cursor: 'pointer',
                    padding: 0,
                    transition: 'all 0.3s ease',
                  }}
                />
              ))}
            </div>
          )}

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
