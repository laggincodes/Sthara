/**
 * User-supplied prototype controls. They are deliberately isolated from
 * authority data and must never be sent to the PostGIS write path.
 */
export const SYNTHETIC_GCP_DEMO = {
  coordinateSystem: "WGS84",
  epsg: 4326,
  authorityStatus: "DEMO_NON_AUTHORITATIVE",
  project: "KUSUM SURESH ENCLAVE",
  plotReference: "808 P",
  planImage: {
    widthPixels: 7193,
    heightPixels: 4335,
    pixelOrigin: "top-left",
  },
  controlPoints: [
    {
      id: "GCP-01",
      featureDescription: "DEMO plot corner - north-west",
      planPixel: { x: 1800, y: 1250 },
      wgs84: { latitude: 25.63372, longitude: 85.07108 },
    },
    {
      id: "GCP-02",
      featureDescription: "DEMO plot corner - north-east",
      planPixel: { x: 5250, y: 1300 },
      wgs84: { latitude: 25.6337, longitude: 85.07124 },
    },
    {
      id: "GCP-03",
      featureDescription: "DEMO plot corner - south-east",
      planPixel: { x: 5200, y: 3550 },
      wgs84: { latitude: 25.63355, longitude: 85.07125 },
    },
    {
      id: "GCP-04",
      featureDescription: "DEMO plot corner - south-west",
      planPixel: { x: 1750, y: 3500 },
      wgs84: { latitude: 25.63357, longitude: 85.07109 },
    },
  ],
} as const;

type PlanPoint = { x: number; y: number };
type WorldPoint = { latitude: number; longitude: number };
type AffineCoefficients = { a: number; b: number; c: number };

function solveThreeByThree(matrix: number[][], vector: number[]) {
  const augmented = matrix.map((row, index) => [...row, vector[index]]);
  for (let pivot = 0; pivot < 3; pivot += 1) {
    let bestRow = pivot;
    for (let row = pivot + 1; row < 3; row += 1) {
      if (Math.abs(augmented[row][pivot]) > Math.abs(augmented[bestRow][pivot]))
        bestRow = row;
    }
    if (Math.abs(augmented[bestRow][pivot]) < 1e-12) {
      throw new Error("Synthetic GCP transform is singular.");
    }
    [augmented[pivot], augmented[bestRow]] = [
      augmented[bestRow],
      augmented[pivot],
    ];
    const scale = augmented[pivot][pivot];
    for (let column = pivot; column < 4; column += 1)
      augmented[pivot][column] /= scale;
    for (let row = 0; row < 3; row += 1) {
      if (row === pivot) continue;
      const factor = augmented[row][pivot];
      for (let column = pivot; column < 4; column += 1) {
        augmented[row][column] -= factor * augmented[pivot][column];
      }
    }
  }
  return augmented.map(row => row[3]);
}

function fitAffine(
  points: readonly { planPixel: PlanPoint; wgs84: WorldPoint }[]
) {
  const normal = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  const longitudeVector = [0, 0, 0];
  const latitudeVector = [0, 0, 0];
  for (const point of points) {
    const row = [point.planPixel.x, point.planPixel.y, 1];
    for (let i = 0; i < 3; i += 1) {
      for (let j = 0; j < 3; j += 1) normal[i][j] += row[i] * row[j];
      longitudeVector[i] += row[i] * point.wgs84.longitude;
      latitudeVector[i] += row[i] * point.wgs84.latitude;
    }
  }
  const longitude = solveThreeByThree(normal, longitudeVector);
  const latitude = solveThreeByThree(normal, latitudeVector);
  return {
    longitude: { a: longitude[0], b: longitude[1], c: longitude[2] },
    latitude: { a: latitude[0], b: latitude[1], c: latitude[2] },
  };
}

function transform(
  point: PlanPoint,
  coefficients: { longitude: AffineCoefficients; latitude: AffineCoefficients }
) {
  return {
    longitude:
      coefficients.longitude.a * point.x +
      coefficients.longitude.b * point.y +
      coefficients.longitude.c,
    latitude:
      coefficients.latitude.a * point.x +
      coefficients.latitude.b * point.y +
      coefficients.latitude.c,
  };
}

function polygonIsNonCollinear(points: readonly PlanPoint[]) {
  const signedDoubleArea = points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length];
    return sum + point.x * next.y - next.x * point.y;
  }, 0);
  return Math.abs(signedDoubleArea) > 1;
}

export function buildSyntheticGcpDemoResult() {
  const points = SYNTHETIC_GCP_DEMO.controlPoints;
  const planPoints = points.map(point => point.planPixel);
  const uniquePixels =
    new Set(planPoints.map(point => `${point.x}:${point.y}`)).size ===
    points.length;
  const inPlanBounds = planPoints.every(
    point =>
      point.x >= 0 &&
      point.y >= 0 &&
      point.x <= SYNTHETIC_GCP_DEMO.planImage.widthPixels &&
      point.y <= SYNTHETIC_GCP_DEMO.planImage.heightPixels
  );
  const nonCollinear = polygonIsNonCollinear(planPoints);
  if (!uniquePixels || !inPlanBounds || !nonCollinear) {
    throw new Error(
      "Synthetic GCP demo input failed its prototype validation gate."
    );
  }

  const coefficients = fitAffine(points);
  const residuals = points.map(point => {
    const transformed = transform(point.planPixel, coefficients);
    const latitudeMetres =
      (transformed.latitude - point.wgs84.latitude) * 111_320;
    const longitudeMetres =
      (transformed.longitude - point.wgs84.longitude) *
      111_320 *
      Math.cos((point.wgs84.latitude * Math.PI) / 180);
    return {
      id: point.id,
      eastMetres: longitudeMetres,
      northMetres: latitudeMetres,
      distanceMetres: Math.hypot(longitudeMetres, latitudeMetres),
    };
  });
  const rmsMetres = Math.sqrt(
    residuals.reduce((sum, residual) => sum + residual.distanceMetres ** 2, 0) /
      residuals.length
  );
  const ring = [
    ...planPoints.map(point => transform(point, coefficients)),
    transform(planPoints[0], coefficients),
  ].map(point => [point.longitude, point.latitude]);

  return {
    status: "DEMO_NON_AUTHORITATIVE" as const,
    validation: {
      controlPointCount: points.length,
      uniquePlanPixels: uniquePixels,
      allPointsWithinDeclaredPlanBounds: inPlanBounds,
      nonCollinear,
      coordinateSystem: "WGS84 / EPSG:4326",
      residuals,
      rmsMetres,
    },
    affineTransform: coefficients,
    ingestionContract: {
      status: "POSTGIS_WRITE_BLOCKED" as const,
      detail:
        "This GeoJSON is a non-persistent contract preview. Synthetic inputs are intentionally not inserted into PostGIS.",
    },
    geoJson: {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          properties: {
            name: "DEMO · KUSUM SURESH ENCLAVE synthetic transform",
            project: SYNTHETIC_GCP_DEMO.project,
            plotReference: SYNTHETIC_GCP_DEMO.plotReference,
            demoNonAuthoritative: true,
            authorityStatus: "DEMO_NON_AUTHORITATIVE",
            coordinateSource: "SYNTHETIC DEMO DATA - NOT A SURVEY",
            geometryRole:
              "Synthetic GCP-corner ring; not a parcel or building footprint",
            syntheticDemoExtrusionMetres: 12,
            extrusionMeaning:
              "Synthetic visual test value only; not a surveyed or approved building height",
            persistence: "Not written to PostGIS",
            activeLocks: [
              "authoritative footprint",
              "approved height",
              "ownership",
              "floor model",
              "vertical ULPIN",
            ],
          },
          geometry: { type: "Polygon" as const, coordinates: [ring] },
        },
      ],
    },
  };
}
