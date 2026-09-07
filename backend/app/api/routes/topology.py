"""
Unified Topology & Spatial Conflict Engine API Router.

Exposes endpoints for comprehensive multi-tier topological validation
and demonstration bundles conforming to SIH PPT 06 TOPOLOGY:
- Overlap Check
- Containment
- Duplicates
"""

from fastapi import APIRouter, status
from app.schemas.topology import (
    TopologyValidationRequest,
    TopologyValidationResponse,
    DemoTopologyResponse,
)
from app.services.topology_service import TopologyService

router = APIRouter(prefix="/topology", tags=["Topology & Spatial Conflicts"])


from fastapi import Query

@router.get(
    "/demo",
    response_model=DemoTopologyResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve realistic multi-tier demonstration scene with benchmark topology checks",
)
async def get_demo_topology_bundle(
    scenario: str = Query(
        default="conflict",
        description="Scenario: 'valid' (clean party-wall units, 0 conflicts) or 'conflict'/'invalid' (positive-volume overlap detected)",
    ),
) -> DemoTopologyResponse:
    """
    Returns an end-to-end multi-tier cadastral scene demonstrating:
    - 'valid': Clean units 101 & 102 with valid party-wall contact and 0 conflicts
    - 'conflict': Deliberate positive-volume encroachment (Unit 103 overlapping Unit 102)
    """
    return TopologyService.get_demo_topology_bundle(scenario=scenario)


@router.post(
    "/validate",
    response_model=TopologyValidationResponse,
    status_code=status.HTTP_200_OK,
    summary="Execute comprehensive topological and spatial conflict audit across cadastral tiers",
)
async def validate_topology(
    request: TopologyValidationRequest,
) -> TopologyValidationResponse:
    """
    Evaluates topological integrity across:
    - 2D horizontal non-overlap (parcels, buildings, units on same floor)
    - 2D footprint containment (building in parcel, unit in building, basement in parcel)
    - Vertical interval order and floor containment
    - Sibling duplicate IDs and duplicate geometries
    - Canonical 3D mesh watertightness and manifoldness (Contract v1.0)
    - Subsurface physical clashes and proximity buffer clearances
    - Hierarchical reference chain integrity
    """
    return TopologyService.validate_full_topology(request)
