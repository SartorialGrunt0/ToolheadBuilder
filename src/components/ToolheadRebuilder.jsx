import { useState, useEffect } from 'react';
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

function buildNameSet(toolheads, fieldGetter) {
  const set = new Set();
  for (const th of toolheads) {
    const val = fieldGetter(th);
    const list = Array.isArray(val) ? val : val ? [val] : [];
    for (const name of list) {
      if (typeof name === 'string' && name.toLowerCase() !== 'unknown' && name.toLowerCase() !== 'na') {
        set.add(name.toLowerCase());
      }
    }
  }
  return set;
}

// Build extended name sets: include both direct + extended list items
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
    // Also add extended items
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

const availableExtruders = extrudersData.extruders.filter((e) =>
  extruderNamesInToolheads.has(e.name.toLowerCase())
);
const availableHotends = hotendsData.hotends.filter((h) =>
  hotendNamesInToolheads.has(h.name.toLowerCase())
);
const availableProbes = probesData.probes.filter((p) =>
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

function ToolheadCard({ toolhead, position, onClick }) {
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
      }}
    >
      <div
        style={{
          borderRadius: '12px',
          border: '2px solid var(--sl-color-gray-5)',
          padding: '16px',
          backgroundColor: 'var(--sl-color-bg-sidebar)',
          boxShadow: isCenter ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
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
          {toolhead.community_favorite && (
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
              ⭐ Community Pick
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

function ComponentOption({ item, isSelected, onClick, accentColor }) {
  const isCommunityFavorite = item?.community_favorite === true;
  const colors = {
    blue: { border: '#3b82f6', bg: '#eff6ff', dot: '#3b82f6', label: '#2563eb', bgAlpha: 'rgba(59,130,246,0.13)' },
    green: { border: '#22c55e', bg: '#f0fdf4', dot: '#22c55e', label: '#16a34a', bgAlpha: 'rgba(34,197,94,0.13)' },
    purple: { border: '#a855f7', bg: '#faf5ff', dot: '#a855f7', label: '#9333ea', bgAlpha: 'rgba(168,85,247,0.13)' },
  };
  const c = colors[accentColor] || colors.blue;

  const badge = item.gear_type || item.hotend_type || item.type || null;

  return (
    <div
      onClick={onClick}
      style={{
        border: isSelected ? `2px solid ${c.border}` : '1px solid var(--sl-color-gray-5)',
        borderRadius: '8px',
        padding: '10px 14px',
        marginBottom: '8px',
        backgroundColor: isSelected ? c.bg : 'var(--sl-color-bg-nav)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
        <strong
          style={{
            fontSize: '0.95rem',
            color: isSelected ? c.label : 'var(--sl-color-white)',
          }}
        >
          {item.name}
        </strong>
        {isCommunityFavorite && (
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
            ⭐ Community Pick
          </span>
        )}
        {badge && (
          <span
            style={{
              fontSize: '0.7rem',
              padding: '2px 6px',
              borderRadius: '4px',
              backgroundColor: isSelected ? c.bgAlpha : 'var(--sl-color-gray-6)',
              color: isSelected ? c.label : 'var(--sl-color-gray-3)',
              fontWeight: 600,
              marginLeft: 'auto',
            }}
          >
            {badge}
          </span>
        )}
      </div>
      {item.description && (
        <p
          style={{
            margin: '4px 0 0 0',
            fontSize: '0.78rem',
            color: 'var(--sl-color-gray-3)',
            lineHeight: 1.4,
            paddingLeft: '16px',
          }}
        >
          {item.description}
        </p>
      )}
    </div>
  );
}

function ComponentSelector({ title, options, selected, onSelect, accentColor }) {
  const colors = {
    blue: { border: '#3b82f6' },
    green: { border: '#22c55e' },
    purple: { border: '#a855f7' },
  };
  const c = colors[accentColor] || colors.blue;

  const visibleOptions = selected
    ? options.filter((o) => o.name === selected)
    : options;

  return (
    <div style={{ flex: '1', minWidth: '280px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
          borderBottom: `2px solid ${c.border}`,
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
          {title}
        </h3>
        {selected && (
          <button
            onClick={() => onSelect(null)}
            style={{
              fontSize: '0.75rem',
              padding: '2px 8px',
              borderRadius: '12px',
              border: `1px solid var(--sl-color-gray-5)`,
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
      {visibleOptions.map((item) => (
        <ComponentOption
          key={item.name}
          item={item}
          isSelected={selected === item.name}
          onClick={() => onSelect(selected === item.name ? null : item.name)}
          accentColor={accentColor}
        />
      ))}
    </div>
  );
}

const HOTEND_FAN_OPTIONS = ['2510', '3007', '3010', '4010'];
const PART_COOLING_FAN_OPTIONS = ['3010', '3515', '3628', '4010', '4020', '5015', '5020', 'CPAP'];

function FanFilter({ title, options, selected, onSelect, accentColor }) {
  const colors = {
    orange: { border: '#f97316', active: '#f97316', activeBg: 'rgba(249,115,22,0.13)', activeText: '#ea580c' },
    teal: { border: '#14b8a6', active: '#14b8a6', activeBg: 'rgba(20,184,166,0.13)', activeText: '#0d9488' },
  };
  const c = colors[accentColor] || colors.orange;

  return (
    <div style={{ flex: '1', minWidth: '220px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
          borderBottom: `2px solid ${c.border}`,
          paddingBottom: '6px',
        }}
      >
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--sl-color-white)', margin: 0 }}>
          {title}
        </h3>
        {selected && (
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
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {options.map((opt) => {
          const isActive = selected === opt;
          return (
            <button
              key={opt}
              onClick={() => onSelect(isActive ? null : opt)}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                border: isActive ? `2px solid ${c.active}` : '2px solid var(--sl-color-gray-5)',
                backgroundColor: isActive ? c.activeBg : 'var(--sl-color-bg-nav)',
                color: isActive ? c.activeText : 'var(--sl-color-gray-3)',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'border-color 0.15s ease, background-color 0.15s ease, color 0.15s ease',
                boxSizing: 'border-box',
                lineHeight: '1.4',
                margin: 0,
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

export default function ToolheadRebuilder() {
  const [selectedExtruder, setSelectedExtruder] = useState(null);
  const [selectedHotend, setSelectedHotend] = useState(null);
  const [selectedProbe, setSelectedProbe] = useState(null);
  const [selectedHotendFan, setSelectedHotendFan] = useState(null);
  const [selectedPartCoolingFan, setSelectedPartCoolingFan] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const filteredToolheads = activeToolheads.filter((th) => {
    if (selectedExtruder && !matchesComponentExtended(th.extruders, selectedExtruder, getExpandedExtruders)) return false;
    if (selectedHotend && !matchesComponentExtended(th.hotend, selectedHotend, getExpandedHotends)) return false;
    if (selectedProbe && !matchesComponentExtended(th.probe, selectedProbe, getExpandedProbes)) return false;
    if (selectedHotendFan) {
      const hf = th.hotend_fan;
      if (!hf || hf === 'unknown') return false;
      const vals = Array.isArray(hf) ? hf : [hf];
      if (!vals.includes(selectedHotendFan)) return false;
    }
    if (selectedPartCoolingFan) {
      const pcf = th.part_cooling_fan;
      if (!pcf || pcf === 'unknown') return false;
      const vals = Array.isArray(pcf) ? pcf : [pcf];
      if (!vals.includes(selectedPartCoolingFan)) return false;
    }
    return true;
  });

  const total = filteredToolheads.length;

  useEffect(() => {
    setActiveIndex(0);
  }, [selectedExtruder, selectedHotend, selectedProbe, selectedHotendFan, selectedPartCoolingFan]);

  const safeIndex = total > 0 ? Math.min(activeIndex, total - 1) : 0;
  const goLeft = () => setActiveIndex((prev) => (prev - 1 + total) % total);
  const goRight = () => setActiveIndex((prev) => (prev + 1) % total);

  const swipeHandlers = useSwipe(goRight, goLeft);

  const leftIndex = total > 1 ? (safeIndex - 1 + total) % total : null;
  const rightIndex = total > 1 ? (safeIndex + 1) % total : null;

  const handleCardClick = (index) => {
    if (index !== safeIndex) setActiveIndex(index);
  };

  return (
    <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Component selectors */}
      <div
        style={{
          padding: '24px',
          borderRadius: '12px',
          border: '1px solid var(--sl-color-gray-5)',
          backgroundColor: 'var(--sl-color-bg-sidebar)',
          marginBottom: '32px',
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
          Select Your Components
        </h2>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          <ComponentSelector
            title="Extruder"
            options={availableExtruders}
            selected={selectedExtruder}
            onSelect={setSelectedExtruder}
            accentColor="blue"
          />
          <ComponentSelector
            title="Hotend"
            options={availableHotends}
            selected={selectedHotend}
            onSelect={setSelectedHotend}
            accentColor="green"
          />
          <ComponentSelector
            title="Probe"
            options={availableProbes}
            selected={selectedProbe}
            onSelect={setSelectedProbe}
            accentColor="purple"
          />
        </div>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--sl-color-gray-5)' }}>
          <FanFilter
            title="Hotend Fan"
            options={HOTEND_FAN_OPTIONS}
            selected={selectedHotendFan}
            onSelect={setSelectedHotendFan}
            accentColor="orange"
          />
          <FanFilter
            title="Part Cooling Fan"
            options={PART_COOLING_FAN_OPTIONS}
            selected={selectedPartCoolingFan}
            onSelect={setSelectedPartCoolingFan}
            accentColor="teal"
          />
        </div>
      </div>

      {/* Compatible toolheads label */}
      <h2
        style={{
          fontSize: '1.4rem',
          fontWeight: 700,
          marginBottom: '16px',
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
        </>
      )}
    </div>
  );
}
