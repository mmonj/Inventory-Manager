import React, { Suspense, lazy, useEffect, useState } from "react";

import {
  Context,
  SurveyWorkerQtraxWebsiteTypedefsAddress,
  SurveyWorkerQtraxWebsiteTypedefsTServiceOrder,
  templates,
} from "@reactivated";
import { Dropdown, DropdownButton, Modal } from "react-bootstrap";

import { faTimes } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { Layout } from "@client/components/Layout";
import { StoreList } from "@client/components/qtSurveyWorker/StoreList";
import { NavigationBar } from "@client/components/surveyWorker/NavigationBar";

const TerritoryMap = lazy(() => import("@client/components/qtSurveyWorker/TerritoryMap"));

type TGroupedStoreRecord = Record<
  number,
  {
    address: SurveyWorkerQtraxWebsiteTypedefsAddress;
    jobs: SurveyWorkerQtraxWebsiteTypedefsTServiceOrder[];
  }
>;

export default function Template(props: templates.QtTerritoryViewer) {
  const [selectedRepDetailId, setSelectedRepDetailId] = useState<number | null>(
    props.rep_sync_datalist[0]?.id ?? null
  );
  const [showMap, setShowMap] = useState(false);
  const [storeFilterValue, setStoreFilterValue] = useState("");
  const [selectedDueDate, setSelectedDueDate] = useState<string>("");
  const [filteredStores, setFilteredStores] = useState<TGroupedStoreRecord>({});
  const djangoContext = React.useContext(Context);

  const selectedRepData = props.rep_sync_datalist.find((r) => r.id === selectedRepDetailId);
  const serviceOrders = selectedRepData?.schedule?.ServiceOrders ?? [];

  // get unique due dates and sort them, excluding weekdays
  const uniqueDueDates = React.useMemo(() => {
    const dates = serviceOrders
      .map((so) => so.DateScheduleRangeEndOriginal)
      .filter((date): date is string => Boolean(date))
      .filter((date) => {
        const dayOfWeek = new Date(date).getDay();
        // include only dates that fall in on either sunday or saturday
        return dayOfWeek === 0 || dayOfWeek === 6;
      })
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    // remove duplicates
    return [...new Set(dates)];
  }, [serviceOrders]);

  // track if initial date already set to avoid overriding user selection
  const initialDateSet = React.useRef(false);

  // group stores
  const groupedByStore = React.useMemo(() => {
    const _groupedByStore: TGroupedStoreRecord = {};

    for (const so of serviceOrders) {
      const siteId = so.Address.SiteId;
      if (!(siteId in _groupedByStore)) {
        _groupedByStore[siteId] = { address: so.Address, jobs: [] };
      }
      _groupedByStore[siteId].jobs.push(so);
    }

    return _groupedByStore;
  }, [serviceOrders]);

  let totalWorkHours = 0;
  Object.values(filteredStores).forEach(({ jobs }) => {
    jobs.forEach((job) => {
      totalWorkHours += job.EstimatedTime;
    });
  });

  // filter stores
  useEffect(() => {
    const timeoutVal = setTimeout(() => {
      const filtered: TGroupedStoreRecord = {};

      Object.entries(groupedByStore).forEach(([siteId, storeData]) => {
        // filter by store name + address + job descriptions
        const fullStoreName = `${storeData.address.City}, ${storeData.address.State} | ${storeData.address.StreetAddress} | ${storeData.address.StoreName}`;
        const jobDescriptions = storeData.jobs
          .map((job) => job.ServiceOrderDescription || "")
          .join(" ");
        const searchableText = `${fullStoreName} ${jobDescriptions}`;

        const matchesStoreFilter = searchableText
          .toLowerCase()
          .includes(storeFilterValue.toLowerCase());

        // filter by due date
        const matchesDueDate =
          selectedDueDate === ""
            ? true // If no due date selected, show all
            : storeData.jobs.some((job) => {
                const jobDueDate = job.DateScheduleRangeEndOriginal;
                if (!jobDueDate) return false;

                return new Date(jobDueDate) <= new Date(selectedDueDate);
              });

        // only include if both filters match
        if (matchesStoreFilter && matchesDueDate) {
          filtered[Number(siteId)] = {
            address: storeData.address,
            jobs: storeData.jobs.filter((job) => {
              // if a due date is selected, only include jobs on or before that date
              if (selectedDueDate !== "" && job.DateScheduleRangeEndOriginal) {
                return new Date(job.DateScheduleRangeEndOriginal) <= new Date(selectedDueDate);
              }
              return true;
            }),
          };
        }
      });

      setFilteredStores(filtered);
    }, 300);

    return () => clearTimeout(timeoutVal);
  }, [storeFilterValue, groupedByStore, selectedDueDate]);

  useEffect(() => {
    setFilteredStores(groupedByStore);
    // reset the initial date flag when rep changes
    initialDateSet.current = false;
  }, [selectedRepDetailId]);

  // load last selected representative ID on mount
  useEffect(() => {
    const lastSelectedRepId = localStorage.getItem("lastSelectedRepId");
    if (lastSelectedRepId !== null && lastSelectedRepId !== "") {
      const storedId = parseInt(lastSelectedRepId);

      if (!isNaN(storedId) && props.rep_sync_datalist.some((rep) => rep.id === storedId)) {
        setSelectedRepDetailId(storedId);
      }
    }
  }, []);

  if (props.rep_sync_datalist.length === 0) {
    return (
      <Layout title="Territory Viewer" navbar={<NavigationBar />}>
        <div className="container mt-4">
          <div className="alert alert-info display-6 text-center">No data available!</div>
        </div>
      </Layout>
    );
  }

  function handleRepChange(repId: number) {
    setStoreFilterValue("");
    setSelectedRepDetailId(repId);

    localStorage.setItem("lastSelectedRepId", repId.toString());
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
        <h2 className="mb-4">Territory Viewer</h2>

        <div className="mb-4">
          <div className="mb-3">
            <label className="form-label fw-semibold">Field Representative:</label>
            <DropdownButton
              id="rep-select"
              title={selectedRepData?.rep_detail.username ?? "Select Representative"}
              variant="secondary"
              className="w-100"
            >
              {props.rep_sync_datalist.map((rep) => (
                <Dropdown.Item
                  key={rep.id}
                  onClick={() => handleRepChange(rep.id)}
                  active={selectedRepDetailId === rep.id}
                >
                  {rep.rep_detail.username}
                </Dropdown.Item>
              ))}
            </DropdownButton>
          </div>

          <div>
            <strong>{Object.keys(filteredStores).length} stores shown</strong>
            <div className="text-secondary">
              Last updated:{" "}
              {selectedRepData
                ? new Date(selectedRepData.datetime_modified).toLocaleString()
                : "N/A"}
            </div>
          </div>
          <div>
            <strong>Total Work Hours: </strong>
            {totalWorkHours.toFixed(2)} hrs
          </div>
        </div>

        <div className="mb-3">
          <button className="btn btn-primary" onClick={() => setShowMap((prev) => !prev)}>
            <img src={`${djangoContext.STATIC_URL}public/geo-alt-fill.svg`} alt="Map" />
            &nbsp;&nbsp;
            {showMap ? "Hide Map" : "Show Map"}
          </button>
        </div>

        <div className="mb-2">
          <label className="form-label fw-semibold">Show Tickets due by:</label>
          <DropdownButton
            id="due-date-select"
            title={
              selectedDueDate === "" ? "All Dates" : new Date(selectedDueDate).toLocaleDateString()
            }
            variant="secondary"
            className="w-100"
          >
            <Dropdown.Item
              onClick={() => {
                initialDateSet.current = true;
                setSelectedDueDate("");
              }}
              active={selectedDueDate === ""}
            >
              All Dates
            </Dropdown.Item>
            {uniqueDueDates.map((date) => (
              <Dropdown.Item
                key={date}
                onClick={() => {
                  initialDateSet.current = true;
                  setSelectedDueDate(date);
                }}
                active={selectedDueDate === date}
              >
                {new Date(date).toLocaleDateString()}
              </Dropdown.Item>
            ))}
          </DropdownButton>
        </div>

        <div className="mb-3">
          <div className="input-group">
            <input
              type="text"
              id="filter-stores"
              className="form-control"
              placeholder="Filter by Store + Address + Job Descriptions"
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

        {/* territory map */}
        {selectedRepDetailId !== null && (
          <Modal
            show={showMap}
            onHide={() => setShowMap(false)}
            backdrop="static"
            size="lg"
            aria-labelledby="map-modal"
            centered
          >
            <Modal.Header closeButton>
              <Modal.Title id="map-modal" className="w-75 text-truncate">
                Map: {selectedRepData?.rep_detail.username ?? "Unknown Rep"}
              </Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-0" style={{ height: "70vh" }}>
              <Suspense fallback={<div>Loading map...</div>}>
                <TerritoryMap groupedByStore={filteredStores} />
              </Suspense>
            </Modal.Body>
          </Modal>
        )}

        {/* store list */}
        <StoreList groupedByStore={filteredStores} />
      </div>
    </Layout>
  );
}
