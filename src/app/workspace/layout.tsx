import type { Metadata } from "next";
import { constructMetadata } from "@/lib/metadata";

export const metadata: Metadata = constructMetadata({
  title: "2D Cadastral Workspace",
  description:
    "Interactive 2D cadastral boundary inspection, parcel selection, and deterministic spatial validation.",
  path: "/workspace",
});

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
