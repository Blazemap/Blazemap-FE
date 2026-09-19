import type { MonitoringOperations } from "@/types";

type Status = MonitoringOperations["assignments"][number]["status"];
export const assignmentTransitions: Record<Status, Status[]> = { ASSIGNED: ["ACCEPTED", "CANCELLED"], ACCEPTED: ["IN_PROGRESS", "CANCELLED"], IN_PROGRESS: ["COMPLETED", "CANCELLED"], COMPLETED: [], CANCELLED: [] };
export function eligibleTeams(teams: MonitoringOperations["teams"], now = Date.now()) {
  return teams.filter(team => {
    const observed = team.latestObservedAt ? Date.parse(team.latestObservedAt) : NaN;
    return team.active && !team.sample && team.activeAssignmentCount === 0 && team.latestCondition === "AVAILABLE" && observed <= now && now - observed <= 86_400_000;
  });
}
