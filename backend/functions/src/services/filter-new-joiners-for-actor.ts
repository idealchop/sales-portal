import { getManagerTeamKey, type SalesActor } from "./sales-scope";
import {
  countJoinedOnManilaDay,
  type NewJoinersSummary,
  type NewSalesRepJoiner,
} from "./build-new-joiners";

function withScopedSalesPortalCount(
  newJoiners: NewJoinersSummary,
  salesReps: NewSalesRepJoiner[],
): NewJoinersSummary {
  if (!newJoiners.registeredToday) {
    return { ...newJoiners, salesReps };
  }
  return {
    ...newJoiners,
    salesReps,
    registeredToday: {
      ...newJoiners.registeredToday,
      salesPortal: countJoinedOnManilaDay(
        salesReps,
        newJoiners.registeredToday.dayKey,
      ),
    },
  };
}

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
        ) :
        newJoiners.salesReps.filter((rep) => rep.id === actor.uid);

    return withScopedSalesPortalCount(newJoiners, salesReps);
  }

  return withScopedSalesPortalCount(newJoiners, []);
}
