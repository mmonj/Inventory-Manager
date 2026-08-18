import { useState } from "react";

import { ApiResponse, IHttpError, TNotFoundErrorList } from "@client/types";
import { getErrorList } from "@client/util/commonUtil";

export function useFetch<T>() {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);

  const fetchData = async (
    fetchCallback: () => Promise<ApiResponse<T>>,
    onSuccess?: () => void
  ) => {
    setData(() => null);
    setIsLoading(() => true);
    setIsError(() => false);
    setErrorMessages(() => []);

    return fetchCallback()
      .then((resp) => {
        if (!resp.ok) {
          throw resp;
        }

        return resp.json();
      })
      .then((data: T) => {
        setData(() => data);
        setIsError(() => false);
        setErrorMessages(() => []);

        onSuccess?.();

        return [true, data] as const;
      })
      .catch(async function (errorResp: ApiResponse<IHttpError | TNotFoundErrorList | Error>) {
        setData(() => null);
        setIsError(() => true);

        let messages: string[];
        if (errorResp instanceof Error) {
          messages = [errorResp.message];
        } else {
          messages = await getErrorList(errorResp as ApiResponse<IHttpError | TNotFoundErrorList>);
        }
        setErrorMessages(() => messages);

        return [false, errorResp, messages] as const;
      })
      .finally(() => {
        setIsLoading(() => false);
      });
  };

  const setDataProxy = (newData: T) => {
    setData(() => newData);
  };

  return { data, isLoading, isError, errorMessages, fetchData, setData: setDataProxy };
}
