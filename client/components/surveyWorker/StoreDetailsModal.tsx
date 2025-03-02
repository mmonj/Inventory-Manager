import React, { useState } from "react";

import {
  SurveyWorkerInterfacesICmklaunchStoreData,
  SurveyWorkerInterfacesIWebhubStore,
  SurveyWorkerInterfacesOnehubModelsMvmPlan,
  SurveyWorkerTemplatesSurveyWorkerTerritoryViewer,
} from "@reactivated";
import { Button, Modal } from "react-bootstrap";

import { faClipboard } from "@fortawesome/free-regular-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { getTimeAgo, trimTicketName } from "@client/util/surveyWorker";

const LISTING_STYLE = {
  border: "1px solid #80808063",
  padding: "8px",
  borderRadius: "6px",
  marginBottom: "1rem",
};

export interface IStoreModalData {
  store: SurveyWorkerInterfacesIWebhubStore;
  storeTickets: SurveyWorkerInterfacesOnehubModelsMvmPlan[];
  totalProjectTimeMins: number;
}

interface Props {
  storeData: IStoreModalData | null;
  setStoreData: React.Dispatch<React.SetStateAction<IStoreModalData | null>>;
  surveyLauncherData: SurveyWorkerTemplatesSurveyWorkerTerritoryViewer["survey_launcher_data"];
}

export function StoreDetailsModal({ storeData, setStoreData, surveyLauncherData }: Props) {
  const [clipboardMessage, setClipboardMessage] = useState<string | null>(null);

  const ticketDescriptor = storeData?.storeTickets.length === 1 ? "Ticket" : "Ticket(s)";
  let numTicketsClassname = "";
  if (storeData?.storeTickets.length == 0) {
    numTicketsClassname = "text-danger";
  }

  function handleClose() {
    setStoreData(null);
  }

  function handleCopyAddress(storeDetails: SurveyWorkerInterfacesIWebhubStore) {
    setClipboardMessage(() => "Address Copied!");
    setTimeout(() => {
      setClipboardMessage(() => null);
    }, 2000);

    void navigator.clipboard.writeText(
      `${storeDetails.City}, ${storeDetails.State} | ${storeDetails.Address} | ${storeDetails.Name}`
    );
  }

  return (
    <Modal centered show={storeData !== null} onHide={handleClose} backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title className="text-white">Store Details</Modal.Title>
      </Modal.Header>
      <Modal.Body className="overflow-auto" style={{ maxHeight: "65vh" }}>
        {storeData !== null && (
          <>
            <div className="d-flex justify-content-between">
              <div className="mb-3">
                <div className="h5 text-white">{storeData.store.Name}</div>
                <div>
                  <div className="h6 mb-1">{storeData.store.Address}</div>
                  <div className="text-body">
                    {storeData.store.City}, {storeData.store.State} {storeData.store.Zip}
                  </div>
                </div>
              </div>
              <div
                className="text-center m-2 w-25"
                style={{ height: "2.2rem", width: "2.2rem" }}
                onClick={() => handleCopyAddress(storeData.store)}
              >
                <FontAwesomeIcon
                  icon={faClipboard}
                  color="white"
                  size="2x"
                  className="copy-address"
                  title="Copy to clipboard"
                />
                {clipboardMessage !== null && <div className="text-info">{clipboardMessage}</div>}
              </div>
            </div>
            <div className="alert alert-info">
              <div className="onehub-store-info">
                <h5 className="mb-3 text-decoration-underline" style={{ color: "unset" }}>
                  Store Ticket Info
                </h5>
                {storeData.totalProjectTimeMins > 0 && (
                  <div className="mb-1">
                    <strong>Work Hours: </strong>
                    {Math.floor(storeData.totalProjectTimeMins / 60)} hr{" "}
                    {storeData.totalProjectTimeMins % 60.0} min
                  </div>
                )}
                <div className={"fw-bold mb-2 " + numTicketsClassname}>
                  {storeData.storeTickets.length} {ticketDescriptor} Pending
                </div>
                <div style={LISTING_STYLE}>
                  <ul className="list-unstyled mb-0">
                    {storeData.storeTickets.map((ticket) => (
                      <li key={ticket.ID} className="">
                        <strong>{trimTicketName(ticket.Name)}</strong>{" "}
                        <span>({ticket.EstimatedTime} min)</span>
                      </li>
                    ))}
                  </ul>
                  {storeData.storeTickets.length === 0 && <div>No tickets to show</div>}
                </div>
              </div>
              <div className="cmklaunch-store-info">
                <SurveyDetails
                  storeGuid={storeData.store.MVID}
                  surveyLauncherData={surveyLauncherData}
                />
              </div>
            </div>
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

function SurveyDetails({
  surveyLauncherData,
  storeGuid,
}: {
  storeGuid: string;
  surveyLauncherData: SurveyWorkerTemplatesSurveyWorkerTerritoryViewer["survey_launcher_data"];
}) {
  const cmklaunchStore = surveyLauncherData.cmk_stores_refresh_data.stores_surveys_map[
    storeGuid
  ] as SurveyWorkerInterfacesICmklaunchStoreData | undefined;

  const surveys = Object.values(cmklaunchStore?.surveys_by_client ?? {}).sort((s1, s2) =>
    s1.category.localeCompare(s2.category)
  );

  function launchLinks() {
    surveys.forEach((survey) => {
      window.open(survey.url, "_blank", "noopener,noreferrer");
    });
  }

  function getDomainName(url: string): string {
    const hostname = new URL(url).hostname;
    return hostname.substring(hostname.lastIndexOf(".", hostname.lastIndexOf(".") - 1) + 1);
  }

  return (
    <>
      <div>
        <div>
          <h5 className="mb-3 text-decoration-underline" style={{ color: "unset" }}>
            Available surveys
          </h5>
          <div className="mb-2">
            <strong>Survey URLs Last Syncced:</strong>{" "}
            {getTimeAgo(surveyLauncherData.cmk_stores_refresh_data.datetime_last_refreshed)}
          </div>
          <div style={LISTING_STYLE}>
            <ul className="list-unstyled mb-0">
              {surveys.map((survey, idx) => (
                <li
                  key={idx}
                  className="m-1"
                  style={{ overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}
                >
                  <span className="fw-bold">{survey.category}: </span>
                  <a href={survey.url} target="_blank" rel="noreferrer" style={{ color: "unset" }}>
                    {getDomainName(survey.url)}
                  </a>
                </li>
              ))}
            </ul>
            {surveys.length === 0 && <div>No surveys to show</div>}
          </div>
        </div>
        {surveys.length !== 0 && (
          <button onClick={launchLinks} type="button" className="btn btn-primary mt-3">
            Open all Surveys
          </button>
        )}
      </div>
    </>
  );
}
