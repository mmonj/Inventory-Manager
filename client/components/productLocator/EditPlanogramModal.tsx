import React, { useContext, useState } from "react";

import { Context, interfaces, reverse, templates } from "@reactivated";
import { Alert, Button, Modal } from "react-bootstrap";
import { format } from "date-fns";

import {
  faCheckCircle,
  faExclamationTriangle,
  faPencilAlt,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { LoadingSpinner } from "@client/components/LoadingSpinner";
import { useFetch } from "@client/hooks/useFetch";
import { fetchByReactivated } from "@client/util/commonUtil";
import { toast } from "@client/util/toast";

import "@client/scss/product_locator/monospace-text.scss";

type TPlanoType = templates.ProductLocatorManagePlanograms["plano_type_choices"][number];

interface Props {
  show: boolean;
  onHide: () => void;
  storeName: string;
  planogram: { pk: number; name: string; planoType: TPlanoType["value"]; dateEnd: string | null };
  planoTypeChoices: TPlanoType[];
  onSuccess: () => void;
}

export function EditPlanogramModal(props: Props) {
  const djangoContext = useContext(Context);
  const submitFetcher = useFetch<interfaces.IPlanogramEdited>();

  const [name, setName] = useState(props.planogram.name);
  const [planoType, setPlanoType] = useState(props.planogram.planoType);
  const [dateEnd, setDateEnd] = useState(props.planogram.dateEnd ?? "");
  const [planogramTextDump, setPlanogramTextDump] = useState("");
  const [isResetPlanogram, setIsResetPlanogram] = useState(false);
  const [label, setLabel] = useState("");

  const hasTextDump = planogramTextDump.trim() !== "";
  const isResetRequested = hasTextDump && isResetPlanogram;
  const hasChanges =
    name.trim() !== props.planogram.name ||
    planoType !== props.planogram.planoType ||
    dateEnd !== (props.planogram.dateEnd ?? "") ||
    hasTextDump;

  function getDefaultResetLabel() {
    return `${format(new Date(), "MM-dd-yy")} reset`;
  }

  function handleResetPlanogramToggle(isChecked: boolean) {
    setIsResetPlanogram(isChecked);
    if (isChecked && label.trim() === "") {
      setLabel(getDefaultResetLabel());
    }
  }

  function handleHide() {
    if (!submitFetcher.isLoading) {
      props.onHide();
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const [isSuccess, data] = await submitFetcher.fetchData(() =>
      fetchByReactivated<interfaces.IPlanogramEdited>(
        reverse("product_locator:edit_planogram"),
        djangoContext.csrf_token,
        "POST",
        JSON.stringify({
          planogram_id: props.planogram.pk,
          name,
          plano_type: planoType,
          date_end: dateEnd === "" ? null : dateEnd,
          planogram_text_dump: planogramTextDump,
          is_reset_planogram: isResetRequested,
          label,
        })
      )
    );

    if (isSuccess) {
      if (data.planogram_update !== null) {
        toast.success(`Queued planogram update "${data.planogram_update.label}".`);
      } else if (data.num_products_parsed !== null) {
        toast.success(
          `Submitted ${String(data.num_products_added)} out of ${String(data.num_products_parsed)} item(s) successfully.`
        );
      } else {
        toast.success(`Saved "${data.planogram.name}".`);
      }

      props.onSuccess();
      props.onHide();
    }
  }

  return (
    <Modal show={props.show} onHide={handleHide} size="lg" centered>
      <Modal.Header closeButton className="bg-primary text-white">
        <Modal.Title>
          <FontAwesomeIcon icon={faPencilAlt} className="me-2" />
          Edit Planogram — {props.planogram.name}
          {props.storeName !== "" && ` (${props.storeName})`}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-3">
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="edit-planogram-name" className="form-label fw-semibold">
              Planogram Name
            </label>
            <input
              type="text"
              id="edit-planogram-name"
              className="form-control"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={50}
              required
            />
          </div>

          <div className="mb-3">
            <label htmlFor="edit-planogram-type" className="form-label fw-semibold">
              Planogram Type
            </label>
            <select
              id="edit-planogram-type"
              className="form-select"
              value={planoType}
              onChange={(event) => setPlanoType(event.target.value as TPlanoType["value"])}
              required
            >
              {props.planoTypeChoices.map((choice) => (
                <option key={choice.value} value={choice.value}>
                  {choice.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-3">
            <label htmlFor="edit-planogram-end-date" className="form-label fw-semibold">
              End Date
            </label>
            <input
              type="date"
              id="edit-planogram-end-date"
              className="form-control"
              value={dateEnd}
              onChange={(event) => setDateEnd(event.target.value)}
            />
            <small className="form-text text-muted">
              Optional. The planogram stays current through this date.
            </small>
          </div>

          <div className="mb-3">
            <label htmlFor="planogram-text-dump" className="form-label fw-semibold">
              Planogram Text Dump
            </label>
            <textarea
              id="planogram-text-dump"
              className="form-control monospace-text"
              rows={10}
              value={planogramTextDump}
              onChange={(event) => setPlanogramTextDump(event.target.value)}
            />
            <small className="form-text text-muted">
              Optional. Leave blank to keep the planogram&apos;s products as they are.
            </small>
          </div>

          {hasTextDump && (
            <div className="mb-3 form-check">
              <input
                type="checkbox"
                className="form-check-input"
                id="is-reset-planogram"
                checked={isResetPlanogram}
                onChange={(event) => handleResetPlanogramToggle(event.target.checked)}
              />
              <label className="form-check-label" htmlFor="is-reset-planogram">
                Reset Planogram
              </label>
            </div>
          )}

          {isResetRequested && (
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
            <Button
              variant="outline-secondary"
              onClick={handleHide}
              type="button"
              disabled={submitFetcher.isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={submitFetcher.isLoading || !hasChanges}
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
        </form>
      </Modal.Body>
    </Modal>
  );
}
