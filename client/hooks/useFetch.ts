import { useState } from "react";

import { ApiResponse, IHttpError, TNotFoundErrorList } from "@client/types";
import { getErrorList } from "@client/util/commonUtil";

export function useFetch<T>() {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);

  const fetchData = async (fetchCallback: () => Promise<ApiResponse<T>>) => {
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
        setIsLoading(() => false);
        setIsError(() => false);
        setErrorMessages(() => []);

        return [true, data] as const;
      })
      .catch(async (resp: ApiResponse<IHttpError | TNotFoundErrorList>) => {
        setData(() => null);
        setIsLoading(() => false);
        setIsError(() => true);

        const data = await resp.json();
        setErrorMessages(() => getErrorList(data));

        return [false, resp] as const;
      });
  };

  return { data, isLoading, isError, errorMessages, fetchData };
}
