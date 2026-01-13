import "server-only";
import pLimit from "p-limit";
import { getAllPages, getOne } from "./gitlabClient";
import { accessLevelToLabel } from "./accessLevel";
import type { AuditResult, AuditUser } from "./types";

type GroupSummary = { id: number; full_path: string };
type ProjectSummary = { id: number; path_with_namespace: string };
type MemberSummary = { id: number; name: string; username: string; access_level: number };

type MembershipEntry = { path: string; accessLevel: string };

const CONCURRENCY_LIMIT = 8;

export async function auditData(groupId: number): Promise<AuditResult> {
  const [groupsInScope, projectsInScope] = await Promise.all([
    fetchGroupsInScope(groupId),
    fetchProjectsInScope(groupId)
  ]);

  const limitConcurrency = pLimit(CONCURRENCY_LIMIT);

  const usersById = new Map<number, AuditUser>();

  await Promise.all(
    groupsInScope.map((group) => limitConcurrency(() => collectGroupMemberships(usersById, group)))
  );

  await Promise.all(
    projectsInScope.map((project) => limitConcurrency(() => collectProjectMemberships(usersById, project)))
  );

  const normalizedUsers = normalizeUsers(Array.from(usersById.values()));

  return {
    groupId,
    users: normalizedUsers,
    totalUsers: normalizedUsers.length,
    stats: { groups: groupsInScope.length, projects: projectsInScope.length }
  };
}

async function fetchGroupsInScope(groupId: number): Promise<GroupSummary[]> {
  const rootGroup = await getOne<GroupSummary>(`/groups/${groupId}`);
  const descendantGroups = await getAllPages<GroupSummary>(`/groups/${groupId}/descendant_groups`);
  return [rootGroup, ...descendantGroups];
}

async function fetchProjectsInScope(groupId: number): Promise<ProjectSummary[]> {
  return getAllPages<ProjectSummary>(`/groups/${groupId}/projects`, { include_subgroups: true });
}

async function collectGroupMemberships(usersById: Map<number, AuditUser>, group: GroupSummary) {
  const groupMembers = await getAllPages<MemberSummary>(`/groups/${group.id}/members`);

  const toGroupMembershipEntry = (member: MemberSummary): MembershipEntry => ({
    path: group.full_path,
    accessLevel: accessLevelToLabel(member.access_level)
  });

  for (const member of groupMembers) {
    const user = getOrCreateUser(usersById, member);
    user.groups = [...user.groups, toGroupMembershipEntry(member)];
  }
}

async function collectProjectMemberships(usersById: Map<number, AuditUser>, project: ProjectSummary) {
  const projectMembers = await getAllPages<MemberSummary>(`/projects/${project.id}/members`);

  const toProjectMembershipEntry = (member: MemberSummary): MembershipEntry => ({
    path: project.path_with_namespace,
    accessLevel: accessLevelToLabel(member.access_level)
  });

  for (const member of projectMembers) {
    const user = getOrCreateUser(usersById, member);
    user.projects = [...user.projects, toProjectMembershipEntry(member)];
  }
}

function getOrCreateUser(usersById: Map<number, AuditUser>, member: MemberSummary): AuditUser {
  const existingUser = usersById.get(member.id);
  if (existingUser) return existingUser;

  const createdUser: AuditUser = {
    id: member.id,
    name: member.name,
    username: member.username,
    groups: [],
    projects: []
  };

  usersById.set(member.id, createdUser);
  return createdUser;
}

function normalizeUsers(users: AuditUser[]): AuditUser[] {
  return users
    .map((user) => ({
      ...user,
      groups: deduplicateAndSortMemberships(user.groups),
      projects: deduplicateAndSortMemberships(user.projects)
    }))
    .sort((a, b) => a.name.localeCompare(b.name) || a.username.localeCompare(b.username));
}

function deduplicateAndSortMemberships(items: MembershipEntry[]): MembershipEntry[] {
  const seenKeys = new Set<string>();

  const uniqueItems = items.filter((item) => {
    const key = `${item.path}-${item.accessLevel}`;
    if (seenKeys.has(key)) return false;
    seenKeys.add(key);
    return true;
  });

  return uniqueItems.sort(
    (a, b) => a.path.localeCompare(b.path) || a.accessLevel.localeCompare(b.accessLevel)
  );
}
