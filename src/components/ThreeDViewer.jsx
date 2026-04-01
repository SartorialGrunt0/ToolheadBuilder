import { Suspense, useState, useEffect, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';
import occtWasmUrl from 'occt-import-js/dist/occt-import-js.wasm?url';

/* ── Traverse assembly tree and collect all meshes ────────────────────── */
function collectMeshIndices(node, out) {
  if (!node) return;
  const meshRefs = Array.isArray(node.meshes) ? node.meshes : [];
  for (const meshIndex of meshRefs) {
    if (typeof meshIndex === 'number') out.add(meshIndex);
  }
  const children = Array.isArray(node.children) ? node.children : [];
  for (const child of children) collectMeshIndices(child, out);
}

function buildMeshItemsFromResult(result) {
  const meshItems = [];
  const allMeshes = Array.isArray(result?.meshes) ? result.meshes : [];

  const referenced = new Set();
  collectMeshIndices(result?.root, referenced);
  const meshIndexes = referenced.size > 0
    ? [...referenced]
    : allMeshes.map((_, idx) => idx);

  for (const meshIndex of meshIndexes) {
    const mesh = allMeshes[meshIndex];
    const posArray = mesh?.attributes?.position?.array;
    const idxArray = mesh?.index?.array;
    if (!Array.isArray(posArray) || !Array.isArray(idxArray) || posArray.length === 0 || idxArray.length === 0) {
      continue;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(posArray), 3));

    const normalArray = mesh?.attributes?.normal?.array;
    if (Array.isArray(normalArray) && normalArray.length === posArray.length) {
      geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(normalArray), 3));
    } else {
      geo.computeVertexNormals();
    }

    geo.setIndex(new THREE.BufferAttribute(new Uint32Array(idxArray), 1));

    const c = Array.isArray(mesh?.color) ? mesh.color : null;
    const color = (c && c.length >= 3)
      ? new THREE.Color(c[0], c[1], c[2])
      : new THREE.Color(0.55, 0.6, 0.65);

    meshItems.push({ geo, color });
  }

  return meshItems;
}

function toVector3(val, fallback) {
  if (!Array.isArray(val) || val.length !== 3) return fallback.clone();
  return new THREE.Vector3(Number(val[0]) || 0, Number(val[1]) || 0, Number(val[2]) || 0);
}

function toEulerDeg(val, fallback) {
  if (!Array.isArray(val) || val.length !== 3) return fallback.clone();
  return new THREE.Euler(
    THREE.MathUtils.degToRad(Number(val[0]) || 0),
    THREE.MathUtils.degToRad(Number(val[1]) || 0),
    THREE.MathUtils.degToRad(Number(val[2]) || 0),
    'XYZ'
  );
}

function applyTransform(meshItems, transform) {
  const position = toVector3(transform?.position, new THREE.Vector3(0, 0, 0));
  const rotation = toEulerDeg(transform?.rotationDeg, new THREE.Euler(0, 0, 0));
  const scale = toVector3(transform?.scale, new THREE.Vector3(1, 1, 1));
  const quat = new THREE.Quaternion().setFromEuler(rotation);
  const matrix = new THREE.Matrix4().compose(position, quat, scale);

  for (const item of meshItems) {
    item.geo.applyMatrix4(matrix);
    item.geo.computeBoundingBox();
    item.geo.computeBoundingSphere();
  }
}

async function parseStepAtUrl(occt, url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status} fetching ${url}`);
  const buffer = new Uint8Array(await response.arrayBuffer());
  const result = occt.ReadStepFile(buffer, null);
  if (!result || !result.success) throw new Error(`STEP parse failed for ${url}`);
  const meshItems = buildMeshItemsFromResult(result);
  if (!meshItems.length) throw new Error(`No meshes found in ${url}`);
  return meshItems;
}

/* ── Camera fit helper ─────────────────────────────────────────────────── */
function FitToModel({ meshItems }) {
  const { camera, controls } = useThree();

  useEffect(() => {
    if (!meshItems.length) return;
    const box = new THREE.Box3();
    meshItems.forEach(({ geo }) => {
      geo.computeBoundingBox();
      if (geo.boundingBox) box.union(geo.boundingBox);
    });
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    const dist = Math.abs(maxDim / Math.sin(fov / 2)) * 0.8;
    camera.position.set(center.x + dist * 0.6, center.y + dist * 0.5, center.z + dist * 0.8);
    camera.near = dist / 100;
    camera.far = dist * 10;
    camera.updateProjectionMatrix();
    if (controls) {
      controls.target.copy(center);
      controls.update();
    }
  }, [meshItems, camera, controls]);

  return null;
}

/* ── The actual 3-D scene content ─────────────────────────────────────── */
function StepScene({ meshItems }) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 8, 5]} intensity={1.2} castShadow />
      <directionalLight position={[-5, -3, -5]} intensity={0.4} />
      <Environment preset="city" background={false} />
      <group>
        {meshItems.map(({ geo, color }, i) => (
          <mesh key={i} geometry={geo} castShadow receiveShadow>
            <meshStandardMaterial color={color} metalness={0.25} roughness={0.55} />
          </mesh>
        ))}
      </group>
      <FitToModel meshItems={meshItems} />
    </>
  );
}

/* ── Main viewer modal ─────────────────────────────────────────────────── */
export default function ThreeDViewer({
  cadUrl,
  assemblyManifestUrl,
  selectedExtruder,
  selectedHotend,
  selectedProbe,
  toolheadName,
  onClose,
}) {
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [meshItems, setMeshItems] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const canvasRef = useRef(null);

  /* keyboard ESC closes */
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  /* lock body scroll while modal open */
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  /* load STEP via occt-import-js (WASM) */
  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setMeshItems([]);

    async function load() {
      try {
        const { default: initOcctImport } = await import('occt-import-js');
        const occt = await initOcctImport({
          // Force the wasm URL so it works from nested routes like /toolhead-builder/.
          locateFile: (path) => (path.endsWith('.wasm') ? occtWasmUrl : path),
        });

        let allItems = [];
        let baseUrl = cadUrl;
        let manifest = null;

        if (assemblyManifestUrl) {
          try {
            const manifestRes = await fetch(assemblyManifestUrl);
            if (manifestRes.ok) {
              manifest = await manifestRes.json();
              if (manifest?.base?.cadUrl) baseUrl = manifest.base.cadUrl;
            }
          } catch {
            // Keep fallback behavior if manifest can't be loaded.
          }
        }

        const baseItems = await parseStepAtUrl(occt, baseUrl);
        if (manifest?.base?.transform) applyTransform(baseItems, manifest.base.transform);
        allItems.push(...baseItems);

        if (manifest?.components?.extruder && selectedExtruder) {
          const extruderSpec = manifest.components.extruder[selectedExtruder];
          if (extruderSpec?.cadUrl) {
            const extruderItems = await parseStepAtUrl(occt, extruderSpec.cadUrl);
            applyTransform(extruderItems, extruderSpec.transform);
            allItems.push(...extruderItems);
          }
        }

        if (manifest?.components?.hotend && selectedHotend) {
          const hotendSpec = manifest.components.hotend[selectedHotend];
          if (hotendSpec?.cadUrl) {
            const hotendItems = await parseStepAtUrl(occt, hotendSpec.cadUrl);
            applyTransform(hotendItems, hotendSpec.transform);
            allItems.push(...hotendItems);
          }
        }

        if (manifest?.components?.probe && selectedProbe) {
          const probeSpec = manifest.components.probe[selectedProbe];
          if (probeSpec?.cadUrl) {
            const probeItems = await parseStepAtUrl(occt, probeSpec.cadUrl);
            applyTransform(probeItems, probeSpec.transform);
            allItems.push(...probeItems);
          }
        }

        if (!cancelled) {
          setMeshItems(allItems);
          setStatus('ready');
        }
      } catch (err) {
        if (!cancelled) {
          setErrorMsg(err.message || 'Unknown error');
          setStatus('error');
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [cadUrl, assemblyManifestUrl, selectedExtruder, selectedHotend, selectedProbe]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`3D viewer for ${toolheadName}`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        backgroundColor: 'rgba(0,0,0,0.85)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: 'min(92vw, 960px)',
          height: 'min(88vh, 720px)',
          borderRadius: '14px',
          border: '1px solid rgba(46,139,87,0.5)',
          backgroundColor: '#111',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>
            ⬡ {toolheadName} — 3D View
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)' }}>
              Drag to rotate · Scroll to zoom · Right-drag to pan · ESC to close
            </span>
            <button
              onClick={onClose}
              aria-label="Close 3D viewer"
              style={{
                background: 'none',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '6px',
                color: 'rgba(255,255,255,0.6)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                padding: '3px 9px',
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Canvas area */}
        <div style={{ flex: 1, position: 'relative' }}>
          {status === 'loading' && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                color: 'rgba(255,255,255,0.5)',
                fontSize: '0.85rem',
              }}
            >
              <LoadingSpinner />
              Loading 3D model…
              <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>First load may take a moment (WASM)</span>
            </div>
          )}

          {status === 'error' && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                color: '#f87171',
                fontSize: '0.85rem',
                textAlign: 'center',
                padding: '24px',
              }}
            >
              <span style={{ fontSize: '2rem' }}>⚠</span>
              <strong>Failed to load model</strong>
              <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>{errorMsg}</span>
            </div>
          )}

          {status === 'ready' && (
            <Canvas
              ref={canvasRef}
              camera={{ fov: 45, near: 0.1, far: 10000 }}
              shadows
              style={{ width: '100%', height: '100%' }}
              gl={{ antialias: true, alpha: false }}
              onCreated={({ gl }) => { gl.setClearColor('#1a1a1a'); }}
            >
              <Suspense fallback={null}>
                <StepScene meshItems={meshItems} />
              </Suspense>
              <OrbitControls
                makeDefault
                enableDamping
                dampingFactor={0.08}
                minDistance={1}
                maxDistance={100000}
              />
            </Canvas>
          )}
        </div>
      </div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 36 36"
      fill="none"
      style={{ animation: 'spin 1s linear infinite' }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="18" cy="18" r="14" stroke="rgba(255,255,255,0.12)" strokeWidth="3" />
      <path
        d="M18 4a14 14 0 0 1 14 14"
        stroke="#2E8B57"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
