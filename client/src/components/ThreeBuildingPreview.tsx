import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import "./three-building-preview.css";

type GeoJsonGeometry = { type: string; coordinates: unknown };

export type ThreePreviewFeature = {
  ulpin: string;
  geometry: GeoJsonGeometry;
  properties: Record<string, unknown>;
};

function readExteriorRing(geometry: GeoJsonGeometry): Array<[number, number]> | null {
  const source = geometry.type === "Polygon"
    ? geometry.coordinates
    : geometry.type === "MultiPolygon" && Array.isArray(geometry.coordinates) ? geometry.coordinates[0] : null;
  if (!Array.isArray(source) || !Array.isArray(source[0])) return null;
  const ring = geometry.type === "Polygon" ? source[0] : (source[0] as unknown[])[0];
  if (!Array.isArray(ring)) return null;
  const points = ring.flatMap(value => {
    if (Array.isArray(value) && typeof value[0] === "number" && typeof value[1] === "number") return [[value[0], value[1]] as [number, number]];
    return [] as Array<[number, number]>;
  });
  return points.length >= 3 ? points : null;
}

function renderSourceFootprint(canvas: HTMLCanvasElement, feature: ThreePreviewFeature) {
  const ring = readExteriorRing(feature.geometry);
  if (!ring) return () => undefined;
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 20_000);
  const centroid = ring.reduce(([lon, lat], point) => [lon + point[0], lat + point[1]], [0, 0] as [number, number]);
  centroid[0] /= ring.length;
  centroid[1] /= ring.length;
  const latitudeScale = Math.cos((centroid[1] * Math.PI) / 180);
  const points = ring.map(([lon, lat]) => new THREE.Vector2((lon - centroid[0]) * 111_320 * latitudeScale, (lat - centroid[1]) * 110_540));
  const shape = new THREE.Shape(points);
  const approvedHeight = typeof feature.properties.approvedHeightMetres === "number" && Number.isFinite(feature.properties.approvedHeightMetres) ? feature.properties.approvedHeightMetres : 0;
  const presentationHeight = approvedHeight > 0 ? approvedHeight : 1;
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: presentationHeight, bevelEnabled: false });
  geometry.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: approvedHeight > 0 ? "#55dcb4" : "#2ad4d9", transparent: true, opacity: approvedHeight > 0 ? 0.7 : 0.46, roughness: 0.32, metalness: 0.28 }));
  scene.add(mesh);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), new THREE.LineBasicMaterial({ color: "#e4ffff", transparent: true, opacity: 0.88 }));
  scene.add(edges);

  const bounds = new THREE.Box3().setFromObject(mesh);
  const size = new THREE.Vector3();
  bounds.getSize(size);
  const span = Math.max(size.x, size.z, 12);
  const grid = new THREE.GridHelper(span * 2.4, 10, "#27616a", "#163b42");
  grid.position.y = -0.04;
  scene.add(grid);
  scene.add(new THREE.AmbientLight("#9de9eb", 1.6));
  const keyLight = new THREE.DirectionalLight("#cffffb", 2.2);
  keyLight.position.set(span, span * 1.4, span);
  scene.add(keyLight);
  const accentLight = new THREE.PointLight("#2ad4d9", 8, span * 4);
  accentLight.position.set(-span, span * 0.9, -span);
  scene.add(accentLight);
  camera.position.set(span * 1.55, Math.max(span * 1.25, presentationHeight * 2 + 9), span * 1.55);
  camera.lookAt(0, approvedHeight > 0 ? presentationHeight / 2 : 0, 0);

  const fit = () => {
    const width = Math.max(canvas.clientWidth, 1);
    const height = Math.max(canvas.clientHeight, 1);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  };
  fit();
  const resizeObserver = new ResizeObserver(fit);
  resizeObserver.observe(canvas);
  let dragging = false;
  let lastX = 0;
  const onDown = (event: PointerEvent) => { dragging = true; lastX = event.clientX; canvas.setPointerCapture(event.pointerId); };
  const onMove = (event: PointerEvent) => { if (!dragging) return; const delta = event.clientX - lastX; lastX = event.clientX; mesh.rotation.y += delta * 0.012; edges.rotation.y = mesh.rotation.y; renderer.render(scene, camera); };
  const onUp = (event: PointerEvent) => { dragging = false; canvas.releasePointerCapture?.(event.pointerId); };
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  return () => {
    resizeObserver.disconnect();
    canvas.removeEventListener("pointerdown", onDown);
    canvas.removeEventListener("pointermove", onMove);
    canvas.removeEventListener("pointerup", onUp);
    geometry.dispose();
    (mesh.material as THREE.Material).dispose();
    (edges.material as THREE.Material).dispose();
    renderer.dispose();
  };
}

export function ThreeBuildingPreview({ feature }: { feature: ThreePreviewFeature | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const evidence = useMemo(() => feature && typeof feature.properties.approvedHeightMetres === "number" ? `Approved height ${feature.properties.approvedHeightMetres} m` : "Footprint plate only · height awaiting authority approval", [feature]);
  useEffect(() => {
    if (!canvasRef.current || !feature) return;
    return renderSourceFootprint(canvasRef.current, feature);
  }, [feature]);

  if (!feature) return <div className="three-building-empty"><strong>No verified 3D building model</strong><span>Search a mapped place or select a live source footprint. AI routing cannot create missing geometry.</span></div>;
  return <div className="three-building-preview"><canvas ref={canvasRef} aria-label={`Interactive 3D source footprint for ${feature.ulpin}`} /><div className="three-building-overlay"><span>THREE.JS · LIVE FOOTPRINT</span><strong>{feature.ulpin}</strong><small>{evidence}</small></div><div className="three-building-drag-hint">Drag to rotate</div></div>;
}
