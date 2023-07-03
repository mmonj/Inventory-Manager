import { useState } from "react";

export function useFetch<T>() {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  const fetchData = (callbackFetch: () => Promise<Response>) => {
    setData(() => null);
    setIsLoading(() => true);
    setIsError(() => false);

    return callbackFetch()
      .then((resp) => {
        if (!resp.ok) {
          throw new Error(`An error occurred: Status ${resp.status}: ${resp.statusText}`);
        }
        return resp.json();
      })
      .then((data: T) => {
        setData(() => data);
        setIsLoading(() => false);
        setIsError(() => false);
      })
      .catch(() => {
        setData(() => null);
        setIsLoading(() => false);
        setIsError(() => true);
      });
  };

  return { data, isLoading, isError, fetchData };
}
