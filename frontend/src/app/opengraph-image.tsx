import { ImageResponse } from "next/og";

export const alt = "3D Cadastral Intelligence - Spatial Intelligence Platform";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "70px 80px",
          backgroundColor: "#0B0F19",
          backgroundImage: "radial-gradient(circle at 80% 20%, rgba(6, 182, 212, 0.15) 0%, transparent 50%), radial-gradient(circle at 20% 80%, rgba(16, 185, 129, 0.12) 0%, transparent 50%)",
          color: "#F8FAFC",
          fontFamily: "sans-serif",
          border: "1px solid #1F2937",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              backgroundColor: "rgba(6, 182, 212, 0.15)",
              border: "1px solid rgba(6, 182, 212, 0.4)",
              color: "#06B6D4",
              fontSize: "24px",
              fontWeight: "bold",
            }}
          >
            3D
          </div>
          <span
            style={{
              fontSize: "18px",
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#38BDF8",
            }}
          >
            Spatial Intelligence &amp; 3D Cadastre
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <h1
            style={{
              fontSize: "56px",
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              color: "#FFFFFF",
              margin: 0,
            }}
          >
            3D Cadastral Intelligence
          </h1>
          <p
            style={{
              fontSize: "24px",
              lineHeight: 1.4,
              color: "#94A3B8",
              margin: 0,
              maxWidth: "920px",
            }}
          >
            Transforming cadastral and geospatial data into validated, stratified 3D property volumes and prototype 3D-ULPIN representations.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid #1F2937",
            paddingTop: "24px",
            fontSize: "16px",
            color: "#64748B",
          }}
        >
          <span>Deterministic Geometry • ISO 19152 LADM • Automated Validation</span>
          <span style={{ color: "#10B981", fontFamily: "monospace" }}>Prototype v1.0</span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
