import { useRef, useState } from "react";

import { ApiResponse, IHttpError, TNotFoundErrorList } from "@client/types";
import { getFailureMessages } from "@client/util/commonUtil";

export function useFetch<T>() {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);
  // Only the latest call may update the state above. An earlier call that replies last still
  // resolves with its own outcome, but must not overwrite what the latest call reported.
  const latestCallIdRef = useRef(0);

  const fetchData = async (
    fetchCallback: () => Promise<ApiResponse<T>>,
    onSuccess?: () => void
  ) => {
    latestCallIdRef.current += 1;
    const callId = latestCallIdRef.current;
    const isLatestCall = () => callId === latestCallIdRef.current;

    setData(() => null);
    setIsLoading(() => true);
    setIsError(() => false);
    setErrorMessages(() => []);

    return fetchCallback()
      .then((resp) => {
        if (!resp.ok) {
          // Caught by the .catch below, which reads the error messages from the response body
          // eslint-disable-next-line @typescript-eslint/only-throw-error
          throw resp;
        }

        return resp.json();
      })
      .then((data: T) => {
        if (isLatestCall()) {
          setData(() => data);
          setIsError(() => false);
          setErrorMessages(() => []);
        }

        onSuccess?.();

        return [true, data] as const;
      })
      .catch(async function (errorResp: ApiResponse<IHttpError | TNotFoundErrorList | Error>) {
        const messages = await getFailureMessages(
          errorResp as ApiResponse<IHttpError | TNotFoundErrorList> | Error
        );

        if (isLatestCall()) {
          setData(() => null);
          setIsError(() => true);
          setErrorMessages(() => messages);
        }

        return [false, errorResp, messages] as const;
      })
      .finally(() => {
        if (isLatestCall()) {
          setIsLoading(() => false);
        }
      });
  };

  const setDataProxy = (newData: T) => {
    setData(() => newData);
  };

  return { data, isLoading, isError, errorMessages, fetchData, setData: setDataProxy };
}
