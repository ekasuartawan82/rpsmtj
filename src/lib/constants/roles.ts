export const USER_ROLES = ["dosen", "koordinator_rmk", "kaprodi", "admin"] as const;

export type UserRole = (typeof USER_ROLES)[number];
