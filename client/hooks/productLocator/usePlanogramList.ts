import { useContext } from "react";

import { Context, interfaces } from "@reactivated";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchJsonOrThrow, getErrorMessages } from "@client/util/commonUtil";
import { createProductLocatorApi } from "@client/util/productLocator/productLocatorApi";

const PLANOGRAMS_QUERY_KEY = "planograms";

/**
 * The planograms of the selected store, plus the writes that change them. Every list reply is
 * cached under its store, so a slow reply for a store the user already left can't show up under
 * another store. After any write, the list refetches for whichever store is selected by then.
 */
export function usePlanogramList(storeId: number | null) {
  const djangoContext = useContext(Context);
  const queryClient = useQueryClient();
  const productLocatorApi = createProductLocatorApi(djangoContext.csrf_token);

  const planogramsQuery = useQuery({
    queryKey: [PLANOGRAMS_QUERY_KEY, storeId],
    // `enabled` below keeps this from running without a store, so the 0 is never sent
    queryFn: () => fetchJsonOrThrow(productLocatorApi.listPlanograms(storeId ?? 0)),
    enabled: storeId !== null,
  });

  async function refreshPlanograms() {
    await queryClient.invalidateQueries({ queryKey: [PLANOGRAMS_QUERY_KEY] });
  }

  const deletePlanogram = useMutation({
    mutationFn: (planogramId: number) =>
      fetchJsonOrThrow(productLocatorApi.deletePlanogram(planogramId)),
    onSuccess: refreshPlanograms,
  });

  const clearPlanogram = useMutation({
    mutationFn: (planogramId: number) =>
      fetchJsonOrThrow(productLocatorApi.clearPlanogram(planogramId)),
    onSuccess: refreshPlanograms,
  });

  const createPlanogram = useMutation({
    mutationFn: (newPlanogram: { storeId: number; body: interfaces.ICreatePlanogramRequest }) =>
      fetchJsonOrThrow(productLocatorApi.createPlanogram(newPlanogram.storeId, newPlanogram.body)),
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
