import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import toolheadsData from '../data/toolheads.json';
import hotendsData from '../data/hotends.json';
import extrudersData from '../data/extruders.json';
import probesData from '../data/probes.json';
import { useDragCarousel } from './useDragCarousel';

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

const allAvailableExtruders = extrudersData.extruders
  .filter((e) => extruderNamesInToolheads.has(e.name.toLowerCase()))
  .sort((a, b) => a.name.localeCompare(b.name));
const allAvailableHotends = hotendsData.hotends
  .filter((h) => hotendNamesInToolheads.has(h.name.toLowerCase()))
  .sort((a, b) => a.name.localeCompare(b.name));
const allAvailableProbes = probesData.probes
  .filter((p) => probeNamesInToolheads.has(p.name.toLowerCase()))
  .sort((a, b) => a.name.localeCompare(b.name));

const EXCLUDED_FILTER_VALUES = new Set(['other', 'integrated', 'unknown', 'na']);

function isFilterableValue(val) {
  return val && !EXCLUDED_FILTER_VALUES.has(val.toLowerCase());
}

function getFieldValues(items, field) {
  const set = new Set();
  for (const item of items) {
    const val = item[field];
    if (Array.isArray(val)) {
      for (const v of val) if (isFilterableValue(v)) set.add(v);
    } else {
      if (isFilterableValue(val)) set.add(val);
    }
  }
  return [...set].sort();
}

function itemPassesFilterGroups(item, filterGroups, skipIndex) {
  for (let i = 0; i < filterGroups.length; i++) {
    if (i === skipIndex) continue;
    const group = filterGroups[i];
    if (group.activeFilters.size === 0) continue;
    const val = item[group.filterField];
    if (Array.isArray(val)) {
      if (!val.some((v) => group.activeFilters.has(v))) return false;
    } else {
      if (!val || !group.activeFilters.has(val)) return false;
    }
  }
  return true;
}

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

/* Normalize a field to an array */
function toArray(val) {
  return Array.isArray(val) ? val : val ? [val] : [];
}

/* Check if a toolhead has at least one component (from a given field) that passes filter groups.
   expandFn expands the component list, catalog is the data catalog to look up details. */
function toolheadHasFilteredComponent(thField, expandFn, catalog, filterGroups) {
  const raw = toArray(thField);
  const expanded = expandFn(raw);
  const allNames = [...new Set([...raw, ...expanded])];
  return allNames.some((name) => {
    const detail = catalog.find((item) => item.name.toLowerCase() === name.toLowerCase());
    return detail && itemPassesFilterGroups(detail, filterGroups, -1);
  });
}

/* ------- Cross-filtering: compute viable items per column ------- */
function getViableToolheads(selections) {
  return activeToolheads.filter((th) => {
    if (selections.toolheadName && th.name !== selections.toolheadName) return false;
    if (selections.extruder && !matchesComponentExtended(th.extruders, selections.extruder, getExpandedExtruders)) return false;
    if (selections.hotend && !matchesComponentExtended(th.hotend, selections.hotend, getExpandedHotends)) return false;
    if (selections.probe && !matchesComponentExtended(th.probe, selections.probe, getExpandedProbes)) return false;
    if (selections.hotendFan && !matchesFan(th.hotend_fan, selections.hotendFan)) return false;
    if (selections.partCoolingFan && !matchesFan(th.part_cooling_fan, selections.partCoolingFan)) return false;
    // Toolhead metadata filters
    if (selections.categoryFilters && selections.categoryFilters.size > 0) {
      if (!th.category || !selections.categoryFilters.has(th.category)) return false;
    }
    if (selections.cutterFilters && selections.cutterFilters.size > 0) {
      if (!th.filament_cutter || !selections.cutterFilters.has(th.filament_cutter)) return false;
    }
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

const HOTEND_FAN_OPTIONS = ['2510', '3007', '3010', '4010', '4028'];
const PART_COOLING_FAN_OPTIONS = ['3010', '3515', '3628', '4010', '4020', '5015', '5020', 'CPAP'];
const CAROUSEL_ITEM_WIDTH = 460;

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

function FilterPopup({ filterGroups, onClose, accentColor, containerRef }) {
  const colors = {
    blue: { border: '#3b82f6', bg: '#eff6ff', text: '#2563eb' },
    green: { border: '#22c55e', bg: '#f0fdf4', text: '#16a34a' },
    purple: { border: '#a855f7', bg: '#faf5ff', text: '#9333ea' },
  };
  const c = colors[accentColor] || colors.blue;

  useEffect(() => {
    const handler = (e) => {
      if (containerRef?.current && !containerRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [onClose, containerRef]);

  return (
    <div
      style={{
        position: 'absolute',
        top: '100%',
        right: 0,
        zIndex: 50,
        marginTop: '4px',
        padding: '8px 10px',
        borderRadius: '8px',
        border: `1px solid ${c.border}`,
        backgroundColor: 'var(--sl-color-bg-sidebar)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        minWidth: '180px',
        maxWidth: '400px',
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {filterGroups.map((group) => (
          <div key={group.label} style={{ minWidth: '80px', flex: '1 1 auto' }}>
            <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--sl-color-gray-4)', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {group.label}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px' }}>
              {group.options.map((opt) => {
                const isActive = group.activeFilters.has(opt);
                return (
                  <button
                    key={opt}
                    onClick={() => group.onToggle(opt)}
                    style={{
                      padding: '2px 6px',
                      borderRadius: '4px',
                      border: isActive ? `1px solid ${c.border}` : '1px solid var(--sl-color-gray-5)',
                      backgroundColor: isActive ? c.bg : 'transparent',
                      color: isActive ? c.text : 'var(--sl-color-gray-3)',
                      fontSize: '0.65rem',
                      fontWeight: isActive ? 700 : 500,
                      cursor: 'pointer',
                      margin: 0,
                    }}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
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

  const isTopPick = item?.top_pick === true;

  const specs = [];
  if (type === 'extruder') {
    if (item.mounting_pattern) specs.push({ label: 'Mount', value: item.mounting_pattern });
    if (item.gear_type) specs.push({ label: 'Gear', value: item.gear_type });
    if (item.filament_sensor && item.filament_sensor !== 'unknown') specs.push({ label: 'Sensor', value: item.filament_sensor });
  } else if (type === 'hotend') {
    if (item.hotend_type && item.hotend_type !== 'unknown') specs.push({ label: 'Type', value: item.hotend_type });
    if (item.flow_rate && item.flow_rate.toLowerCase() !== 'unknown') specs.push({ label: 'Flow', value: item.flow_rate });
    if (item.length && item.length !== 'unknown') specs.push({ label: 'Length', value: item.length });
    if (item.mounting_pattern) {
      const mounts = (Array.isArray(item.mounting_pattern) ? item.mounting_pattern : [item.mounting_pattern]).filter((m) => m && m !== 'unknown');
      if (mounts.length > 0) specs.push({ label: 'Mount', value: mounts.join(', ') });
    }
    if (item.nozzle_compatibility) {
      const nozzles = (Array.isArray(item.nozzle_compatibility) ? item.nozzle_compatibility : [item.nozzle_compatibility]).filter((n) => n && n.toLowerCase() !== 'unknown');
      if (nozzles.length > 0) specs.push({ label: 'Nozzles', value: nozzles.join(', ') });
    }
  } else if (type === 'probe') {
    if (item.type) specs.push({ label: 'Type', value: item.type });
  }

  return (
    <div
      style={{
        marginTop: '6px',
        padding: '6px 10px',
        borderRadius: '6px',
        border: `1px solid ${c.border}`,
        backgroundColor: c.bg,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        {isTopPick && (
          <span style={{ fontSize: '0.6rem', padding: '1px 5px', borderRadius: '4px', backgroundColor: '#fffbeb', color: '#b45309', fontWeight: 700 }}>
            ⭐ Top Pick
          </span>
        )}
        {specs.map((s) => (
          <span key={s.label} style={{ fontSize: '0.68rem', color: 'var(--sl-color-gray-3)' }}>
            <strong style={{ color: 'var(--sl-color-gray-2)' }}>{s.label}:</strong> {s.value}
          </span>
        ))}
      </div>
      {item.url && (
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: c.label, fontSize: '0.7rem', fontWeight: 600, textDecoration: 'none' }}
        >
          {isGitHubUrl(item.url) ? 'GitHub →' : 'Webpage →'}
        </a>
      )}
    </div>
  );
}

function ComponentRow({ title, items, viableNames, selected, onSelect, accentColor, type, detailCatalog, filterGroups }) {
  const [showFilter, setShowFilter] = useState(false);
  const filterContainerRef = useRef(null);
  const colors = {
    blue: { border: '#3b82f6' },
    green: { border: '#22c55e' },
    purple: { border: '#a855f7' },
    orange: { border: '#f97316' },
    teal: { border: '#14b8a6' },
  };
  const c = colors[accentColor] || colors.blue;

  const selectedDetail = selected ? findDetail(selected, detailCatalog) : null;

  const hasActiveFilter = filterGroups && filterGroups.some((g) => g.activeFilters.size > 0);

  /* Items viable from cross-filtering (other component categories) */
  const viableItems = items.filter((item) => viableNames.has(item.name.toLowerCase()));

  /* For each filter group, compute available options from viable items that pass all OTHER filter groups.
     Always include currently active filter values so user can deselect them. */
  const dynamicFilterGroups = filterGroups
    ? filterGroups.map((group, gi) => {
        const candidateItems = viableItems.filter((item) => itemPassesFilterGroups(item, filterGroups, gi));
        const dynamicOptions = getFieldValues(candidateItems, group.filterField);
        const optionSet = new Set(dynamicOptions);
        for (const val of group.activeFilters) optionSet.add(val);
        return { ...group, options: [...optionSet].sort() };
      })
    : null;

  /* Items that pass all filter groups */
  const filteredItems = filterGroups
    ? items.filter((item) => itemPassesFilterGroups(item, filterGroups, -1))
    : items;

  return (
    <div style={{ marginBottom: '12px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '6px',
          borderBottom: `2px solid ${c.border}`,
          paddingBottom: '4px',
          position: 'relative',
        }}
      >
        <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--sl-color-white)', margin: 0 }}>
          {title}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
          {dynamicFilterGroups && dynamicFilterGroups.some((g) => g.options.length > 0) && (
            <div ref={filterContainerRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setShowFilter((prev) => !prev)}
                style={{
                  fontSize: '0.7rem',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  border: hasActiveFilter ? `1px solid ${c.border}` : '1px solid var(--sl-color-gray-5)',
                  backgroundColor: hasActiveFilter ? c.border + '22' : 'transparent',
                  color: hasActiveFilter ? c.border : 'var(--sl-color-gray-4)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  margin: 0,
                  lineHeight: 1.4,
                }}
                title="Filter"
              >
                {hasActiveFilter ? '▾ Filter ✓' : '▾ Filter'}
              </button>
              {showFilter && dynamicFilterGroups && (
                <FilterPopup
                  filterGroups={dynamicFilterGroups.filter((g) => g.options.length > 0)}
                  onClose={() => setShowFilter(false)}
                  accentColor={accentColor}
                  containerRef={filterContainerRef}
                />
              )}
            </div>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
        {filteredItems.map((item) => {
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

function FanRow({ title, options, viableValues, selected, onSelect, accentColor }) {
  const colors = {
    orange: { border: '#f97316', active: '#f97316', activeBg: 'rgba(249,115,22,0.13)', activeText: '#ea580c' },
    teal: { border: '#14b8a6', active: '#14b8a6', activeBg: 'rgba(20,184,166,0.13)', activeText: '#0d9488' },
  };
  const c = colors[accentColor] || colors.orange;

  return (
    <div style={{ marginBottom: '12px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '6px',
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
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
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

function ToolheadCard({ toolhead, position, isSelected, onSelect, onClick, dragOffset = 0, isDragging }) {
  const isCenter = position === 'center';
  const isLeft = position === 'left';
  const isRight = position === 'right';

  const baseTranslateX = isCenter ? 0 : isLeft ? -60 : 60;
  const scale = isCenter ? 1 : 0.82;
  const opacity = isCenter ? 1 : 0.4;
  const zIndex = isCenter ? 5 : 2;

  // Convert dragOffset pixels to percentage of container
  const dragPercent = (dragOffset / CAROUSEL_ITEM_WIDTH) * 60;

  return (
    <div
      onClick={onClick}
      style={{
        position: 'absolute',
        top: 0,
        left: '50%',
        width: '100%',
        maxWidth: '420px',
        transform: `translateX(-50%) translateX(${baseTranslateX + dragPercent}%) scale(${scale})`,
        opacity,
        zIndex,
        transition: isDragging ? 'none' : 'all 0.4s cubic-bezier(0.25, 0.1, 0.25, 1)',
        cursor: isDragging ? 'grabbing' : 'pointer',
        pointerEvents: 'auto',
        userSelect: 'none',
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
          }}
        >
          {toolhead.title || toolhead.name}
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '0.75rem', color: 'var(--sl-color-gray-3)', marginBottom: '8px' }}>
          {toolhead.category && <span><strong>Category:</strong> {toolhead.category}</span>}
          {toolhead.filament_cutter && toolhead.filament_cutter !== 'unknown' && <span><strong>Filament Cutter:</strong> {toolhead.filament_cutter}</span>}
          {toolhead.top_pick && <span style={{ color: '#b45309', fontWeight: 700 }}>⭐ Top Pick</span>}
        </div>
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

function ToolheadGridTile({ toolhead, isSelected, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px',
        borderRadius: '8px',
        border: isSelected ? '2px solid #2E8B57' : '1px solid var(--sl-color-gray-5)',
        backgroundColor: isSelected ? 'var(--sl-color-bg-nav)' : 'var(--sl-color-bg-sidebar)',
        boxShadow: isSelected ? '0 2px 8px rgba(46, 139, 87, 0.3)' : 'none',
        cursor: 'pointer',
        textAlign: 'center',
        margin: 0,
        transition: 'all 0.15s ease',
      }}
    >
      <img
        src={toolhead.image}
        alt={toolhead.name}
        loading="lazy"
        decoding="async"
        style={{
          width: '100%',
          height: '90px',
          objectFit: 'contain',
          backgroundColor: 'var(--sl-color-bg-nav)',
          borderRadius: '4px',
          marginBottom: '4px',
        }}
      />
      <div style={{
        fontSize: '0.7rem',
        fontWeight: isSelected ? 700 : 600,
        color: isSelected ? '#2E8B57' : 'var(--sl-color-white)',
        lineHeight: 1.2,
        wordBreak: 'break-word',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '3px',
      }}>
        {toolhead.title || toolhead.name}
      </div>
    </button>
  );
}

function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1" y="1" width="5.5" height="5.5" rx="1" />
      <rect x="9.5" y="1" width="5.5" height="5.5" rx="1" />
      <rect x="1" y="9.5" width="5.5" height="5.5" rx="1" />
      <rect x="9.5" y="9.5" width="5.5" height="5.5" rx="1" />
    </svg>
  );
}

function DenseGridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="0.5" y="0.5" width="3.5" height="3.5" rx="0.5" />
      <rect x="6.25" y="0.5" width="3.5" height="3.5" rx="0.5" />
      <rect x="12" y="0.5" width="3.5" height="3.5" rx="0.5" />
      <rect x="0.5" y="6.25" width="3.5" height="3.5" rx="0.5" />
      <rect x="6.25" y="6.25" width="3.5" height="3.5" rx="0.5" />
      <rect x="12" y="6.25" width="3.5" height="3.5" rx="0.5" />
      <rect x="0.5" y="12" width="3.5" height="3.5" rx="0.5" />
      <rect x="6.25" y="12" width="3.5" height="3.5" rx="0.5" />
      <rect x="12" y="12" width="3.5" height="3.5" rx="0.5" />
    </svg>
  );
}

function CarouselIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="2" width="12" height="12" rx="2" />
    </svg>
  );
}

function ToolheadCompactTile({ name, isSelected, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '4px 8px',
        borderRadius: '5px',
        border: isSelected ? '2px solid #2E8B57' : '1px solid var(--sl-color-gray-5)',
        backgroundColor: isSelected ? 'rgba(46,139,87,0.08)' : 'var(--sl-color-bg-nav)',
        color: isSelected ? '#2E8B57' : 'var(--sl-color-white)',
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

function ToolheadDetailCard({ toolhead }) {
  if (!toolhead) return null;
  return (
    <div
      style={{
        marginTop: '8px',
        padding: '12px',
        borderRadius: '10px',
        border: '2px solid #2E8B57',
        backgroundColor: 'rgba(46,139,87,0.06)',
      }}
    >
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <img
          src={toolhead.image}
          alt={toolhead.name}
          loading="lazy"
          decoding="async"
          style={{
            width: '160px',
            height: '120px',
            objectFit: 'contain',
            objectPosition: 'center',
            backgroundColor: 'var(--sl-color-bg-nav)',
            borderRadius: '6px',
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1, minWidth: '180px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 4px 0', color: 'var(--sl-color-white)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {toolhead.title || toolhead.name}
            {toolhead.top_pick && (
              <span style={{ fontSize: '0.6rem', padding: '1px 6px', borderRadius: '4px', backgroundColor: '#fffbeb', color: '#b45309', fontWeight: 700 }}>
                ⭐ Top Pick
              </span>
            )}
          </h3>
          {toolhead.description && (
            <p style={{ fontSize: '0.8rem', color: 'var(--sl-color-gray-3)', marginBottom: '6px', lineHeight: 1.4 }}>
              {toolhead.description}
            </p>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', fontSize: '0.7rem', color: 'var(--sl-color-gray-3)' }}>
            {toolhead.category && <span><strong>Category:</strong> {toolhead.category}</span>}
            {toolhead.filament_cutter && toolhead.filament_cutter !== 'unknown' && <span><strong>Filament Cutter:</strong> {toolhead.filament_cutter}</span>}
          </div>
          {toolhead.url && (
            <a
              href={toolhead.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#2E8B57', fontSize: '0.75rem', fontWeight: 600, textDecoration: 'none', display: 'inline-block', marginTop: '4px' }}
            >
              {isGitHubUrl(toolhead.url) ? 'View on GitHub →' : 'View →'}
            </a>
          )}
        </div>
      </div>
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
  const [extruderFilters, setExtruderFilters] = useState(new Set());
  const [hotendFilters, setHotendFilters] = useState(new Set());
  const [probeFilters, setProbeFilters] = useState(new Set());
  const [extruderMountFilters, setExtruderMountFilters] = useState(new Set());
  const [hotendMountFilters, setHotendMountFilters] = useState(new Set());
  const [hotendNozzleFilters, setHotendNozzleFilters] = useState(new Set());
  const [toolheadView, setToolheadView] = useState('carousel'); // 'carousel', 'grid', or 'compact'
  const [toolheadCategoryFilters, setToolheadCategoryFilters] = useState(new Set());
  const [toolheadCutterFilters, setToolheadCutterFilters] = useState(new Set());
  const [showToolheadFilter, setShowToolheadFilter] = useState(false);
  const toolheadFilterRef = useRef(null);

  useEffect(() => {
    if (!showToolheadFilter) return;
    const handler = (e) => {
      if (toolheadFilterRef.current && !toolheadFilterRef.current.contains(e.target)) {
        setShowToolheadFilter(false);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [showToolheadFilter]);

  const toggleFilter = (setter) => (value) => {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  /* Toolheads filtered by component selections AND metadata filters */
  const componentFilteredToolheads = useMemo(() => getViableToolheads({
    extruder: selectedExtruder, hotend: selectedHotend, probe: selectedProbe,
    hotendFan: selectedHotendFan, partCoolingFan: selectedPartCoolingFan,
    toolheadName: null,
    categoryFilters: toolheadCategoryFilters,
    cutterFilters: toolheadCutterFilters,
  }), [selectedExtruder, selectedHotend, selectedProbe, selectedHotendFan, selectedPartCoolingFan, toolheadCategoryFilters, toolheadCutterFilters]);

  /* Further filter toolheads by component-level filters (extruder gear/mount, hotend flow/mount/nozzle, probe type) */
  const extruderFilterGroups = useMemo(() => [
    { activeFilters: extruderFilters, filterField: 'gear_type' },
    { activeFilters: extruderMountFilters, filterField: 'mounting_pattern' },
  ], [extruderFilters, extruderMountFilters]);

  const hotendFilterGroups = useMemo(() => [
    { activeFilters: hotendFilters, filterField: 'hotend_type' },
    { activeFilters: hotendMountFilters, filterField: 'mounting_pattern' },
    { activeFilters: hotendNozzleFilters, filterField: 'nozzle_compatibility' },
  ], [hotendFilters, hotendMountFilters, hotendNozzleFilters]);

  const probeFilterGroups = useMemo(() => [
    { activeFilters: probeFilters, filterField: 'type' },
  ], [probeFilters]);

  const filteredToolheads = useMemo(() => {
    const hasExtruderFilter = extruderFilterGroups.some((g) => g.activeFilters.size > 0);
    const hasHotendFilter = hotendFilterGroups.some((g) => g.activeFilters.size > 0);
    const hasProbeFilter = probeFilterGroups.some((g) => g.activeFilters.size > 0);
    if (!hasExtruderFilter && !hasHotendFilter && !hasProbeFilter) return componentFilteredToolheads;

    return componentFilteredToolheads.filter((th) => {
      if (hasExtruderFilter && !toolheadHasFilteredComponent(th.extruders, getExpandedExtruders, extrudersData.extruders, extruderFilterGroups)) return false;
      if (hasHotendFilter && !toolheadHasFilteredComponent(th.hotend, getExpandedHotends, hotendsData.hotends, hotendFilterGroups)) return false;
      if (hasProbeFilter && !toolheadHasFilteredComponent(th.probe, getExpandedProbes, probesData.probes, probeFilterGroups)) return false;
      return true;
    });
  }, [componentFilteredToolheads, extruderFilterGroups, hotendFilterGroups, probeFilterGroups]);

  /* Helper: filter toolheads by component-level filters, optionally skipping one category */
  const applyComponentFilters = useCallback((ths, skipCategory) => {
    const hasExtFilter = skipCategory !== 'extruder' && extruderFilterGroups.some((g) => g.activeFilters.size > 0);
    const hasHotFilter = skipCategory !== 'hotend' && hotendFilterGroups.some((g) => g.activeFilters.size > 0);
    const hasProFilter = skipCategory !== 'probe' && probeFilterGroups.some((g) => g.activeFilters.size > 0);
    if (!hasExtFilter && !hasHotFilter && !hasProFilter) return ths;
    return ths.filter((th) => {
      if (hasExtFilter && !toolheadHasFilteredComponent(th.extruders, getExpandedExtruders, extrudersData.extruders, extruderFilterGroups)) return false;
      if (hasHotFilter && !toolheadHasFilteredComponent(th.hotend, getExpandedHotends, hotendsData.hotends, hotendFilterGroups)) return false;
      if (hasProFilter && !toolheadHasFilteredComponent(th.probe, getExpandedProbes, probesData.probes, probeFilterGroups)) return false;
      return true;
    });
  }, [extruderFilterGroups, hotendFilterGroups, probeFilterGroups]);

  const viableExtruderNames = useMemo(() => {
    let ths = getViableToolheads({
      extruder: null, hotend: selectedHotend, probe: selectedProbe,
      hotendFan: selectedHotendFan, partCoolingFan: selectedPartCoolingFan,
      toolheadName: selectedToolheadName,
      categoryFilters: toolheadCategoryFilters,
      cutterFilters: toolheadCutterFilters,
    });
    ths = applyComponentFilters(ths, 'extruder');
    return getViableNames(ths, (t) => t.extruders, getExpandedExtruders);
  }, [selectedHotend, selectedProbe, selectedHotendFan, selectedPartCoolingFan, selectedToolheadName, toolheadCategoryFilters, toolheadCutterFilters, applyComponentFilters]);

  const viableHotendNames = useMemo(() => {
    let ths = getViableToolheads({
      extruder: selectedExtruder, hotend: null, probe: selectedProbe,
      hotendFan: selectedHotendFan, partCoolingFan: selectedPartCoolingFan,
      toolheadName: selectedToolheadName,
      categoryFilters: toolheadCategoryFilters,
      cutterFilters: toolheadCutterFilters,
    });
    ths = applyComponentFilters(ths, 'hotend');
    return getViableNames(ths, (t) => t.hotend, getExpandedHotends);
  }, [selectedExtruder, selectedProbe, selectedHotendFan, selectedPartCoolingFan, selectedToolheadName, toolheadCategoryFilters, toolheadCutterFilters, applyComponentFilters]);

  const viableProbeNames = useMemo(() => {
    let ths = getViableToolheads({
      extruder: selectedExtruder, hotend: selectedHotend, probe: null,
      hotendFan: selectedHotendFan, partCoolingFan: selectedPartCoolingFan,
      toolheadName: selectedToolheadName,
      categoryFilters: toolheadCategoryFilters,
      cutterFilters: toolheadCutterFilters,
    });
    ths = applyComponentFilters(ths, 'probe');
    return getViableNames(ths, (t) => t.probe, getExpandedProbes);
  }, [selectedExtruder, selectedHotend, selectedHotendFan, selectedPartCoolingFan, selectedToolheadName, toolheadCategoryFilters, toolheadCutterFilters, applyComponentFilters]);

  const viableHotendFanValues = useMemo(() => {
    let ths = getViableToolheads({
      extruder: selectedExtruder, hotend: selectedHotend, probe: selectedProbe,
      hotendFan: null, partCoolingFan: selectedPartCoolingFan,
      toolheadName: selectedToolheadName,
      categoryFilters: toolheadCategoryFilters,
      cutterFilters: toolheadCutterFilters,
    });
    ths = applyComponentFilters(ths, null);
    return getViableFanValues(ths, 'hotend_fan');
  }, [selectedExtruder, selectedHotend, selectedProbe, selectedPartCoolingFan, selectedToolheadName, toolheadCategoryFilters, toolheadCutterFilters, applyComponentFilters]);

  const viablePartCoolingFanValues = useMemo(() => {
    let ths = getViableToolheads({
      extruder: selectedExtruder, hotend: selectedHotend, probe: selectedProbe,
      hotendFan: selectedHotendFan, partCoolingFan: null,
      toolheadName: selectedToolheadName,
      categoryFilters: toolheadCategoryFilters,
      cutterFilters: toolheadCutterFilters,
    });
    ths = applyComponentFilters(ths, null);
    return getViableFanValues(ths, 'part_cooling_fan');
  }, [selectedExtruder, selectedHotend, selectedProbe, selectedHotendFan, selectedToolheadName, toolheadCategoryFilters, toolheadCutterFilters, applyComponentFilters]);

  const total = filteredToolheads.length;

  useEffect(() => {
    setActiveIndex(0);
  }, [selectedExtruder, selectedHotend, selectedProbe, selectedHotendFan, selectedPartCoolingFan, toolheadCategoryFilters, toolheadCutterFilters, extruderFilters, extruderMountFilters, hotendFilters, hotendMountFilters, hotendNozzleFilters, probeFilters]);

  useEffect(() => {
    if (!selectedToolheadName) return;
    const stillAvailable = filteredToolheads.some((th) => th.name === selectedToolheadName);
    if (!stillAvailable) setSelectedToolheadName(null);
  }, [filteredToolheads, selectedToolheadName]);

  const safeIndex = total > 0 ? Math.min(activeIndex, total - 1) : 0;
  const goLeft = () => setActiveIndex((prev) => (prev - 1 + total) % total);
  const goRight = () => setActiveIndex((prev) => (prev + 1) % total);

  const { dragOffset, isDragging, handlers: dragHandlers } = useDragCarousel(total, safeIndex, setActiveIndex, CAROUSEL_ITEM_WIDTH);

  const leftIndex = total > 1 ? (safeIndex - 1 + total) % total : null;
  const rightIndex = total > 1 ? (safeIndex + 1) % total : null;

  const handleCardClick = (index) => {
    if (isDragging) return; // Don't select during drag
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

  /* Dynamic toolhead filter options based on component-filtered toolheads */
  /* Need base toolheads without metadata filters but WITH component-level filters for computing dynamic options */
  const baseToolheadsForFilterOptions = useMemo(() => {
    const base = getViableToolheads({
      extruder: selectedExtruder, hotend: selectedHotend, probe: selectedProbe,
      hotendFan: selectedHotendFan, partCoolingFan: selectedPartCoolingFan,
      toolheadName: null,
    });
    return applyComponentFilters(base, null);
  }, [selectedExtruder, selectedHotend, selectedProbe, selectedHotendFan, selectedPartCoolingFan, applyComponentFilters]);

  const toolheadCategoryOptions = useMemo(() => {
    const cats = new Set();
    // Show category options from base toolheads that pass cutter filter
    let candidates = baseToolheadsForFilterOptions;
    if (toolheadCutterFilters.size > 0) {
      candidates = candidates.filter((th) => th.filament_cutter && toolheadCutterFilters.has(th.filament_cutter));
    }
    for (const th of candidates) {
      if (th.category && !EXCLUDED_FILTER_VALUES.has(th.category.toLowerCase())) cats.add(th.category);
    }
    for (const v of toolheadCategoryFilters) cats.add(v);
    return [...cats].sort();
  }, [baseToolheadsForFilterOptions, toolheadCategoryFilters, toolheadCutterFilters]);

  const toolheadCutterOptions = useMemo(() => {
    const cutters = new Set();
    let candidates = baseToolheadsForFilterOptions;
    if (toolheadCategoryFilters.size > 0) {
      candidates = candidates.filter((th) => th.category && toolheadCategoryFilters.has(th.category));
    }
    for (const th of candidates) {
      if (th.filament_cutter && !EXCLUDED_FILTER_VALUES.has(th.filament_cutter.toLowerCase())) cutters.add(th.filament_cutter);
    }
    for (const v of toolheadCutterFilters) cutters.add(v);
    return [...cutters].sort();
  }, [baseToolheadsForFilterOptions, toolheadCategoryFilters, toolheadCutterFilters]);

  const hasActiveToolheadFilter = toolheadCategoryFilters.size > 0 || toolheadCutterFilters.size > 0;

  return (
    <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto' }}>

      {/* ===== Toolheads section (moved to top) ===== */}
      <div
        style={{
          padding: '16px',
          borderRadius: '12px',
          border: '1px solid var(--sl-color-gray-5)',
          backgroundColor: 'var(--sl-color-bg-sidebar)',
          marginBottom: '24px',
        }}
      >
      {/* Toolheads header: label + filter + view toggle with colored line */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '6px',
          borderBottom: '2px solid #2E8B57',
          paddingBottom: '4px',
          position: 'relative',
        }}
      >
        <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--sl-color-white)', margin: 0 }}>
            Toolheads
            {total > 0 && (
              <span style={{ marginLeft: '6px', fontSize: '0.75rem', fontWeight: 400, color: 'var(--sl-color-gray-3)' }}>
                ({total})
              </span>
            )}
          </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
          <button
            onClick={() => setToolheadView('carousel')}
            style={{
              padding: '4px 6px',
              borderRadius: '4px 0 0 4px',
              border: '1px solid var(--sl-color-gray-5)',
              borderRight: 'none',
              backgroundColor: toolheadView === 'carousel' ? 'rgba(46,139,87,0.13)' : 'transparent',
              color: toolheadView === 'carousel' ? '#2E8B57' : 'var(--sl-color-gray-4)',
              cursor: 'pointer',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
            }}
            title="Carousel view"
          >
            <CarouselIcon />
          </button>
          <button
            onClick={() => setToolheadView('grid')}
            style={{
              padding: '4px 6px',
              borderRadius: '0',
              border: '1px solid var(--sl-color-gray-5)',
              borderRight: 'none',
              backgroundColor: toolheadView === 'grid' ? 'rgba(46,139,87,0.13)' : 'transparent',
              color: toolheadView === 'grid' ? '#2E8B57' : 'var(--sl-color-gray-4)',
              cursor: 'pointer',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
            }}
            title="Grid view"
          >
            <GridIcon />
          </button>
          <button
            onClick={() => setToolheadView('compact')}
            style={{
              padding: '4px 6px',
              borderRadius: '0 4px 4px 0',
              border: '1px solid var(--sl-color-gray-5)',
              backgroundColor: toolheadView === 'compact' ? 'rgba(46,139,87,0.13)' : 'transparent',
              color: toolheadView === 'compact' ? '#2E8B57' : 'var(--sl-color-gray-4)',
              cursor: 'pointer',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
            }}
            title="Compact view"
          >
            <DenseGridIcon />
          </button>
          </div>
          {(toolheadCategoryOptions.length > 0 || toolheadCutterOptions.length > 0) && (
            <div ref={toolheadFilterRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setShowToolheadFilter((prev) => !prev)}
                style={{
                  fontSize: '0.7rem',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  border: hasActiveToolheadFilter ? '1px solid #2E8B57' : '1px solid var(--sl-color-gray-5)',
                  backgroundColor: hasActiveToolheadFilter ? 'rgba(46,139,87,0.13)' : 'transparent',
                  color: hasActiveToolheadFilter ? '#2E8B57' : 'var(--sl-color-gray-4)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  margin: 0,
                  lineHeight: 1.4,
                }}
                title="Filter toolheads"
              >
                {hasActiveToolheadFilter ? '▾ Filter ✓' : '▾ Filter'}
              </button>
              {showToolheadFilter && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    zIndex: 50,
                    marginTop: '4px',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid #2E8B57',
                    backgroundColor: 'var(--sl-color-bg-sidebar)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    minWidth: '180px',
                    maxWidth: '400px',
                  }}
                >
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {toolheadCategoryOptions.length > 0 && (
                    <div style={{ minWidth: '80px', flex: '1 1 auto' }}>
                      <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--sl-color-gray-4)', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Category
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px' }}>
                        {toolheadCategoryOptions.map((opt) => {
                          const isActive = toolheadCategoryFilters.has(opt);
                          return (
                            <button
                              key={opt}
                              onClick={() => toggleFilter(setToolheadCategoryFilters)(opt)}
                              style={{
                                padding: '2px 6px',
                                borderRadius: '4px',
                                border: isActive ? '1px solid #2E8B57' : '1px solid var(--sl-color-gray-5)',
                                backgroundColor: isActive ? 'rgba(46,139,87,0.13)' : 'transparent',
                                color: isActive ? '#2E8B57' : 'var(--sl-color-gray-3)',
                                fontSize: '0.65rem',
                                fontWeight: isActive ? 700 : 500,
                                cursor: 'pointer',
                                margin: 0,
                              }}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {toolheadCutterOptions.length > 0 && (
                    <div style={{ minWidth: '80px', flex: '1 1 auto' }}>
                      <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--sl-color-gray-4)', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Filament Cutter
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px' }}>
                        {toolheadCutterOptions.map((opt) => {
                          const isActive = toolheadCutterFilters.has(opt);
                          return (
                            <button
                              key={opt}
                              onClick={() => toggleFilter(setToolheadCutterFilters)(opt)}
                              style={{
                                padding: '2px 6px',
                                borderRadius: '4px',
                                border: isActive ? '1px solid #2E8B57' : '1px solid var(--sl-color-gray-5)',
                                backgroundColor: isActive ? 'rgba(46,139,87,0.13)' : 'transparent',
                                color: isActive ? '#2E8B57' : 'var(--sl-color-gray-3)',
                                fontSize: '0.65rem',
                                fontWeight: isActive ? 700 : 500,
                                cursor: 'pointer',
                                margin: 0,
                              }}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {total === 0 ? (
        <NoCompatibleCard />
      ) : (
        <>
          {toolheadView === 'carousel' ? (
            <>
              {/* Toolhead carousel */}
              <div
                {...dragHandlers}
                style={{
                  position: 'relative',
                  height: '480px',
                  marginBottom: '32px',
                  overflow: 'hidden',
                  padding: '0 40px',
                  touchAction: 'pan-y',
                  cursor: isDragging ? 'grabbing' : 'grab',
                  userSelect: 'none',
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
                      dragOffset={dragOffset}
                      isDragging={isDragging}
                    />
                  );
                })}
              </div>

              {/* Dot indicators */}
              {total > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '32px', flexWrap: 'wrap' }}>
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
          ) : toolheadView === 'grid' ? (
            /* Grid view with images */
            <div style={{ marginBottom: '24px' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                gap: '6px',
              }}>
                {filteredToolheads.map((toolhead) => (
                  <ToolheadGridTile
                    key={toolhead.name}
                    toolhead={toolhead}
                    isSelected={selectedToolheadName === toolhead.name}
                    onClick={() => handleToolheadSelect(toolhead.name)}
                  />
                ))}
              </div>
              {selectedToolheadEntry && (
                <ToolheadDetailCard toolhead={selectedToolheadEntry} />
              )}
            </div>
          ) : (
            /* Compact name-only view */
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                {filteredToolheads.map((toolhead) => (
                  <ToolheadCompactTile
                    key={toolhead.name}
                    name={toolhead.title || toolhead.name}
                    isSelected={selectedToolheadName === toolhead.name}
                    onClick={() => handleToolheadSelect(toolhead.name)}
                  />
                ))}
              </div>
              {selectedToolheadEntry && (
                <ToolheadDetailCard toolhead={selectedToolheadEntry} />
              )}
            </div>
          )}
        </>
      )}
      </div>

      {/* ===== Component selection section ===== */}
      <div
        style={{
          padding: '16px',
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
          }}
        >
          Select Your Components
        </h2>
        <div>
          <ComponentRow
            title="Extruder"
            items={allAvailableExtruders}
            viableNames={viableExtruderNames}
            selected={selectedExtruder}
            onSelect={setSelectedExtruder}
            accentColor="blue"
            type="extruder"
            detailCatalog={extrudersData.extruders}
            filterGroups={[
              { label: 'Gear Type', activeFilters: extruderFilters, onToggle: toggleFilter(setExtruderFilters), filterField: 'gear_type' },
              { label: 'Mount', activeFilters: extruderMountFilters, onToggle: toggleFilter(setExtruderMountFilters), filterField: 'mounting_pattern' },
            ]}
          />
          <ComponentRow
            title="Hotend"
            items={allAvailableHotends}
            viableNames={viableHotendNames}
            selected={selectedHotend}
            onSelect={setSelectedHotend}
            accentColor="green"
            type="hotend"
            detailCatalog={hotendsData.hotends}
            filterGroups={[
              { label: 'Flow Type', activeFilters: hotendFilters, onToggle: toggleFilter(setHotendFilters), filterField: 'hotend_type' },
              { label: 'Mount', activeFilters: hotendMountFilters, onToggle: toggleFilter(setHotendMountFilters), filterField: 'mounting_pattern' },
              { label: 'Nozzle', activeFilters: hotendNozzleFilters, onToggle: toggleFilter(setHotendNozzleFilters), filterField: 'nozzle_compatibility' },
            ]}
          />
          <ComponentRow
            title="Probe"
            items={allAvailableProbes}
            viableNames={viableProbeNames}
            selected={selectedProbe}
            onSelect={setSelectedProbe}
            accentColor="purple"
            type="probe"
            detailCatalog={probesData.probes}
            filterGroups={[
              { label: 'Probe Type', activeFilters: probeFilters, onToggle: toggleFilter(setProbeFilters), filterField: 'type' },
            ]}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <FanRow
              title="Hotend Fan"
              options={HOTEND_FAN_OPTIONS}
              viableValues={viableHotendFanValues}
              selected={selectedHotendFan}
              onSelect={setSelectedHotendFan}
              accentColor="orange"
            />
            <FanRow
              title="Part Cooling"
              options={PART_COOLING_FAN_OPTIONS}
              viableValues={viablePartCoolingFanValues}
              selected={selectedPartCoolingFan}
              onSelect={setSelectedPartCoolingFan}
              accentColor="teal"
            />
          </div>
        </div>
      </div>

      {/* ===== Hardware summary table ===== */}
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
    </div>
  );
}
