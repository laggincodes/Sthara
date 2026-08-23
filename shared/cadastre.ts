export type CadastreRecord = {
  ulpin: string;
  title: string;
  parcel: string;
  building: string;
  unit: string;
  floor: number;
  area: string;
  volume: string;
  elevation: string;
  status: "Verified" | "Review required";
  rights: string;
  evidence: string[];
};

export const INITIAL_CADASTRE_RECORDS: CadastreRecord[] = [
  {
    ulpin: "KA-29-105-0421-B12-F04-021",
    title: "Unit 4C · Floor 4",
    parcel: "P-0421",
    building: "Block B12",
    unit: "4C",
    floor: 4,
    area: "152.4 m²",
    volume: "486.2 m³",
    elevation: "+12.7 m → +15.8 m",
    status: "Verified",
    rights: "Residential ownership · 1 parking easement",
    evidence: ["LiDAR 2026.06", "Approved floor plan", "GNSS/CORS aligned"],
  },
  {
    ulpin: "KA-29-105-0421-B12-F02-006",
    title: "Parking volume P2-06 · Floor 2",
    parcel: "P-0421",
    building: "Block B12",
    unit: "P2-06",
    floor: 2,
    area: "18.6 m²",
    volume: "54.8 m³",
    elevation: "+6.3 m → +9.3 m",
    status: "Review required",
    rights: "Parking right · utility clearance pending",
    evidence: ["Floor plan v3", "Utility depth conflict U-223"],
  },
  {
    ulpin: "KA-29-105-0421-B11-F07-008",
    title: "Unit 7B · Floor 7",
    parcel: "P-0421",
    building: "Block B11",
    unit: "7B",
    floor: 7,
    area: "118.9 m²",
    volume: "380.5 m³",
    elevation: "+22.3 m → +25.5 m",
    status: "Verified",
    rights: "Residential ownership · air-rights boundary registered",
    evidence: ["LiDAR 2026.06", "Validated parcel geometry", "CORS aligned"],
  },
];
