import React, { Suspense, lazy, useState } from "react";

import { templates } from "@reactivated";

import { Layout } from "@client/components/Layout";
import { NavigationBar } from "@client/components/surveyWorker/NavigationBar";
import { formatDateRange, formatJobTime } from "@client/util/qtSurveyWorker/scheduleUtils";

const TerritoryMap = lazy(() => import("@client/components/qtSurveyWorker/TerritoryMap"));

export default function (props: templates.QtTerritoryViewer) {
  const [selectedRepDetailId, setSelectedRepDetailId] = useState<number | null>(
    props.rep_sync_datalist[0]?.id ?? null
  );
  const [showMap, setShowMap] = useState(false);

  const selectedRepData = props.rep_sync_datalist.find((r) => r.id === selectedRepDetailId);

  const schedule = selectedRepData?.schedule;
  const serviceOrders = schedule?.ServiceOrders ?? [];

  const groupedByStore: Record<
    number,
    { address: (typeof serviceOrders)[0]["Address"]; jobs: typeof serviceOrders }
  > = {};

  for (const so of serviceOrders) {
    const siteId = so.Address.SiteId;
    if (groupedByStore[siteId] === undefined) {
      groupedByStore[siteId] = {
        address: so.Address,
        jobs: [],
      };
    }
    groupedByStore[siteId].jobs.push(so);
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

        <div className="mb-3">
          <label htmlFor="rep-select" className="form-label">
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

        <div className="mb-3">
          <button className="btn btn-primary" onClick={() => setShowMap((prev) => !prev)}>
            {showMap ? "Hide Map" : "Show Map"}
          </button>
        </div>

        {showMap && (
          <div className="mb-4" style={{ height: "500px" }}>
            <Suspense fallback={<div>Loading map...</div>}>
              <TerritoryMap groupedByStore={groupedByStore} />
            </Suspense>
          </div>
        )}

        {Object.values(groupedByStore).map(({ address, jobs }) => (
          <div key={address.SiteId} className="card mb-3">
            <div className="card-body">
              <h5 className="card-title">Store: {address.StoreName || "(Unnamed Store)"}</h5>
              <div className="pb-2">
                {address.StreetAddress}, {address.City}, {address.State} {address.PostalCode}
              </div>
              <ul className="list-group list-group-flush alert alert-info">
                {jobs.map((job, jobIndex) => (
                  <li key={jobIndex} className="list-group-item">
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
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
}
