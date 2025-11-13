import React from "react";

import { Context, interfaces, templates } from "@reactivated";

import { format } from "date-fns";

import { BarcodeScanner } from "@client/components/BarcodeScanner";
import { Layout } from "@client/components/Layout";
import { NavigationBar } from "@client/components/productLocator/NavigationBar";
import { useFetch } from "@client/hooks/useFetch";
import { createNewScanAudit, postToScanAudit } from "@client/util/productLocator";

export default function Template(props: templates.ProductLocatorScanAudit) {
  const [scannedUpcs, setScannedUpcs] = React.useState<string[]>([]);
  const [selectedScanAuditId, setSelectedScanAuditId] = React.useState<number | null>(null);
  const createNewScanAuditFetch = useFetch<interfaces.IScanAuditCreation>();
  const addToScanAuditFetch = useFetch<interfaces.IProductLocatorProduct>();
  const djangoContext = React.useContext(Context);

  const scanAuditSelectRef = React.useRef<HTMLSelectElement>(null);
  const newScanAuditInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const _scanAuditId = new URL(window.location.href).searchParams.get("scan-audit-id");
    if (_scanAuditId !== null) {
      setSelectedScanAuditId(() => parseInt(_scanAuditId));
    }
  }, []);

  function setQueryParameter(key: string, value: string) {
    const url = new URL(window.location.href);
    url.searchParams.set(key, value);

    window.location.href = url.href;
  }

  function handleScanAuditSubmission(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (scanAuditSelectRef.current!.value === "") {
      return;
    }

    setSelectedScanAuditId(() => parseInt(scanAuditSelectRef.current!.value));
    setQueryParameter("scan-audit-id", scanAuditSelectRef.current!.value);
  }

  async function handleCreateNewAudit() {
    const newScanAuditProductType = newScanAuditInputRef.current!.value.trim();

    const [isSuccess, result] = await createNewScanAuditFetch.fetchData(() =>
      createNewScanAudit(newScanAuditProductType, djangoContext.csrf_token)
    );

    if (isSuccess) {
      setSelectedScanAuditId(() => result.scan_audit.pk);
      setQueryParameter("scan-audit-id", result.scan_audit.pk.toString());
    }
  }

  async function scanSuccessCallback(decodedText: string) {
    const [isSuccess] = await addToScanAuditFetch.fetchData(() =>
      postToScanAudit(selectedScanAuditId!, decodedText, djangoContext.csrf_token)
    );

    if (isSuccess) {
      setScannedUpcs((prev) => prev.filter((prevUpc) => prevUpc !== decodedText));
      setScannedUpcs((prev) => [decodedText, ...prev]);
    }
  }

  function scanErrorCallback() {
    console.log("error");
  }

  return (
    <Layout
      title="Scan Audit"
      navbar={<NavigationBar />}
      extraStyles={["styles/stock_tracker/scanner.css"]}
    >
      <section className="m-2 px-2 mw-rem-60 mx-auto">
        <h1 className="text-center my-3">Scan Audit</h1>
        {selectedScanAuditId === null && (
          <form onSubmit={handleScanAuditSubmission}>
            <label htmlFor="previous-scan-audits">Continue with a previous Audit</label>
            <div className="d-flex">
              <select
                ref={scanAuditSelectRef}
                name="previous-scan-audits"
                id="previous-scan-audits"
                className="form-select me-1"
                defaultValue={""}
                required
              >
                <option value="" disabled>
                  Choose a Scan Audit to add to
                </option>
                {props.previous_audits.map((previous_audit) => (
                  <option key={previous_audit.pk} value={previous_audit.pk}>
                    {format(
                      new Date(previous_audit.datetime_created),
                      "EEEE, MMMM d, yyyy, hh:mm a"
                    )}{" "}
                  </option>
                ))}
              </select>

              <button type="submit" className="btn btn-primary">
                <img src={`${djangoContext.STATIC_URL}public/arrow-right.svg`} alt="Next" />
              </button>
            </div>

            <div className="mt-3">
              <label className="form-label">Create New Scan Audit</label>
              <input
                ref={newScanAuditInputRef}
                type="text"
                className="form-control"
                placeholder="New Scan Audit Product Type"
              />
              <button
                onClick={handleCreateNewAudit}
                type="button"
                className="btn btn-secondary my-2"
              >
                Create
              </button>
            </div>
          </form>
        )}
      </section>

      {selectedScanAuditId !== null && (
        <section id="scanner-container" className="mw-rem-60 mx-auto">
          <div id="scanner-store-indicator">
            <BarcodeScanner
              scanSuccessCallback={scanSuccessCallback}
              scanErrorCallback={scanErrorCallback}
            />
          </div>
        </section>
      )}

      <ol className="list-group list-group-numbered px-2 mw-rem-60 mx-auto">
        {scannedUpcs.map((upc) => (
          <li
            key={crypto.randomUUID()}
            className="list-group-item d-flex justify-content-between align-items-start"
          >
            <div className="ms-2 me-auto product-container">
              <div className="fw-bold upc-container">{upc}</div>
            </div>
          </li>
        ))}
      </ol>
    </Layout>
  );
}
