import React, { useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";
import {
  type BuildingFloorStackRecord,
  type FloorStackLevel,
  type FloorUnitCadastre,
  type UnitType,
} from "@shared/floorCadastre";
import {
  Building2,
  Maximize2,
  RotateCcw,
  Eye,
  Layers,
  AlertTriangle,
  Compass,
  FileText,
  Sliders,
  Sparkles,
} from "lucide-react";

type ThreeFloorStackViewerProps = {
  building: BuildingFloorStackRecord;
  selectedFloorIndex: number | null; // null = show all
  selectedUnitId: string | null;
  explosionFactor: number; // 0 to 1
  clashMode: boolean; // municipal height violation overlay
  blueprintMode: boolean; // 2D CAD blueprint drape
  onSelectFloor: (floor: FloorStackLevel | null) => void;
  onSelectUnit: (unit: FloorUnitCadastre | null, floor: FloorStackLevel | null) => void;
  onExplosionChange?: (factor: number) => void;
};

// Unit color mapping
const UNIT_TYPE_COLORS: Record<UnitType, { hex: number; css: string; label: string }> = {
  RESIDENTIAL: { hex: 0x10b981, css: "#10b981", label: "Residential Unit" },
  COMMERCIAL: { hex: 0x3b82f6, css: "#3b82f6", label: "Commercial Office" },
  PARKING: { hex: 0xf59e0b, css: "#f59e0b", label: "Parking Easement" },
  UTILITY_CORE: { hex: 0xa855f7, css: "#a855f7", label: "Utility Core / Shaft" },
  AIR_RIGHTS: { hex: 0xec4899, css: "#ec4899", label: "Air-Rights Zone" },
  BASEMENT_STORAGE: { hex: 0x64748b, css: "#64748b", label: "Sub-Surface Storage" },
};

/**
 * Creates a procedural high-contrast 2D architectural blueprint texture
 */
function createBlueprintTexture(floorName: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Blueprint dark cyan background
  ctx.fillStyle = "#0c2438";
  ctx.fillRect(0, 0, 1024, 1024);

  // Grid lines
  ctx.strokeStyle = "#164e63";
  ctx.lineWidth = 1;
  const gridSize = 32;
  for (let x = 0; x <= 1024; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 1024);
    ctx.stroke();
  }
  for (let y = 0; y <= 1024; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y);
    ctx.stroke();
  }

  // Major architectural grid
  ctx.strokeStyle = "#0284c7";
  ctx.lineWidth = 2;
  for (let x = 0; x <= 1024; x += 128) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 1024);
    ctx.stroke();
  }
  for (let y = 0; y <= 1024; y += 128) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y);
    ctx.stroke();
  }

  // Room Wall Outlines (White/Cyan)
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 6;

  // Outer perimeter walls
  ctx.strokeRect(40, 40, 944, 944);

  // Internal division walls (Unit 1 & Unit 2 & Corridor)
  // Central corridor
  ctx.strokeRect(40, 460, 944, 100);

  // Left Unit Rooms (Living, Master Bed, Kitchen, Bath)
  ctx.strokeRect(40, 40, 460, 420); // Unit Left
  ctx.strokeRect(40, 40, 240, 260); // Master Bedroom
  ctx.strokeRect(280, 40, 220, 200); // Living Lounge
  ctx.strokeRect(280, 240, 220, 220); // Kitchen & Dining
  ctx.strokeRect(40, 300, 140, 160); // Bathroom 1

  // Right Unit Rooms
  ctx.strokeRect(524, 40, 460, 420); // Unit Right
  ctx.strokeRect(524, 40, 240, 260); // Living Room
  ctx.strokeRect(764, 40, 220, 260); // Master Bed 2
  ctx.strokeRect(764, 300, 220, 160); // Kitchen 2

  // Lower Units / Amenities
  ctx.strokeRect(40, 560, 460, 424);
  ctx.strokeRect(524, 560, 460, 424);

  // Room Labels & Dimensions
  ctx.fillStyle = "#e0f2fe";
  ctx.font = "bold 22px monospace";
  ctx.fillText("MASTER BEDROOM (14' x 16')", 60, 150);
  ctx.fillText("LIVING & DINING (18' x 24')", 300, 150);
  ctx.fillText("KITCHEN (10' x 12')", 300, 340);
  ctx.fillText("BATHROOM (6' x 8')", 60, 380);

  ctx.fillText("UNIT 402 · LIVING ROOM", 540, 150);
  ctx.fillText("BEDROOM 2 (13' x 15')", 780, 150);
  ctx.fillText("BALCONY DECK", 560, 520);

  // Central Corridor label
  ctx.fillStyle = "#38bdf8";
  ctx.font = "bold 26px monospace";
  ctx.fillText("COMMON LIFT LOBBY & ESCAPE CORRIDOR", 220, 520);

  // Architectural stamp & floor code
  ctx.fillStyle = "#facc15";
  ctx.font = "bold 20px sans-serif";
  ctx.fillText(`CADASTRAL BLUEPRINT · ${floorName.toUpperCase()}`, 60, 1000);
  ctx.fillText("APPROVED MUNICIPAL CAD PLAN v2.4", 580, 1000);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export function ThreeFloorStackViewer({
  building,
  selectedFloorIndex,
  selectedUnitId,
  explosionFactor,
  clashMode,
  blueprintMode,
  onSelectFloor,
  onSelectUnit,
  onExplosionChange,
}: ThreeFloorStackViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hoveredUnit, setHoveredUnit] = useState<FloorUnitCadastre | null>(null);
  const [hoveredFloor, setHoveredFloor] = useState<FloorStackLevel | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [isAutoRotate, setIsAutoRotate] = useState(false);
  const [cameraPreset, setCameraPreset] = useState<"perspective" | "front" | "top">("perspective");

  // Three.js scene refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const floorGroupsRef = useRef<Map<number, THREE.Group>>(new Map());
  const unitMeshesRef = useRef<Map<string, { mesh: THREE.Mesh; unit: FloorUnitCadastre; floor: FloorStackLevel }>>(new Map());
  const clashWireframeRef = useRef<THREE.Group | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const prevMouseRef = useRef({ x: 0, y: 0 });
  const cameraAngleRef = useRef({ theta: 0.8, phi: 0.9, radius: 42 });

  // Building floor dimensions
  const slabWidth = 24;
  const slabDepth = 20;
  const slabThickness = 0.5;
  const verticalSpacing = 4.8; // explosion spacing multiplier

  // Active blueprint textures cache
  const blueprintTextures = useMemo(() => {
    const map = new Map<string, THREE.CanvasTexture>();
    building.floors.forEach(floor => {
      map.set(floor.floorCode, createBlueprintTexture(floor.floorName));
    });
    return map;
  }, [building]);

  // Setup Three.js Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene & Environment
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060913); // Deep Cadastre Midnight
    scene.fog = new THREE.FogExp2(0x060913, 0.012);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    cameraRef.current = camera;
    updateCameraPosition();

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // 4. Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xe0f2fe, 1.4);
    dirLight1.position.set(30, 50, 40);
    dirLight1.castShadow = true;
    dirLight1.shadow.mapSize.width = 2048;
    dirLight1.shadow.mapSize.height = 2048;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 0.6);
    dirLight2.position.set(-30, 20, -30);
    scene.add(dirLight2);

    const pointLight = new THREE.PointLight(0x0284c7, 1.2, 80);
    pointLight.position.set(0, 15, 0);
    scene.add(pointLight);

    // 5. Ground Datum & Spatial Grid Plane at Z = 0
    const groundGrid = new THREE.GridHelper(60, 30, 0x0284c7, 0x1e293b);
    groundGrid.position.y = 0;
    scene.add(groundGrid);

    // Compass Direction Ring
    const compassGeom = new THREE.RingGeometry(24, 24.4, 32);
    const compassMat = new THREE.MeshBasicMaterial({ color: 0x0284c7, side: THREE.DoubleSide, transparent: true, opacity: 0.3 });
    const compassMesh = new THREE.Mesh(compassGeom, compassMat);
    compassMesh.rotation.x = Math.PI / 2;
    compassMesh.position.y = 0.05;
    scene.add(compassMesh);

    // Subterranean Excavation Box Outline for Basements (Z < 0)
    const basementBoxGeom = new THREE.BoxGeometry(slabWidth + 4, 7, slabDepth + 4);
    const basementEdges = new THREE.EdgesGeometry(basementBoxGeom);
    const basementLineMat = new THREE.LineBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.25 });
    const basementLine = new THREE.LineSegments(basementEdges, basementLineMat);
    basementLine.position.y = -3.5;
    scene.add(basementLine);

    // Underground Metro Easement Tube below Basement B2
    if (building.subsurfaceMetroEasement) {
      const tubeGeom = new THREE.CylinderGeometry(2.4, 2.4, 48, 24);
      const tubeMat = new THREE.MeshStandardMaterial({
        color: 0x0891b2,
        roughness: 0.4,
        metalness: 0.8,
        transparent: true,
        opacity: 0.35,
        wireframe: false,
      });
      const metroTube = new THREE.Mesh(tubeGeom, tubeMat);
      metroTube.rotation.z = Math.PI / 2;
      metroTube.position.set(0, -9.5, 0);
      scene.add(metroTube);

      const tubeWireframe = new THREE.LineSegments(
        new THREE.EdgesGeometry(tubeGeom),
        new THREE.LineBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.6 })
      );
      tubeWireframe.rotation.z = Math.PI / 2;
      tubeWireframe.position.set(0, -9.5, 0);
      scene.add(tubeWireframe);
    }

    // 6. Build Floor Stacks & Units
    buildFloorStackMeshes(scene);

    // 7. Render Loop
    const render = () => {
      if (isAutoRotate) {
        cameraAngleRef.current.theta += 0.003;
        updateCameraPosition();
      }

      // Pulsing effect for unauthorized clash floors
      if (clashMode) {
        const time = Date.now() * 0.003;
        const pulse = Math.sin(time) * 0.4 + 0.6;
        unitMeshesRef.current.forEach(({ mesh, floor }) => {
          if (floor.isUnauthorizedFloor) {
            const mat = mesh.material as THREE.MeshStandardMaterial;
            if (mat && mat.emissive) {
              mat.emissive.setHex(0xef4444);
              mat.emissiveIntensity = pulse * 0.8;
            }
          }
        });
      }

      renderer.render(scene, camera);
      animFrameIdRef.current = requestAnimationFrame(render);
    };
    render();

    // Resize handler
    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      renderer.dispose();
      container.innerHTML = "";
    };
  }, [building]);

  // Update Camera Orbit Position
  const updateCameraPosition = () => {
    const camera = cameraRef.current;
    if (!camera) return;

    const { theta, phi, radius } = cameraAngleRef.current;
    const x = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi) + 8; // Look slightly above center
    const z = radius * Math.sin(phi) * Math.cos(theta);

    camera.position.set(x, y, z);
    camera.lookAt(0, 6, 0);
  };

  // Build or Rebuild Floor Meshes
  const buildFloorStackMeshes = (scene: THREE.Scene) => {
    // Clear previous
    floorGroupsRef.current.forEach(group => scene.remove(group));
    floorGroupsRef.current.clear();
    unitMeshesRef.current.clear();
    if (clashWireframeRef.current) {
      scene.remove(clashWireframeRef.current);
      clashWireframeRef.current = null;
    }

    building.floors.forEach((floor, idx) => {
      const floorGroup = new THREE.Group();
      floorGroup.name = `floor-${floor.floorCode}`;

      // 1. Concrete Floor Slab Base Mesh
      const slabGeom = new THREE.BoxGeometry(slabWidth, slabThickness, slabDepth);
      let slabMat: THREE.Material;

      if (blueprintMode) {
        const bpTex = blueprintTextures.get(floor.floorCode);
        slabMat = new THREE.MeshStandardMaterial({
          map: bpTex,
          roughness: 0.5,
          metalness: 0.1,
        });
      } else {
        const isBasement = floor.floorIndex < 0;
        const isTerrace = floor.floorType === "ROOFTOP_TERRACE";
        slabMat = new THREE.MeshStandardMaterial({
          color: isBasement ? 0x0e7490 : isTerrace ? 0x059669 : 0x1e293b,
          roughness: 0.3,
          metalness: 0.4,
          transparent: true,
          opacity: isBasement ? 0.85 : 0.95,
        });
      }

      const slabMesh = new THREE.Mesh(slabGeom, slabMat);
      slabMesh.castShadow = true;
      slabMesh.receiveShadow = true;
      floorGroup.add(slabMesh);

      // Slab Wireframe Accent Edges
      const slabEdges = new THREE.EdgesGeometry(slabGeom);
      const edgeColor = floor.isUnauthorizedFloor && clashMode ? 0xef4444 : 0x38bdf8;
      const slabEdgeLine = new THREE.LineSegments(
        slabEdges,
        new THREE.LineBasicMaterial({ color: edgeColor, linewidth: 2 })
      );
      floorGroup.add(slabEdgeLine);

      // 2. Units / Partition Volumes on this Floor
      floor.units.forEach(unit => {
        const uW = slabWidth * unit.relativeBounds.w;
        const uD = slabDepth * unit.relativeBounds.d;
        const uH = unit.heightM * 0.7; // Visual height scale
        const uX = slabWidth * unit.relativeBounds.x;
        const uZ = slabDepth * unit.relativeBounds.z;
        const uY = slabThickness / 2 + uH / 2;

        const unitGeom = new THREE.BoxGeometry(uW, uH, uD);
        const typeInfo = UNIT_TYPE_COLORS[unit.unitType] || { hex: 0x38bdf8 };
        const unitColor = floor.isUnauthorizedFloor && clashMode ? 0xef4444 : typeInfo.hex;

        const unitMat = new THREE.MeshStandardMaterial({
          color: unitColor,
          roughness: 0.25,
          metalness: 0.3,
          transparent: true,
          opacity: 0.78,
          wireframe: false,
        });

        const unitMesh = new THREE.Mesh(unitGeom, unitMat);
        unitMesh.position.set(uX, uY, uZ);
        unitMesh.castShadow = true;
        unitMesh.receiveShadow = true;
        unitMesh.userData = { unit, floor };

        // Unit Border Line
        const unitEdges = new THREE.EdgesGeometry(unitGeom);
        const unitEdgeLine = new THREE.LineSegments(
          unitEdges,
          new THREE.LineBasicMaterial({
            color: floor.isUnauthorizedFloor && clashMode ? 0xfca5a5 : 0xffffff,
            transparent: true,
            opacity: 0.6,
          })
        );
        unitMesh.add(unitEdgeLine);

        floorGroup.add(unitMesh);
        unitMeshesRef.current.set(unit.id, { mesh: unitMesh, unit, floor });
      });

      // Position floor group vertically
      const baseY = floor.elevationBaseM * 0.7;
      floorGroup.position.y = baseY;
      floorGroup.userData = { floor, baseY, index: idx };

      scene.add(floorGroup);
      floorGroupsRef.current.set(floor.floorIndex, floorGroup);
    });

    // 3. Municipal Sanctioned Height Clash Envelope
    if (clashMode) {
      const clashGroup = new THREE.Group();
      const sanctionedHeightVisual = building.sanctionedHeightM * 0.7;
      const clashBoxGeom = new THREE.BoxGeometry(slabWidth + 1.2, sanctionedHeightVisual, slabDepth + 1.2);
      const clashEdges = new THREE.EdgesGeometry(clashBoxGeom);
      const clashLineMat = new THREE.LineDashedMaterial({
        color: 0xf59e0b,
        dashSize: 1,
        gapSize: 0.5,
        linewidth: 2,
      });
      const clashBox = new THREE.LineSegments(clashEdges, clashLineMat);
      clashBox.computeLineDistances();
      clashBox.position.y = sanctionedHeightVisual / 2;
      clashGroup.add(clashBox);

      // Translucent Limit Roof Plane
      const limitPlaneGeom = new THREE.PlaneGeometry(slabWidth + 2, slabDepth + 2);
      const limitPlaneMat = new THREE.MeshBasicMaterial({
        color: 0xf59e0b,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.18,
      });
      const limitPlane = new THREE.Mesh(limitPlaneGeom, limitPlaneMat);
      limitPlane.rotation.x = Math.PI / 2;
      limitPlane.position.y = sanctionedHeightVisual;
      clashGroup.add(limitPlane);

      scene.add(clashGroup);
      clashWireframeRef.current = clashGroup;
    }
  };

  // Re-run building geometry when clashMode or blueprintMode changes
  useEffect(() => {
    if (sceneRef.current) {
      buildFloorStackMeshes(sceneRef.current);
    }
  }, [clashMode, blueprintMode, building]);

  // Update Explosion & Isolated X-Ray State
  useEffect(() => {
    floorGroupsRef.current.forEach(group => {
      const { floor, baseY, index } = group.userData;
      const explosionOffset = explosionFactor * (index - 2) * verticalSpacing;
      group.position.y = baseY + explosionOffset;

      // X-Ray isolated mode logic
      const isIsolated = selectedFloorIndex !== null;
      const isCurrentSelected = selectedFloorIndex === floor.floorIndex;

      group.children.forEach(child => {
        if (child instanceof THREE.Mesh) {
          const mat = child.material as THREE.MeshStandardMaterial;
          if (mat) {
            if (isIsolated) {
              if (isCurrentSelected) {
                mat.transparent = false;
                mat.opacity = 1.0;
              } else {
                mat.transparent = true;
                mat.opacity = 0.12;
              }
            } else {
              mat.transparent = true;
              mat.opacity = 0.85;
            }
          }
        }
      });
    });
  }, [explosionFactor, selectedFloorIndex]);

  // Mouse Orbit Controls (Rotate, Pan, Zoom)
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    prevMouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const container = mountRef.current;
    if (!container) return;

    if (isDraggingRef.current) {
      const deltaX = e.clientX - prevMouseRef.current.x;
      const deltaY = e.clientY - prevMouseRef.current.y;
      prevMouseRef.current = { x: e.clientX, y: e.clientY };

      cameraAngleRef.current.theta += deltaX * 0.008;
      cameraAngleRef.current.phi = Math.max(
        0.1,
        Math.min(Math.PI / 2 + 0.3, cameraAngleRef.current.phi - deltaY * 0.008)
      );
      updateCameraPosition();
      return;
    }

    // Raycast Unit & Floor Hover
    const rect = container.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const camera = cameraRef.current;
    const scene = sceneRef.current;
    if (!camera || !scene) return;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);

    const meshes: THREE.Mesh[] = [];
    unitMeshesRef.current.forEach(({ mesh }) => meshes.push(mesh));

    const intersects = raycaster.intersectObjects(meshes);
    if (intersects.length > 0) {
      const hit = intersects[0].object as THREE.Mesh;
      if (hit.userData && hit.userData.unit) {
        setHoveredUnit(hit.userData.unit);
        setHoveredFloor(hit.userData.floor);
        setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        return;
      }
    }

    setHoveredUnit(null);
    setHoveredFloor(null);
    setTooltipPos(null);
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    cameraAngleRef.current.radius = Math.max(
      15,
      Math.min(90, cameraAngleRef.current.radius + e.deltaY * 0.04)
    );
    updateCameraPosition();
  };

  const handleClick = (e: React.MouseEvent) => {
    const container = mountRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const camera = cameraRef.current;
    const scene = sceneRef.current;
    if (!camera || !scene) return;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);

    const meshes: THREE.Mesh[] = [];
    unitMeshesRef.current.forEach(({ mesh }) => meshes.push(mesh));

    const intersects = raycaster.intersectObjects(meshes);
    if (intersects.length > 0) {
      const hit = intersects[0].object as THREE.Mesh;
      if (hit.userData && hit.userData.unit) {
        onSelectUnit(hit.userData.unit, hit.userData.floor);
        onSelectFloor(hit.userData.floor);
        return;
      }
    }
  };

  const setPreset = (preset: "perspective" | "front" | "top") => {
    setCameraPreset(preset);
    if (preset === "perspective") {
      cameraAngleRef.current = { theta: 0.8, phi: 0.9, radius: 42 };
    } else if (preset === "front") {
      cameraAngleRef.current = { theta: 0, phi: Math.PI / 2, radius: 46 };
    } else if (preset === "top") {
      cameraAngleRef.current = { theta: 0, phi: 0.05, radius: 52 };
    }
    updateCameraPosition();
  };

  return (
    <div className="relative w-full h-full select-none overflow-hidden bg-slate-950 font-sans">
      {/* 3D WebGL Canvas Viewport */}
      <div
        ref={mountRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onClick={handleClick}
      />

      {/* Floating Spatial HUD Controls */}
      <div className="absolute top-4 left-4 z-20 flex flex-wrap gap-2 items-center bg-slate-900/90 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-700/60 shadow-2xl">
        <div className="flex items-center gap-1.5 pr-2 border-r border-slate-700 text-xs font-semibold text-sky-400">
          <Building2 size={15} />
          <span>{building.buildingName}</span>
        </div>

        {/* Camera Presets */}
        <div className="flex items-center gap-1 bg-slate-800/80 p-0.5 rounded-lg text-xs">
          <button
            type="button"
            onClick={() => setPreset("perspective")}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              cameraPreset === "perspective"
                ? "bg-sky-500 text-white font-bold"
                : "text-slate-300 hover:text-white"
            }`}
          >
            3D Iso
          </button>
          <button
            type="button"
            onClick={() => setPreset("front")}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              cameraPreset === "front"
                ? "bg-sky-500 text-white font-bold"
                : "text-slate-300 hover:text-white"
            }`}
          >
            Elevation (Front)
          </button>
          <button
            type="button"
            onClick={() => setPreset("top")}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              cameraPreset === "top"
                ? "bg-sky-500 text-white font-bold"
                : "text-slate-300 hover:text-white"
            }`}
          >
            CAD (Top)
          </button>
        </div>

        {/* Auto Rotate Button */}
        <button
          type="button"
          onClick={() => setIsAutoRotate(!isAutoRotate)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
            isAutoRotate
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
              : "bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
          }`}
        >
          <RotateCcw size={12} className={isAutoRotate ? "animate-spin" : ""} />
          Auto Orbit
        </button>

        {/* Reset View */}
        <button
          type="button"
          onClick={() => {
            setPreset("perspective");
            onSelectFloor(null);
            onSelectUnit(null, null);
          }}
          className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
          title="Reset Camera & Selection"
        >
          <Maximize2 size={13} />
        </button>
      </div>

      {/* Floating Explosion Slider Widget (Bottom Left) */}
      <div className="absolute bottom-5 left-4 z-20 w-80 bg-slate-900/90 backdrop-blur-md p-3.5 rounded-xl border border-slate-700/60 shadow-2xl">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-sky-400">
            <Sliders size={14} />
            <span>Exploded Floor Stacker</span>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-400">
            {Math.round(explosionFactor * 100)}%
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={explosionFactor}
          onChange={e => onExplosionChange?.(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-400"
        />
        <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
          <span>0% (Solid Stack)</span>
          <span>50% (Slight Gap)</span>
          <span>100% (Full Disassembly)</span>
        </div>
      </div>

      {/* Clash Violation Indicator Floating Banner */}
      {clashMode && building.sanctionStatus === "SANCTIONED_WITH_DEVIATIONS" && (
        <div className="absolute top-16 left-4 z-20 flex items-center gap-2.5 bg-red-950/90 border border-red-500/60 text-red-200 px-3 py-2 rounded-xl backdrop-blur-md shadow-2xl animate-pulse">
          <AlertTriangle size={18} className="text-red-400" />
          <div className="text-xs">
            <b className="text-red-300">3D Spatial Clash Detected:</b> Exceeds Sanctioned Limit (15.0m max) by{" "}
            <span className="font-mono text-red-100 font-bold">
              +{(building.actualHeightM - building.sanctionedHeightM).toFixed(1)}m
            </span>
          </div>
        </div>
      )}

      {/* 3D Hover Tooltip */}
      {hoveredUnit && hoveredFloor && tooltipPos && (
        <div
          className="pointer-events-none absolute z-30 bg-slate-900/95 border border-sky-500/50 shadow-2xl rounded-xl p-3 text-xs w-64 backdrop-blur-lg transform -translate-x-1/2 -translate-y-full mb-3 animate-in fade-in zoom-in-95 duration-100"
          style={{ left: tooltipPos.x, top: tooltipPos.y }}
        >
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800">
            <span className="font-bold text-white text-sm">{hoveredUnit.unitNumber}</span>
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white"
              style={{ backgroundColor: UNIT_TYPE_COLORS[hoveredUnit.unitType]?.css }}
            >
              {UNIT_TYPE_COLORS[hoveredUnit.unitType]?.label}
            </span>
          </div>
          <div className="space-y-1 font-mono text-[11px] text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">3D ULPIN:</span>
              <span className="text-sky-300 font-semibold truncate max-w-[130px]">{hoveredUnit.ulpin3d}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Elevation:</span>
              <span className="text-emerald-300 font-semibold">{hoveredUnit.elevationRange}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Carpet Area:</span>
              <span className="text-slate-200">{hoveredUnit.carpetAreaSqM} m² ({hoveredUnit.volumeCuM} m³)</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-800 text-[10px]">
              <span className="text-slate-400">Owner:</span>
              <span className="text-white truncate max-w-[140px]">{hoveredUnit.owner.name}</span>
            </div>
          </div>
          <p className="text-[9px] text-sky-400 mt-2 italic text-center">Click unit to inspect deed & clearances</p>
        </div>
      )}

      {/* Legend at Bottom Right */}
      <div className="absolute bottom-5 right-4 z-20 bg-slate-900/90 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-slate-700/60 shadow-2xl text-xs space-y-1.5">
        <span className="font-bold text-[11px] text-slate-300 uppercase tracking-wider block mb-1">
          Property Zone Legend
        </span>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
          {Object.entries(UNIT_TYPE_COLORS).map(([key, info]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: info.css }} />
              <span className="text-slate-300">{info.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ThreeFloorStackViewer;
