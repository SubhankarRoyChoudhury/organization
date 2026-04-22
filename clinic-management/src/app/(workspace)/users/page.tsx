import { AppShell } from "@/components/app-shell";
import { relationshipCards, userRows } from "@/lib/clinic-data";

export default function UsersPage() {
  return (
    <AppShell title="Users" eyebrow="Identity Layer">
      <div className="grid gap-4">
        <section className="grid gap-4 xl:grid-cols-2">
          {relationshipCards.slice(0, 2).map((item) => (
            <article
              key={item.title}
              className="rounded-[24px] border border-slate-200 bg-white p-5"
            >
              <p className="text-sm text-slate-500">{item.title}</p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
                {item.ratio}
              </p>
              <p className="mt-2 text-sm text-slate-500">{item.description}</p>
            </article>
          ))}
        </section>

        <section className="rounded-[24px] border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                User to profile mapping
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Each login account owns exactly one patient profile or one doctor
                profile.
              </p>
            </div>
            <button className="rounded-xl bg-[#6c62ff] px-4 py-2 text-sm font-medium text-white">
              Add user
            </button>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 text-sm text-slate-400">
                  <th className="pb-3 font-medium">User</th>
                  <th className="pb-3 font-medium">Role</th>
                  <th className="pb-3 font-medium">Linked record</th>
                  <th className="pb-3 font-medium">Department</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {userRows.map((row) => (
                  <tr
                    key={row.user}
                    className="border-b border-slate-100 text-sm text-slate-700"
                  >
                    <td className="py-4">
                      <p className="font-medium text-slate-900">{row.user}</p>
                      <p className="text-xs text-slate-400">{row.email}</p>
                    </td>
                    <td className="py-4">{row.role}</td>
                    <td className="py-4">{row.linkedRecord}</td>
                    <td className="py-4">{row.department}</td>
                    <td className="py-4">
                      <span className="rounded-full bg-[#eefbf4] px-3 py-1 text-xs font-medium text-emerald-600">
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
