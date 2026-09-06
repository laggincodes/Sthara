from typing import Any, Generic, Optional, TypeVar
from datetime import datetime, timezone
from pydantic import BaseModel, Field

T = TypeVar("T")


class ResponseEnvelope(BaseModel, Generic[T]):
    status: str = Field(default="success", description="Operation status ('success' or 'error')")
    data: T = Field(..., description="Payload data")
    message: str = Field(default="Operation completed successfully", description="Status description")
    timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="ISO 8601 UTC timestamp",
    )


class ErrorEnvelope(BaseModel):
    status: str = Field(default="error", description="Error status identifier")
    error_code: str = Field(..., description="Machine-readable error classification")
    message: str = Field(..., description="Human-readable explanation of error")
    details: Optional[Any] = Field(default=None, description="Granular error attributes if applicable")
    timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="ISO 8601 UTC timestamp",
    )


class NotImplementedResponse(BaseModel):
    status: str = Field(default="not_implemented", description="Status tag")
    message: str = Field(..., description="Notice that endpoint is defined but scheduled for future phase")
    endpoint: str = Field(..., description="Requested API route")
    phase_target: str = Field(..., description="Target implementation phase from PHASES.md")
