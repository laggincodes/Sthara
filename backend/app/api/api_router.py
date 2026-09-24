from fastapi import APIRouter
from app.api.routes import (
    health,
    datasets,
    parcels,
    volumes,
    validation,
    ulpin,
    ai_extraction,
    spatial,
    elevation,
    buildings,
    properties,
    units,
    fusion,
    underground,
    topology,
    osm_converter,
    datameet,
    floor_plans,
    building_blueprints,
    spatial_analysis,
    measurements,
    quality,
    sources,
    reports,
    demo,
    drawing_intelligence,
    project_data,
)

api_router = APIRouter()

# Health router (active foundation)
api_router.include_router(health.router)

# Cadastral, Dataset, Spatial, Elevation, Building, Property, Units, Fusion, Underground, Topology, and DataMeet routers
api_router.include_router(datasets.router)
api_router.include_router(spatial.router)
api_router.include_router(elevation.router)
api_router.include_router(buildings.router)
api_router.include_router(osm_converter.router)
api_router.include_router(osm_converter.export_router)
api_router.include_router(datameet.router)
api_router.include_router(properties.router)
api_router.include_router(units.router)
api_router.include_router(fusion.router)
api_router.include_router(underground.router)
api_router.include_router(topology.router)
api_router.include_router(parcels.router)
api_router.include_router(volumes.router)
api_router.include_router(validation.router)
api_router.include_router(ulpin.router)
api_router.include_router(ai_extraction.router)
api_router.include_router(floor_plans.router)
api_router.include_router(building_blueprints.router, prefix="/building-blueprints")
api_router.include_router(building_blueprints.router, prefix="/blueprints")
api_router.include_router(spatial_analysis.router)
api_router.include_router(measurements.router)
api_router.include_router(quality.router)
api_router.include_router(sources.router)
api_router.include_router(reports.router)
api_router.include_router(demo.router)
api_router.include_router(drawing_intelligence.router)
api_router.include_router(project_data.router)




