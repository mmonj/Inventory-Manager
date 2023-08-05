import { useState } from "react";

import { ApiResponse, IHttpError, TNotFoundErrorList } from "@client/types";

export function useFetch<T>() {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  const fetchData = async (fetchCallback: () => Promise<ApiResponse<T>>) => {
    setData(() => null);
    setIsLoading(() => true);
    setIsError(() => false);

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
        return [true, data] as const;
      })
      .catch((error: ApiResponse<IHttpError | TNotFoundErrorList>) => {
        setData(() => null);
        setIsLoading(() => false);
        setIsError(() => true);
        return [false, error] as const;
      });
  };

  return { data, isLoading, isError, fetchData };
}
