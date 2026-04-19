"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type UserRecord = {
  id: string;
  nama: string;
  email: string;
  nidn: string | null;
  role: "dosen" | "koordinator_rmk" | "kaprodi" | "admin";
  isActive: boolean;
  createdAt: Date;
};

type UsersAdminPanelProps = {
  users: UserRecord[];
  currentAdminId: string;
};

const roleOptions: Array<UserRecord["role"]> = ["admin", "kaprodi", "koordinator_rmk", "dosen"];

async function submitJson(url: string, method: "POST" | "PATCH", body: unknown) {
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: { message?: string } }
      | null;

    throw new Error(payload?.error?.message ?? "Permintaan gagal diproses.");
  }
}

export function UsersAdminPanel({ users, currentAdminId }: UsersAdminPanelProps) {
  const router = useRouter();
  const [createFormError, setCreateFormError] = useState<string | null>(null);
  const [updateFormErrors, setUpdateFormErrors] = useState<Record<string, string | null>>({});
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-8">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#6e6e73]">
            Create User
          </p>
          <h2 className="mt-4 font-heading text-3xl text-slate-950">
            Tambah akun baru untuk dosen, koordinator RMK, Ka Prodi, atau admin.
          </h2>
        </div>

        <form
          className="mt-8 grid gap-4 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const formData = new FormData(form);

            startTransition(async () => {
              try {
                setCreateFormError(null);

                await submitJson("/api/admin/users", "POST", {
                  nama: String(formData.get("nama") ?? ""),
                  email: String(formData.get("email") ?? ""),
                  nidn: String(formData.get("nidn") ?? ""),
                  role: String(formData.get("role") ?? ""),
                  password: String(formData.get("password") ?? ""),
                  isActive: formData.get("isActive") === "on",
                });

                form.reset();
                router.refresh();
              } catch (error) {
                setCreateFormError(error instanceof Error ? error.message : "Gagal membuat user.");
              }
            });
          }}
        >
          <input
            name="nama"
            required
            placeholder="Nama lengkap"
            className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#0071e3]"
          />
          <input
            name="email"
            type="email"
            required
            placeholder="email@kampus.ac.id"
            className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#0071e3]"
          />
          <input
            name="nidn"
            placeholder="NIDN (opsional)"
            className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#0071e3]"
          />
          <select
            name="role"
            defaultValue="dosen"
            className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#0071e3]"
          >
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <input
            name="password"
            type="password"
            minLength={8}
            required
            placeholder="Password minimal 8 karakter"
            className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#0071e3] md:col-span-2"
          />

          <label className="flex items-center gap-3 rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-700 md:col-span-2">
            <input name="isActive" type="checkbox" defaultChecked className="h-4 w-4" />
            Akun aktif setelah dibuat
          </label>

          {createFormError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 md:col-span-2">
              {createFormError}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isPending}
            className="rounded-full bg-[#0071e3] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0059b5] disabled:opacity-60 md:col-span-2"
          >
            {isPending ? "Menyimpan..." : "Simpan User"}
          </button>
        </form>
      </section>

      <section className="space-y-4">
        {users.map((user) => (
          <details
            key={user.id}
            className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]"
          >
            <summary className="flex cursor-pointer list-none flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-semibold text-slate-950">{user.nama}</p>
                <p className="text-sm text-slate-600">
                  {user.email} • {user.role}
                </p>
              </div>
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                  user.isActive
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                {user.isActive ? "Aktif" : "Nonaktif"}
              </span>
            </summary>

            <form
              className="mt-6 grid gap-4 md:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);

                startTransition(async () => {
                  try {
                    setUpdateFormErrors((current) => ({
                      ...current,
                      [user.id]: null,
                    }));

                    await submitJson(`/api/admin/users/${user.id}`, "PATCH", {
                      nama: String(formData.get("nama") ?? ""),
                      email: String(formData.get("email") ?? ""),
                      nidn: String(formData.get("nidn") ?? ""),
                      role: String(formData.get("role") ?? ""),
                      password: String(formData.get("password") ?? ""),
                      isActive: formData.get("isActive") === "on",
                    });

                    router.refresh();
                  } catch (error) {
                    setUpdateFormErrors((current) => ({
                      ...current,
                      [user.id]:
                        error instanceof Error ? error.message : "Gagal memperbarui user.",
                    }));
                  }
                });
              }}
            >
              <input
                name="nama"
                defaultValue={user.nama}
                required
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#0071e3]"
              />
              <input
                name="email"
                type="email"
                defaultValue={user.email}
                required
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#0071e3]"
              />
              <input
                name="nidn"
                defaultValue={user.nidn ?? ""}
                placeholder="NIDN (opsional)"
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#0071e3]"
              />
              <select
                name="role"
                defaultValue={user.role}
                disabled={user.id === currentAdminId}
                className={`rounded-2xl border px-4 py-3 text-sm outline-none transition focus:border-[#0071e3] ${
                  user.id === currentAdminId
                    ? "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed"
                    : "border-slate-300"
                }`}
              >
                {roleOptions.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
              <input
                name="password"
                type="password"
                placeholder="Kosongkan jika tidak ganti password"
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#0071e3] md:col-span-2"
              />
              <label className="flex items-center gap-3 rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-700 md:col-span-2">
                <input
                  name="isActive"
                  type="checkbox"
                  defaultChecked={user.isActive}
                  className="h-4 w-4"
                />
                Akun aktif
              </label>
              {updateFormErrors[user.id] ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 md:col-span-2">
                  {updateFormErrors[user.id]}
                </div>
              ) : null}
              <button
                type="submit"
                disabled={isPending}
                className="rounded-full bg-[#0071e3] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0059b5] disabled:opacity-60 md:col-span-2"
              >
                {isPending ? "Menyimpan..." : "Update User"}
              </button>
            </form>
          </details>
        ))}
      </section>
    </div>
  );
}
