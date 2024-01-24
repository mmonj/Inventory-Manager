import React from "react";

import { THubModalController, THubModalState } from "./types";

export const HubModalController = React.createContext<THubModalController>({
  setStatus: () => {},
});

export const defaultModalState: THubModalState = {
  isShow: false,
  statusMessages: [],
  warningMessages: [],
  errorMessages: [],
};
