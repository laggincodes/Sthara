from fastapi import APIRouter
from app.api.routes import (
    health,
    datasets,
    parcels,
    volumes,
    validation,
    ulpin,
    ai_advisor,
    spatial,
    elevation,
    buildings,
    properties,
    units,
)

api_router = APIRouter()

# Health router (active foundation)
api_router.include_router(health.router)

# Cadastral, Dataset, Spatial, Elevation, Building, and Property routers
api_router.include_router(datasets.router)
api_router.include_router(spatial.router)
api_router.include_router(elevation.router)
api_router.include_router(buildings.router)
api_router.include_router(properties.router)
api_router.include_router(units.router)
api_router.include_router(parcels.router)
api_router.include_router(volumes.router)
api_router.include_router(validation.router)
api_router.include_router(ulpin.router)
api_router.include_router(ai_advisor.router)

