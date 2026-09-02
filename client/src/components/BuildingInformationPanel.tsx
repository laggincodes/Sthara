import { Building2, CheckCircle2, MapPin, ShieldAlert } from "lucide-react";
import type { DetailedMapSelection } from "@/components/CesiumSpatialViewer";

type BuildingInformationPanelProps = {
  selection: DetailedMapSelection | null;
};

const unavailable = "Data not available / Not verified";

function valueFrom(properties: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = properties[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value))
      return String(value);
  }
  return null;
}

function formatNumber(value: number | null) {
  return value === null || !Number.isFinite(value)
    ? unavailable
    : value.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

function numberFrom(properties: Record<string, unknown>, keys: string[]) {
  const value = valueFrom(properties, keys);
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function centroidFromGeometry(geometry: unknown) {
  if (!geometry || typeof geometry !== "object") return null;
  const candidate = geometry as { coordinates?: unknown };
  const points: number[][] = [];
  const collect = (value: unknown) => {
    if (!Array.isArray(value)) return;
    if (
      value.length >= 2 &&
      typeof value[0] === "number" &&
      typeof value[1] === "number"
    ) {
      points.push([value[0], value[1]]);
      return;
    }
    value.forEach(collect);
  };
  collect(candidate.coordinates);
  if (!points.length) return null;
  const [longitude, latitude] = points.reduce(
    (sum, point) => [sum[0] + point[0], sum[1] + point[1]],
    [0, 0]
  );
  return {
    longitude: longitude / points.length,
    latitude: latitude / points.length,
  };
}

function Field({ label, children }: { label: string; children: string }) {
  return (
    <div className="building-info-field">
      <dt>{label}</dt>
      <dd className={children === unavailable ? "unavailable" : ""}>
        {children}
      </dd>
    </div>
  );
}

export function BuildingInformationPanel({
  selection,
}: BuildingInformationPanelProps) {
  if (!selection) {
    return (
      <section
        className="building-information-panel empty"
        aria-label="Building information panel"
      >
        <div className="building-information-heading">
          <div>
            <p>Building information</p>
            <h2>Select a visible building or search for a place</h2>
          </div>
          <Building2 size={18} />
        </div>
        <p className="building-information-empty-copy">
          Verified source fields will appear here. No ownership, parcel number,
          floor count, date, height, or ULPIN is inferred from the 3D view.
        </p>
      </section>
    );
  }

  const properties = selection.properties;
  const isOsm = selection.kind === "osm-3d-tile";
  const layer = valueFrom(properties, [
    "layer",
    "featureType",
    "recordType",
    "propertyType",
  ]);
  const isParcel =
    !isOsm && Boolean(layer && /parcel|plot|land|field/i.test(layer));
  const geometryCentroid = centroidFromGeometry(properties.geometry);
  const latitude =
    selection.coordinates?.latitude ??
    numberFrom(properties, ["latitude", "lat"]) ??
    geometryCentroid?.latitude ??
    null;
  const longitude =
    selection.coordinates?.longitude ??
    numberFrom(properties, ["longitude", "lon", "lng"]) ??
    geometryCentroid?.longitude ??
    null;
  const name =
    valueFrom(properties, ["name", "title", "buildingName"]) ?? unavailable;
  const location =
    valueFrom(properties, ["location", "address", "locality", "place"]) ??
    unavailable;
  const buildingType =
    valueFrom(properties, [
      "buildingType",
      "propertyType",
      "buildingUse",
      "use",
    ]) ?? unavailable;
  const builtDate =
    valueFrom(properties, [
      "establishedDate",
      "builtDate",
      "constructionDate",
      "yearBuilt",
    ]) ?? unavailable;
  const height = valueFrom(properties, [
    "approvedHeightMetres",
    "heightMetres",
    "buildingHeight",
  ])
    ? `${valueFrom(properties, ["approvedHeightMetres", "heightMetres", "buildingHeight"])} m`
    : unavailable;
  const hasApprovedFloorPlan =
    properties.officialFloorPlanApproved === true ||
    ["true", "t", "1"].includes(
      String(properties.officialFloorPlanApproved).toLowerCase()
    );
  const approvedFloorCount = numberFrom(properties, ["approvedFloorCount"]);
  const floorCount =
    hasApprovedFloorPlan && approvedFloorCount !== null
      ? Math.floor(approvedFloorCount)
      : null;
  const ownershipData = properties.ownershipData;
  const ownerName =
    properties.ownershipLinked === true
      ? ownershipData && typeof ownershipData === "object"
        ? valueFrom(ownershipData as Record<string, unknown>, ["ownerName"])
        : valueFrom(properties, ["ownerName"])
      : null;
  const parcel = valueFrom(properties, [
    "parcelReference",
    "plotNumber",
    "khesraNumber",
    "khasraNumber",
  ]);
  const area = valueFrom(properties, [
    "areaSquareMetres",
    "footprintAreaSquareMetres",
    "area",
  ]);
  const sourceUlpIn = selection.ulpin ?? valueFrom(properties, ["ulpin"]);
  const verticalUlpIn = valueFrom(properties, [
    "verticalUlpIn",
    "verticalULPIN",
    "verticalUlpin",
    "verticalUlpInRecord",
  ]);
  const source =
    valueFrom(properties, ["source", "sourceReference"]) ??
    selection.sourceReference;
  const verification = isOsm
    ? "OSM visual context only; official property data is not available for this location."
    : properties.ownershipLinked === true ||
        properties.approvedHeightMetres !== null
      ? "Live source record; individual fields shown only when present in the source."
      : "Source geometry located; official property data is not available for this location.";

  return (
    <section
      className="building-information-panel"
      aria-label="Building information panel"
    >
      <div className="building-information-heading">
        <div>
          <p>{isParcel ? "Parcel information" : "Building information"}</p>
          <h2>{name}</h2>
        </div>
        {isOsm ? <ShieldAlert size={18} /> : <CheckCircle2 size={18} />}
      </div>
      <div
        className={`building-information-status ${isOsm ? "unverified" : "source-backed"}`}
      >
        {isOsm
          ? "VISUAL CONTEXT · NOT AUTHORITATIVE"
          : "SOURCE-BACKED SELECTION"}
      </div>
      <dl className="building-information-grid">
        <Field label="Exact / available location">{location}</Field>
        <Field label="Latitude">{formatNumber(latitude)}</Field>
        <Field label="Longitude">{formatNumber(longitude)}</Field>
        {!isParcel && (
          <Field label="Institution / building type">{buildingType}</Field>
        )}
        {!isParcel && (
          <Field label="Established / built date">{builtDate}</Field>
        )}
        {!isParcel && (
          <Field label="Number of floors">
            {floorCount === null ? unavailable : String(floorCount)}
          </Field>
        )}
        <Field label={isParcel ? "Area" : "Footprint / area"}>
          {area
            ? `${area}${/m²|sqm|square/i.test(area) ? "" : " m²"}`
            : unavailable}
        </Field>
        {!isParcel && <Field label="Building height">{height}</Field>}
        <Field
          label={isParcel ? "Plot / Khesra number" : "Plot / Parcel number"}
        >
          {parcel ?? unavailable}
        </Field>
        <Field label={isParcel ? "Parcel / ULPIN" : "3D ULPIN"}>
          {sourceUlpIn ?? unavailable}
        </Field>
        {!isParcel && (
          <Field label="Vertical ULPIN">{verticalUlpIn ?? unavailable}</Field>
        )}
        <Field label="Owner / name (verified only)">
          {ownerName ?? unavailable}
        </Field>
        <Field label="Source">{source}</Field>
      </dl>
      <div className="building-information-floors">
        <div>
          <span>Floor-by-floor information</span>
          <b>
            {floorCount === null
              ? unavailable
              : `${floorCount + 1} verified levels`}
          </b>
        </div>
        {floorCount === null ? (
          <p>
            Ground, Floor 1, Floor 2, and higher levels are not verified for
            this selection.
          </p>
        ) : (
          <div className="building-floor-list">
            {Array.from({ length: floorCount + 1 }, (_, index) => (
              <span key={index}>
                {index === 0 ? "Ground" : `Floor ${index}`}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="building-information-verification">
        <MapPin size={14} />
        <span>
          <b>Source / verification status</b>
          {verification}
        </span>
      </div>
    </section>
  );
}

export default BuildingInformationPanel;
