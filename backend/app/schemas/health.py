from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = Field(default="ok", description="Service health indicator")
    service: str = Field(default="3D Cadastral Intelligence API", description="Service title")
