"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { fetchAuditReport } from "@/lib/clientApi";

type FormValues = { groupId: string };

export default function Page() {
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<FormValues>({
    defaultValues: { groupId: "10975505" }
  });

  const [groupId, setGroupId] = useState("");

  const {
    data: audit,
    isFetching,
    isError,
    error,
    isSuccess
  } = useQuery({
    queryKey: ["audit", groupId],
    queryFn: () => fetchAuditReport(groupId),
    enabled: Boolean(groupId)
  });

  const onSubmit = handleSubmit((values) => setGroupId(values.groupId.trim()));

  const content = useMemo(() => {
    if (!audit) return null;

    return audit.users.map((user) => (
      <div key={user.id} className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="font-medium text-slate-900">
          {user.name} <span className="text-slate-500">(@{user.username})</span>
        </div>

        <div className="mt-3 text-sm">
          <div className="grid grid-cols-[90px_1fr] gap-2">
            <div className="text-slate-500">Groups:</div>
            <div className="text-slate-800">
              {user.groups.length ? (
                <div className="flex flex-wrap gap-2">
                  {user.groups.map((group) => (
                    <span
                      key={`${group.path}-${group.accessLevel}`}
                      className="rounded-md bg-slate-100 px-2 py-1"
                    >
                      {group.path} <span className="text-slate-500">({group.accessLevel})</span>
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-slate-400">[]</span>
              )}
            </div>

            <div className="text-slate-500">Projects:</div>
            <div className="text-slate-800">
              {user.projects.length ? (
                <div className="flex flex-wrap gap-2">
                  {user.projects.map((project) => (
                    <span
                      key={`${project.path}-${project.accessLevel}`}
                      className="rounded-md bg-slate-100 px-2 py-1"
                    >
                      {project.path} <span className="text-slate-500">({project.accessLevel})</span>
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-slate-400">[]</span>
              )}
            </div>
          </div>
        </div>
      </div>
    ));
  }, [audit]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="text-xl font-semibold text-slate-900">GitLab Access Audit</div>
          <div className="mt-1 text-sm text-slate-600">
            Enter a top-level group ID and generate a direct-membership report for groups and projects in its subtree.
          </div>

          <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="text-sm font-medium text-slate-700">Top-level group ID</label>
              <input
                className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-900 outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="e.g. 10975505"
                {...register("groupId", { required: "Group ID is required" })}
              />
              {errors.groupId?.message ? (
                <div className="mt-1 text-sm text-red-600">{errors.groupId.message}</div>
              ) : null}
            </div>

            <button
              type="submit"
              className="mt-1 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 font-medium text-white hover:bg-slate-800 disabled:opacity-60"
              disabled={isFetching}
            >
              {isFetching ? (
                <>
                  <span
                    className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                    aria-label="Loading"
                    role="status"
                  />
                  <span>Running</span>
                </>
              ) : (
                "Run audit"
              )}
            </button>
          </form>

          {isError ? (
            <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {(error as Error).message}
            </div>
          ) : null}
        </div>

        {isSuccess && audit ? (
          <div className="mt-6 space-y-4">
            {content}
            <div className="text-right text-sm text-slate-700">
              Total Users: <span className="font-medium text-slate-900">{audit.totalUsers}</span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
