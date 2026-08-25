export type GcpPair = {
  id: string;
  featureDescription: string;
  planPixel: { x: number; y: number };
  wgs84: { latitude: number; longitude: number };
};

export type GcpValidationResult = {
  valid: boolean;
  controlPointCount: number;
  uniquePlanPixels: boolean;
  uniqueWgs84Coordinates: boolean;
  allPointsWithinDeclaredPlanBounds: boolean;
  finiteCoordinates: boolean;
  nonCollinear: boolean;
  plausibleLocalSpread: boolean;
  issues: string[];
};

type PlanBounds = { widthPixels: number; heightPixels: number };

const coordinateKey = (value: number) => value.toFixed(10);

function hasNonCollinearTriplet(points: readonly GcpPair[]) {
  for (let first = 0; first < points.length - 2; first += 1) {
    for (let second = first + 1; second < points.length - 1; second += 1) {
      for (let third = second + 1; third < points.length; third += 1) {
        const a = points[first].planPixel;
        const b = points[second].planPixel;
        const c = points[third].planPixel;
        const signedDoubleArea =
          a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y);
        if (Math.abs(signedDoubleArea) > 1e-6) return true;
      }
    }
  }
  return false;
}

/**
 * Validates only the numerical suitability of submitted control-point pairs.
 * A passing result is not a survey, cadastral, ownership, or publication
 * approval and must never unlock an authoritative PostGIS write on its own.
 */
export function validateGcpPairs(
  points: readonly GcpPair[],
  planBounds?: PlanBounds
): GcpValidationResult {
  const issues: string[] = [];
  const controlPointCount = points.length;
  if (controlPointCount < 3)
    issues.push("At least three control-point pairs are required.");

  const finiteCoordinates = points.every(
    point =>
      point.id.trim().length > 0 &&
      point.featureDescription.trim().length > 0 &&
      Number.isFinite(point.planPixel.x) &&
      Number.isFinite(point.planPixel.y) &&
      Number.isFinite(point.wgs84.latitude) &&
      Number.isFinite(point.wgs84.longitude) &&
      point.wgs84.latitude >= -90 &&
      point.wgs84.latitude <= 90 &&
      point.wgs84.longitude >= -180 &&
      point.wgs84.longitude <= 180
  );
  if (!finiteCoordinates)
    issues.push("Every pair needs a description, finite plan pixels, and valid WGS84 coordinates.");

  const uniquePlanPixels =
    new Set(points.map(point => `${point.planPixel.x}:${point.planPixel.y}`))
      .size === controlPointCount;
  if (!uniquePlanPixels)
    issues.push("Duplicate plan-pixel control points are not usable.");

  const uniqueWgs84Coordinates =
    new Set(
      points.map(
        point =>
          `${coordinateKey(point.wgs84.latitude)}:${coordinateKey(point.wgs84.longitude)}`
      )
    ).size === controlPointCount;
  if (!uniqueWgs84Coordinates)
    issues.push("Duplicate WGS84 control points are not usable.");

  const allPointsWithinDeclaredPlanBounds =
    !planBounds ||
    points.every(
      point =>
        point.planPixel.x >= 0 &&
        point.planPixel.y >= 0 &&
        point.planPixel.x <= planBounds.widthPixels &&
        point.planPixel.y <= planBounds.heightPixels
    );
  if (!allPointsWithinDeclaredPlanBounds)
    issues.push("A plan-pixel control point falls outside the declared plan bounds.");

  const nonCollinear = hasNonCollinearTriplet(points);
  if (!nonCollinear)
    issues.push("At least three non-collinear plan-pixel control points are required.");

  const latitudes = points.map(point => point.wgs84.latitude);
  const longitudes = points.map(point => point.wgs84.longitude);
  const plausibleLocalSpread =
    points.length === 0 ||
    (Math.max(...latitudes) - Math.min(...latitudes) <= 0.25 &&
      Math.max(...longitudes) - Math.min(...longitudes) <= 0.25);
  if (!plausibleLocalSpread)
    issues.push("WGS84 points span an implausibly large area for one plan.");

  return {
    valid:
      issues.length === 0 &&
      finiteCoordinates &&
      uniquePlanPixels &&
      uniqueWgs84Coordinates &&
      allPointsWithinDeclaredPlanBounds &&
      nonCollinear &&
      plausibleLocalSpread,
    controlPointCount,
    uniquePlanPixels,
    uniqueWgs84Coordinates,
    allPointsWithinDeclaredPlanBounds,
    finiteCoordinates,
    nonCollinear,
    plausibleLocalSpread,
    issues,
  };
}
