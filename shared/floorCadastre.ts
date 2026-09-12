export type UnitType =
  | "RESIDENTIAL"
  | "COMMERCIAL"
  | "PARKING"
  | "UTILITY_CORE"
  | "AIR_RIGHTS"
  | "BASEMENT_STORAGE";

export type FloorType =
  | "UNDERGROUND_BASEMENT"
  | "GROUND_RETAIL"
  | "RESIDENTIAL_LEVEL"
  | "COMMERCIAL_OFFICES"
  | "ROOFTOP_TERRACE";

export type FloorUnitCadastre = {
  id: string;
  unitNumber: string;
  ulpin3d: string;
  unitType: UnitType;
  carpetAreaSqM: number;
  builtUpAreaSqM: number;
  volumeCuM: number;
  elevationRange: string;
  baseElevationM: number;
  heightM: number;
  relativeBounds: {
    x: number; // -0.5 to 0.5 relative to slab width
    z: number; // -0.5 to 0.5 relative to slab depth
    w: number; // relative width (0 to 1)
    d: number; // relative depth (0 to 1)
  };
  owner: {
    name: string;
    verifiedAadhaarPan: boolean;
    contact: string;
    email: string;
    deedNumber: string;
    deedDate: string;
    stampDutyRef: string;
    registeredShare: string;
  };
  clearances: {
    fireNoc: "APPROVED" | "PENDING" | "EXEMPT";
    fireNocNumber?: string;
    electricityConsumerId: string;
    electricitySanctionedKw: number;
    waterConnectionId: string;
    municipalTaxStatus: "CLEARED" | "DUE" | "DISPUTED";
    lastTaxPaidDate?: string;
    taxReceiptNo?: string;
  };
  easements: string[];
};

export type FloorStackLevel = {
  floorIndex: number; // -2, -1, 0, 1, 2, 3...
  floorCode: string; // B2, B1, G, F1, F2...
  floorName: string;
  floorType: FloorType;
  elevationBaseM: number;
  floorHeightM: number;
  elevationMsl: string;
  grossAreaSqM: number;
  units: FloorUnitCadastre[];
  isUnauthorizedFloor: boolean;
  heightViolationNotice?: string;
  blueprintSvg?: string;
};

export type BuildingFloorStackRecord = {
  id: string;
  buildingName: string;
  ulpin: string;
  address: string;
  district: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  sanctionedHeightM: number;
  actualHeightM: number;
  sanctionedFloors: string;
  actualFloors: string;
  totalUnits: number;
  municipalSanctionNo: string;
  sanctionStatus: "SANCTIONED_WITH_DEVIATIONS" | "FULLY_COMPLIANT" | "UNDER_REVIEW";
  subsurfaceMetroEasement: boolean;
  rooftopSolarRights: boolean;
  floors: FloorStackLevel[];
};

export const SAMPLE_BUILDING_FLOOR_STACKS: BuildingFloorStackRecord[] = [
  {
    id: "patna-central-heights",
    buildingName: "Patna Central Heights",
    ulpin: "IN-BR-PAT-0042-3D",
    address: "Plot 42, Bailey Road, Patna, Bihar 800001",
    district: "Patna Central",
    coordinates: { latitude: 25.6093, longitude: 85.1235 },
    sanctionedHeightM: 15.0, // G+4 sanction limit
    actualHeightM: 25.6, // G+7 + 2 Basements (exceeds by 10.6m)
    sanctionedFloors: "G+4 (15.0m max limit)",
    actualFloors: "2B + G + 7 + Terrace (25.6m)",
    totalUnits: 28,
    municipalSanctionNo: "PMC/2024/BP-9941/A",
    sanctionStatus: "SANCTIONED_WITH_DEVIATIONS",
    subsurfaceMetroEasement: true,
    rooftopSolarRights: true,
    floors: [
      {
        floorIndex: -2,
        floorCode: "B2",
        floorName: "Basement 2 · Subterranean Mechanical & Metro Buffer",
        floorType: "UNDERGROUND_BASEMENT",
        elevationBaseM: -6.4,
        floorHeightM: 3.2,
        elevationMsl: "-6.4m → -3.2m MSL",
        grossAreaSqM: 740,
        isUnauthorizedFloor: false,
        units: [
          {
            id: "b2-util-01",
            unitNumber: "HVAC & Power Substation B2-U1",
            ulpin3d: "IN-BR-PAT-0042-3D-B02-U01",
            unitType: "UTILITY_CORE",
            carpetAreaSqM: 280.0,
            builtUpAreaSqM: 310.0,
            volumeCuM: 896.0,
            elevationRange: "-6.4m → -3.2m MSL",
            baseElevationM: -6.4,
            heightM: 3.2,
            relativeBounds: { x: -0.25, z: -0.25, w: 0.45, d: 0.45 },
            owner: {
              name: "Patna Central Heights Owners Association",
              verifiedAadhaarPan: true,
              contact: "+91 94310 11002",
              email: "society@patnacentralheights.in",
              deedNumber: "DEED-PAT-2024-UT01",
              deedDate: "12-Jan-2024",
              stampDutyRef: "STAMP-BR-2024-88412",
              registeredShare: "Common Undivided Share (100%)",
            },
            clearances: {
              fireNoc: "APPROVED",
              fireNocNumber: "BR-FIRE-PAT-2024-098",
              electricityConsumerId: "SBPDCL-HT-882109",
              electricitySanctionedKw: 150,
              waterConnectionId: "PHED-PAT-WTR-4421",
              municipalTaxStatus: "CLEARED",
              lastTaxPaidDate: "15-Apr-2026",
              taxReceiptNo: "PMC-TAX-2026-90412",
            },
            easements: ["Patna Metro Corridor Line-1 Subsurface Clearance Buffer (6.0m)"],
          },
          {
            id: "b2-park-01",
            unitNumber: "Basement Parking B2-Bay A (Slots 1-12)",
            ulpin3d: "IN-BR-PAT-0042-3D-B02-U02",
            unitType: "PARKING",
            carpetAreaSqM: 360.0,
            builtUpAreaSqM: 390.0,
            volumeCuM: 1152.0,
            elevationRange: "-6.4m → -3.2m MSL",
            baseElevationM: -6.4,
            heightM: 3.2,
            relativeBounds: { x: 0.25, z: 0.25, w: 0.45, d: 0.45 },
            owner: {
              name: "Patna Central Heights Society",
              verifiedAadhaarPan: true,
              contact: "+91 94310 11002",
              email: "parking@patnacentralheights.in",
              deedNumber: "DEED-PAT-2024-PK02",
              deedDate: "12-Jan-2024",
              stampDutyRef: "STAMP-BR-2024-88413",
              registeredShare: "Designated Society Allotment",
            },
            clearances: {
              fireNoc: "APPROVED",
              fireNocNumber: "BR-FIRE-PAT-2024-098",
              electricityConsumerId: "SBPDCL-HT-882109",
              electricitySanctionedKw: 25,
              waterConnectionId: "PHED-PAT-WTR-4421",
              municipalTaxStatus: "CLEARED",
              lastTaxPaidDate: "15-Apr-2026",
              taxReceiptNo: "PMC-TAX-2026-90413",
            },
            easements: ["Vehicular Ingress Ramp Easement"],
          },
        ],
      },
      {
        floorIndex: -1,
        floorCode: "B1",
        floorName: "Basement 1 · Resident Dedicated Parking",
        floorType: "UNDERGROUND_BASEMENT",
        elevationBaseM: -3.2,
        floorHeightM: 3.2,
        elevationMsl: "-3.2m → 0.0m MSL",
        grossAreaSqM: 740,
        isUnauthorizedFloor: false,
        units: [
          {
            id: "b1-park-01",
            unitNumber: "Resident Parking Bay B1-01 to 08",
            ulpin3d: "IN-BR-PAT-0042-3D-B01-U01",
            unitType: "PARKING",
            carpetAreaSqM: 320.0,
            builtUpAreaSqM: 350.0,
            volumeCuM: 1024.0,
            elevationRange: "-3.2m → 0.0m MSL",
            baseElevationM: -3.2,
            heightM: 3.2,
            relativeBounds: { x: -0.25, z: 0.0, w: 0.45, d: 0.85 },
            owner: {
              name: "Multiple Registered Unit Owners",
              verifiedAadhaarPan: true,
              contact: "+91 98350 44219",
              email: "admin@patnacentralheights.in",
              deedNumber: "DEED-PAT-2024-PK01",
              deedDate: "15-Feb-2024",
              stampDutyRef: "STAMP-BR-2024-91024",
              registeredShare: "Per-unit deed registered easement",
            },
            clearances: {
              fireNoc: "APPROVED",
              fireNocNumber: "BR-FIRE-PAT-2024-098",
              electricityConsumerId: "SBPDCL-LT-440192",
              electricitySanctionedKw: 30,
              waterConnectionId: "PHED-PAT-WTR-4421",
              municipalTaxStatus: "CLEARED",
              lastTaxPaidDate: "15-Apr-2026",
              taxReceiptNo: "PMC-TAX-2026-90414",
            },
            easements: ["Designated EV Charging Points Right (Slots 1-4)"],
          },
          {
            id: "b1-store-02",
            unitNumber: "Secure Society Archive & Storage B1-S1",
            ulpin3d: "IN-BR-PAT-0042-3D-B01-U02",
            unitType: "BASEMENT_STORAGE",
            carpetAreaSqM: 290.0,
            builtUpAreaSqM: 320.0,
            volumeCuM: 928.0,
            elevationRange: "-3.2m → 0.0m MSL",
            baseElevationM: -3.2,
            heightM: 3.2,
            relativeBounds: { x: 0.25, z: 0.0, w: 0.45, d: 0.85 },
            owner: {
              name: "Patna Central Heights Society",
              verifiedAadhaarPan: true,
              contact: "+91 94310 11002",
              email: "storage@patnacentralheights.in",
              deedNumber: "DEED-PAT-2024-ST01",
              deedDate: "15-Feb-2024",
              stampDutyRef: "STAMP-BR-2024-91025",
              registeredShare: "Society Common Storage",
            },
            clearances: {
              fireNoc: "APPROVED",
              fireNocNumber: "BR-FIRE-PAT-2024-098",
              electricityConsumerId: "SBPDCL-LT-440192",
              electricitySanctionedKw: 10,
              waterConnectionId: "PHED-PAT-WTR-4421",
              municipalTaxStatus: "CLEARED",
              lastTaxPaidDate: "15-Apr-2026",
              taxReceiptNo: "PMC-TAX-2026-90415",
            },
            easements: ["Fire Sprinkler Trunk Line Ingress"],
          },
        ],
      },
      {
        floorIndex: 0,
        floorCode: "G",
        floorName: "Ground Floor · Commercial Retail & Grand Foyer",
        floorType: "GROUND_RETAIL",
        elevationBaseM: 0.0,
        floorHeightM: 3.8,
        elevationMsl: "+0.0m → +3.8m MSL",
        grossAreaSqM: 740,
        isUnauthorizedFloor: false,
        units: [
          {
            id: "g-ret-01",
            unitNumber: "Retail Showroom G-01 (Apex Bank Branch)",
            ulpin3d: "IN-BR-PAT-0042-3D-F00-U01",
            unitType: "COMMERCIAL",
            carpetAreaSqM: 260.0,
            builtUpAreaSqM: 295.0,
            volumeCuM: 988.0,
            elevationRange: "+0.0m → +3.8m MSL",
            baseElevationM: 0.0,
            heightM: 3.8,
            relativeBounds: { x: -0.25, z: -0.22, w: 0.45, d: 0.48 },
            owner: {
              name: "Apex Commercial Bank Ltd (Reg: Patna RO)",
              verifiedAadhaarPan: true,
              contact: "+91 612 2209100",
              email: "estates@apexbank.in",
              deedNumber: "DEED-PAT-2024-COM01",
              deedDate: "20-Mar-2024",
              stampDutyRef: "STAMP-BR-2024-100234",
              registeredShare: "Commercial Freehold Ownership (100%)",
            },
            clearances: {
              fireNoc: "APPROVED",
              fireNocNumber: "BR-FIRE-PAT-2024-112",
              electricityConsumerId: "SBPDCL-COM-99104",
              electricitySanctionedKw: 45,
              waterConnectionId: "PHED-PAT-COM-102",
              municipalTaxStatus: "CLEARED",
              lastTaxPaidDate: "10-May-2026",
              taxReceiptNo: "PMC-TAX-2026-94819",
            },
            easements: ["Bailey Road Frontage Signage Easement", "ATM Dedicated Footpath Access"],
          },
          {
            id: "g-ret-02",
            unitNumber: "Commercial Suite G-02 (Health Diagnostics)",
            ulpin3d: "IN-BR-PAT-0042-3D-F00-U02",
            unitType: "COMMERCIAL",
            carpetAreaSqM: 210.0,
            builtUpAreaSqM: 240.0,
            volumeCuM: 798.0,
            elevationRange: "+0.0m → +3.8m MSL",
            baseElevationM: 0.0,
            heightM: 3.8,
            relativeBounds: { x: 0.25, z: -0.22, w: 0.45, d: 0.48 },
            owner: {
              name: "Dr. Alok Verma & Sangeeta Verma",
              verifiedAadhaarPan: true,
              contact: "+91 94312 88401",
              email: "dr.verma@bihardiagnostics.com",
              deedNumber: "DEED-PAT-2024-COM02",
              deedDate: "24-Mar-2024",
              stampDutyRef: "STAMP-BR-2024-100289",
              registeredShare: "Joint Commercial Ownership (50:50)",
            },
            clearances: {
              fireNoc: "APPROVED",
              fireNocNumber: "BR-FIRE-PAT-2024-115",
              electricityConsumerId: "SBPDCL-COM-99108",
              electricitySanctionedKw: 35,
              waterConnectionId: "PHED-PAT-COM-105",
              municipalTaxStatus: "CLEARED",
              lastTaxPaidDate: "12-May-2026",
              taxReceiptNo: "PMC-TAX-2026-94880",
            },
            easements: ["Dedicated Patient Drop-off Corridor Right"],
          },
          {
            id: "g-foyer-03",
            unitNumber: "Main Entrance Foyer & Security Core",
            ulpin3d: "IN-BR-PAT-0042-3D-F00-U03",
            unitType: "UTILITY_CORE",
            carpetAreaSqM: 180.0,
            builtUpAreaSqM: 205.0,
            volumeCuM: 684.0,
            elevationRange: "+0.0m → +3.8m MSL",
            baseElevationM: 0.0,
            heightM: 3.8,
            relativeBounds: { x: 0.0, z: 0.28, w: 0.95, d: 0.38 },
            owner: {
              name: "Patna Central Heights Society",
              verifiedAadhaarPan: true,
              contact: "+91 94310 11002",
              email: "security@patnacentralheights.in",
              deedNumber: "DEED-PAT-2024-FY01",
              deedDate: "20-Mar-2024",
              stampDutyRef: "STAMP-BR-2024-100290",
              registeredShare: "Common Undivided Foyer (100%)",
            },
            clearances: {
              fireNoc: "APPROVED",
              fireNocNumber: "BR-FIRE-PAT-2024-112",
              electricityConsumerId: "SBPDCL-LT-440192",
              electricitySanctionedKw: 20,
              waterConnectionId: "PHED-PAT-WTR-4421",
              municipalTaxStatus: "CLEARED",
              lastTaxPaidDate: "15-Apr-2026",
              taxReceiptNo: "PMC-TAX-2026-90416",
            },
            easements: ["Universal Access Ramps & Lift Core Ingress Right"],
          },
        ],
      },
      {
        floorIndex: 1,
        floorCode: "F1",
        floorName: "1st Floor · Commercial Corporate Offices",
        floorType: "COMMERCIAL_OFFICES",
        elevationBaseM: 3.8,
        floorHeightM: 3.2,
        elevationMsl: "+3.8m → +7.0m MSL",
        grossAreaSqM: 740,
        isUnauthorizedFloor: false,
        units: [
          {
            id: "f1-off-101",
            unitNumber: "Corporate Office Suite 101",
            ulpin3d: "IN-BR-PAT-0042-3D-F01-U01",
            unitType: "COMMERCIAL",
            carpetAreaSqM: 290.0,
            builtUpAreaSqM: 330.0,
            volumeCuM: 928.0,
            elevationRange: "+3.8m → +7.0m MSL",
            baseElevationM: 3.8,
            heightM: 3.2,
            relativeBounds: { x: -0.25, z: 0.0, w: 0.45, d: 0.85 },
            owner: {
              name: "Magadh Infotech Solutions LLP",
              verifiedAadhaarPan: true,
              contact: "+91 612 2589011",
              email: "director@magadhinfo.com",
              deedNumber: "DEED-PAT-2024-OFF101",
              deedDate: "10-Apr-2024",
              stampDutyRef: "STAMP-BR-2024-104921",
              registeredShare: "Commercial Freehold Unit (100%)",
            },
            clearances: {
              fireNoc: "APPROVED",
              fireNocNumber: "BR-FIRE-PAT-2024-140",
              electricityConsumerId: "SBPDCL-COM-99210",
              electricitySanctionedKw: 30,
              waterConnectionId: "PHED-PAT-COM-110",
              municipalTaxStatus: "CLEARED",
              lastTaxPaidDate: "18-May-2026",
              taxReceiptNo: "PMC-TAX-2026-95104",
            },
            easements: ["Optical Fiber Duct Easement", "1 Basement Parking Slot (B1-02)"],
          },
          {
            id: "f1-off-102",
            unitNumber: "Corporate Office Suite 102",
            ulpin3d: "IN-BR-PAT-0042-3D-F01-U02",
            unitType: "COMMERCIAL",
            carpetAreaSqM: 310.0,
            builtUpAreaSqM: 350.0,
            volumeCuM: 992.0,
            elevationRange: "+3.8m → +7.0m MSL",
            baseElevationM: 3.8,
            heightM: 3.2,
            relativeBounds: { x: 0.25, z: 0.0, w: 0.45, d: 0.85 },
            owner: {
              name: "Chanakya Legal Associates",
              verifiedAadhaarPan: true,
              contact: "+91 98351 90221",
              email: "partners@chanakyalegal.in",
              deedNumber: "DEED-PAT-2024-OFF102",
              deedDate: "15-Apr-2024",
              stampDutyRef: "STAMP-BR-2024-104955",
              registeredShare: "Commercial Freehold Unit (100%)",
            },
            clearances: {
              fireNoc: "APPROVED",
              fireNocNumber: "BR-FIRE-PAT-2024-142",
              electricityConsumerId: "SBPDCL-COM-99214",
              electricitySanctionedKw: 25,
              waterConnectionId: "PHED-PAT-COM-112",
              municipalTaxStatus: "CLEARED",
              lastTaxPaidDate: "20-May-2026",
              taxReceiptNo: "PMC-TAX-2026-95180",
            },
            easements: ["Server Room Exhaust Right", "1 Basement Parking Slot (B1-03)"],
          },
        ],
      },
      {
        floorIndex: 2,
        floorCode: "F2",
        floorName: "2nd Floor · Residential Executive Flats",
        floorType: "RESIDENTIAL_LEVEL",
        elevationBaseM: 7.0,
        floorHeightM: 3.2,
        elevationMsl: "+7.0m → +10.2m MSL",
        grossAreaSqM: 740,
        isUnauthorizedFloor: false,
        units: [
          {
            id: "f2-apt-201",
            unitNumber: "Deluxe Apartment Flat 201 (3BHK)",
            ulpin3d: "IN-BR-PAT-0042-3D-F02-U01",
            unitType: "RESIDENTIAL",
            carpetAreaSqM: 135.4,
            builtUpAreaSqM: 158.0,
            volumeCuM: 433.28,
            elevationRange: "+7.0m → +10.2m MSL",
            baseElevationM: 7.0,
            heightM: 3.2,
            relativeBounds: { x: -0.25, z: -0.22, w: 0.45, d: 0.48 },
            owner: {
              name: "Suresh Kumar Singh & Anjana Singh",
              verifiedAadhaarPan: true,
              contact: "+91 94310 55192",
              email: "suresh.singh@gov.bihar.in",
              deedNumber: "DEED-PAT-2024-RES201",
              deedDate: "02-May-2024",
              stampDutyRef: "STAMP-BR-2024-110901",
              registeredShare: "Joint Residential Ownership (50:50)",
            },
            clearances: {
              fireNoc: "APPROVED",
              fireNocNumber: "BR-FIRE-PAT-2024-180",
              electricityConsumerId: "SBPDCL-DOM-30192",
              electricitySanctionedKw: 8,
              waterConnectionId: "PHED-PAT-DOM-201",
              municipalTaxStatus: "CLEARED",
              lastTaxPaidDate: "05-Jun-2026",
              taxReceiptNo: "PMC-TAX-2026-96401",
            },
            easements: ["1 Covered Parking Bay B1-05", "East Balcony Sun Right"],
          },
          {
            id: "f2-apt-202",
            unitNumber: "Deluxe Apartment Flat 202 (3BHK)",
            ulpin3d: "IN-BR-PAT-0042-3D-F02-U02",
            unitType: "RESIDENTIAL",
            carpetAreaSqM: 138.2,
            builtUpAreaSqM: 161.0,
            volumeCuM: 442.24,
            elevationRange: "+7.0m → +10.2m MSL",
            baseElevationM: 7.0,
            heightM: 3.2,
            relativeBounds: { x: 0.25, z: -0.22, w: 0.45, d: 0.48 },
            owner: {
              name: "Priyanka Mishra",
              verifiedAadhaarPan: true,
              contact: "+91 98350 12891",
              email: "priyanka.mishra@tcs.com",
              deedNumber: "DEED-PAT-2024-RES202",
              deedDate: "08-May-2024",
              stampDutyRef: "STAMP-BR-2024-110944",
              registeredShare: "Sole Residential Ownership (100%)",
            },
            clearances: {
              fireNoc: "APPROVED",
              fireNocNumber: "BR-FIRE-PAT-2024-180",
              electricityConsumerId: "SBPDCL-DOM-30195",
              electricitySanctionedKw: 8,
              waterConnectionId: "PHED-PAT-DOM-202",
              municipalTaxStatus: "CLEARED",
              lastTaxPaidDate: "10-Jun-2026",
              taxReceiptNo: "PMC-TAX-2026-96455",
            },
            easements: ["1 Covered Parking Bay B1-06", "Common Corridor Ingress"],
          },
          {
            id: "f2-apt-203",
            unitNumber: "Executive Suite Flat 203 (2BHK)",
            ulpin3d: "IN-BR-PAT-0042-3D-F02-U03",
            unitType: "RESIDENTIAL",
            carpetAreaSqM: 104.5,
            builtUpAreaSqM: 122.0,
            volumeCuM: 334.4,
            elevationRange: "+7.0m → +10.2m MSL",
            baseElevationM: 7.0,
            heightM: 3.2,
            relativeBounds: { x: -0.25, z: 0.28, w: 0.45, d: 0.38 },
            owner: {
              name: "Rameshwar Prasad Jha",
              verifiedAadhaarPan: true,
              contact: "+91 94314 99100",
              email: "rpjha.patna@gmail.com",
              deedNumber: "DEED-PAT-2024-RES203",
              deedDate: "12-May-2024",
              stampDutyRef: "STAMP-BR-2024-110988",
              registeredShare: "Sole Residential Ownership (100%)",
            },
            clearances: {
              fireNoc: "APPROVED",
              fireNocNumber: "BR-FIRE-PAT-2024-180",
              electricityConsumerId: "SBPDCL-DOM-30198",
              electricitySanctionedKw: 6,
              waterConnectionId: "PHED-PAT-DOM-203",
              municipalTaxStatus: "CLEARED",
              lastTaxPaidDate: "15-Jun-2026",
              taxReceiptNo: "PMC-TAX-2026-96499",
            },
            easements: ["1 Basement Scooter Bay B1-S4"],
          },
          {
            id: "f2-apt-204",
            unitNumber: "Executive Suite Flat 204 (2BHK)",
            ulpin3d: "IN-BR-PAT-0042-3D-F02-U04",
            unitType: "RESIDENTIAL",
            carpetAreaSqM: 102.0,
            builtUpAreaSqM: 120.0,
            volumeCuM: 326.4,
            elevationRange: "+7.0m → +10.2m MSL",
            baseElevationM: 7.0,
            heightM: 3.2,
            relativeBounds: { x: 0.25, z: 0.28, w: 0.45, d: 0.38 },
            owner: {
              name: "Amitabh Sen & Nandita Sen",
              verifiedAadhaarPan: true,
              contact: "+91 98352 77123",
              email: "amitabh.sen@iitp.ac.in",
              deedNumber: "DEED-PAT-2024-RES204",
              deedDate: "16-May-2024",
              stampDutyRef: "STAMP-BR-2024-111012",
              registeredShare: "Joint Residential Ownership (50:50)",
            },
            clearances: {
              fireNoc: "APPROVED",
              fireNocNumber: "BR-FIRE-PAT-2024-180",
              electricityConsumerId: "SBPDCL-DOM-30201",
              electricitySanctionedKw: 6,
              waterConnectionId: "PHED-PAT-DOM-204",
              municipalTaxStatus: "CLEARED",
              lastTaxPaidDate: "18-Jun-2026",
              taxReceiptNo: "PMC-TAX-2026-96540",
            },
            easements: ["1 Basement Scooter Bay B1-S5"],
          },
        ],
      },
      {
        floorIndex: 3,
        floorCode: "F3",
        floorName: "3rd Floor · Residential Apartments",
        floorType: "RESIDENTIAL_LEVEL",
        elevationBaseM: 10.2,
        floorHeightM: 3.2,
        elevationMsl: "+10.2m → +13.4m MSL",
        grossAreaSqM: 740,
        isUnauthorizedFloor: false,
        units: [
          {
            id: "f3-apt-301",
            unitNumber: "Deluxe Apartment Flat 301 (3BHK)",
            ulpin3d: "IN-BR-PAT-0042-3D-F03-U01",
            unitType: "RESIDENTIAL",
            carpetAreaSqM: 135.4,
            builtUpAreaSqM: 158.0,
            volumeCuM: 433.28,
            elevationRange: "+10.2m → +13.4m MSL",
            baseElevationM: 10.2,
            heightM: 3.2,
            relativeBounds: { x: -0.25, z: -0.22, w: 0.45, d: 0.48 },
            owner: {
              name: "Gautam Kumar & Neha Kumari",
              verifiedAadhaarPan: true,
              contact: "+91 94301 22890",
              email: "gautamkr192007@gmail.com",
              deedNumber: "DEED-PAT-2024-RES301",
              deedDate: "01-Jun-2024",
              stampDutyRef: "STAMP-BR-2024-118021",
              registeredShare: "Joint Residential Ownership (50:50)",
            },
            clearances: {
              fireNoc: "APPROVED",
              fireNocNumber: "BR-FIRE-PAT-2024-195",
              electricityConsumerId: "SBPDCL-DOM-31001",
              electricitySanctionedKw: 10,
              waterConnectionId: "PHED-PAT-DOM-301",
              municipalTaxStatus: "CLEARED",
              lastTaxPaidDate: "02-Jul-2026",
              taxReceiptNo: "PMC-TAX-2026-98102",
            },
            easements: ["1 Covered Parking Bay B1-08", "Balcony Solar Exposure Right"],
          },
          {
            id: "f3-apt-302",
            unitNumber: "Deluxe Apartment Flat 302 (3BHK)",
            ulpin3d: "IN-BR-PAT-0042-3D-F03-U02",
            unitType: "RESIDENTIAL",
            carpetAreaSqM: 138.2,
            builtUpAreaSqM: 161.0,
            volumeCuM: 442.24,
            elevationRange: "+10.2m → +13.4m MSL",
            baseElevationM: 10.2,
            heightM: 3.2,
            relativeBounds: { x: 0.25, z: -0.22, w: 0.45, d: 0.48 },
            owner: {
              name: "Anand Vikram Pathak",
              verifiedAadhaarPan: true,
              contact: "+91 98355 44019",
              email: "anand.pathak@nitp.ac.in",
              deedNumber: "DEED-PAT-2024-RES302",
              deedDate: "05-Jun-2024",
              stampDutyRef: "STAMP-BR-2024-118055",
              registeredShare: "Sole Residential Ownership (100%)",
            },
            clearances: {
              fireNoc: "APPROVED",
              fireNocNumber: "BR-FIRE-PAT-2024-195",
              electricityConsumerId: "SBPDCL-DOM-31005",
              electricitySanctionedKw: 8,
              waterConnectionId: "PHED-PAT-DOM-302",
              municipalTaxStatus: "CLEARED",
              lastTaxPaidDate: "05-Jul-2026",
              taxReceiptNo: "PMC-TAX-2026-98144",
            },
            easements: ["1 Covered Parking Bay B1-09"],
          },
        ],
      },
      {
        floorIndex: 4,
        floorCode: "F4",
        floorName: "4th Floor · Sanction Boundary Upper Floor (G+4 Max)",
        floorType: "RESIDENTIAL_LEVEL",
        elevationBaseM: 13.4,
        floorHeightM: 3.2,
        elevationMsl: "+13.4m → +16.6m MSL",
        grossAreaSqM: 740,
        isUnauthorizedFloor: false, // Right on the 15.0m line
        units: [
          {
            id: "f4-apt-401",
            unitNumber: "Luxury Apartment Flat 401 (4BHK)",
            ulpin3d: "IN-BR-PAT-0042-3D-F04-U01",
            unitType: "RESIDENTIAL",
            carpetAreaSqM: 172.5,
            builtUpAreaSqM: 202.0,
            volumeCuM: 552.0,
            elevationRange: "+13.4m → +16.6m MSL",
            baseElevationM: 13.4,
            heightM: 3.2,
            relativeBounds: { x: -0.25, z: 0.0, w: 0.45, d: 0.85 },
            owner: {
              name: "Rajesh Ranjan & Rashmi Ranjan",
              verifiedAadhaarPan: true,
              contact: "+91 94318 90144",
              email: "rajesh.ranjan@patna.gov.in",
              deedNumber: "DEED-PAT-2024-RES401",
              deedDate: "20-Jun-2024",
              stampDutyRef: "STAMP-BR-2024-124900",
              registeredShare: "Joint Residential Ownership (50:50)",
            },
            clearances: {
              fireNoc: "APPROVED",
              fireNocNumber: "BR-FIRE-PAT-2024-210",
              electricityConsumerId: "SBPDCL-DOM-32091",
              electricitySanctionedKw: 12,
              waterConnectionId: "PHED-PAT-DOM-401",
              municipalTaxStatus: "CLEARED",
              lastTaxPaidDate: "12-Jul-2026",
              taxReceiptNo: "PMC-TAX-2026-99100",
            },
            easements: ["2 Covered Parking Slots B1-11 & B1-12", "Terrace Ingress Staircase Right"],
          },
          {
            id: "f4-apt-402",
            unitNumber: "Luxury Apartment Flat 402 (4BHK)",
            ulpin3d: "IN-BR-PAT-0042-3D-F04-U02",
            unitType: "RESIDENTIAL",
            carpetAreaSqM: 170.0,
            builtUpAreaSqM: 198.0,
            volumeCuM: 544.0,
            elevationRange: "+13.4m → +16.6m MSL",
            baseElevationM: 13.4,
            heightM: 3.2,
            relativeBounds: { x: 0.25, z: 0.0, w: 0.45, d: 0.85 },
            owner: {
              name: "Vikramaditya Narayan",
              verifiedAadhaarPan: true,
              contact: "+91 98358 22100",
              email: "vikram.narayan@narayanlaw.com",
              deedNumber: "DEED-PAT-2024-RES402",
              deedDate: "25-Jun-2024",
              stampDutyRef: "STAMP-BR-2024-124945",
              registeredShare: "Sole Residential Ownership (100%)",
            },
            clearances: {
              fireNoc: "APPROVED",
              fireNocNumber: "BR-FIRE-PAT-2024-210",
              electricityConsumerId: "SBPDCL-DOM-32098",
              electricitySanctionedKw: 12,
              waterConnectionId: "PHED-PAT-DOM-402",
              municipalTaxStatus: "CLEARED",
              lastTaxPaidDate: "15-Jul-2026",
              taxReceiptNo: "PMC-TAX-2026-99144",
            },
            easements: ["2 Covered Parking Slots B1-13 & B1-14"],
          },
        ],
      },
      {
        floorIndex: 5,
        floorCode: "F5",
        floorName: "5th Floor · Unauthorized Height Deviation Tier-1",
        floorType: "RESIDENTIAL_LEVEL",
        elevationBaseM: 16.6,
        floorHeightM: 3.2,
        elevationMsl: "+16.6m → +19.8m MSL",
        grossAreaSqM: 740,
        isUnauthorizedFloor: true,
        heightViolationNotice: "Exceeds sanctioned municipal height limit of 15.0m (FAR violation +1.6m)",
        units: [
          {
            id: "f5-apt-501",
            unitNumber: "Penthouse Suite 501 [UNDER CLASH REVIEW]",
            ulpin3d: "IN-BR-PAT-0042-3D-F05-U01",
            unitType: "RESIDENTIAL",
            carpetAreaSqM: 172.5,
            builtUpAreaSqM: 202.0,
            volumeCuM: 552.0,
            elevationRange: "+16.6m → +19.8m MSL",
            baseElevationM: 16.6,
            heightM: 3.2,
            relativeBounds: { x: -0.25, z: 0.0, w: 0.45, d: 0.85 },
            owner: {
              name: "Devendra Builders (Unsold Inventory / Disputed)",
              verifiedAadhaarPan: false,
              contact: "+91 94300 00192",
              email: "disputes@devendrabuilders.com",
              deedNumber: "DEED-PROV-2025-DEV501",
              deedDate: "10-Jan-2025",
              stampDutyRef: "STAMP-PENDING-BR",
              registeredShare: "Builder Retained Provisional Unit",
            },
            clearances: {
              fireNoc: "PENDING",
              electricityConsumerId: "SBPDCL-TEMP-90112",
              electricitySanctionedKw: 5,
              waterConnectionId: "PHED-UNREGISTERED",
              municipalTaxStatus: "DISPUTED",
              lastTaxPaidDate: "Unpaid (Show Cause Notice Issued)",
              taxReceiptNo: "PMC-NOTICE-2025-081",
            },
            easements: ["Subject to Municipal Compoundment Hearing under PMC Sec 314"],
          },
          {
            id: "f5-apt-502",
            unitNumber: "Penthouse Suite 502 [UNDER CLASH REVIEW]",
            ulpin3d: "IN-BR-PAT-0042-3D-F05-U02",
            unitType: "RESIDENTIAL",
            carpetAreaSqM: 170.0,
            builtUpAreaSqM: 198.0,
            volumeCuM: 544.0,
            elevationRange: "+16.6m → +19.8m MSL",
            baseElevationM: 16.6,
            heightM: 3.2,
            relativeBounds: { x: 0.25, z: 0.0, w: 0.45, d: 0.85 },
            owner: {
              name: "Devendra Builders (Unsold Inventory / Disputed)",
              verifiedAadhaarPan: false,
              contact: "+91 94300 00192",
              email: "disputes@devendrabuilders.com",
              deedNumber: "DEED-PROV-2025-DEV502",
              deedDate: "10-Jan-2025",
              stampDutyRef: "STAMP-PENDING-BR",
              registeredShare: "Builder Retained Provisional Unit",
            },
            clearances: {
              fireNoc: "PENDING",
              electricityConsumerId: "SBPDCL-TEMP-90113",
              electricitySanctionedKw: 5,
              waterConnectionId: "PHED-UNREGISTERED",
              municipalTaxStatus: "DISPUTED",
              lastTaxPaidDate: "Unpaid (Show Cause Notice Issued)",
              taxReceiptNo: "PMC-NOTICE-2025-082",
            },
            easements: ["Subject to Municipal Compoundment Hearing under PMC Sec 314"],
          },
        ],
      },
      {
        floorIndex: 6,
        floorCode: "F6",
        floorName: "6th Floor · Unauthorized Height Deviation Tier-2",
        floorType: "RESIDENTIAL_LEVEL",
        elevationBaseM: 19.8,
        floorHeightM: 3.2,
        elevationMsl: "+19.8m → +23.0m MSL",
        grossAreaSqM: 740,
        isUnauthorizedFloor: true,
        heightViolationNotice: "Exceeds sanctioned municipal height limit of 15.0m (FAR violation +4.8m)",
        units: [
          {
            id: "f6-apt-601",
            unitNumber: "Sky Villa Flat 601 [VIOLATION FLAG]",
            ulpin3d: "IN-BR-PAT-0042-3D-F06-U01",
            unitType: "RESIDENTIAL",
            carpetAreaSqM: 340.0,
            builtUpAreaSqM: 395.0,
            volumeCuM: 1088.0,
            elevationRange: "+19.8m → +23.0m MSL",
            baseElevationM: 19.8,
            heightM: 3.2,
            relativeBounds: { x: 0.0, z: 0.0, w: 0.95, d: 0.85 },
            owner: {
              name: "Devendra Builders & Developers Pvt Ltd",
              verifiedAadhaarPan: false,
              contact: "+91 94300 00192",
              email: "legal@devendrabuilders.com",
              deedNumber: "DEED-UNAPPROVED-2025-01",
              deedDate: "15-Feb-2025",
              stampDutyRef: "STAMP-NON-COMPLIANT",
              registeredShare: "Unauthorized Vertical Extrusion",
            },
            clearances: {
              fireNoc: "PENDING",
              electricityConsumerId: "SBPDCL-DISCONNECTED",
              electricitySanctionedKw: 0,
              waterConnectionId: "PHED-NONE",
              municipalTaxStatus: "DISPUTED",
              lastTaxPaidDate: "Encroachment Notice Served (PMC)",
              taxReceiptNo: "PMC-STAY-2025-99",
            },
            easements: ["Municipal Demolition / Regularization Stay Order Active"],
          },
        ],
      },
      {
        floorIndex: 7,
        floorCode: "F7",
        floorName: "7th Floor · Unauthorized Height Deviation Tier-3",
        floorType: "RESIDENTIAL_LEVEL",
        elevationBaseM: 23.0,
        floorHeightM: 3.2,
        elevationMsl: "+23.0m → +26.2m MSL",
        grossAreaSqM: 740,
        isUnauthorizedFloor: true,
        heightViolationNotice: "Exceeds sanctioned municipal height limit of 15.0m (FAR violation +8.0m)",
        units: [
          {
            id: "f7-apt-701",
            unitNumber: "Sky Villa Flat 701 [VIOLATION FLAG]",
            ulpin3d: "IN-BR-PAT-0042-3D-F07-U01",
            unitType: "RESIDENTIAL",
            carpetAreaSqM: 340.0,
            builtUpAreaSqM: 395.0,
            volumeCuM: 1088.0,
            elevationRange: "+23.0m → +26.2m MSL",
            baseElevationM: 23.0,
            heightM: 3.2,
            relativeBounds: { x: 0.0, z: 0.0, w: 0.95, d: 0.85 },
            owner: {
              name: "Devendra Builders & Developers Pvt Ltd",
              verifiedAadhaarPan: false,
              contact: "+91 94300 00192",
              email: "legal@devendrabuilders.com",
              deedNumber: "DEED-UNAPPROVED-2025-02",
              deedDate: "15-Feb-2025",
              stampDutyRef: "STAMP-NON-COMPLIANT",
              registeredShare: "Unauthorized Vertical Extrusion",
            },
            clearances: {
              fireNoc: "PENDING",
              electricityConsumerId: "SBPDCL-DISCONNECTED",
              electricitySanctionedKw: 0,
              waterConnectionId: "PHED-NONE",
              municipalTaxStatus: "DISPUTED",
              lastTaxPaidDate: "Encroachment Notice Served (PMC)",
              taxReceiptNo: "PMC-STAY-2025-100",
            },
            easements: ["Municipal Demolition / Regularization Stay Order Active"],
          },
        ],
      },
      {
        floorIndex: 8,
        floorCode: "TERRACE",
        floorName: "Terrace · Rooftop Solar & Telecomm Air-Rights",
        floorType: "ROOFTOP_TERRACE",
        elevationBaseM: 26.2,
        floorHeightM: 2.4,
        elevationMsl: "+26.2m → +28.6m MSL",
        grossAreaSqM: 740,
        isUnauthorizedFloor: false,
        units: [
          {
            id: "ter-solar-01",
            unitNumber: "Rooftop Solar Easement Zone (75kW Array)",
            ulpin3d: "IN-BR-PAT-0042-3D-TER-U01",
            unitType: "AIR_RIGHTS",
            carpetAreaSqM: 420.0,
            builtUpAreaSqM: 450.0,
            volumeCuM: 1008.0,
            elevationRange: "+26.2m → +28.6m MSL",
            baseElevationM: 26.2,
            heightM: 2.4,
            relativeBounds: { x: -0.22, z: 0.0, w: 0.5, d: 0.85 },
            owner: {
              name: "Patna Central Heights Renewable Energy Consortium",
              verifiedAadhaarPan: true,
              contact: "+91 94310 11002",
              email: "solar@patnacentralheights.in",
              deedNumber: "DEED-PAT-2024-SOL01",
              deedDate: "15-Aug-2024",
              stampDutyRef: "STAMP-BR-2024-149021",
              registeredShare: "BREDA Net-Metering Grid Easement",
            },
            clearances: {
              fireNoc: "APPROVED",
              fireNocNumber: "BR-FIRE-PAT-2024-301",
              electricityConsumerId: "BREDA-SOL-9901",
              electricitySanctionedKw: 75,
              waterConnectionId: "PHED-PAT-WTR-4421",
              municipalTaxStatus: "CLEARED",
              lastTaxPaidDate: "15-Apr-2026",
              taxReceiptNo: "PMC-TAX-2026-90420",
            },
            easements: ["Unobstructed Solar Air-Rights Cone (360° Hemispherical Right)"],
          },
          {
            id: "ter-air-02",
            unitNumber: "Telecomm 5G Antenna Mast Easement",
            ulpin3d: "IN-BR-PAT-0042-3D-TER-U02",
            unitType: "AIR_RIGHTS",
            carpetAreaSqM: 180.0,
            builtUpAreaSqM: 210.0,
            volumeCuM: 432.0,
            elevationRange: "+26.2m → +28.6m MSL",
            baseElevationM: 26.2,
            heightM: 2.4,
            relativeBounds: { x: 0.28, z: 0.0, w: 0.38, d: 0.85 },
            owner: {
              name: "Bharti Airtel Telecom Infrastructure Ltd",
              verifiedAadhaarPan: true,
              contact: "+91 11 4666 6100",
              email: "towers.bihar@airtel.com",
              deedNumber: "DEED-PAT-2024-TEL01",
              deedDate: "20-Aug-2024",
              stampDutyRef: "STAMP-BR-2024-149088",
              registeredShare: "10-Year Registered Lease Easement",
            },
            clearances: {
              fireNoc: "APPROVED",
              fireNocNumber: "BR-FIRE-PAT-2024-305",
              electricityConsumerId: "SBPDCL-COM-99901",
              electricitySanctionedKw: 15,
              waterConnectionId: "PHED-EXEMPT",
              municipalTaxStatus: "CLEARED",
              lastTaxPaidDate: "10-May-2026",
              taxReceiptNo: "PMC-TAX-2026-95990",
            },
            easements: ["Civil Aviation Obstacle Light Maintenance Easement"],
          },
        ],
      },
    ],
  },
  {
    id: "exhibition-road-tower",
    buildingName: "Exhibition Road Business Tower",
    ulpin: "IN-BR-PAT-0089-3D",
    address: "Exhibition Road Commercial Corridor, Patna, Bihar 800001",
    district: "Patna Central",
    coordinates: { latitude: 25.612, longitude: 85.141 },
    sanctionedHeightM: 22.0,
    actualHeightM: 21.8,
    sanctionedFloors: "B1 + G + 5 + Terrace (22.0m max)",
    actualFloors: "B1 + G + 5 + Terrace (21.8m)",
    totalUnits: 16,
    municipalSanctionNo: "PMC/2023/BP-8120/C",
    sanctionStatus: "FULLY_COMPLIANT",
    subsurfaceMetroEasement: false,
    rooftopSolarRights: true,
    floors: [
      {
        floorIndex: -1,
        floorCode: "B1",
        floorName: "Basement 1 · Corporate Parking",
        floorType: "UNDERGROUND_BASEMENT",
        elevationBaseM: -3.5,
        floorHeightM: 3.5,
        elevationMsl: "-3.5m → 0.0m MSL",
        grossAreaSqM: 620,
        isUnauthorizedFloor: false,
        units: [
          {
            id: "ex-b1-pk01",
            unitNumber: "Corporate Executive Parking (Slots 1-18)",
            ulpin3d: "IN-BR-PAT-0089-3D-B01-U01",
            unitType: "PARKING",
            carpetAreaSqM: 520.0,
            builtUpAreaSqM: 580.0,
            volumeCuM: 1820.0,
            elevationRange: "-3.5m → 0.0m MSL",
            baseElevationM: -3.5,
            heightM: 3.5,
            relativeBounds: { x: 0.0, z: 0.0, w: 0.92, d: 0.88 },
            owner: {
              name: "Exhibition Tower Commercial Syndicate",
              verifiedAadhaarPan: true,
              contact: "+91 612 2320091",
              email: "admin@exhibitiontower.in",
              deedNumber: "DEED-PAT-2023-EX-PK01",
              deedDate: "10-Oct-2023",
              stampDutyRef: "STAMP-BR-2023-90118",
              registeredShare: "Common Commercial Parking Share",
            },
            clearances: {
              fireNoc: "APPROVED",
              fireNocNumber: "BR-FIRE-PAT-2023-441",
              electricityConsumerId: "SBPDCL-COM-88129",
              electricitySanctionedKw: 40,
              waterConnectionId: "PHED-PAT-COM-221",
              municipalTaxStatus: "CLEARED",
              lastTaxPaidDate: "10-Apr-2026",
              taxReceiptNo: "PMC-TAX-2026-88190",
            },
            easements: ["Exhibition Road Dual Ramp Ingress"],
          },
        ],
      },
      {
        floorIndex: 0,
        floorCode: "G",
        floorName: "Ground Floor · Banking & Retail",
        floorType: "GROUND_RETAIL",
        elevationBaseM: 0.0,
        floorHeightM: 4.0,
        elevationMsl: "+0.0m → +4.0m MSL",
        grossAreaSqM: 620,
        isUnauthorizedFloor: false,
        units: [
          {
            id: "ex-g-ret01",
            unitNumber: "Flagship Banking Hall (SBI Exhibition Rd)",
            ulpin3d: "IN-BR-PAT-0089-3D-F00-U01",
            unitType: "COMMERCIAL",
            carpetAreaSqM: 480.0,
            builtUpAreaSqM: 540.0,
            volumeCuM: 1920.0,
            elevationRange: "+0.0m → +4.0m MSL",
            baseElevationM: 0.0,
            heightM: 4.0,
            relativeBounds: { x: 0.0, z: 0.0, w: 0.92, d: 0.88 },
            owner: {
              name: "State Bank of India (Patna Main Module)",
              verifiedAadhaarPan: true,
              contact: "+91 612 2320100",
              email: "agm.exhibition@sbi.co.in",
              deedNumber: "DEED-PAT-2023-EX-G01",
              deedDate: "15-Oct-2023",
              stampDutyRef: "STAMP-BR-2023-90145",
              registeredShare: "Commercial Freehold (100%)",
            },
            clearances: {
              fireNoc: "APPROVED",
              fireNocNumber: "BR-FIRE-PAT-2023-442",
              electricityConsumerId: "SBPDCL-HT-88100",
              electricitySanctionedKw: 80,
              waterConnectionId: "PHED-PAT-COM-222",
              municipalTaxStatus: "CLEARED",
              lastTaxPaidDate: "12-Apr-2026",
              taxReceiptNo: "PMC-TAX-2026-88195",
            },
            easements: ["Armored Cash Van Secure Bay Easement"],
          },
        ],
      },
      {
        floorIndex: 1,
        floorCode: "F1",
        floorName: "1st Floor · Financial Advisory Suites",
        floorType: "COMMERCIAL_OFFICES",
        elevationBaseM: 4.0,
        floorHeightM: 3.4,
        elevationMsl: "+4.0m → +7.4m MSL",
        grossAreaSqM: 620,
        isUnauthorizedFloor: false,
        units: [
          {
            id: "ex-f1-off01",
            unitNumber: "Corporate Office Suite 101",
            ulpin3d: "IN-BR-PAT-0089-3D-F01-U01",
            unitType: "COMMERCIAL",
            carpetAreaSqM: 240.0,
            builtUpAreaSqM: 275.0,
            volumeCuM: 816.0,
            elevationRange: "+4.0m → +7.4m MSL",
            baseElevationM: 4.0,
            heightM: 3.4,
            relativeBounds: { x: -0.25, z: 0.0, w: 0.45, d: 0.85 },
            owner: {
              name: "Motilal Oswal Wealth Management",
              verifiedAadhaarPan: true,
              contact: "+91 612 2500111",
              email: "patna@motilaloswal.com",
              deedNumber: "DEED-PAT-2023-EX-101",
              deedDate: "20-Nov-2023",
              stampDutyRef: "STAMP-BR-2023-95100",
              registeredShare: "Commercial Freehold (100%)",
            },
            clearances: {
              fireNoc: "APPROVED",
              fireNocNumber: "BR-FIRE-PAT-2023-450",
              electricityConsumerId: "SBPDCL-COM-88201",
              electricitySanctionedKw: 25,
              waterConnectionId: "PHED-PAT-COM-225",
              municipalTaxStatus: "CLEARED",
              lastTaxPaidDate: "15-Apr-2026",
              taxReceiptNo: "PMC-TAX-2026-88201",
            },
            easements: ["Direct Elevator Core Access"],
          },
          {
            id: "ex-f1-off02",
            unitNumber: "Corporate Office Suite 102",
            ulpin3d: "IN-BR-PAT-0089-3D-F01-U02",
            unitType: "COMMERCIAL",
            carpetAreaSqM: 240.0,
            builtUpAreaSqM: 275.0,
            volumeCuM: 816.0,
            elevationRange: "+4.0m → +7.4m MSL",
            baseElevationM: 4.0,
            heightM: 3.4,
            relativeBounds: { x: 0.25, z: 0.0, w: 0.45, d: 0.85 },
            owner: {
              name: "Tata AIG General Insurance Regional Office",
              verifiedAadhaarPan: true,
              contact: "+91 612 2500222",
              email: "bihar.ops@tataaig.com",
              deedNumber: "DEED-PAT-2023-EX-102",
              deedDate: "22-Nov-2023",
              stampDutyRef: "STAMP-BR-2023-95120",
              registeredShare: "Commercial Freehold (100%)",
            },
            clearances: {
              fireNoc: "APPROVED",
              fireNocNumber: "BR-FIRE-PAT-2023-450",
              electricityConsumerId: "SBPDCL-COM-88205",
              electricitySanctionedKw: 25,
              waterConnectionId: "PHED-PAT-COM-226",
              municipalTaxStatus: "CLEARED",
              lastTaxPaidDate: "15-Apr-2026",
              taxReceiptNo: "PMC-TAX-2026-88205",
            },
            easements: ["Direct Elevator Core Access"],
          },
        ],
      },
      {
        floorIndex: 2,
        floorCode: "F2",
        floorName: "2nd Floor · IT & FinTech Hub",
        floorType: "COMMERCIAL_OFFICES",
        elevationBaseM: 7.4,
        floorHeightM: 3.4,
        elevationMsl: "+7.4m → +10.8m MSL",
        grossAreaSqM: 620,
        isUnauthorizedFloor: false,
        units: [
          {
            id: "ex-f2-off01",
            unitNumber: "FinTech Innovation Lab 201",
            ulpin3d: "IN-BR-PAT-0089-3D-F02-U01",
            unitType: "COMMERCIAL",
            carpetAreaSqM: 490.0,
            builtUpAreaSqM: 550.0,
            volumeCuM: 1666.0,
            elevationRange: "+7.4m → +10.8m MSL",
            baseElevationM: 7.4,
            heightM: 3.4,
            relativeBounds: { x: 0.0, z: 0.0, w: 0.92, d: 0.88 },
            owner: {
              name: "Bihar Startup & Innovation Hub",
              verifiedAadhaarPan: true,
              contact: "+91 612 2554411",
              email: "startups@bihar.gov.in",
              deedNumber: "DEED-PAT-2023-EX-201",
              deedDate: "05-Dec-2023",
              stampDutyRef: "STAMP-BR-2023-99012",
              registeredShare: "Government Registered Incubation Suite",
            },
            clearances: {
              fireNoc: "APPROVED",
              fireNocNumber: "BR-FIRE-PAT-2023-460",
              electricityConsumerId: "SBPDCL-COM-88300",
              electricitySanctionedKw: 50,
              waterConnectionId: "PHED-PAT-COM-230",
              municipalTaxStatus: "CLEARED",
              lastTaxPaidDate: "20-Apr-2026",
              taxReceiptNo: "PMC-TAX-2026-88300",
            },
            easements: ["State Data Center Fiber Ring Interconnect Right"],
          },
        ],
      },
      {
        floorIndex: 3,
        floorCode: "F3",
        floorName: "3rd Floor · Corporate Boardrooms",
        floorType: "COMMERCIAL_OFFICES",
        elevationBaseM: 10.8,
        floorHeightM: 3.4,
        elevationMsl: "+10.8m → +14.2m MSL",
        grossAreaSqM: 620,
        isUnauthorizedFloor: false,
        units: [
          {
            id: "ex-f3-off01",
            unitNumber: "Executive Boardroom Suite 301",
            ulpin3d: "IN-BR-PAT-0089-3D-F03-U01",
            unitType: "COMMERCIAL",
            carpetAreaSqM: 490.0,
            builtUpAreaSqM: 550.0,
            volumeCuM: 1666.0,
            elevationRange: "+10.8m → +14.2m MSL",
            baseElevationM: 10.8,
            heightM: 3.4,
            relativeBounds: { x: 0.0, z: 0.0, w: 0.92, d: 0.88 },
            owner: {
              name: "Patliputra Chambers of Commerce",
              verifiedAadhaarPan: true,
              contact: "+91 612 2541100",
              email: "contact@patliputrachambers.org",
              deedNumber: "DEED-PAT-2023-EX-301",
              deedDate: "12-Dec-2023",
              stampDutyRef: "STAMP-BR-2023-99055",
              registeredShare: "Institutional Commercial Freehold (100%)",
            },
            clearances: {
              fireNoc: "APPROVED",
              fireNocNumber: "BR-FIRE-PAT-2023-465",
              electricityConsumerId: "SBPDCL-COM-88350",
              electricitySanctionedKw: 35,
              waterConnectionId: "PHED-PAT-COM-235",
              municipalTaxStatus: "CLEARED",
              lastTaxPaidDate: "22-Apr-2026",
              taxReceiptNo: "PMC-TAX-2026-88350",
            },
            easements: ["Conference Audio Acoustic Right"],
          },
        ],
      },
      {
        floorIndex: 4,
        floorCode: "F4",
        floorName: "4th Floor · Architectural Design Studio",
        floorType: "COMMERCIAL_OFFICES",
        elevationBaseM: 14.2,
        floorHeightM: 3.4,
        elevationMsl: "+14.2m → +17.6m MSL",
        grossAreaSqM: 620,
        isUnauthorizedFloor: false,
        units: [
          {
            id: "ex-f4-off01",
            unitNumber: "Spatial Design Studio 401",
            ulpin3d: "IN-BR-PAT-0089-3D-F04-U01",
            unitType: "COMMERCIAL",
            carpetAreaSqM: 490.0,
            builtUpAreaSqM: 550.0,
            volumeCuM: 1666.0,
            elevationRange: "+14.2m → +17.6m MSL",
            baseElevationM: 14.2,
            heightM: 3.4,
            relativeBounds: { x: 0.0, z: 0.0, w: 0.92, d: 0.88 },
            owner: {
              name: "Nirmana Architects & Urban Planners",
              verifiedAadhaarPan: true,
              contact: "+91 94311 00992",
              email: "studio@nirmana.co.in",
              deedNumber: "DEED-PAT-2024-EX-401",
              deedDate: "15-Jan-2024",
              stampDutyRef: "STAMP-BR-2024-10112",
              registeredShare: "Commercial Freehold (100%)",
            },
            clearances: {
              fireNoc: "APPROVED",
              fireNocNumber: "BR-FIRE-PAT-2024-012",
              electricityConsumerId: "SBPDCL-COM-88400",
              electricitySanctionedKw: 30,
              waterConnectionId: "PHED-PAT-COM-240",
              municipalTaxStatus: "CLEARED",
              lastTaxPaidDate: "25-Apr-2026",
              taxReceiptNo: "PMC-TAX-2026-88400",
            },
            easements: ["North Light Daylight Easement"],
          },
        ],
      },
      {
        floorIndex: 5,
        floorCode: "F5",
        floorName: "5th Floor · Penthouse Corporate Lounge",
        floorType: "COMMERCIAL_OFFICES",
        elevationBaseM: 17.6,
        floorHeightM: 3.4,
        elevationMsl: "+17.6m → +21.0m MSL",
        grossAreaSqM: 620,
        isUnauthorizedFloor: false,
        units: [
          {
            id: "ex-f5-off01",
            unitNumber: "Executive Skyline Suite 501",
            ulpin3d: "IN-BR-PAT-0089-3D-F05-U01",
            unitType: "COMMERCIAL",
            carpetAreaSqM: 490.0,
            builtUpAreaSqM: 550.0,
            volumeCuM: 1666.0,
            elevationRange: "+17.6m → +21.0m MSL",
            baseElevationM: 17.6,
            heightM: 3.4,
            relativeBounds: { x: 0.0, z: 0.0, w: 0.92, d: 0.88 },
            owner: {
              name: "Exhibition Tower Holdings Ltd",
              verifiedAadhaarPan: true,
              contact: "+91 612 2320091",
              email: "holdings@exhibitiontower.in",
              deedNumber: "DEED-PAT-2024-EX-501",
              deedDate: "20-Jan-2024",
              stampDutyRef: "STAMP-BR-2024-10155",
              registeredShare: "Commercial Freehold (100%)",
            },
            clearances: {
              fireNoc: "APPROVED",
              fireNocNumber: "BR-FIRE-PAT-2024-015",
              electricityConsumerId: "SBPDCL-COM-88450",
              electricitySanctionedKw: 35,
              waterConnectionId: "PHED-PAT-COM-245",
              municipalTaxStatus: "CLEARED",
              lastTaxPaidDate: "28-Apr-2026",
              taxReceiptNo: "PMC-TAX-2026-88450",
            },
            easements: ["Terrace Direct Staircase Easement"],
          },
        ],
      },
      {
        floorIndex: 6,
        floorCode: "TERRACE",
        floorName: "Terrace · Helipad & Solar Zone",
        floorType: "ROOFTOP_TERRACE",
        elevationBaseM: 21.0,
        floorHeightM: 0.8,
        elevationMsl: "+21.0m → +21.8m MSL",
        grossAreaSqM: 620,
        isUnauthorizedFloor: false,
        units: [
          {
            id: "ex-ter-01",
            unitNumber: "Emergency Heli-pad & Solar Air-Rights",
            ulpin3d: "IN-BR-PAT-0089-3D-TER-U01",
            unitType: "AIR_RIGHTS",
            carpetAreaSqM: 520.0,
            builtUpAreaSqM: 580.0,
            volumeCuM: 416.0,
            elevationRange: "+21.0m → +21.8m MSL",
            baseElevationM: 21.0,
            heightM: 0.8,
            relativeBounds: { x: 0.0, z: 0.0, w: 0.92, d: 0.88 },
            owner: {
              name: "Exhibition Tower Commercial Syndicate",
              verifiedAadhaarPan: true,
              contact: "+91 612 2320091",
              email: "admin@exhibitiontower.in",
              deedNumber: "DEED-PAT-2024-EX-TER",
              deedDate: "25-Jan-2024",
              stampDutyRef: "STAMP-BR-2024-10199",
              registeredShare: "Common Syndicate Air-Rights",
            },
            clearances: {
              fireNoc: "APPROVED",
              fireNocNumber: "BR-FIRE-PAT-2024-020",
              electricityConsumerId: "BREDA-SOL-8819",
              electricitySanctionedKw: 50,
              waterConnectionId: "PHED-EXEMPT",
              municipalTaxStatus: "CLEARED",
              lastTaxPaidDate: "10-Apr-2026",
              taxReceiptNo: "PMC-TAX-2026-88499",
            },
            easements: ["DGCA Emergency Air Evacuation Clearance"],
          },
        ],
      },
    ],
  },
  {
    id: "iit-patna-academic-block-4",
    buildingName: "IIT Patna · Academic Block 4 (Institutional Campus Facility)",
    ulpin: "IN-BR-PAT-IITP-0004-3D",
    address: "Indian Institute of Technology Patna, Bihta, Patna, Bihar 801106",
    district: "Patna (Bihta Sub-Division)",
    coordinates: { latitude: 25.5357, longitude: 84.8512 },
    sanctionedHeightM: 18.5,
    actualHeightM: 18.2,
    sanctionedFloors: "G + 4 + Terrace (18.5m max limit)",
    actualFloors: "G + 4 + Terrace (18.2m)",
    totalUnits: 18,
    municipalSanctionNo: "IITP/EST/2022/CW-004",
    sanctionStatus: "FULLY_COMPLIANT",
    subsurfaceMetroEasement: false,
    rooftopSolarRights: true,
    floors: [
      {
        floorIndex: 0,
        floorCode: "G",
        floorName: "Ground Floor · Central Foyer & Heavy Engineering Workshop",
        floorType: "COMMERCIAL_OFFICES",
        elevationBaseM: 0.0,
        floorHeightM: 3.8,
        elevationMsl: "+0.0m → +3.8m MSL",
        grossAreaSqM: 1347,
        isUnauthorizedFloor: false,
        units: [
          {
            id: "iitp-g-foyer",
            unitNumber: "Main Academic Reception & Security Core",
            ulpin3d: "IN-BR-PAT-IITP-0004-3D-F00-U01",
            unitType: "UTILITY_CORE",
            carpetAreaSqM: 380.0,
            builtUpAreaSqM: 420.0,
            volumeCuM: 1444.0,
            elevationRange: "+0.0m → +3.8m MSL",
            baseElevationM: 0.0,
            heightM: 3.8,
            relativeBounds: { x: -0.25, z: 0.0, w: 0.45, d: 0.85 },
            owner: {
              name: "Board of Governors, IIT Patna (Ministry of Education)",
              verifiedAadhaarPan: true,
              contact: "+91 6115 233001",
              email: "registrar@iitp.ac.in",
              deedNumber: "DEED-INST-IITP-2022-01",
              deedDate: "10-Jan-2022",
              stampDutyRef: "STAMP-INST-CENTRAL-EXEMPT",
              registeredShare: "Statutory Institute Title (100%)",
            },
            clearances: {
              fireNoc: "APPROVED",
              fireNocNumber: "BR-FIRE-IITP-2022-01",
              electricityConsumerId: "SBPDCL-HT-IITP-01",
              electricitySanctionedKw: 500,
              waterConnectionId: "IITP-CAMPUS-WTR-01",
              municipalTaxStatus: "CLEARED",
              lastTaxPaidDate: "10-Apr-2026",
              taxReceiptNo: "PMC-EXEMPT-CENTRAL",
            },
            easements: ["Central Campus Quadrangle Ingress Right"],
          },
          {
            id: "iitp-g-mech",
            unitNumber: "Advanced Robotics & Mechatronics Fabrication Lab",
            ulpin3d: "IN-BR-PAT-IITP-0004-3D-F00-U02",
            unitType: "COMMERCIAL",
            carpetAreaSqM: 780.0,
            builtUpAreaSqM: 860.0,
            volumeCuM: 2964.0,
            elevationRange: "+0.0m → +3.8m MSL",
            baseElevationM: 0.0,
            heightM: 3.8,
            relativeBounds: { x: 0.25, z: 0.0, w: 0.45, d: 0.85 },
            owner: {
              name: "Department of Mechanical Engineering, IIT Patna",
              verifiedAadhaarPan: true,
              contact: "+91 6115 233020",
              email: "mech_head@iitp.ac.in",
              deedNumber: "DEED-INST-IITP-2022-02",
              deedDate: "10-Jan-2022",
              stampDutyRef: "STAMP-INST-CENTRAL-EXEMPT",
              registeredShare: "Academic Department Allocation",
            },
            clearances: {
              fireNoc: "APPROVED",
              fireNocNumber: "BR-FIRE-IITP-2022-01",
              electricityConsumerId: "SBPDCL-HT-IITP-01",
              electricitySanctionedKw: 150,
              waterConnectionId: "IITP-CAMPUS-WTR-01",
              municipalTaxStatus: "CLEARED",
              lastTaxPaidDate: "10-Apr-2026",
              taxReceiptNo: "PMC-EXEMPT-CENTRAL",
            },
            easements: ["High-Voltage 3-Phase Industrial Power Busway Right"],
          },
        ],
      },
      {
        floorIndex: 1,
        floorCode: "F1",
        floorName: "1st Floor · Computer Science Research & AI Cluster",
        floorType: "COMMERCIAL_OFFICES",
        elevationBaseM: 3.8,
        floorHeightM: 3.6,
        elevationMsl: "+3.8m → +7.4m MSL",
        grossAreaSqM: 1347,
        isUnauthorizedFloor: false,
        units: [
          {
            id: "iitp-f1-ai",
            unitNumber: "High Performance AI & Deep Learning Supercomputing Suite",
            ulpin3d: "IN-BR-PAT-IITP-0004-3D-F01-U01",
            unitType: "COMMERCIAL",
            carpetAreaSqM: 620.0,
            builtUpAreaSqM: 680.0,
            volumeCuM: 2232.0,
            elevationRange: "+3.8m → +7.4m MSL",
            baseElevationM: 3.8,
            heightM: 3.6,
            relativeBounds: { x: -0.25, z: 0.0, w: 0.45, d: 0.85 },
            owner: {
              name: "Department of Computer Science & Engineering, IIT Patna",
              verifiedAadhaarPan: true,
              contact: "+91 6115 233040",
              email: "cse_head@iitp.ac.in",
              deedNumber: "DEED-INST-IITP-2022-03",
              deedDate: "10-Jan-2022",
              stampDutyRef: "STAMP-INST-CENTRAL-EXEMPT",
              registeredShare: "Academic Department Allocation",
            },
            clearances: {
              fireNoc: "APPROVED",
              fireNocNumber: "BR-FIRE-IITP-2022-01",
              electricityConsumerId: "SBPDCL-HT-IITP-01",
              electricitySanctionedKw: 200,
              waterConnectionId: "IITP-CAMPUS-WTR-01",
              municipalTaxStatus: "CLEARED",
              lastTaxPaidDate: "10-Apr-2026",
              taxReceiptNo: "PMC-EXEMPT-CENTRAL",
            },
            easements: ["Dedicated Optical Fiber Ring & UPS Power Corridor"],
          },
          {
            id: "iitp-f1-semi",
            unitNumber: "Department Seminar & Conference Hall (250 Seats)",
            ulpin3d: "IN-BR-PAT-IITP-0004-3D-F01-U02",
            unitType: "COMMERCIAL",
            carpetAreaSqM: 540.0,
            builtUpAreaSqM: 600.0,
            volumeCuM: 1944.0,
            elevationRange: "+3.8m → +7.4m MSL",
            baseElevationM: 3.8,
            heightM: 3.6,
            relativeBounds: { x: 0.25, z: 0.0, w: 0.45, d: 0.85 },
            owner: {
              name: "IIT Patna Central Academic Facilities",
              verifiedAadhaarPan: true,
              contact: "+91 6115 233001",
              email: "academic@iitp.ac.in",
              deedNumber: "DEED-INST-IITP-2022-04",
              deedDate: "10-Jan-2022",
              stampDutyRef: "STAMP-INST-CENTRAL-EXEMPT",
              registeredShare: "Institutional Common Facility",
            },
            clearances: {
              fireNoc: "APPROVED",
              fireNocNumber: "BR-FIRE-IITP-2022-01",
              electricityConsumerId: "SBPDCL-HT-IITP-01",
              electricitySanctionedKw: 50,
              waterConnectionId: "IITP-CAMPUS-WTR-01",
              municipalTaxStatus: "CLEARED",
              lastTaxPaidDate: "10-Apr-2026",
              taxReceiptNo: "PMC-EXEMPT-CENTRAL",
            },
            easements: ["Dual Fire Exit Emergency Corridors"],
          },
        ],
      },
      {
        floorIndex: 2,
        floorCode: "F2",
        floorName: "2nd Floor · Electronics & Nanotechnology Cleanroom Lab",
        floorType: "COMMERCIAL_OFFICES",
        elevationBaseM: 7.4,
        floorHeightM: 3.6,
        elevationMsl: "+7.4m → +11.0m MSL",
        grossAreaSqM: 1347,
        isUnauthorizedFloor: false,
        units: [
          {
            id: "iitp-f2-nano",
            unitNumber: "VLSI & Nanofabrication Class-1000 Cleanroom",
            ulpin3d: "IN-BR-PAT-IITP-0004-3D-F02-U01",
            unitType: "COMMERCIAL",
            carpetAreaSqM: 580.0,
            builtUpAreaSqM: 640.0,
            volumeCuM: 2088.0,
            elevationRange: "+7.4m → +11.0m MSL",
            baseElevationM: 7.4,
            heightM: 3.6,
            relativeBounds: { x: -0.25, z: 0.0, w: 0.45, d: 0.85 },
            owner: {
              name: "Department of Electrical Engineering, IIT Patna",
              verifiedAadhaarPan: true,
              contact: "+91 6115 233060",
              email: "ee_head@iitp.ac.in",
              deedNumber: "DEED-INST-IITP-2022-05",
              deedDate: "10-Jan-2022",
              stampDutyRef: "STAMP-INST-CENTRAL-EXEMPT",
              registeredShare: "Academic Department Allocation",
            },
            clearances: {
              fireNoc: "APPROVED",
              fireNocNumber: "BR-FIRE-IITP-2022-01",
              electricityConsumerId: "SBPDCL-HT-IITP-01",
              electricitySanctionedKw: 120,
              waterConnectionId: "IITP-CAMPUS-WTR-01",
              municipalTaxStatus: "CLEARED",
              lastTaxPaidDate: "10-Apr-2026",
              taxReceiptNo: "PMC-EXEMPT-CENTRAL",
            },
            easements: ["Specialized Gas Exhaust & Vibration Dampening Easement"],
          },
          {
            id: "iitp-f2-fac",
            unitNumber: "Faculty Chambers & Research Scholar Cabins (EE/CSE)",
            ulpin3d: "IN-BR-PAT-IITP-0004-3D-F02-U02",
            unitType: "COMMERCIAL",
            carpetAreaSqM: 560.0,
            builtUpAreaSqM: 620.0,
            volumeCuM: 2016.0,
            elevationRange: "+7.4m → +11.0m MSL",
            baseElevationM: 7.4,
            heightM: 3.6,
            relativeBounds: { x: 0.25, z: 0.0, w: 0.45, d: 0.85 },
            owner: {
              name: "Dean Faculty Affairs, IIT Patna",
              verifiedAadhaarPan: true,
              contact: "+91 6115 233005",
              email: "dean_fa@iitp.ac.in",
              deedNumber: "DEED-INST-IITP-2022-06",
              deedDate: "10-Jan-2022",
              stampDutyRef: "STAMP-INST-CENTRAL-EXEMPT",
              registeredShare: "Faculty Administrative Allocation",
            },
            clearances: {
              fireNoc: "APPROVED",
              fireNocNumber: "BR-FIRE-IITP-2022-01",
              electricityConsumerId: "SBPDCL-HT-IITP-01",
              electricitySanctionedKw: 40,
              waterConnectionId: "IITP-CAMPUS-WTR-01",
              municipalTaxStatus: "CLEARED",
              lastTaxPaidDate: "10-Apr-2026",
              taxReceiptNo: "PMC-EXEMPT-CENTRAL",
            },
            easements: ["Elevator Core Direct Access"],
          },
        ],
      },
      {
        floorIndex: 3,
        floorCode: "F3",
        floorName: "3rd Floor · Civil Engineering & Geotechnical Materials Testing",
        floorType: "COMMERCIAL_OFFICES",
        elevationBaseM: 11.0,
        floorHeightM: 3.6,
        elevationMsl: "+11.0m → +14.6m MSL",
        grossAreaSqM: 1347,
        isUnauthorizedFloor: false,
        units: [
          {
            id: "iitp-f3-civil",
            unitNumber: "Geotechnical & Earthquake Simulation Laboratory",
            ulpin3d: "IN-BR-PAT-IITP-0004-3D-F03-U01",
            unitType: "COMMERCIAL",
            carpetAreaSqM: 600.0,
            builtUpAreaSqM: 660.0,
            volumeCuM: 2160.0,
            elevationRange: "+11.0m → +14.6m MSL",
            baseElevationM: 11.0,
            heightM: 3.6,
            relativeBounds: { x: -0.25, z: 0.0, w: 0.45, d: 0.85 },
            owner: {
              name: "Department of Civil Engineering, IIT Patna",
              verifiedAadhaarPan: true,
              contact: "+91 6115 233080",
              email: "ce_head@iitp.ac.in",
              deedNumber: "DEED-INST-IITP-2022-07",
              deedDate: "10-Jan-2022",
              stampDutyRef: "STAMP-INST-CENTRAL-EXEMPT",
              registeredShare: "Academic Department Allocation",
            },
            clearances: {
              fireNoc: "APPROVED",
              fireNocNumber: "BR-FIRE-IITP-2022-01",
              electricityConsumerId: "SBPDCL-HT-IITP-01",
              electricitySanctionedKw: 80,
              waterConnectionId: "IITP-CAMPUS-WTR-01",
              municipalTaxStatus: "CLEARED",
              lastTaxPaidDate: "10-Apr-2026",
              taxReceiptNo: "PMC-EXEMPT-CENTRAL",
            },
            easements: ["Structural Testing Heavy Load Bedding Right"],
          },
          {
            id: "iitp-f3-env",
            unitNumber: "Environmental Engineering & Water Quality Testing Centre",
            ulpin3d: "IN-BR-PAT-IITP-0004-3D-F03-U02",
            unitType: "COMMERCIAL",
            carpetAreaSqM: 520.0,
            builtUpAreaSqM: 580.0,
            volumeCuM: 1872.0,
            elevationRange: "+11.0m → +14.6m MSL",
            baseElevationM: 11.0,
            heightM: 3.6,
            relativeBounds: { x: 0.25, z: 0.0, w: 0.45, d: 0.85 },
            owner: {
              name: "Center for Water Resources & Sustainable Infrastructure",
              verifiedAadhaarPan: true,
              contact: "+91 6115 233085",
              email: "water_center@iitp.ac.in",
              deedNumber: "DEED-INST-IITP-2022-08",
              deedDate: "10-Jan-2022",
              stampDutyRef: "STAMP-INST-CENTRAL-EXEMPT",
              registeredShare: "Research Centre Allocation",
            },
            clearances: {
              fireNoc: "APPROVED",
              fireNocNumber: "BR-FIRE-IITP-2022-01",
              electricityConsumerId: "SBPDCL-HT-IITP-01",
              electricitySanctionedKw: 60,
              waterConnectionId: "IITP-CAMPUS-WTR-01",
              municipalTaxStatus: "CLEARED",
              lastTaxPaidDate: "10-Apr-2026",
              taxReceiptNo: "PMC-EXEMPT-CENTRAL",
            },
            easements: ["Chemical Drainage Neutralization Line Right"],
          },
        ],
      },
      {
        floorIndex: 4,
        floorCode: "F4",
        floorName: "4th Floor · Dean Executive Suite & Academic Council Boardroom",
        floorType: "COMMERCIAL_OFFICES",
        elevationBaseM: 14.6,
        floorHeightM: 3.6,
        elevationMsl: "+14.6m → +18.2m MSL",
        grossAreaSqM: 1347,
        isUnauthorizedFloor: false,
        units: [
          {
            id: "iitp-f4-dean",
            unitNumber: "Dean (Academic & Research) Executive Chambers",
            ulpin3d: "IN-BR-PAT-IITP-0004-3D-F04-U01",
            unitType: "COMMERCIAL",
            carpetAreaSqM: 580.0,
            builtUpAreaSqM: 640.0,
            volumeCuM: 2088.0,
            elevationRange: "+14.6m → +18.2m MSL",
            baseElevationM: 14.6,
            heightM: 3.6,
            relativeBounds: { x: -0.25, z: 0.0, w: 0.45, d: 0.85 },
            owner: {
              name: "Director & Dean Council, IIT Patna",
              verifiedAadhaarPan: true,
              contact: "+91 6115 233002",
              email: "director@iitp.ac.in",
              deedNumber: "DEED-INST-IITP-2022-09",
              deedDate: "10-Jan-2022",
              stampDutyRef: "STAMP-INST-CENTRAL-EXEMPT",
              registeredShare: "Executive Academic Administration",
            },
            clearances: {
              fireNoc: "APPROVED",
              fireNocNumber: "BR-FIRE-IITP-2022-01",
              electricityConsumerId: "SBPDCL-HT-IITP-01",
              electricitySanctionedKw: 50,
              waterConnectionId: "IITP-CAMPUS-WTR-01",
              municipalTaxStatus: "CLEARED",
              lastTaxPaidDate: "10-Apr-2026",
              taxReceiptNo: "PMC-EXEMPT-CENTRAL",
            },
            easements: ["Terrace Direct Access Staircase Right"],
          },
          {
            id: "iitp-f4-council",
            unitNumber: "Academic Senate & International Collab Hall",
            ulpin3d: "IN-BR-PAT-IITP-0004-3D-F04-U02",
            unitType: "COMMERCIAL",
            carpetAreaSqM: 540.0,
            builtUpAreaSqM: 600.0,
            volumeCuM: 1944.0,
            elevationRange: "+14.6m → +18.2m MSL",
            baseElevationM: 14.6,
            heightM: 3.6,
            relativeBounds: { x: 0.25, z: 0.0, w: 0.45, d: 0.85 },
            owner: {
              name: "IIT Patna Senate Secretariat",
              verifiedAadhaarPan: true,
              contact: "+91 6115 233001",
              email: "senate@iitp.ac.in",
              deedNumber: "DEED-INST-IITP-2022-10",
              deedDate: "10-Jan-2022",
              stampDutyRef: "STAMP-INST-CENTRAL-EXEMPT",
              registeredShare: "Institutional Senate Facility",
            },
            clearances: {
              fireNoc: "APPROVED",
              fireNocNumber: "BR-FIRE-IITP-2022-01",
              electricityConsumerId: "SBPDCL-HT-IITP-01",
              electricitySanctionedKw: 40,
              waterConnectionId: "IITP-CAMPUS-WTR-01",
              municipalTaxStatus: "CLEARED",
              lastTaxPaidDate: "10-Apr-2026",
              taxReceiptNo: "PMC-EXEMPT-CENTRAL",
            },
            easements: ["Secure Video Telepresence Fiber Link Right"],
          },
        ],
      },
      {
        floorIndex: 5,
        floorCode: "TERRACE",
        floorName: "Terrace · Drone Aerodynamics Testbed & 100kW Solar Plant",
        floorType: "ROOFTOP_TERRACE",
        elevationBaseM: 18.2,
        floorHeightM: 1.0,
        elevationMsl: "+18.2m → +19.2m MSL",
        grossAreaSqM: 1347,
        isUnauthorizedFloor: false,
        units: [
          {
            id: "iitp-ter-drone",
            unitNumber: "UAV / Drone Air-Rights Corridor & Testing Cage",
            ulpin3d: "IN-BR-PAT-IITP-0004-3D-TER-U01",
            unitType: "AIR_RIGHTS",
            carpetAreaSqM: 680.0,
            builtUpAreaSqM: 720.0,
            volumeCuM: 680.0,
            elevationRange: "+18.2m → +19.2m MSL",
            baseElevationM: 18.2,
            heightM: 1.0,
            relativeBounds: { x: -0.22, z: 0.0, w: 0.5, d: 0.85 },
            owner: {
              name: "Center for Aerial Robotics & Drone Systems (IITP)",
              verifiedAadhaarPan: true,
              contact: "+91 6115 233090",
              email: "drones@iitp.ac.in",
              deedNumber: "DEED-INST-IITP-2022-TER1",
              deedDate: "10-Jan-2022",
              stampDutyRef: "STAMP-INST-CENTRAL-EXEMPT",
              registeredShare: "DGCA Registered Drone Testing Envelope",
            },
            clearances: {
              fireNoc: "APPROVED",
              fireNocNumber: "BR-FIRE-IITP-2022-01",
              electricityConsumerId: "SBPDCL-HT-IITP-01",
              electricitySanctionedKw: 30,
              waterConnectionId: "IITP-CAMPUS-WTR-01",
              municipalTaxStatus: "CLEARED",
              lastTaxPaidDate: "10-Apr-2026",
              taxReceiptNo: "PMC-EXEMPT-CENTRAL",
            },
            easements: ["Unrestricted Air-Space Altitude Right (Up to 120m AGL)"],
          },
          {
            id: "iitp-ter-solar",
            unitNumber: "100kW Rooftop Solar Photovoltaic Grid Array",
            ulpin3d: "IN-BR-PAT-IITP-0004-3D-TER-U02",
            unitType: "AIR_RIGHTS",
            carpetAreaSqM: 520.0,
            builtUpAreaSqM: 580.0,
            volumeCuM: 520.0,
            elevationRange: "+18.2m → +19.2m MSL",
            baseElevationM: 18.2,
            heightM: 1.0,
            relativeBounds: { x: 0.28, z: 0.0, w: 0.38, d: 0.85 },
            owner: {
              name: "IIT Patna Green Energy Initiative (BREDA Co-op)",
              verifiedAadhaarPan: true,
              contact: "+91 6115 233001",
              email: "green@iitp.ac.in",
              deedNumber: "DEED-INST-IITP-2022-TER2",
              deedDate: "10-Jan-2022",
              stampDutyRef: "STAMP-INST-CENTRAL-EXEMPT",
              registeredShare: "Net-Metering Clean Power Allocation",
            },
            clearances: {
              fireNoc: "APPROVED",
              fireNocNumber: "BR-FIRE-IITP-2022-01",
              electricityConsumerId: "BREDA-IITP-SOL-01",
              electricitySanctionedKw: 100,
              waterConnectionId: "IITP-CAMPUS-WTR-01",
              municipalTaxStatus: "CLEARED",
              lastTaxPaidDate: "10-Apr-2026",
              taxReceiptNo: "PMC-EXEMPT-CENTRAL",
            },
            easements: ["Solar Insolation Direct Exposure Easement"],
          },
        ],
      },
    ],
  },
];

export function getBuildingFloorStackRecord(buildingIdOrUlpin: string): BuildingFloorStackRecord | null {
  const normalized = buildingIdOrUlpin.trim().toLowerCase();
  const match = SAMPLE_BUILDING_FLOOR_STACKS.find(
    b =>
      b.id.toLowerCase() === normalized ||
      b.ulpin.toLowerCase() === normalized ||
      b.buildingName.toLowerCase().includes(normalized)
  );
  if (match) return match;

  if (normalized.includes("iit") || normalized.includes("patna") || normalized.includes("bihta") || normalized.includes("academic")) {
    return SAMPLE_BUILDING_FLOOR_STACKS.find(b => b.id === "iit-patna-academic-block-4") ?? SAMPLE_BUILDING_FLOOR_STACKS[0];
  }
  if (normalized.includes("exhibition")) {
    return SAMPLE_BUILDING_FLOOR_STACKS.find(b => b.id === "exhibition-road-tower") ?? SAMPLE_BUILDING_FLOOR_STACKS[0];
  }
  return SAMPLE_BUILDING_FLOOR_STACKS[0];
}

/**
 * Universal dynamic floor stack generator for ANY searched building or clicked polygon on the map
 */
/**
 * Infers the realistic floor count for any building using:
 * 1. Authority approved floor count / OSM building:levels
 * 2. 3D Survey Height (height / 3.2m standard slab height)
 * 3. Typology & Institution classification (Towers: 12-15 floors, Heights/Apartments: 8-10 floors, Campus: 6-8 floors, Houses: 2-3 floors)
 */
export function inferFloorCountForBuilding(
  properties?: Record<string, unknown> | null,
  name?: string
): { floorCount: number; sourceBasis: "sanction-record" | "height-derived" | "typology-profile" } {
  // 1. Explicit approvedFloorCount or building:levels
  const explicit = Number(
    properties?.approvedFloorCount ||
    properties?.floorCount ||
    properties?.['building:levels'] ||
    properties?.levels
  );
  if (Number.isFinite(explicit) && explicit > 0) {
    return {
      floorCount: Math.min(Math.max(Math.floor(explicit), 1), 24),
      sourceBasis: "sanction-record",
    };
  }

  // 2. Height-derived: approvedHeightMetres / 3.2m
  const rawHeight = Number(
    properties?.approvedHeightMetres ||
    properties?.heightMetres ||
    properties?.height ||
    properties?.buildingHeight
  );
  if (Number.isFinite(rawHeight) && rawHeight > 0) {
    return {
      floorCount: Math.min(Math.max(Math.round(rawHeight / 3.2), 1), 24),
      sourceBasis: "height-derived",
    };
  }

  // 3. Typology & Name Keywords
  const lower = (name || "").toLowerCase();
  if (/tower|skyscraper|high-?rise|exhibition|centre point|commercial hub/i.test(lower)) {
    return { floorCount: 12, sourceBasis: "typology-profile" }; // G+11 commercial high-rise
  }
  if (/heights|apartment|residency|enclave|alankar|plaza|central|kusum/i.test(lower)) {
    return { floorCount: 8, sourceBasis: "typology-profile" }; // G+7 residential multi-storey
  }
  if (/amity|hospital|aiims|hotel|corporate/i.test(lower)) {
    return { floorCount: 8, sourceBasis: "typology-profile" }; // G+7 institutional/medical tower
  }
  if (/university|college|institute|iit|academic|block|bihta|science/i.test(lower)) {
    return { floorCount: 6, sourceBasis: "typology-profile" }; // G+5 academic complex
  }
  if (/house|villa|bungalow|cottage|single|plot/i.test(lower)) {
    return { floorCount: 2, sourceBasis: "typology-profile" }; // G+1 residential bungalow
  }

  // 4. Standard default for urban multi-storey structures
  return { floorCount: 7, sourceBasis: "typology-profile" }; // G+6 standard urban multi-storey
}

/**
 * Universal dynamic floor stack generator for ANY searched building or clicked polygon on the map.
 * Supports custom override floor counts (e.g. user toggles 8, 10, 12, etc.).
 */
export function resolveFloorStackForSelection(
  properties?: Record<string, unknown> | null,
  query?: string,
  overrideFloorCount?: number | null
): BuildingFloorStackRecord {
  const name = String(
    properties?.name ||
    properties?.title ||
    properties?.buildingName ||
    query ||
    "Searched Structure"
  ).trim();
  const lowerName = name.toLowerCase();

  // 1. Direct Catalog Match (if no override requested)
  if (!overrideFloorCount) {
    if (lowerName.includes("bailey") || lowerName.includes("patna central") || (lowerName.includes("heights") && !lowerName.includes("alankar"))) {
      return getBuildingFloorStackRecord("patna-central-heights")!;
    }
    if (lowerName.includes("exhibition") || lowerName.includes("business tower")) {
      return getBuildingFloorStackRecord("exhibition-road-tower")!;
    }
    if (lowerName.includes("iit") || lowerName.includes("academic block") || lowerName.includes("bihta")) {
      return getBuildingFloorStackRecord("iit-patna-academic-block-4")!;
    }
  }

  // 2. Determine floor count dynamically
  const inference = inferFloorCountForBuilding(properties, name);
  const floorCount = overrideFloorCount && overrideFloorCount > 0
    ? Math.min(Math.max(overrideFloorCount, 1), 24)
    : inference.floorCount;

  const rawHeight = Number(properties?.approvedHeightMetres || properties?.heightMetres || floorCount * 3.2);
  const buildingHeight = Number.isFinite(rawHeight) ? rawHeight : floorCount * 3.2;
  const footprintArea = Number(properties?.footprintAreaSquareMetres || properties?.area || 850);
  const ulpin = String(properties?.ulpin || `IN-BR-PAT-${Math.floor(1000 + Math.random() * 9000)}-3D`);

  const dynamicFloors: FloorStackLevel[] = [];

  // Add Basement for taller buildings (>= 6 floors)
  if (floorCount >= 6) {
    dynamicFloors.push({
      floorIndex: -1,
      floorCode: "B1",
      floorName: `Basement 1 · Dedicated Resident/Visitor Parking Bay`,
      floorType: "UNDERGROUND_BASEMENT",
      elevationBaseM: -3.2,
      floorHeightM: 3.2,
      elevationMsl: `-3.2m → 0.0m MSL`,
      grossAreaSqM: footprintArea,
      isUnauthorizedFloor: false,
      units: [
        {
          id: `dyn-b1-park`,
          unitNumber: "Basement Parking Bay B1 (Slots 1-18)",
          ulpin3d: `${ulpin}-B01-U01`,
          unitType: "PARKING",
          carpetAreaSqM: Math.round(footprintArea * 0.7),
          builtUpAreaSqM: Math.round(footprintArea * 0.8),
          volumeCuM: Math.round(footprintArea * 0.7 * 3.2),
          elevationRange: `-3.2m → 0.0m MSL`,
          baseElevationM: -3.2,
          heightM: 3.2,
          relativeBounds: { x: 0.0, z: 0.0, w: 0.9, d: 0.9 },
          owner: {
            name: `${name} Common Parking Association`,
            verifiedAadhaarPan: true,
            contact: "+91 94310 00000",
            email: `parking@patna.gov.in`,
            deedNumber: `DEED-PAT-2024-B1PK`,
            deedDate: "10-Jan-2024",
            stampDutyRef: `STAMP-BR-2024-90000`,
            registeredShare: "Common Parking Easement",
          },
          clearances: {
            fireNoc: "APPROVED",
            fireNocNumber: `BR-FIRE-PAT-2024-B1`,
            electricityConsumerId: `SBPDCL-HT-9001`,
            electricitySanctionedKw: 25,
            waterConnectionId: `PHED-EXEMPT`,
            municipalTaxStatus: "CLEARED",
            lastTaxPaidDate: "10-Apr-2026",
            taxReceiptNo: `PMC-TAX-2026-90001`,
          },
          easements: ["Vehicular Ingress & Ramp Easement"],
        },
      ],
    });
  }

  // Build above-ground floors G, F1, F2, F3...
  for (let i = 0; i < floorCount; i++) {
    const isGround = i === 0;
    const floorCode = isGround ? "G" : `F${i}`;
    const baseElevation = i * 3.2;
    const topElevation = (i + 1) * 3.2;
    const isCommercial = isGround || floorCount >= 10;
    const floorType: FloorType = isGround
      ? "GROUND_RETAIL"
      : isCommercial && i <= 2
        ? "COMMERCIAL_OFFICES"
        : "RESIDENTIAL_LEVEL";

    // Mark top floor as unauthorized if exceeding standard 15m sanction on 8+ floors without deviation permit
    const isUnauthorized = floorCount > 7 && i >= 6 && properties?.sanctionStatus === "SANCTIONED_WITH_DEVIATIONS";

    dynamicFloors.push({
      floorIndex: i,
      floorCode,
      floorName: isGround
        ? `Ground Floor · Foyer, Reception & Retail Suites`
        : `Floor ${i} · Verified Units [${isCommercial ? "Commercial Suite" : "Residential"}]`,
      floorType,
      elevationBaseM: baseElevation,
      floorHeightM: 3.2,
      elevationMsl: `+${baseElevation.toFixed(1)}m → +${topElevation.toFixed(1)}m MSL`,
      grossAreaSqM: footprintArea,
      isUnauthorizedFloor: isUnauthorized,
      heightViolationNotice: isUnauthorized
        ? `Floor ${i} exceeds sanctioned G+4 height baseline without updated municipal NOC.`
        : undefined,
      units: [
        {
          id: `dyn-f${i}-u1`,
          unitNumber: isGround
            ? `Commercial Suite G-01`
            : `${floorType === "COMMERCIAL_OFFICES" ? "Executive Office" : "Apartment Flat"} ${i}01`,
          ulpin3d: `${ulpin}-F0${i}-U01`,
          unitType: isGround || floorType === "COMMERCIAL_OFFICES" ? "COMMERCIAL" : "RESIDENTIAL",
          carpetAreaSqM: Math.round(footprintArea * 0.42 * 10) / 10,
          builtUpAreaSqM: Math.round(footprintArea * 0.48 * 10) / 10,
          volumeCuM: Math.round(footprintArea * 0.42 * 3.2 * 10) / 10,
          elevationRange: `+${baseElevation.toFixed(1)}m → +${topElevation.toFixed(1)}m MSL`,
          baseElevationM: baseElevation,
          heightM: 3.2,
          relativeBounds: { x: -0.25, z: 0.0, w: 0.45, d: 0.85 },
          owner: {
            name: `${name} Registered Unit Owner ${i}01`,
            verifiedAadhaarPan: true,
            contact: "+91 94310 00001",
            email: `owner.f${i}01@bihar.cadastre.gov.in`,
            deedNumber: `DEED-PAT-2024-F${i}01`,
            deedDate: "15-May-2024",
            stampDutyRef: `STAMP-BR-2024-${88000 + i}`,
            registeredShare: "Freehold Ownership (100%)",
          },
          clearances: {
            fireNoc: "APPROVED",
            fireNocNumber: `BR-FIRE-PAT-2024-F${i}`,
            electricityConsumerId: `SBPDCL-DOM-${40000 + i}`,
            electricitySanctionedKw: isGround ? 25 : 8,
            waterConnectionId: `PHED-PAT-DOM-${400 + i}`,
            municipalTaxStatus: "CLEARED",
            lastTaxPaidDate: "10-Jun-2026",
            taxReceiptNo: `PMC-TAX-2026-${90000 + i}`,
          },
          easements: [`1 Dedicated Parking Slot B1-0${i + 1}`, `Common Corridor Ingress Right`],
        },
        {
          id: `dyn-f${i}-u2`,
          unitNumber: isGround
            ? `Commercial Suite G-02`
            : `${floorType === "COMMERCIAL_OFFICES" ? "Corporate Suite" : "Apartment Flat"} ${i}02`,
          ulpin3d: `${ulpin}-F0${i}-U02`,
          unitType: isGround || floorType === "COMMERCIAL_OFFICES" ? "COMMERCIAL" : "RESIDENTIAL",
          carpetAreaSqM: Math.round(footprintArea * 0.42 * 10) / 10,
          builtUpAreaSqM: Math.round(footprintArea * 0.48 * 10) / 10,
          volumeCuM: Math.round(footprintArea * 0.42 * 3.2 * 10) / 10,
          elevationRange: `+${baseElevation.toFixed(1)}m → +${topElevation.toFixed(1)}m MSL`,
          baseElevationM: baseElevation,
          heightM: 3.2,
          relativeBounds: { x: 0.25, z: 0.0, w: 0.45, d: 0.85 },
          owner: {
            name: `${name} Registered Unit Owner ${i}02`,
            verifiedAadhaarPan: true,
            contact: "+91 94310 00002",
            email: `owner.f${i}02@bihar.cadastre.gov.in`,
            deedNumber: `DEED-PAT-2024-F${i}02`,
            deedDate: "18-May-2024",
            stampDutyRef: `STAMP-BR-2024-${88500 + i}`,
            registeredShare: "Freehold Ownership (100%)",
          },
          clearances: {
            fireNoc: "APPROVED",
            fireNocNumber: `BR-FIRE-PAT-2024-F${i}`,
            electricityConsumerId: `SBPDCL-DOM-${40500 + i}`,
            electricitySanctionedKw: isGround ? 20 : 8,
            waterConnectionId: `PHED-PAT-DOM-${450 + i}`,
            municipalTaxStatus: "CLEARED",
            lastTaxPaidDate: "12-Jun-2026",
            taxReceiptNo: `PMC-TAX-2026-${90500 + i}`,
          },
          easements: [`Common Corridor Ingress Right`],
        },
      ],
    });
  }

  // Add Terrace
  dynamicFloors.push({
    floorIndex: floorCount,
    floorCode: "TERRACE",
    floorName: `Terrace · Rooftop Solar Array & Air-Rights Zone`,
    floorType: "ROOFTOP_TERRACE",
    elevationBaseM: floorCount * 3.2,
    floorHeightM: 1.0,
    elevationMsl: `+${(floorCount * 3.2).toFixed(1)}m → +${(floorCount * 3.2 + 1.0).toFixed(1)}m MSL`,
    grossAreaSqM: footprintArea,
    isUnauthorizedFloor: false,
    units: [
      {
        id: `dyn-ter-solar`,
        unitNumber: `Rooftop Solar Array (${Math.round(footprintArea * 0.08)} kW)`,
        ulpin3d: `${ulpin}-TER-U01`,
        unitType: "AIR_RIGHTS",
        carpetAreaSqM: Math.round(footprintArea * 0.6),
        builtUpAreaSqM: Math.round(footprintArea * 0.65),
        volumeCuM: Math.round(footprintArea * 0.6),
        elevationRange: `+${(floorCount * 3.2).toFixed(1)}m → +${(floorCount * 3.2 + 1.0).toFixed(1)}m MSL`,
        baseElevationM: floorCount * 3.2,
        heightM: 1.0,
        relativeBounds: { x: 0.0, z: 0.0, w: 0.85, d: 0.85 },
        owner: {
          name: `${name} Common Society & Solar Co-op`,
          verifiedAadhaarPan: true,
          contact: "+91 94310 00000",
          email: `society@bihar.cadastre.gov.in`,
          deedNumber: `DEED-PAT-2024-TER`,
          deedDate: "01-Jun-2024",
          stampDutyRef: `STAMP-BR-2024-99999`,
          registeredShare: "Society Common Solar Easement",
        },
        clearances: {
          fireNoc: "APPROVED",
          fireNocNumber: "BR-FIRE-PAT-2024-099",
          electricityConsumerId: "BREDA-SOL-0099",
          electricitySanctionedKw: 50,
          waterConnectionId: "PHED-EXEMPT",
          municipalTaxStatus: "CLEARED",
          lastTaxPaidDate: "10-Apr-2026",
          taxReceiptNo: "PMC-TAX-2026-99999",
        },
        easements: ["Unobstructed Solar Insolation Air-Rights Cone"],
      },
    ],
  });

  return {
    id: `custom-${ulpin.toLowerCase()}`,
    buildingName: name,
    ulpin,
    address: String(properties?.location || properties?.address || `${name}, Patna, Bihar`),
    district: "Patna Central",
    coordinates: {
      latitude: Number(properties?.latitude || 25.6093),
      longitude: Number(properties?.longitude || 85.1235),
    },
    sanctionedHeightM: buildingHeight,
    actualHeightM: buildingHeight,
    sanctionedFloors: `G + ${floorCount - 1} + Terrace (${buildingHeight.toFixed(1)}m)`,
    actualFloors: `${floorCount >= 6 ? "B1 + " : ""}G + ${floorCount - 1} + Terrace (${buildingHeight.toFixed(1)}m)`,
    totalUnits: floorCount * 2 + (floorCount >= 6 ? 2 : 1),
    municipalSanctionNo: `PMC/2024/BP-${Math.floor(1000 + Math.random() * 9000)}/A`,
    sanctionStatus: floorCount > 7 && properties?.sanctionStatus === "SANCTIONED_WITH_DEVIATIONS"
      ? "SANCTIONED_WITH_DEVIATIONS"
      : "FULLY_COMPLIANT",
    subsurfaceMetroEasement: floorCount >= 8,
    rooftopSolarRights: true,
    floors: dynamicFloors,
  };
}

export function getUnitCadastreDetails(ulpin3d: string): {
  building: BuildingFloorStackRecord;
  floor: FloorStackLevel;
  unit: FloorUnitCadastre;
} | null {
  for (const b of SAMPLE_BUILDING_FLOOR_STACKS) {
    for (const f of b.floors) {
      const u = f.units.find(
        unit =>
          unit.ulpin3d.toLowerCase() === ulpin3d.toLowerCase() ||
          unit.id.toLowerCase() === ulpin3d.toLowerCase()
      );
      if (u) {
        return { building: b, floor: f, unit: u };
      }
    }
  }
  return null;
}

