import { SurveyWorkerOnehubTemplatesSurveyWorkerTaskAdminer } from "@reactivated";

export type TaskTypeType = SurveyWorkerOnehubTemplatesSurveyWorkerTaskAdminer["task_types"][number];
export type THubModalState = {
  isShow: boolean;
  statusMessages: string[];
  warningMessages: string[];
  errorMessages: string[];
};

export type THubModalController = {
  setStatus: React.Dispatch<React.SetStateAction<THubModalState>>;
};
