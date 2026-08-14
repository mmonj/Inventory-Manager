import React, { useContext, useState } from "react";

import { Context, interfaces, reverse } from "@reactivated";
import { Alert, Button, Modal } from "react-bootstrap";

import {
  faCheckCircle,
  faExclamationTriangle,
  faPencilAlt,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { LoadingSpinner } from "@client/components/LoadingSpinner";
import { useFetch } from "@client/hooks/useFetch";
import { fetchByReactivated } from "@client/util/commonUtil";

interface Props {
  show: boolean;
  onHide: () => void;
  planogram: { pk: number; name: string };
  onSuccess: () => void;
}

export function EditPlanogramModal(props: Props) {
  const djangoContext = useContext(Context);
  const submitFetcher = useFetch<interfaces.ISubmitPlanogramProductsResult>();

  const [planogramTextDump, setPlanogramTextDump] = useState("");
  const [isResetPlanogram, setIsResetPlanogram] = useState(false);
  const [label, setLabel] = useState("");

  function handleHide() {
    setPlanogramTextDump("");
    setIsResetPlanogram(false);
    setLabel("");
    submitFetcher.setData(null as unknown as interfaces.ISubmitPlanogramProductsResult);
    props.onHide();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const [isSuccess] = await submitFetcher.fetchData(() =>
      fetchByReactivated<interfaces.ISubmitPlanogramProductsResult>(
        reverse("product_locator:submit_planogram_products"),
        djangoContext.csrf_token,
        "POST",
        JSON.stringify({
          planogram_id: props.planogram.pk,
          planogram_text_dump: planogramTextDump,
          is_reset_planogram: isResetPlanogram,
          label,
        })
      )
    );

    if (isSuccess) {
      setPlanogramTextDump("");
      props.onSuccess();
    }
  }

  return (
    <Modal show={props.show} onHide={handleHide} size="lg" centered>
      <Modal.Header closeButton className="bg-primary text-white">
        <Modal.Title>
          <FontAwesomeIcon icon={faPencilAlt} className="me-2" />
          Edit Planogram Products — {props.planogram.name}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-3">
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="planogram-text-dump" className="form-label fw-semibold">
              Planogram Text Dump
            </label>
            <textarea
              id="planogram-text-dump"
              className="form-control"
              rows={10}
              value={planogramTextDump}
              onChange={(event) => setPlanogramTextDump(event.target.value)}
              style={{ fontFamily: 'Consolas, "Courier New", monospace' }}
              required
            />
          </div>

          <div className="mb-3 form-check">
            <input
              type="checkbox"
              className="form-check-input"
              id="is-reset-planogram"
              checked={isResetPlanogram}
              onChange={(event) => setIsResetPlanogram(event.target.checked)}
            />
            <label className="form-check-label" htmlFor="is-reset-planogram">
              Reset Planogram
            </label>
          </div>

          {isResetPlanogram && (
            <div className="mb-3">
              <label htmlFor="planogram-update-label" className="form-label fw-semibold">
                Label
              </label>
              <input
                type="text"
                id="planogram-update-label"
                className="form-control"
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                required
              />
              <small className="form-text text-muted">
                Enter the reason for the reset, e.g. &quot;04/18/26 reset&quot;
              </small>
            </div>
          )}

          <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
            <Button variant="outline-secondary" onClick={handleHide} type="button">
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={submitFetcher.isLoading || planogramTextDump.trim() === ""}
            >
              <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
              Submit
              {submitFetcher.isLoading && (
                <LoadingSpinner isBlockElement={false} spinnerVariant="light" size="sm" />
              )}
            </Button>
          </div>

          {submitFetcher.isError && (
            <Alert variant="danger" className="mt-3 mb-0">
              <div className="d-flex align-items-start">
                <FontAwesomeIcon icon={faExclamationTriangle} className="me-2 fs-5 mt-1" />
                <ul className="mb-0">
                  {submitFetcher.errorMessages.map((msg, index) => (
                    <li key={index}>{msg}</li>
                  ))}
                </ul>
              </div>
            </Alert>
          )}

          {!submitFetcher.isError && !submitFetcher.isLoading && submitFetcher.data && (
            <Alert variant="success" className="mt-3 mb-0">
              <div className="d-flex align-items-center">
                <FontAwesomeIcon icon={faCheckCircle} className="me-2 fs-5" />
                {submitFetcher.data.planogram_update !== null ? (
                  <span>
                    Queued planogram update &quot;{submitFetcher.data.planogram_update.label}
                    &quot; for review.
                  </span>
                ) : (
                  <span>
                    Submitted {submitFetcher.data.num_products_added} out of{" "}
                    {submitFetcher.data.num_products_parsed} item(s) successfully.
                  </span>
                )}
              </div>
            </Alert>
          )}
        </form>
      </Modal.Body>
    </Modal>
  );
}
