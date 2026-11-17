"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Modal } from "@/components/Modal";
import { detachCloud, useCloud } from "@/app/studio/cloud";
import { sampleProject } from "@/engine/project/factory";
import { useAuth } from "@/lib/auth/useAuth";
import {
  createCloudProject,
  deleteCloudProject,
  duplicateCloudProject,
  listCloudProjects,
  renameCloudProject,
  type CloudProjectSummary,
} from "@/lib/cloud/projects";
import { th } from "@/lib/i18n/th";
import { DownloadsSection } from "./DownloadsSection";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });

type Load = { state: "loading" } | { state: "error" } | { state: "ok"; items: CloudProjectSummary[] };

export function LibraryApp() {
  const router = useRouter();
  const { status, user } = useAuth();
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<CloudProjectSummary | null>(null);
  const [deleting, setDeleting] = useState<CloudProjectSummary | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoad({ state: "ok", items: await listCloudProjects() });
    } catch {
      setLoad({ state: "error" });
    }
  }, []);

  useEffect(() => {
    if (status !== "signed-in") return;
    let alive = true;
    listCloudProjects()
      .then((items) => alive && setLoad({ state: "ok", items }))
      .catch(() => alive && setLoad({ state: "error" }));
    return () => {
      alive = false;
    };
  }, [status]);

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      await refresh();
    } catch {
      setMsg(th.library.actionFail);
    } finally {
      setBusy(false);
    }
  };

  const newProject = () =>
    act(async () => {
      if (!user) return;
      const p = { ...sampleProject(), name: th.library.newName, surfaces: [] };
      const cp = await createCloudProject(user.id, p);
      router.push(`/studio?p=${cp.id}`);
    });

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="mb-1">{th.library.title}</h2>
          <p className="text-mu">{th.library.body}</p>
        </div>
        {status === "signed-in" && (
          <button className="btn pri" onClick={newProject} disabled={busy}>
            + {th.library.newProject}
          </button>
        )}
      </div>

      <h3>{th.library.projects}</h3>
      {msg && (
        <p role="alert" className="mb-3 text-ac2">
          {msg}
        </p>
      )}
      {status === "loading" ? (
        <Empty>{th.library.loading}</Empty>
      ) : status === "guest" ? (
        <Empty>
          <p className="mb-3">{th.library.loginPrompt}</p>
          <Link href="/login?next=/library" className="btn pri inline-flex items-center">
            {th.auth.login}
          </Link>
        </Empty>
      ) : load.state === "loading" ? (
        <Empty>{th.library.loading}</Empty>
      ) : load.state === "error" ? (
        <Empty>
          <p className="mb-3">{th.library.loadFail}</p>
          <button className="btn" onClick={() => void refresh()}>
            {th.library.retry}
          </button>
        </Empty>
      ) : load.items.length === 0 ? (
        <Empty>{th.library.empty}</Empty>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-3.5">
          {load.items.map((p) => (
            <li key={p.id} className="flex flex-col overflow-hidden rounded-xl border border-ln bg-pn">
              <Link href={`/studio?p=${p.id}`} className="block aspect-video bg-black" aria-label={`${th.library.open} ${p.name}`}>
                {p.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- signed URL จาก Supabase Storage
                  <img src={p.thumbnailUrl} alt="" className="size-full object-cover" />
                ) : (
                  <span className="flex size-full items-center justify-center text-[13px] text-mu">{th.library.noThumb}</span>
                )}
              </Link>
              <div className="flex flex-1 flex-col gap-1.5 p-3">
                <b className="truncate">{p.name || th.library.newName}</b>
                <span className="text-[13px] text-mu">{th.library.updated(fmtDate(p.updatedAt))}</span>
                <div className="mt-auto grid grid-cols-2 gap-1.5 pt-1">
                  <Link href={`/studio?p=${p.id}`} className="btn pri inline-flex items-center justify-center">
                    {th.library.open}
                  </Link>
                  <button className="btn" disabled={busy} onClick={() => setRenaming(p)}>
                    {th.library.rename}
                  </button>
                  <button
                    className="btn"
                    disabled={busy || !user}
                    onClick={() => act(() => duplicateCloudProject(user!.id, p.id, th.cloud.copySuffix))}
                  >
                    {th.library.duplicate}
                  </button>
                  <button className="btn" disabled={busy} onClick={() => setDeleting(p)}>
                    {th.library.delete}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {status === "signed-in" && <DownloadsSection />}

      <Modal open={!!renaming} onClose={() => setRenaming(null)} title={th.library.rename}>
        {renaming && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const name = String(new FormData(e.currentTarget).get("name") ?? "").trim().slice(0, 200);
              const target = renaming;
              setRenaming(null);
              if (name && name !== target.name) void act(() => renameCloudProject(target.id, name));
            }}
          >
            <input name="name" className="field mb-3" defaultValue={renaming.name} maxLength={200} autoFocus required />
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className="btn" onClick={() => setRenaming(null)}>
                {th.library.cancel}
              </button>
              <button className="btn pri">{th.library.save}</button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={!!deleting} onClose={() => setDeleting(null)} title={deleting ? th.library.deleteTitle(deleting.name) : ""}>
        <p className="mb-4 text-mu">{th.library.deleteBody}</p>
        <div className="grid grid-cols-2 gap-2">
          <button className="btn" onClick={() => setDeleting(null)}>
            {th.library.cancel}
          </button>
          <button
            className="btn pri"
            onClick={() => {
              const target = deleting!;
              setDeleting(null);
              if (useCloud.getState().projectId === target.id) detachCloud();
              void act(() => deleteCloudProject(target.id, target.thumbnailPath));
            }}
          >
            {th.library.delete}
          </button>
        </div>
      </Modal>
    </>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-dashed border-ln p-6 text-center text-mu">{children}</div>;
}
