import type { ReactNode } from "react";
import { AdminUtilityBar } from "./admin-utility-bar";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AdminUtilityBar />
      {children}
    </>
  );
}
