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
          console.log("here1");
          throw resp;
        }

        return resp.json();
      })
      .then((data: T) => {
        setData(() => data);
        setIsLoading(() => false);
        setIsError(() => false);
        setErrorMessages(() => []);

        onSuccess?.();

        return [true, data] as const;
      })
      .catch(async function (errorResp: ApiResponse<IHttpError | TNotFoundErrorList | Error>) {
        setData(() => null);
        setIsLoading(() => false);
        setIsError(() => true);
        if (errorResp instanceof Error) {
          setErrorMessages(() => [errorResp.message]);
          return [false, errorResp] as const;
        } else {
          const data = await (errorResp as ApiResponse<IHttpError | TNotFoundErrorList>).json();
          setErrorMessages(() => getErrorList(data));

          return [false, errorResp] as const;
        }
      });
  };

  const setDataProxy = (newData: T) => {
    setData(() => newData);
  };

  return { data, isLoading, isError, errorMessages, fetchData, setData: setDataProxy };
}
