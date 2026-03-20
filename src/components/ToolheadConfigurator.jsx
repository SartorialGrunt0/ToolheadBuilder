import { useState } from 'react';
import toolheadsData from '../data/toolheads.json';
import hotendsData from '../data/hotends.json';
import extrudersData from '../data/extruders.json';
import probesData from '../data/probes.json';

const communityPicks = toolheadsData.toolheads.filter((t) => t.communityPick);

function findDetail(name, catalog, nameKey = 'name') {
  const lower = name.toLowerCase();
  return catalog.find((item) => {
    const itemName = item[nameKey].toLowerCase();
    return (
      itemName === lower ||
      itemName.includes(lower) ||
      lower.includes(itemName)
    );
  });
}

function formatList(items) {
  if (!items) return [];
  if (typeof items === 'string') return items === 'unknown' ? [] : [items];
  return Array.isArray(items)
    ? items.filter((i) => i !== 'unknown' && i !== 'other' && i !== 'NA')
    : [];
}

function HardwareCard({ name, detail, accentColor }) {
  const colors = {
    blue: { border: '#3b82f6', bg: '#eff6ff', dot: '#3b82f6', label: '#2563eb' },
    green: { border: '#22c55e', bg: '#f0fdf4', dot: '#22c55e', label: '#16a34a' },
    purple: { border: '#a855f7', bg: '#faf5ff', dot: '#a855f7', label: '#9333ea' },
  };
  const c = colors[accentColor] || colors.blue;

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
        {detail?.flow_rate && (
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
            {detail.flow_rate}
          </span>
        )}
        {detail?.type && (
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
        {detail?.gear_type && (
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
      {detail?.mounting_pattern && (
        <p
          style={{
            margin: '4px 0 0 0',
            fontSize: '0.75rem',
            color: 'var(--sl-color-gray-4)',
            paddingLeft: '16px',
          }}
        >
          Mount: {Array.isArray(detail.mounting_pattern) ? detail.mounting_pattern.join(', ') : detail.mounting_pattern}
          {detail.length && detail.length !== 'unknown' ? ` · Length: ${detail.length}` : ''}
        </p>
      )}
    </div>
  );
}

function HardwareSection({ title, items, catalog, accentColor }) {
  const list = formatList(items);
  return (
    <div style={{ flex: '1', minWidth: '280px' }}>
      <h3
        style={{
          fontSize: '1.1rem',
          fontWeight: 700,
          marginBottom: '12px',
          color: 'var(--sl-color-white)',
          borderBottom: `2px solid ${
            accentColor === 'blue'
              ? '#3b82f6'
              : accentColor === 'green'
              ? '#22c55e'
              : '#a855f7'
          }`,
          paddingBottom: '6px',
        }}
      >
        {title} ({list.length})
      </h3>
      {list.length > 0 ? (
        list.map((name) => (
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
    </div>
  );
}

export default function ToolheadConfigurator() {
  const [selectedName, setSelectedName] = useState(null);

  const toolheadEntry = selectedName
    ? communityPicks.find((t) => t.name === selectedName)
    : null;

  return (
    <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Toolhead selection cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '24px',
          marginBottom: '32px',
        }}
      >
        {communityPicks.map((toolhead) => {
          const isSelected = selectedName === toolhead.name;
          return (
            <div
              key={toolhead.name}
              onClick={() =>
                setSelectedName(isSelected ? null : toolhead.name)
              }
              style={{
                cursor: 'pointer',
                borderRadius: '12px',
                border: isSelected
                  ? '3px solid #2E8B57'
                  : '2px solid var(--sl-color-gray-5)',
                padding: '16px',
                transition: 'all 0.2s ease',
                backgroundColor: isSelected
                  ? 'var(--sl-color-bg-nav)'
                  : 'var(--sl-color-bg-sidebar)',
                boxShadow: isSelected
                  ? '0 4px 12px rgba(46, 139, 87, 0.3)'
                  : 'none',
              }}
            >
              <img
                src={toolhead.image}
                alt={toolhead.name}
                style={{
                  width: '100%',
                  height: '220px',
                  objectFit: 'cover',
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
                <span
                  style={{
                    fontSize: '0.8rem',
                    padding: '4px 12px',
                    borderRadius: '16px',
                    backgroundColor: isSelected ? '#2E8B57' : 'transparent',
                    color: isSelected ? '#fff' : 'var(--sl-color-gray-3)',
                    border: isSelected ? 'none' : '1px solid var(--sl-color-gray-5)',
                    fontWeight: 600,
                  }}
                >
                  {isSelected ? '✓ Selected' : 'Click to select'}
                </span>
              </div>
            </div>
          );
        })}
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
              items={toolheadEntry.extruders}
              catalog={extrudersData.extruders}
              accentColor="blue"
            />
            <HardwareSection
              title="Hotends"
              items={toolheadEntry.hotend}
              catalog={hotendsData.hotends}
              accentColor="green"
            />
            <HardwareSection
              title="Probes"
              items={toolheadEntry.probe}
              catalog={probesData.probes}
              accentColor="purple"
            />
          </div>
        </div>
      )}
    </div>
  );
}
