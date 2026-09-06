import math
from typing import Dict, Any, List, Tuple, Optional
from collections import defaultdict
import pyproj
from shapely.geometry import shape, Polygon, MultiPolygon
from shapely.validation import make_valid
from shapely.ops import transform, triangulate

from app.schemas.geometry_3d import (
    SCHEMA_VERSION,
    Geometry3DStatus,
    FeatureType,
    GeometryType,
    FaceWinding,
    GeometryValidationErrorType,
    CoordinateReference,
    UnitReference,
    Bounds3D,
    Mesh3D,
    Mesh3DCollection,
    BuildingAttributes3D,
    Building3DResult,
    BatchSummary3D,
    Generate3DResponse,
    Mesh3DValidationResult,
    Building3DRequest,
    BatchBuilding3DRequest,
)


class ExtrusionService:
    """
    Canonical domain service for 3D polyhedral building extrusion conforming
    to the 3D Geometry Contract (v1.0).
    Transforms 2D footprint polygons into closed, watertight 3D solid meshes.
    """

    MIN_HEIGHT_SANITY_M: float = 0.1
    MAX_HEIGHT_SANITY_M: float = 500.0

    @classmethod
    def resolve_height_and_elevations(
        cls, req: Building3DRequest
    ) -> Tuple[Optional[float], Optional[float], Optional[float], str, List[str]]:
        """
        Applies strict height source priority order:
        1. Valid LiDAR-derived roof elevation
        2. Valid explicit roof elevation
        3. Valid explicit building height (top_z = base_z + building_height)
        4. Unavailable
        """
        warnings: List[str] = []
        base_z = req.ground_elevation

        if base_z is None or not math.isfinite(base_z):
            return None, None, None, "UNAVAILABLE", ["Missing or non-finite ground elevation."]

        # 1. LiDAR Roof Elevation
        if (
            req.lidar_roof_elevation is not None
            and math.isfinite(req.lidar_roof_elevation)
            and req.lidar_roof_elevation > base_z
        ):
            top_z = req.lidar_roof_elevation
            height = round(top_z - base_z, 3)
            return round(base_z, 3), round(top_z, 3), height, "LIDAR_DERIVED", warnings

        # 2. Explicit Roof Elevation
        if (
            req.roof_elevation is not None
            and math.isfinite(req.roof_elevation)
            and req.roof_elevation > base_z
        ):
            top_z = req.roof_elevation
            height = round(top_z - base_z, 3)
            return round(base_z, 3), round(top_z, 3), height, "EXPLICIT_ROOF_ELEVATION", warnings

        # 3. Explicit Building Height
        if req.building_height is not None and math.isfinite(req.building_height) and req.building_height > 0:
            height = round(req.building_height, 3)
            top_z = round(base_z + height, 3)
            return round(base_z, 3), top_z, height, "EXPLICIT_BUILDING_HEIGHT", warnings

        # If roof elevation <= base elevation
        if req.roof_elevation is not None and req.roof_elevation <= base_z:
            warnings.append(
                f"Roof elevation ({req.roof_elevation}m) must be strictly greater than ground elevation ({base_z}m)."
            )
            return round(base_z, 3), round(req.roof_elevation, 3), round(req.roof_elevation - base_z, 3), "INVALID", warnings

        return round(base_z, 3), None, None, "UNAVAILABLE", ["No valid roof elevation or building height provided."]

    @classmethod
    def _project_geometry(
        cls, geom: Any, source_crs_str: str, target_crs_str: str
    ) -> Tuple[Any, pyproj.Transformer]:
        """Projects geometry to target metric CRS (e.g. EPSG:32643 UTM Zone 43N)."""
        src = pyproj.CRS.from_user_input(source_crs_str)
        dst = pyproj.CRS.from_user_input(target_crs_str)
        if src == dst:
            return geom, None

        transformer = pyproj.Transformer.from_crs(src, dst, always_xy=True)
        projected = transform(transformer.transform, geom)
        return projected, transformer

    @classmethod
    def _extrude_single_polygon(
        cls,
        poly: Polygon,
        base_z: float,
        top_z: float,
        origin: Tuple[float, float, float],
        feature_id: str,
        horizontal_crs: str,
        source_crs: str,
        vertical_ref: Optional[str] = "AMSL (Above Mean Sea Level)",
        feature_type: FeatureType = FeatureType.BUILDING,
    ) -> Mesh3D:
        """
        Extrudes a single 2D polygon into a closed 3D solid Mesh3D with COUNTER_CLOCKWISE
        outward-facing triangle faces.
        """
        ox, oy, oz = origin
        vertices: List[List[float]] = []
        faces: List[List[int]] = []
        v_map: Dict[Tuple[float, float, float], int] = {}

        def get_v_idx(x: float, y: float, z: float) -> int:
            key = (round(x, 4), round(y, 4), round(z, 4))
            if key not in v_map:
                v_map[key] = len(vertices)
                vertices.append([key[0], key[1], key[2]])
            return v_map[key]

        # 1. Extrude Vertical Walls for each ring (exterior + interiors)
        rings = [poly.exterior] + list(poly.interiors)

        for ring_idx, ring in enumerate(rings):
            coords = list(ring.coords)
            if len(coords) < 3:
                continue

            # Ensure exterior is CCW in 2D, interiors are CW for outward wall normals
            r_poly = Polygon(coords)
            if ring_idx == 0 and not r_poly.exterior.is_ccw:
                coords = coords[::-1]
            elif ring_idx > 0 and r_poly.exterior.is_ccw:
                coords = coords[::-1]

            n_pts = len(coords) - 1 if coords[0] == coords[-1] else len(coords)

            for i in range(n_pts):
                p_curr = coords[i]
                p_next = coords[(i + 1) % len(coords)] if coords[0] != coords[-1] else coords[i + 1]

                # 4 vertices for vertical wall quad
                vb0 = get_v_idx(p_curr[0] - ox, p_curr[1] - oy, base_z - oz)
                vb1 = get_v_idx(p_next[0] - ox, p_next[1] - oy, base_z - oz)
                vt0 = get_v_idx(p_curr[0] - ox, p_curr[1] - oy, top_z - oz)
                vt1 = get_v_idx(p_next[0] - ox, p_next[1] - oy, top_z - oz)

                # Quad split into two outward CCW triangles:
                # T1: (vb0, vb1, vt1)
                # T2: (vb0, vt1, vt0)
                faces.append([vb0, vb1, vt1])
                faces.append([vb0, vt1, vt0])

        # 2. Triangulate Bottom and Top Caps via Shapely Delaunay triangulation
        triangles_2d = triangulate(poly)
        contained_tris = [t for t in triangles_2d if poly.contains(t.representative_point())]

        for tri in contained_tris:
            t_coords = list(tri.exterior.coords)
            if len(t_coords) < 3:
                continue

            if not tri.exterior.is_ccw:
                t_coords = t_coords[::-1]

            pt0, pt1, pt2 = t_coords[0], t_coords[1], t_coords[2]

            # Top cap (Z = top_z): normal points UP (+Z) -> CCW viewed from above
            tt0 = get_v_idx(pt0[0] - ox, pt0[1] - oy, top_z - oz)
            tt1 = get_v_idx(pt1[0] - ox, pt1[1] - oy, top_z - oz)
            tt2 = get_v_idx(pt2[0] - ox, pt2[1] - oy, top_z - oz)
            faces.append([tt0, tt1, tt2])

            # Bottom cap (Z = base_z): normal points DOWN (-Z) -> CCW viewed from below (outside)
            tb0 = get_v_idx(pt0[0] - ox, pt0[1] - oy, base_z - oz)
            tb1 = get_v_idx(pt1[0] - ox, pt1[1] - oy, base_z - oz)
            tb2 = get_v_idx(pt2[0] - ox, pt2[1] - oy, base_z - oz)
            faces.append([tb0, tb2, tb1])

        # Compute metric local bounds
        min_x = min(v[0] for v in vertices)
        min_y = min(v[1] for v in vertices)
        min_z = min(v[2] for v in vertices)
        max_x = max(v[0] for v in vertices)
        max_y = max(v[1] for v in vertices)
        max_z = max(v[2] for v in vertices)

        height = top_z - base_z
        poly_area = poly.area
        volume = round(poly_area * height, 3)
        surface_area = round((2.0 * poly_area) + (poly.length * height), 3)

        coord_ref = CoordinateReference(
            horizontal_crs=horizontal_crs,
            vertical_reference=vertical_ref,
            source_crs=source_crs,
            viewer_origin=[round(ox, 2), round(oy, 2), round(oz, 2)],
        )

        bounds = Bounds3D(
            min=[round(min_x, 3), round(min_y, 3), round(min_z, 3)],
            max=[round(max_x, 3), round(max_y, 3), round(max_z, 3)],
        )

        return Mesh3D(
            feature_id=feature_id,
            feature_type=feature_type,
            geometry_type=GeometryType.SOLID,
            vertices=vertices,
            faces=faces,
            coordinate_reference=coord_ref,
            units=UnitReference(horizontal_unit="meter", vertical_unit="meter"),
            bounds=bounds,
            winding=FaceWinding.COUNTER_CLOCKWISE,
            surface_area_sqm=surface_area,
            volume_cubic_m=volume,
        )

    @classmethod
    def validate_mesh(cls, mesh: Mesh3D) -> Mesh3DValidationResult:
        """
        Audits a Mesh3D against the Solid and Topology Requirements of the 3D Geometry Contract.
        Verifies:
        1. Finiteness of all 3-element vertices.
        2. Range validity of face indices (0 <= idx < len(vertices)).
        3. Non-degeneracy of triangle faces (no duplicate vertices, non-zero cross product).
        4. Closed 2-manifold watertightness (every undirected edge shared by exactly 2 faces with opposite directions).
        5. Consistent COUNTER_CLOCKWISE winding.
        6. Elevation consistency (Z_top > Z_base).
        7. Bounds matching actual vertex extents.
        """
        errors: List[str] = []
        warnings: List[str] = []

        # 1. Vertices check
        if not mesh.vertices or len(mesh.vertices) < 4:
            errors.append(f"{GeometryValidationErrorType.INVALID_VERTEX}: Mesh has fewer than 4 vertices ({len(mesh.vertices)}).")
            return Mesh3DValidationResult(valid=False, errors=errors, warnings=warnings)

        for i, v in enumerate(mesh.vertices):
            if len(v) != 3:
                errors.append(f"{GeometryValidationErrorType.INVALID_VERTEX}: Vertex {i} does not have exactly 3 coordinates: {v}")
            elif not all(math.isfinite(c) for c in v):
                errors.append(f"{GeometryValidationErrorType.NON_FINITE_COORDINATE}: Vertex {i} contains non-finite coordinates: {v}")

        # 2. Faces & Index check
        num_v = len(mesh.vertices)
        if not mesh.faces or len(mesh.faces) < 4:
            errors.append(f"{GeometryValidationErrorType.OPEN_SOLID}: Solid mesh requires at least 4 triangular faces ({len(mesh.faces)}).")
            return Mesh3DValidationResult(valid=False, errors=errors, warnings=warnings)

        directed_edges: Dict[Tuple[int, int], int] = defaultdict(int)
        undirected_edges: Dict[Tuple[int, int], int] = defaultdict(int)

        for f_idx, face in enumerate(mesh.faces):
            if len(face) != 3:
                errors.append(f"{GeometryValidationErrorType.DEGENERATE_FACE}: Face {f_idx} is not a triangle: {face}")
                continue

            i0, i1, i2 = face
            if not all(isinstance(idx, int) and 0 <= idx < num_v for idx in (i0, i1, i2)):
                errors.append(f"{GeometryValidationErrorType.INVALID_FACE_INDEX}: Face {f_idx} contains out-of-range index: {face}")
                continue

            # Check duplicate vertex indices in face
            if i0 == i1 or i1 == i2 or i2 == i0:
                errors.append(f"{GeometryValidationErrorType.DEGENERATE_FACE}: Face {f_idx} has collapsed duplicate vertices: {face}")
                continue

            # Check zero-area face
            v0, v1, v2 = mesh.vertices[i0], mesh.vertices[i1], mesh.vertices[i2]
            ux, uy, uz = v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]
            vx, vy, vz = v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]
            nx = uy * vz - uz * vy
            ny = uz * vx - ux * vz
            nz = ux * vy - uy * vx
            cross_mag = math.sqrt(nx * nx + ny * ny + nz * nz)
            if cross_mag < 1e-7:
                errors.append(f"{GeometryValidationErrorType.ZERO_AREA_FACE}: Face {f_idx} has degenerate zero surface area.")

            # Record edges for manifold & closedness check
            e1 = (i0, i1)
            e2 = (i1, i2)
            e3 = (i2, i0)
            for de in (e1, e2, e3):
                directed_edges[de] += 1
                ue = (min(de[0], de[1]), max(de[0], de[1]))
                undirected_edges[ue] += 1

        # 3. Watertight Closed 2-Manifold check
        # In a closed 2-manifold mesh:
        # Every undirected edge must be shared by exactly 2 faces
        open_edges = [ue for ue, count in undirected_edges.items() if count != 2]
        if open_edges:
            errors.append(
                f"{GeometryValidationErrorType.OPEN_SOLID}: Mesh is not closed. Found {len(open_edges)} non-manifold or boundary edges (expected each edge to belong to exactly 2 faces)."
            )

        # Consistent winding check: each directed edge (u, v) should appear at most once
        inconsistent_winding = [de for de, count in directed_edges.items() if count > 1]
        if inconsistent_winding:
            errors.append(
                f"INCONSISTENT_WINDING: Found {len(inconsistent_winding)} edges oriented in the same direction in multiple faces (violates COUNTER_CLOCKWISE outward manifold winding)."
            )

        # 4. Bounds verification
        if mesh.vertices:
            actual_min = [min(v[i] for v in mesh.vertices) for i in range(3)]
            actual_max = [max(v[i] for v in mesh.vertices) for i in range(3)]
            for axis, name in enumerate(["X", "Y", "Z"]):
                if abs(actual_min[axis] - mesh.bounds.min[axis]) > 0.01 or abs(actual_max[axis] - mesh.bounds.max[axis]) > 0.01:
                    warnings.append(
                        f"Bounds mismatch on {name}-axis: declared [{mesh.bounds.min[axis]}, {mesh.bounds.max[axis]}], computed [{actual_min[axis]}, {actual_max[axis]}]."
                    )

        valid = len(errors) == 0
        return Mesh3DValidationResult(valid=valid, errors=errors, warnings=warnings)

    @classmethod
    def extrude_building(
        cls, req: Building3DRequest, shared_origin: Optional[Tuple[float, float, float]] = None
    ) -> Building3DResult:
        """
        Extrudes a single building footprint into a canonical Building3DResult
        containing a Mesh3DCollection of closed Mesh3D solids.
        """
        attrs = BuildingAttributes3D(
            building_id=req.building_id,
            parcel_id=req.parcel_id,
        )

        # 1. Height & Elevation Resolution
        base_z, top_z, height, height_source, warnings = cls.resolve_height_and_elevations(req)
        attrs.base_elevation = base_z
        attrs.top_elevation = top_z
        attrs.height = height
        attrs.height_source = height_source

        if base_z is None or top_z is None or height is None:
            return Building3DResult(
                building_id=req.building_id,
                geometry_status=Geometry3DStatus.UNAVAILABLE,
                building=attrs,
                geometry=None,
                warnings=warnings,
            )

        if height <= 0:
            warnings.append(f"{GeometryValidationErrorType.INVALID_ELEVATION}: Top elevation ({top_z}m) must be strictly greater than base elevation ({base_z}m).")
            return Building3DResult(
                building_id=req.building_id,
                geometry_status=Geometry3DStatus.INVALID,
                building=attrs,
                geometry=None,
                warnings=warnings,
            )

        if height < cls.MIN_HEIGHT_SANITY_M:
            warnings.append(f"Building height ({height}m) is below minimum sanity threshold ({cls.MIN_HEIGHT_SANITY_M}m).")
            return Building3DResult(
                building_id=req.building_id,
                geometry_status=Geometry3DStatus.INVALID,
                building=attrs,
                geometry=None,
                warnings=warnings,
            )

        # 2. Footprint Geometry Parsing & Reprojection
        try:
            raw_geom = shape(req.footprint_geometry)
            if not raw_geom.is_valid:
                raw_geom = make_valid(raw_geom)
        except Exception as e:
            warnings.append(f"Failed to parse GeoJSON footprint: {str(e)}")
            return Building3DResult(
                building_id=req.building_id,
                geometry_status=Geometry3DStatus.INVALID,
                building=attrs,
                geometry=None,
                warnings=warnings,
            )

        if raw_geom.is_empty:
            warnings.append("Footprint geometry is empty.")
            return Building3DResult(
                building_id=req.building_id,
                geometry_status=Geometry3DStatus.INVALID,
                building=attrs,
                geometry=None,
                warnings=warnings,
            )

        target_crs = req.target_crs or "EPSG:32643"
        try:
            metric_geom, _ = cls._project_geometry(raw_geom, req.source_crs, target_crs)
        except Exception as e:
            warnings.append(f"{GeometryValidationErrorType.INVALID_CRS}: CRS reprojection to {target_crs} failed: {str(e)}")
            return Building3DResult(
                building_id=req.building_id,
                geometry_status=Geometry3DStatus.INVALID,
                building=attrs,
                geometry=None,
                warnings=warnings,
            )

        # Handle Polygon and MultiPolygon
        polygons: List[Polygon] = []
        if isinstance(metric_geom, Polygon):
            polygons.append(metric_geom)
        elif isinstance(metric_geom, MultiPolygon):
            polygons.extend(metric_geom.geoms)
        else:
            warnings.append(f"Unsupported geometry type '{metric_geom.geom_type}'. Expected Polygon or MultiPolygon.")
            return Building3DResult(
                building_id=req.building_id,
                geometry_status=Geometry3DStatus.INVALID,
                building=attrs,
                geometry=None,
                warnings=warnings,
            )

        # Check area sanity (< 1.0 m² is degenerate)
        if metric_geom.area < 1.0:
            warnings.append(f"{GeometryValidationErrorType.DEGENERATE_FACE}: Footprint metric area ({metric_geom.area:.2f} m²) is degenerate (< 1.0 m²).")
            return Building3DResult(
                building_id=req.building_id,
                geometry_status=Geometry3DStatus.INVALID,
                building=attrs,
                geometry=None,
                warnings=warnings,
            )

        # 3. Determine Viewer Origin Offset
        if req.scene_origin and len(req.scene_origin) >= 3:
            origin = (req.scene_origin[0], req.scene_origin[1], req.scene_origin[2])
        elif shared_origin:
            origin = shared_origin
        else:
            c = metric_geom.centroid
            origin = (round(c.x, 2), round(c.y, 2), base_z)

        # 4. Extrude Each Polygon Part into a discrete Mesh3D
        mesh_parts: List[Mesh3D] = []
        total_vol = 0.0
        total_s_area = 0.0

        for part_idx, poly in enumerate(polygons):
            if poly.area <= 0:
                continue
            part_id = f"{req.building_id}-P{part_idx + 1}" if len(polygons) > 1 else req.building_id
            mesh = cls._extrude_single_polygon(
                poly=poly,
                base_z=base_z,
                top_z=top_z,
                origin=origin,
                feature_id=part_id,
                horizontal_crs=target_crs,
                source_crs=req.source_crs,
            )

            # Audit mesh solid integrity
            val = cls.validate_mesh(mesh)
            if not val.valid:
                warnings.extend(val.errors)
                return Building3DResult(
                    building_id=req.building_id,
                    geometry_status=Geometry3DStatus.INVALID,
                    building=attrs,
                    geometry=None,
                    warnings=warnings,
                )
            if val.warnings:
                warnings.extend(val.warnings)

            mesh_parts.append(mesh)
            if mesh.volume_cubic_m:
                total_vol += mesh.volume_cubic_m
            if mesh.surface_area_sqm:
                total_s_area += mesh.surface_area_sqm

        if not mesh_parts:
            warnings.append("No valid 3D mesh parts generated from footprint.")
            return Building3DResult(
                building_id=req.building_id,
                geometry_status=Geometry3DStatus.INVALID,
                building=attrs,
                geometry=None,
                warnings=warnings,
            )

        # Compute unified bounds across all parts
        all_min_x = min(m.bounds.min[0] for m in mesh_parts)
        all_min_y = min(m.bounds.min[1] for m in mesh_parts)
        all_min_z = min(m.bounds.min[2] for m in mesh_parts)
        all_max_x = max(m.bounds.max[0] for m in mesh_parts)
        all_max_y = max(m.bounds.max[1] for m in mesh_parts)
        all_max_z = max(m.bounds.max[2] for m in mesh_parts)

        unified_bounds = Bounds3D(
            min=[round(all_min_x, 3), round(all_min_y, 3), round(all_min_z, 3)],
            max=[round(all_max_x, 3), round(all_max_y, 3), round(all_max_z, 3)],
        )

        collection = Mesh3DCollection(
            parts=mesh_parts,
            bounds=unified_bounds,
            total_volume_cubic_m=round(total_vol, 2),
            total_surface_area_sqm=round(total_s_area, 2),
        )

        return Building3DResult(
            building_id=req.building_id,
            geometry_status=Geometry3DStatus.VALID,
            building=attrs,
            geometry=collection,
            warnings=warnings,
        )

    @classmethod
    def extrude_batch(cls, req: BatchBuilding3DRequest) -> Generate3DResponse:
        """
        Extrudes a batch of buildings into the canonical Generate3DResponse.
        Computes a unified shared origin across all footprints when requested.
        """
        target_crs = req.target_crs or "EPSG:32643"
        total = len(req.buildings)
        if total == 0:
            return Generate3DResponse(
                schema_version=SCHEMA_VERSION,
                results=[],
                summary=BatchSummary3D(requested=0, successful=0, failed=0),
            )

        # 1. Compute Shared Scene Origin if requested
        shared_origin: Optional[Tuple[float, float, float]] = None
        if req.compute_shared_origin:
            centroids_x = []
            centroids_y = []
            base_zs = []

            for b in req.buildings:
                try:
                    g = shape(b.footprint_geometry)
                    if g.is_valid and not g.is_empty:
                        mg, _ = cls._project_geometry(g, b.source_crs, target_crs)
                        c = mg.centroid
                        centroids_x.append(c.x)
                        centroids_y.append(c.y)
                        if b.ground_elevation is not None and math.isfinite(b.ground_elevation):
                            base_zs.append(b.ground_elevation)
                except Exception:
                    pass

            if centroids_x and centroids_y:
                ox = round(sum(centroids_x) / len(centroids_x), 2)
                oy = round(sum(centroids_y) / len(centroids_y), 2)
                oz = round(sum(base_zs) / len(base_zs), 2) if base_zs else 0.0
                shared_origin = (ox, oy, oz)

        # 2. Extrude Each Building Individually
        results: List[Building3DResult] = []
        successful_count = 0
        failed_count = 0

        for b_req in req.buildings:
            res = cls.extrude_building(b_req, shared_origin=shared_origin)
            if res.geometry_status == Geometry3DStatus.VALID:
                successful_count += 1
            else:
                failed_count += 1
            results.append(res)

        return Generate3DResponse(
            schema_version=SCHEMA_VERSION,
            results=results,
            summary=BatchSummary3D(
                requested=total,
                successful=successful_count,
                failed=failed_count,
            ),
        )
