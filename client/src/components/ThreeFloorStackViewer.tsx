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
  Sliders,
  AlertTriangle,
  RotateCcw,
  Maximize2,
} from "lucide-react";

// STHARA Cadastral Palette Colors
export const UNIT_TYPE_COLORS: Record<
  UnitType,
  { hex: number; css: string; label: string }
> = {
  RESIDENTIAL: { hex: 0xa85d48, css: "#A85D48", label: "Residential Unit" },
  COMMERCIAL: { hex: 0xb28a52, css: "#B28A52", label: "Commercial Suite" },
  PARKING: { hex: 0x788575, css: "#788575", label: "Stilt / Covered Parking" },
  UTILITY_CORE: { hex: 0x8e897e, css: "#8E897E", label: "Core (Lift / Stair)" },
  AIR_RIGHTS: { hex: 0xd7d4cb, css: "#D7D4CB", label: "Terrace Air Rights" },
  BASEMENT_STORAGE: { hex: 0x5a6358, css: "#5A6358", label: "Basement Vault" },
};

export type ThreeFloorStackViewerProps = {
  building: BuildingFloorStackRecord;
  selectedFloorIndex: number | null;
  selectedUnitId: string | null;
  explosionFactor: number;
  clashMode: boolean;
  blueprintMode: boolean;
  onSelectFloor: (floor: FloorStackLevel | null) => void;
  onSelectUnit: (
    unit: FloorUnitCadastre | null,
    floor: FloorStackLevel | null
  ) => void;
  onExplosionChange?: (val: number) => void;
};

function generateProceduralBlueprintTexture(
  floorName: string,
  floorCode: string
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Blueprint matte background
  ctx.fillStyle = "#1E2220";
  ctx.fillRect(0, 0, 1024, 1024);

  // Grid lines
  ctx.strokeStyle = "#2D3430";
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
  ctx.strokeStyle = "#A85D48";
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

  // Room Wall Outlines
  ctx.strokeStyle = "#F8F6F0";
  ctx.lineWidth = 5;
  ctx.strokeRect(60, 60, 904, 904);

  // Central corridor & core
  ctx.strokeRect(360, 200, 304, 624);
  ctx.strokeRect(360, 420, 304, 184); // Lobby

  // Units
  ctx.strokeRect(60, 60, 300, 420); // Unit 05
  ctx.strokeRect(664, 60, 300, 420); // Unit 01
  ctx.strokeRect(60, 544, 300, 420); // Unit 04
  ctx.strokeRect(664, 544, 300, 420); // Unit 02

  // Labels
  ctx.fillStyle = "#F8F6F0";
  ctx.font = "bold 20px monospace";
  ctx.fillText("UNIT 05 (3BHK)", 80, 120);
  ctx.fillText("UNIT 01 (3BHK)", 684, 120);
  ctx.fillText("UNIT 04 (3BHK)", 80, 600);
  ctx.fillText("UNIT 02 (3BHK)", 684, 600);

  ctx.fillStyle = "#A85D48";
  ctx.font = "bold 22px monospace";
  ctx.fillText("LOBBY & CORE", 420, 520);

  // Header stamp
  ctx.fillStyle = "#B28A52";
  ctx.font = "bold 18px sans-serif";
  ctx.fillText(`STHARA SPATIAL MODEL · ${floorName.toUpperCase()} [${floorCode}]`, 80, 990);

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
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  // Meshes & Groups Registry
  const floorGroupsRef = useRef<Map<number, THREE.Group>>(new Map());
  const unitMeshesRef = useRef<
    Map<
      string,
      {
        mesh: THREE.Mesh;
        unit: FloorUnitCadastre;
        floor: FloorStackLevel;
      }
    >
  >(new Map());
  const slabMeshesRef = useRef<THREE.Mesh[]>([]);
  const wallMeshesRef = useRef<THREE.Mesh[]>([]);
  const clashWireframeRef = useRef<THREE.Group | null>(null);

  // Interaction State
  const [hoveredUnit, setHoveredUnit] = useState<FloorUnitCadastre | null>(null);
  const [hoveredFloor, setHoveredFloor] = useState<FloorStackLevel | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // Camera Orbit Presets
  const [cameraPreset, setCameraPreset] = useState<
    "perspective" | "front" | "top" | "isometric"
  >("perspective");
  const [isAutoRotate, setIsAutoRotate] = useState(false);

  // Orbit angle state
  const cameraAngleRef = useRef({ theta: 0.8, phi: 0.9, radius: 44 });
  const isDraggingRef = useRef(false);
  const prevMouseRef = useRef({ x: 0, y: 0 });
  const animFrameIdRef = useRef<number | null>(null);

  // Geometry dimensions
  const slabWidth = 22;
  const slabDepth = 24;
  const slabThickness = 0.28;
  const verticalSpacing = 4.2;

  // Memoize procedural textures
  const blueprintTextures = useMemo(() => {
    const map = new Map<string, THREE.CanvasTexture>();
    building.floors.forEach(f => {
      map.set(f.floorCode, generateProceduralBlueprintTexture(f.floorName, f.floorCode));
    });
    return map;
  }, [building]);

  // Setup Three.js Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene & Environment (STHARA matte dark charcoal)
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x191a18);
    scene.fog = new THREE.FogExp2(0x191a18, 0.012);
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
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // 4. Architectural Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xfff8ee, 0.95);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xfff5ea, 1.4);
    dirLight1.position.set(35, 55, 45);
    dirLight1.castShadow = true;
    dirLight1.shadow.mapSize.width = 2048;
    dirLight1.shadow.mapSize.height = 2048;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xd4d8d1, 0.65);
    dirLight2.position.set(-35, 25, -35);
    scene.add(dirLight2);

    const pointLight = new THREE.PointLight(0xa85d48, 0.8, 60);
    pointLight.position.set(0, 18, 0);
    scene.add(pointLight);

    // 5. Ground Datum Plane at Z = 0
    const groundGrid = new THREE.GridHelper(60, 30, 0xa85d48, 0x383a36);
    groundGrid.position.y = 0;
    scene.add(groundGrid);

    // Compass Direction Ring
    const compassGeom = new THREE.RingGeometry(24, 24.3, 48);
    const compassMat = new THREE.MeshBasicMaterial({
      color: 0xa85d48,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.25,
    });
    const compassMesh = new THREE.Mesh(compassGeom, compassMat);
    compassMesh.rotation.x = Math.PI / 2;
    compassMesh.position.y = 0.05;
    scene.add(compassMesh);

    // Subterranean Excavation Box ONLY if basement explicitly exists
    if ((building.basementCount || 0) > 0) {
      const basementBoxGeom = new THREE.BoxGeometry(slabWidth + 4, 7, slabDepth + 4);
      const basementEdges = new THREE.EdgesGeometry(basementBoxGeom);
      const basementLineMat = new THREE.LineBasicMaterial({
        color: 0x788575,
        transparent: true,
        opacity: 0.35,
      });
      const basementLine = new THREE.LineSegments(basementEdges, basementLineMat);
      basementLine.position.y = -3.5;
      scene.add(basementLine);
    }

    // 6. Build Floor Stacks & Architectural Geometry
    buildFloorStackMeshes(scene);

    // 7. Render Loop
    const render = () => {
      if (isAutoRotate) {
        cameraAngleRef.current.theta += 0.003;
        updateCameraPosition();
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

    let targetY = 7;
    if (selectedFloorIndex !== null && floorGroupsRef.current.has(selectedFloorIndex)) {
      targetY = floorGroupsRef.current.get(selectedFloorIndex)!.position.y + 0.5;
    }

    const { theta, phi, radius } = cameraAngleRef.current;
    const x = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi) + targetY;
    const z = radius * Math.sin(phi) * Math.cos(theta);

    camera.position.set(x, y, z);
    camera.lookAt(0, targetY, 0);
  };

  // Build Floor Meshes (Architectural Walls, Core, Balconies, Units, and Slabs)
  const buildFloorStackMeshes = (scene: THREE.Scene) => {
    // Clear previous
    floorGroupsRef.current.forEach(group => scene.remove(group));
    floorGroupsRef.current.clear();
    unitMeshesRef.current.clear();
    slabMeshesRef.current = [];
    wallMeshesRef.current = [];

    if (clashWireframeRef.current) {
      scene.remove(clashWireframeRef.current);
      clashWireframeRef.current = null;
    }

    building.floors.forEach((floor, idx) => {
      const floorGroup = new THREE.Group();
      floorGroup.name = `floor-${floor.floorCode}`;
      const isBasement = floor.floorIndex < 0;
      const isTerrace = floor.floorType === "ROOFTOP_TERRACE";
      const arch = floor.architecturalGeometry;

      // =======================================================================
      // 1. Concrete Floor Slab Base Mesh
      // =======================================================================
      let slabGeom: THREE.BufferGeometry;

      if (arch && arch.slabPolygon && arch.slabPolygon.length > 2) {
        // Authentic non-rectangular architectural contour with balcony projections & recesses
        const shape = new THREE.Shape();
        shape.moveTo(arch.slabPolygon[0][0], arch.slabPolygon[0][1]);
        for (let p = 1; p < arch.slabPolygon.length; p++) {
          shape.lineTo(arch.slabPolygon[p][0], arch.slabPolygon[p][1]);
        }
        shape.closePath();

        const extrudeSettings = {
          depth: slabThickness,
          bevelEnabled: true,
          bevelSegments: 2,
          steps: 1,
          bevelSize: 0.05,
          bevelThickness: 0.05,
        };
        slabGeom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        // Rotate shape from XY to XZ plane
        slabGeom.rotateX(Math.PI / 2);
      } else {
        // Fallback generic extrusion only when architectural geometry is missing
        slabGeom = new THREE.BoxGeometry(slabWidth, slabThickness, slabDepth);
      }

      let slabMat: THREE.Material;
      if (blueprintMode) {
        const bpTex = blueprintTextures.get(floor.floorCode);
        slabMat = new THREE.MeshStandardMaterial({
          map: bpTex,
          roughness: 0.5,
          metalness: 0.1,
        });
      } else {
        slabMat = new THREE.MeshStandardMaterial({
          color: isBasement ? 0x0e7490 : isTerrace ? 0x788575 : 0xd8d4ca,
          roughness: 0.45,
          metalness: 0.1,
          transparent: true,
          opacity: 0.95,
        });
      }

      const slabMesh = new THREE.Mesh(slabGeom, slabMat);
      slabMesh.castShadow = true;
      slabMesh.receiveShadow = true;
      slabMesh.userData = { floor, isSlab: true };
      slabMeshesRef.current.push(slabMesh);
      floorGroup.add(slabMesh);

      // Crisp Slab Accent Outline
      const slabEdges = new THREE.EdgesGeometry(slabGeom);
      const edgeColor = floor.isUnauthorizedFloor && clashMode ? 0xef4444 : 0x8e897e;
      const slabEdgeLine = new THREE.LineSegments(
        slabEdges,
        new THREE.LineBasicMaterial({ color: edgeColor, linewidth: 1.5 })
      );
      floorGroup.add(slabEdgeLine);

      // =======================================================================
      // 2. Architectural 3D Walls & Core (When Available)
      // =======================================================================
      if (arch && arch.walls && arch.walls.length > 0) {
        arch.walls.forEach(w => {
          const dx = w.x2 - w.x1;
          const dz = w.z2 - w.z1;
          const L = Math.hypot(dx, dz);
          if (L < 0.05) return;

          const angle = Math.atan2(dz, dx);
          const mx = (w.x1 + w.x2) / 2;
          const mz = (w.z1 + w.z2) / 2;
          const H = (w.zTopM - w.zBaseM) * 0.7; // Visual height scale

          const wallGeom = new THREE.BoxGeometry(L, H, w.thicknessM);

          let wallColor = 0xc6c1b3; // Exterior warm architectural stone
          if (w.wallType === "CORE_SHAFT") wallColor = 0x8e897e; // Core shaft structural tone
          else if (w.wallType === "INTERIOR_PARTITION") wallColor = 0xe9e5da; // Interior partition
          else if (w.wallType === "PARAPET") wallColor = 0xa39e92; // Terrace parapet

          const wallMat = new THREE.MeshStandardMaterial({
            color: wallColor,
            roughness: 0.6,
            metalness: 0.1,
          });

          const wallMesh = new THREE.Mesh(wallGeom, wallMat);
          wallMesh.position.set(mx, slabThickness / 2 + H / 2, mz);
          wallMesh.rotation.y = -angle;
          wallMesh.castShadow = true;
          wallMesh.receiveShadow = true;
          wallMesh.userData = { floor, isWall: true };

          // Wall Edge Definition
          const wallEdges = new THREE.EdgesGeometry(wallGeom);
          const wallEdgeLine = new THREE.LineSegments(
            wallEdges,
            new THREE.LineBasicMaterial({
              color: 0x3d413b,
              opacity: 0.35,
              transparent: true,
            })
          );
          wallMesh.add(wallEdgeLine);

          floorGroup.add(wallMesh);
          wallMeshesRef.current.push(wallMesh);
        });

        // Staircase flights with steps inside core
        if (arch.core?.staircase?.steps) {
          const stepCount = arch.core.staircase.steps.length;
          const totalRise = (floor.floorHeightM || 2.8) * 0.7;

          arch.core.staircase.steps.forEach((step, sIdx) => {
            const sx = (step.x1 + step.x2) / 2;
            const sz = (step.z1 + step.z2) / 2;
            const sw = Math.abs(step.x2 - step.x1) || 1.2;
            const stepY = slabThickness / 2 + (sIdx / stepCount) * totalRise;

            const stepGeom = new THREE.BoxGeometry(sw, 0.12, 0.32);
            const stepMat = new THREE.MeshStandardMaterial({
              color: 0x5a6358,
              roughness: 0.7,
            });
            const stepMesh = new THREE.Mesh(stepGeom, stepMat);
            stepMesh.position.set(sx, stepY, sz);
            stepMesh.castShadow = true;
            floorGroup.add(stepMesh);
          });
        }

        // Passenger Lift Elevator Shaft Volume
        if (arch.core?.lift?.polygon) {
          const lp = arch.core.lift.polygon;
          const minX = Math.min(...lp.map(p => p[0]));
          const maxX = Math.max(...lp.map(p => p[0]));
          const minZ = Math.min(...lp.map(p => p[1]));
          const maxZ = Math.max(...lp.map(p => p[1]));
          const lH = (floor.floorHeightM || 2.8) * 0.7;

          const liftBox = new THREE.BoxGeometry(maxX - minX - 0.2, lH, maxZ - minZ - 0.2);
          const liftMat = new THREE.MeshStandardMaterial({
            color: 0x383b37,
            metalness: 0.75,
            roughness: 0.3,
            transparent: true,
            opacity: 0.8,
          });
          const liftMesh = new THREE.Mesh(liftBox, liftMat);
          liftMesh.position.set((minX + maxX) / 2, slabThickness / 2 + lH / 2, (minZ + maxZ) / 2);
          floorGroup.add(liftMesh);
        }

        // Central Corridor & Common Lobby Tiled Floor
        if (arch.core?.corridorLobby?.polygon) {
          const clp = arch.core.corridorLobby.polygon;
          const minX = Math.min(...clp.map(p => p[0]));
          const maxX = Math.max(...clp.map(p => p[0]));
          const minZ = Math.min(...clp.map(p => p[1]));
          const maxZ = Math.max(...clp.map(p => p[1]));

          const lobbyTileGeom = new THREE.BoxGeometry(maxX - minX, 0.02, maxZ - minZ);
          const lobbyTileMat = new THREE.MeshStandardMaterial({
            color: 0xf5f1e8,
            roughness: 0.2,
          });
          const lobbyMesh = new THREE.Mesh(lobbyTileGeom, lobbyTileMat);
          lobbyMesh.position.set((minX + maxX) / 2, slabThickness / 2 + 0.01, (minZ + maxZ) / 2);
          floorGroup.add(lobbyMesh);
        }

        // Balconies with Glass Railings
        if (arch.balconies && arch.balconies.length > 0) {
          arch.balconies.forEach(b => {
            const minX = Math.min(...b.polygon.map(p => p[0]));
            const maxX = Math.max(...b.polygon.map(p => p[0]));
            const minZ = Math.min(...b.polygon.map(p => p[1]));
            const maxZ = Math.max(...b.polygon.map(p => p[1]));
            const bW = maxX - minX;
            const rH = (b.railingHeightM || 1.0) * 0.7;

            const glassMat = new THREE.MeshStandardMaterial({
              color: 0x38bdf8,
              metalness: 0.4,
              roughness: 0.1,
              transparent: true,
              opacity: 0.45,
            });

            // Modern Balcony Glass Balustrade
            const glassGeom = new THREE.BoxGeometry(bW, rH, 0.04);
            const glassMesh = new THREE.Mesh(glassGeom, glassMat);
            const glassZ = minZ < -10 ? minZ : maxZ;
            glassMesh.position.set((minX + maxX) / 2, slabThickness / 2 + rH / 2, glassZ);
            floorGroup.add(glassMesh);
          });
        }

        // Ground Floor Structural RCC Columns & Parking Demarcation
        if (arch.columns) {
          arch.columns.forEach(col => {
            const colH = (floor.floorHeightM || 3.22) * 0.7;
            const colGeom = new THREE.BoxGeometry(col.widthM, colH, col.depthM);
            const colMat = new THREE.MeshStandardMaterial({
              color: 0x8e897e,
              roughness: 0.5,
            });
            const colMesh = new THREE.Mesh(colGeom, colMat);
            colMesh.position.set(col.x, slabThickness / 2 + colH / 2, col.z);
            colMesh.castShadow = true;
            floorGroup.add(colMesh);
          });
        }

        // Roof Lift Machine Room Bulkhead
        if (arch.roofElements) {
          arch.roofElements.forEach(re => {
            const minX = Math.min(...re.polygon.map(p => p[0]));
            const maxX = Math.max(...re.polygon.map(p => p[0]));
            const minZ = Math.min(...re.polygon.map(p => p[1]));
            const maxZ = Math.max(...re.polygon.map(p => p[1]));
            const rH = re.heightM * 0.7;

            const bulkGeom = new THREE.BoxGeometry(maxX - minX, rH, maxZ - minZ);
            const bulkMat = new THREE.MeshStandardMaterial({
              color: 0x788575,
              roughness: 0.5,
            });
            const bulkMesh = new THREE.Mesh(bulkGeom, bulkMat);
            bulkMesh.position.set(
              (minX + maxX) / 2,
              slabThickness / 2 + rH / 2,
              (minZ + maxZ) / 2
            );
            bulkMesh.castShadow = true;
            floorGroup.add(bulkMesh);
          });
        }
      }

      // =======================================================================
      // 3. Units / Apartment Demarcation Volumes
      // =======================================================================
      floor.units.forEach(unit => {
        const uW = slabWidth * unit.relativeBounds.w;
        const uD = slabDepth * unit.relativeBounds.d;
        const uH = unit.heightM * 0.7;
        const uX = slabWidth * unit.relativeBounds.x;
        const uZ = slabDepth * unit.relativeBounds.z;
        const uY = slabThickness / 2 + uH / 2;

        const unitGeom = new THREE.BoxGeometry(uW, uH, uD);
        const typeInfo = UNIT_TYPE_COLORS[unit.unitType] || { hex: 0xa85d48 };
        const unitColor = floor.isUnauthorizedFloor && clashMode ? 0xef4444 : typeInfo.hex;

        const unitMat = new THREE.MeshStandardMaterial({
          color: unitColor,
          roughness: 0.3,
          metalness: 0.2,
          transparent: true,
          opacity: 0.28, // Translucent interior volume so architectural walls are visible
          wireframe: false,
        });

        const unitMesh = new THREE.Mesh(unitGeom, unitMat);
        unitMesh.position.set(uX, uY, uZ);
        unitMesh.userData = { unit, floor };

        // Unit Border Line
        const unitEdges = new THREE.EdgesGeometry(unitGeom);
        const unitEdgeLine = new THREE.LineSegments(
          unitEdges,
          new THREE.LineBasicMaterial({
            color: floor.isUnauthorizedFloor && clashMode ? 0xfca5a5 : typeInfo.hex,
            transparent: true,
            opacity: 0.75,
          })
        );
        unitMesh.add(unitEdgeLine);

        floorGroup.add(unitMesh);
        unitMeshesRef.current.set(unit.id, { mesh: unitMesh, unit, floor });
      });

      // Position floor group vertically in building elevation stack
      const baseY = floor.elevationBaseM * 0.7;
      floorGroup.position.y = baseY;
      floorGroup.userData = { floor, baseY, index: idx };

      scene.add(floorGroup);
      floorGroupsRef.current.set(floor.floorIndex, floorGroup);
    });

    // 4. Municipal Sanctioned Height Clash Envelope
    if (clashMode) {
      const clashGroup = new THREE.Group();
      const sanctionedHeightVisual = building.sanctionedHeightM * 0.7;
      const clashBoxGeom = new THREE.BoxGeometry(
        slabWidth + 1.2,
        sanctionedHeightVisual,
        slabDepth + 1.2
      );
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
      const explosionOffset = explosionFactor * (index - 1) * verticalSpacing;
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
                mat.transparent = child.userData?.unit ? true : false;
                mat.opacity = child.userData?.unit ? 0.35 : 1.0;
              } else {
                mat.transparent = true;
                mat.opacity = 0.12;
              }
            } else {
              mat.transparent = child.userData?.unit ? true : false;
              mat.opacity = child.userData?.unit ? 0.28 : 1.0;
            }
          }
        }
      });
    });
    updateCameraPosition();
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
        0.05,
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
    slabMeshesRef.current.forEach(mesh => meshes.push(mesh));
    wallMeshesRef.current.forEach(mesh => meshes.push(mesh));

    const intersects = raycaster.intersectObjects(meshes);
    if (intersects.length > 0) {
      const hit = intersects[0].object as THREE.Mesh;
      if (hit.userData && hit.userData.unit) {
        onSelectUnit(hit.userData.unit, hit.userData.floor);
        onSelectFloor(hit.userData.floor);
        return;
      }
      if (hit.userData && (hit.userData.isSlab || hit.userData.isWall) && hit.userData.floor) {
        onSelectFloor(hit.userData.floor);
        onSelectUnit(null, hit.userData.floor);
        return;
      }
    } else {
      // Empty background click clears floor selection
      onSelectFloor(null);
      onSelectUnit(null, null);
    }
  };

  const setPreset = (preset: "perspective" | "front" | "top" | "isometric") => {
    setCameraPreset(preset);
    if (preset === "perspective") {
      cameraAngleRef.current = { theta: 0.8, phi: 0.9, radius: 44 };
    } else if (preset === "front") {
      cameraAngleRef.current = { theta: 0, phi: Math.PI / 2, radius: 46 };
    } else if (preset === "top") {
      // Exact Top-down architectural plan camera angle
      cameraAngleRef.current = { theta: 0, phi: 0.01, radius: 48 };
    } else if (preset === "isometric") {
      cameraAngleRef.current = { theta: Math.PI / 4, phi: 0.95, radius: 45 };
    }
    updateCameraPosition();
  };

  return (
    <div className="relative w-full h-full select-none overflow-hidden bg-[#191a18] font-sans">
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
      <div className="absolute top-4 left-4 z-20 flex flex-wrap gap-2 items-center bg-[#F8F6F0]/95 backdrop-blur-md px-3 py-2 rounded-xl border border-[#D7D4CB] shadow-lg text-[#252622]">
        <div className="flex items-center gap-1.5 pr-2 border-r border-[#D7D4CB] text-xs font-semibold text-[#A85D48]">
          <Building2 size={15} />
          <span>{building.buildingName}</span>
        </div>

        {/* Camera Presets */}
        <div className="flex items-center gap-1 bg-[#E9E5DA] p-0.5 rounded-lg text-xs font-semibold">
          <button
            type="button"
            onClick={() => setPreset("perspective")}
            className={`px-2.5 py-1 rounded transition-colors ${
              cameraPreset === "perspective"
                ? "bg-[#A85D48] text-white font-bold shadow-xs"
                : "text-[#6F7069] hover:text-[#252622]"
            }`}
          >
            3D View
          </button>
          <button
            type="button"
            onClick={() => setPreset("front")}
            className={`px-2.5 py-1 rounded transition-colors ${
              cameraPreset === "front"
                ? "bg-[#A85D48] text-white font-bold shadow-xs"
                : "text-[#6F7069] hover:text-[#252622]"
            }`}
          >
            Front
          </button>
          <button
            type="button"
            onClick={() => setPreset("top")}
            className={`px-2.5 py-1 rounded transition-colors ${
              cameraPreset === "top"
                ? "bg-[#A85D48] text-white font-bold shadow-xs"
                : "text-[#6F7069] hover:text-[#252622]"
            }`}
          >
            Top (Plan)
          </button>
          <button
            type="button"
            onClick={() => setPreset("isometric")}
            className={`px-2.5 py-1 rounded transition-colors ${
              cameraPreset === "isometric"
                ? "bg-[#A85D48] text-white font-bold shadow-xs"
                : "text-[#6F7069] hover:text-[#252622]"
            }`}
          >
            Isometric
          </button>
        </div>

        {/* Auto Orbit Button */}
        <button
          type="button"
          onClick={() => setIsAutoRotate(!isAutoRotate)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
            isAutoRotate
              ? "bg-[#788575] text-white shadow-xs"
              : "bg-[#E9E5DA] text-[#6F7069] hover:text-[#252622] border border-[#D7D4CB]"
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
          className="p-1.5 rounded-lg bg-[#E9E5DA] text-[#6F7069] hover:text-[#252622] border border-[#D7D4CB]"
          title="Reset Camera & Selection"
        >
          <Maximize2 size={13} />
        </button>
      </div>

      {/* Floating EXPLODE FLOORS Slider Widget (Bottom Left) */}
      <div className="absolute bottom-5 left-4 z-20 w-72 bg-[#F8F6F0]/95 backdrop-blur-md p-3 rounded-xl border border-[#D7D4CB] shadow-lg text-[#252622]">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#A85D48]">
            <Sliders size={13} />
            <span className="uppercase font-mono tracking-wider">EXPLODE FLOORS</span>
          </div>
          <span className="text-xs font-mono font-bold text-[#252622]">
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
          className="w-full h-1.5 bg-[#D7D4CB] rounded appearance-none cursor-pointer accent-[#A85D48]"
        />
        <div className="flex justify-between text-[9px] text-[#6F7069] mt-1 font-mono">
          <span>0% — Solid</span>
          <span>50% — Separated</span>
          <span>100% — Exploded</span>
        </div>
      </div>

      {/* Clash Violation Indicator Floating Banner */}
      {clashMode && building.sanctionStatus === "SANCTIONED_WITH_DEVIATIONS" && (
        <div className="absolute top-16 left-4 z-20 flex items-center gap-2.5 bg-red-950/90 border border-red-500/60 text-red-200 px-3 py-2 rounded-xl backdrop-blur-md shadow-2xl animate-pulse">
          <AlertTriangle size={18} className="text-red-400" />
          <div className="text-xs">
            <b className="text-red-300">3D Spatial Clash Detected:</b> Exceeds Sanctioned Limit by{" "}
            <span className="font-mono text-red-100 font-bold">
              +{(building.actualHeightM - building.sanctionedHeightM).toFixed(1)}m
            </span>
          </div>
        </div>
      )}

      {/* 3D Hover Tooltip */}
      {hoveredUnit && hoveredFloor && tooltipPos && (
        <div
          className="pointer-events-none absolute z-30 bg-[#F8F6F0]/95 border border-[#D7D4CB] shadow-xl rounded-xl p-3 text-xs w-64 backdrop-blur-lg transform -translate-x-1/2 -translate-y-full mb-3 animate-in fade-in zoom-in-95 duration-100 text-[#252622]"
          style={{ left: tooltipPos.x, top: tooltipPos.y }}
        >
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-[#E9E5DA]">
            <span className="font-bold text-[#252622] text-sm">{hoveredUnit.unitNumber}</span>
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white"
              style={{ backgroundColor: UNIT_TYPE_COLORS[hoveredUnit.unitType]?.css }}
            >
              {UNIT_TYPE_COLORS[hoveredUnit.unitType]?.label}
            </span>
          </div>
          <div className="space-y-1 font-mono text-[11px] text-[#252622]">
            <div className="flex justify-between">
              <span className="text-[#6F7069]">3D ULPIN:</span>
              <span className="text-[#A85D48] font-semibold truncate max-w-[130px]">
                {hoveredUnit.ulpin3d}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6F7069]">Elevation:</span>
              <span className="text-[#788575] font-semibold">{hoveredUnit.elevationRange}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6F7069]">Carpet Area:</span>
              <span className="text-[#252622]">
                {hoveredUnit.carpetAreaSqM} m² ({hoveredUnit.volumeCuM} m³)
              </span>
            </div>
            <div className="flex justify-between pt-1 border-t border-[#E9E5DA] text-[10px]">
              <span className="text-[#6F7069]">Owner:</span>
              <span className="text-[#252622] truncate max-w-[140px]">{hoveredUnit.owner.name}</span>
            </div>
          </div>
          <p className="text-[9px] text-[#A85D48] mt-2 italic text-center">
            Click unit to inspect deed & clearances
          </p>
        </div>
      )}

      {/* Legend at Bottom Right */}
      <div className="absolute bottom-5 right-4 z-20 bg-[#F8F6F0]/95 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-[#D7D4CB] shadow-xl text-xs space-y-1.5">
        <span className="font-bold text-[11px] text-[#6F7069] uppercase tracking-wider block mb-1">
          Property Zone Legend
        </span>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
          {Object.entries(UNIT_TYPE_COLORS).map(([key, info]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: info.css }} />
              <span className="text-[#252622]">{info.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ThreeFloorStackViewer;
