import pytest
from fastapi import status


def test_root_endpoint(client):
    """Test root service endpoint responds with 200 and docs link."""
    response = client.get("/")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "service" in data
    assert "docs_url" in data
    assert data["health_check"] == "/api/v1/health"


def test_health_check_endpoint(client):
    """Test genuine GET /api/v1/health returns HTTP 200 and expected payload."""
    response = client.get("/api/v1/health")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data == {
        "status": "ok",
        "service": "3D Cadastral Intelligence API",
    }


def test_openapi_schema_endpoint(client):
    """Test OpenAPI JSON schema is generated and accessible."""
    response = client.get("/api/v1/openapi.json")
    assert response.status_code == status.HTTP_200_OK
    schema = response.json()
    assert "openapi" in schema
    assert "paths" in schema
    assert "/api/v1/health" in schema["paths"]


def test_placeholder_parcels_route(client):
    """Test placeholder routes return HTTP 501 Not Implemented."""
    response = client.get("/api/v1/parcels/PARCEL-001")
    assert response.status_code == status.HTTP_501_NOT_IMPLEMENTED
    data = response.json()
    assert data["status"] == "not_implemented"
    assert "PHASE 4" in data["phase_target"]


def test_placeholder_validation_route(client):
    """Test placeholder validation route returns HTTP 501 Not Implemented."""
    response = client.post("/api/v1/validation/run")
    assert response.status_code == status.HTTP_501_NOT_IMPLEMENTED
    data = response.json()
    assert data["status"] == "not_implemented"
    assert "PHASE 7" in data["phase_target"]
