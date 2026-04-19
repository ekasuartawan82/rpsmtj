import type { UserRole } from "@/lib/constants/roles";

export function getDefaultRouteForRole(role?: UserRole | null) {
  switch (role) {
    case "admin":
      return "/admin";
    case "dosen":
      return "/rps";
    case "koordinator_rmk":
      return "/review";
    case "kaprodi":
      return "/review";
    default:
      return "/";
  }
}
