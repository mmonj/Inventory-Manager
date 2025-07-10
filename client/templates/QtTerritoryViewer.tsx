import React, { Suspense, lazy, useEffect, useState } from "react";

import {
  SurveyWorkerQtraxWebsiteTypedefsAddress,
  SurveyWorkerQtraxWebsiteTypedefsTServiceOrder,
  templates,
} from "@reactivated";
import { Accordion } from "react-bootstrap";

import { faTimes } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { Layout } from "@client/components/Layout";
import { NavigationBar } from "@client/components/surveyWorker/NavigationBar";
import { formatDateRange, formatJobTime } from "@client/util/qtSurveyWorker/scheduleUtils";

const TerritoryMap = lazy(() => import("@client/components/qtSurveyWorker/TerritoryMap"));

export function Template(props: templates.QtTerritoryViewer) {
  const [selectedRepDetailId, setSelectedRepDetailId] = useState<number | null>(
    props.rep_sync_datalist[0]?.id ?? null
  );
  const [showMap, setShowMap] = useState(false);
  const [storeFilterValue, setStoreFilterValue] = useState("");
  const [filteredStores, setFilteredStores] = useState<
    Record<
      number,
      {
        address: SurveyWorkerQtraxWebsiteTypedefsAddress;
        jobs: SurveyWorkerQtraxWebsiteTypedefsTServiceOrder[];
      }
    >
  >({});

  const selectedRepData = props.rep_sync_datalist.find((r) => r.id === selectedRepDetailId);
  const serviceOrders = selectedRepData?.schedule?.ServiceOrders ?? [];

  // Group stores
  const groupedByStore: Record<
    number,
    {
      address: SurveyWorkerQtraxWebsiteTypedefsAddress;
      jobs: SurveyWorkerQtraxWebsiteTypedefsTServiceOrder[];
    }
  > = {};
  for (const so of serviceOrders) {
    const siteId = so.Address.SiteId;
    // if (groupedByStore[siteId] === undefined) {
    if (!(siteId in groupedByStore)) {
      groupedByStore[siteId] = { address: so.Address, jobs: [] };
    }
    groupedByStore[siteId].jobs.push(so);
  }

  // Filter stores effect with debounce
  useEffect(() => {
    const timeoutVal = setTimeout(() => {
      const filtered = Object.entries(groupedByStore).reduce(
        (acc, [siteId, storeData]) => {
          const fullStoreName = `${storeData.address.City}, ${storeData.address.State} | ${storeData.address.StreetAddress} | ${storeData.address.StoreName}`;
          if (fullStoreName.toLowerCase().includes(storeFilterValue.toLowerCase())) {
            acc[Number(siteId)] = storeData;
          }
          return acc;
        },
        {} as typeof groupedByStore
      );

      setFilteredStores(filtered);
    }, 300);

    return () => clearTimeout(timeoutVal);
  }, [storeFilterValue, groupedByStore]);

  useEffect(() => {
    setFilteredStores(groupedByStore);
  }, [selectedRepDetailId]);

  if (props.rep_sync_datalist.length === 0) {
    return (
      <Layout title="Territory Viewer" navbar={<NavigationBar />}>
        <div className="container mt-4">
          <div className="alert alert-info display-6 text-center">No data available!</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      navbar={<NavigationBar />}
      title="Territory Viewer"
      extraExternalStyles={[
        {
          src: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
          integrity: "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=",
        },
      ]}
    >
      <div className="container mt-4">
        <h2 className="mb-4">Survey Worker Territory Viewer</h2>

        <div className="mb-4">
          <div className="mb-3">
            <label htmlFor="rep-select" className="form-label fw-semibold">
              Select Representative:
            </label>
            <select
              id="rep-select"
              className="form-select"
              value={selectedRepDetailId ?? undefined}
              onChange={(e) => setSelectedRepDetailId(Number(e.target.value))}
            >
              {props.rep_sync_datalist.map((rep) => (
                <option key={rep.id} value={rep.id}>
                  {rep.rep_detail.username}
                </option>
              ))}
            </select>
          </div>

          <div>
            <strong>{Object.keys(filteredStores).length} stores shown</strong>
          </div>
        </div>

        <div className="mb-3">
          <button className="btn btn-primary" onClick={() => setShowMap((prev) => !prev)}>
            {showMap ? "Hide Map" : "Show Map"}
          </button>
        </div>

        <div className="mb-3">
          <div className="input-group">
            <input
              type="text"
              id="filter-stores"
              className="form-control"
              placeholder="Filter by Store"
              value={storeFilterValue}
              onChange={(e) => setStoreFilterValue(e.target.value)}
            />
            {storeFilterValue !== "" && (
              <button
                type="button"
                className="btn bg-transparent"
                style={{ marginLeft: "-40px", zIndex: "100" }}
                onClick={() => setStoreFilterValue("")}
              >
                <FontAwesomeIcon icon={faTimes} color={"#d9d9d9"} />
              </button>
            )}
          </div>
        </div>

        {showMap && (
          <div className="mb-4" style={{ height: "500px" }}>
            <Suspense fallback={<div>Loading map...</div>}>
              <TerritoryMap groupedByStore={filteredStores} />
            </Suspense>
          </div>
        )}

        <Accordion className="list-group list-group-flush">
          {Object.values(filteredStores).map(({ address, jobs }) => (
            <Accordion.Item
              key={address.SiteId}
              eventKey={address.SiteId.toString()}
              className="list-group-item"
            >
              <Accordion.Header>
                <div>
                  <h5 className="mb-1">{address.StoreName || "(Unnamed Store)"}</h5>
                  <p className="mb-1 text-secondary">
                    {address.StreetAddress}, {address.City}, {address.State} {address.PostalCode}
                  </p>
                  <small className="text-muted">{jobs.length} jobs</small>
                </div>
              </Accordion.Header>
              <Accordion.Body>
                <ul className="list-group list-group-flush">
                  {jobs.map((job, jobIndex) => (
                    <li key={jobIndex} className="list-group-item list-group-item-info">
                      <strong>Description:</strong> {job.ServiceOrderDescription}
                      <br />
                      <strong>Estimated Time:</strong> {formatJobTime(job.EstimatedTime)}
                      <br />
                      <strong>Date Range:</strong>{" "}
                      {formatDateRange(
                        job.DateScheduleRangeStartOriginal,
                        job.DateScheduleRangeEndOriginal
                      )}
                    </li>
                  ))}
                </ul>
              </Accordion.Body>
            </Accordion.Item>
          ))}
        </Accordion>
      </div>
    </Layout>
  );
}
