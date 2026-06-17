import { getManagerTeamKey, type SalesActor } from "./sales-scope";
import type { NewJoinersSummary } from "./build-new-joiners";

export async function filterNewJoinersForActor(
  newJoiners: NewJoinersSummary,
  actor: SalesActor,
): Promise<NewJoinersSummary> {
  if (actor.role === "admin") {
    return newJoiners;
  }

  if (actor.role === "manager") {
    const teamKey = await getManagerTeamKey(actor.uid);
    const salesReps =
      teamKey ?
        newJoiners.salesReps.filter(
          (rep) => rep.team === teamKey || rep.id === actor.uid,
        )
      : newJoiners.salesReps.filter((rep) => rep.id === actor.uid);

    return {
      ...newJoiners,
      salesReps,
    };
  }

  return {
    ...newJoiners,
    salesReps: [],
  };
}
