import { useState } from 'react';
import toolheadsData from '../data/toolheads.json';
import hotendsData from '../data/hotends.json';
import extrudersData from '../data/extruders.json';
import probesData from '../data/probes.json';

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

function getExpandedHotends(hotendNames) {
  const official = formatList(hotendNames);
  const officialLower = new Set(official.map((n) => n.toLowerCase()));
  const mountPatterns = new Set();

  for (const name of official) {
    const detail = findDetail(name, hotendsData.hotends);
    if (detail?.mounting_pattern) {
      for (const p of detail.mounting_pattern) {
        if (p !== 'other') mountPatterns.add(p);
      }
    }
  }

  const expanded = [];
  const seen = new Set([...officialLower]);
  for (const hotend of hotendsData.hotends) {
    const hLower = hotend.name.toLowerCase();
    if (seen.has(hLower)) continue;
    if (hotend.mounting_pattern?.some((p) => mountPatterns.has(p))) {
      expanded.push(hotend.name);
      seen.add(hLower);
    }
  }
  return expanded;
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

function HardwareCard({ name, detail, accentColor }) {
  const colors = {
    blue: { border: '#3b82f6', bg: '#eff6ff', dot: '#3b82f6', label: '#2563eb' },
    green: { border: '#22c55e', bg: '#f0fdf4', dot: '#22c55e', label: '#16a34a' },
    purple: { border: '#a855f7', bg: '#faf5ff', dot: '#a855f7', label: '#9333ea' },
  };
  const c = colors[accentColor] || colors.blue;
  const nozzleCompatibility = toKnownList(detail?.nozzle_compatibility);
  const mountingPatterns = toKnownList(detail?.mounting_pattern);
  const hotendType = getDisplayHotendType(detail);
  const flowRate = getDisplayFlowRate(detail);
  const showMeltzone = detail?.meltzone_length && !isUnknownValue(detail.meltzone_length);
  const showLength = detail?.length && !isUnknownValue(detail.length);

  const mountAndLength = [];
  if (mountingPatterns.length > 0) {
    mountAndLength.push(`Mount: ${mountingPatterns.join(', ')}`);
  }
  if (showLength) {
    mountAndLength.push(`Length: ${detail.length}`);
  }

  return (
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '12px 16px',
        marginBottom: '8px',
        backgroundColor: 'var(--sl-color-bg-nav)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: detail ? '6px' : 0 }}>
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: c.dot,
            flexShrink: 0,
          }}
        />
        <strong style={{ fontSize: '0.95rem', color: 'var(--sl-color-white)' }}>
          {detail ? (
            <a
              href={detail.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: c.label, textDecoration: 'none' }}
            >
              {detail.name}
            </a>
          ) : (
            name
          )}
        </strong>
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
    </div>
  );
}

function HardwareSection({ title, officialItems, expandedItems, catalog, accentColor }) {
  const [showExpanded, setShowExpanded] = useState(false);
  const officialList = typeof officialItems === 'object' && Array.isArray(officialItems) ? officialItems : formatList(officialItems);
  const expandedList = expandedItems || [];
  const borderColor = accentColor === 'blue' ? '#3b82f6' : accentColor === 'green' ? '#22c55e' : '#a855f7';

  return (
    <div style={{ flex: '1', minWidth: '280px' }}>
      <h3
        style={{
          fontSize: '1.1rem',
          fontWeight: 700,
          marginBottom: '12px',
          color: 'var(--sl-color-white)',
          borderBottom: `2px solid ${borderColor}`,
          paddingBottom: '6px',
        }}
      >
        {title} ({officialList.length}{expandedList.length > 0 ? ` + ${expandedList.length}` : ''})
      </h3>
      {officialList.length > 0 ? (
        officialList.map((name) => (
          <HardwareCard
            key={name}
            name={name}
            detail={findDetail(name, catalog)}
            accentColor={accentColor}
          />
        ))
      ) : (
        <p style={{ color: 'var(--sl-color-gray-4)', fontStyle: 'italic', fontSize: '0.9rem' }}>
          Compatibility data not yet available
        </p>
      )}
      {expandedList.length > 0 && (
        <>
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
            {showExpanded ? 'Hide' : 'See'} {expandedList.length} more by mounting pattern
          </button>
          {showExpanded && (
            <div style={{ opacity: 0.85 }}>
              {expandedList.map((name) => (
                <HardwareCard
                  key={name}
                  name={name}
                  detail={findDetail(name, catalog)}
                  accentColor={accentColor}
                />
              ))}
            </div>
          )}
        </>
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
          }}
        >
          {toolhead.title || toolhead.name}
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
            View on GitHub →
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

export default function ToolheadConfigurator() {
  const [selectedName, setSelectedName] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const total = communityPicks.length;

  const goLeft = () => setActiveIndex((prev) => (prev - 1 + total) % total);
  const goRight = () => setActiveIndex((prev) => (prev + 1) % total);

  const leftIndex = (activeIndex - 1 + total) % total;
  const rightIndex = (activeIndex + 1) % total;

  const toolheadEntry = selectedName
    ? communityPicks.find((t) => t.name === selectedName)
    : null;

  const handleCardClick = (index) => {
    if (index === activeIndex) {
      const name = communityPicks[activeIndex].name;
      setSelectedName((prev) => (prev === name ? null : name));
    } else {
      setActiveIndex(index);
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Toolhead carousel */}
      <div
        style={{
          position: 'relative',
          height: '430px',
          marginBottom: '32px',
          overflow: 'hidden',
          padding: '0 40px',
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
              onSelect={() =>
                setSelectedName((prev) =>
                  prev === toolhead.name ? null : toolhead.name
                )
              }
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
            />
            <HardwareSection
              title="Hotends"
              officialItems={getOfficialHotends(toolheadEntry.hotend)}
              // expandedItems={getExpandedHotends(toolheadEntry.hotend)}
              catalog={hotendsData.hotends}
              accentColor="green"
            />
            <HardwareSection
              title="Probes"
              officialItems={formatList(toolheadEntry.probe)}
              catalog={probesData.probes}
              accentColor="purple"
            />
          </div>
        </div>
      )}
    </div>
  );
}
