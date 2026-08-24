export function getApprovedExtrusionHeight(properties: Record<string, unknown>, visualLiftMetres = 1) {
  const approvedHeight = properties.approvedHeightMetres;
  if (typeof approvedHeight !== "number" || !Number.isFinite(approvedHeight) || approvedHeight <= 0) return undefined;
  return approvedHeight + visualLiftMetres;
}
