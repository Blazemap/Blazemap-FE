import type { MonitoringOperations } from "@/types";

type Status = MonitoringOperations["assignments"][number]["status"];
export const assignmentTransitions: Record<Status, Status[]> = { ASSIGNED: ["ACCEPTED", "CANCELLED"], ACCEPTED: ["IN_PROGRESS", "CANCELLED"], IN_PROGRESS: ["COMPLETED", "CANCELLED"], COMPLETED: [], CANCELLED: [] };
export function activeCaseAssignments(assignments: MonitoringOperations["assignments"], caseId: string) {
  return assignments.filter(assignment => assignment.caseId === caseId && ["ASSIGNED", "ACCEPTED", "IN_PROGRESS"].includes(assignment.status));
}
export function assignmentActionLabel(assignmentCount: number) {
  return assignmentCount > 0 ? "Assign another team" : "Assign first team";
}
export function eligibleTeams(teams: MonitoringOperations["teams"], now = Date.now()) {
  return teams.filter(team => {
    const observed = team.latestObservedAt ? Date.parse(team.latestObservedAt) : NaN;
    return team.active && !team.sample && team.activeAssignmentCount === 0 && team.latestCondition === "AVAILABLE" && observed <= now && now - observed <= 86_400_000;
  });
}
