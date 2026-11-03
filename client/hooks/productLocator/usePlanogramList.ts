import { useContext } from "react";

import { Context, interfaces, reverse } from "@reactivated";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchByReactivated, fetchJsonOrThrow, getErrorMessages } from "@client/util/commonUtil";

export interface INewPlanogram {
  storeId: number;
  name: string;
  planoType: string;
  horizontalSectionThresholds: string[] | undefined;
  planogramTextDump: string;
}

const PLANOGRAMS_QUERY_KEY = "planograms";

/**
 * The planograms of the selected store, plus the writes that change them. Every list reply is
 * cached under its store, so a slow reply for a store the user already left can't show up under
 * another store. After any write, the list refetches for whichever store is selected by then.
 */
export function usePlanogramList(storeId: number | null) {
  const djangoContext = useContext(Context);
  const queryClient = useQueryClient();

  const planogramsQuery = useQuery({
    queryKey: [PLANOGRAMS_QUERY_KEY, storeId],
    queryFn: () =>
      fetchJsonOrThrow(
        fetchByReactivated<interfaces.IPlanogramsByStore>(
          // `enabled` below keeps this from running without a store, so the 0 is never sent
          reverse("product_locator:get_planograms_by_store", { store_id: storeId ?? 0 }),
          djangoContext.csrf_token,
          "GET"
        )
      ),
    enabled: storeId !== null,
  });

  async function refreshPlanograms() {
    await queryClient.invalidateQueries({ queryKey: [PLANOGRAMS_QUERY_KEY] });
  }

  const deletePlanogram = useMutation({
    mutationFn: (planogramId: number) =>
      fetchJsonOrThrow(
        fetchByReactivated<interfaces.ISuccess>(
          reverse("product_locator:delete_planogram", { planogram_id: planogramId }),
          djangoContext.csrf_token,
          "DELETE"
        )
      ),
    onSuccess: refreshPlanograms,
  });

  const clearPlanogram = useMutation({
    mutationFn: (planogramId: number) =>
      fetchJsonOrThrow(
        fetchByReactivated<interfaces.IPlanogramCleared>(
          reverse("product_locator:clear_planogram", { planogram_id: planogramId }),
          djangoContext.csrf_token,
          "POST"
        )
      ),
    onSuccess: refreshPlanograms,
  });

  const createPlanogram = useMutation({
    mutationFn: (newPlanogram: INewPlanogram) =>
      fetchJsonOrThrow(
        fetchByReactivated<interfaces.IPlanogramCreated>(
          reverse("product_locator:create_planogram", { store_id: newPlanogram.storeId }),
          djangoContext.csrf_token,
          "POST",
          JSON.stringify({
            name: newPlanogram.name,
            plano_type: newPlanogram.planoType,
            horizontal_section_thresholds: newPlanogram.horizontalSectionThresholds ?? null,
            planogram_text_dump: newPlanogram.planogramTextDump,
          } satisfies interfaces.ICreatePlanogramRequest)
        )
      ),
    onSuccess: refreshPlanograms,
  });

  return {
    planograms: planogramsQuery.data?.planograms,
    isListLoading: planogramsQuery.isLoading,
    listErrorMessages: getErrorMessages(planogramsQuery.error),
    refreshPlanograms,
    deletePlanogram,
    clearPlanogram,
    createPlanogram,
  };
}
