import type { ReactNode } from "react";
import { AdminUtilityBar } from "./admin-utility-bar";
import "./admin-shell.css";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminUtilityBar>{children}</AdminUtilityBar>;
}
