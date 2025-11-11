import React, { Suspense, lazy, useEffect, useState } from "react";

import {
  Button,
  Card,
  Col,
  Container,
  Dropdown,
  DropdownButton,
  Form,
  InputGroup,
  Modal,
  Row,
} from "react-bootstrap";

import {
  SurveyWorkerQtraxWebsiteTypedefsAddress,
  SurveyWorkerQtraxWebsiteTypedefsTServiceOrder,
  templates,
} from "@reactivated";

import { faCalendarAlt, faClock, faMap, faTimes } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { Layout } from "@client/components/Layout";
import { NavigationBar } from "@client/components/qtSurveyWorker/NavigationBar";
import { StoreList } from "@client/components/qtSurveyWorker/StoreList";

const TerritoryMap = lazy(() => import("@client/components/qtSurveyWorker/TerritoryMap"));

type TGroupedStoreRecord = Record<
  number,
  {
    address: SurveyWorkerQtraxWebsiteTypedefsAddress;
    jobs: SurveyWorkerQtraxWebsiteTypedefsTServiceOrder[];
  }
>;

export function Template(props: templates.QtTerritoryViewer) {
  const [selectedRepDetailId, setSelectedRepDetailId] = useState<number | null>(
    props.rep_sync_datalist[0]?.id ?? null
  );
  const [showMap, setShowMap] = useState(false);
  const [storeFilterValue, setStoreFilterValue] = useState("");
  const [selectedDueDate, setSelectedDueDate] = useState<string>("");
  const [filteredStores, setFilteredStores] = useState<TGroupedStoreRecord>({});

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
        <Container className="mt-5">
          <Row className="justify-content-center">
            <Col lg={8} xl={6}>
              <Card className="border-0 shadow-sm text-center py-5">
                <Card.Body>
                  <div className="mb-4">
                    <i className="fs-1">🗺️</i>
                  </div>
                  <h3 className="mb-3">No Territory Data Available</h3>
                  <p className="text-muted">
                    There are currently no representatives with territory data to display.
                  </p>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
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
      <Container fluid className="py-4">
        <Row className="justify-content-center">
          <Col lg={11} xl={10}>
            {/* Header */}
            <div className="text-center mb-4">
              <h1 className="display-5 fw-bold mb-2">Territory Viewer</h1>
              <p className="text-muted">Manage and view field representative territories</p>
            </div>

            {/* Main Control Panel */}
            <Card className="shadow-sm border-0 mb-4">
              <Card.Body className="p-4">
                <Row className="g-3">
                  {/* Field Representative Selector */}
                  <Col md={6}>
                    <Form.Label className="fw-semibold text-secondary small mb-2">
                      Field Representative
                    </Form.Label>
                    <DropdownButton
                      id="rep-select"
                      title={selectedRepData?.rep_detail.username ?? "Select Representative"}
                      variant="outline-primary"
                      className="w-100"
                      size="lg"
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
                  </Col>

                  {/* Due Date Filter */}
                  <Col md={6}>
                    <Form.Label className="fw-semibold text-secondary small mb-2">
                      <FontAwesomeIcon icon={faCalendarAlt} className="me-2" />
                      Show Tickets Due By
                    </Form.Label>
                    <DropdownButton
                      id="due-date-select"
                      title={
                        selectedDueDate === ""
                          ? "All Dates"
                          : new Date(selectedDueDate).toLocaleDateString()
                      }
                      variant="outline-secondary"
                      className="w-100"
                      size="lg"
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
                  </Col>
                </Row>

                {/* Stats Row */}
                <Row className="mt-4 g-3">
                  <Col md={4}>
                    <Card className="bg-primary bg-opacity-10 border-primary border-opacity-25 h-100">
                      <Card.Body className="text-center">
                        <div className="fs-2 fw-bold text-primary">
                          {Object.keys(filteredStores).length}
                        </div>
                        <div className="text-secondary small">Stores Shown</div>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={4}>
                    <Card className="bg-success bg-opacity-10 border-success border-opacity-25 h-100">
                      <Card.Body className="text-center">
                        <div className="fs-2 fw-bold text-success">
                          <FontAwesomeIcon icon={faClock} className="me-2" size="sm" />
                          {totalWorkHours.toFixed(1)}
                        </div>
                        <div className="text-secondary small">Total Work Hours</div>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={4}>
                    <Card className="bg-info bg-opacity-10 border-info border-opacity-25 h-100">
                      <Card.Body className="text-center">
                        <div className="small text-secondary mb-1">Last Updated</div>
                        <div className="fw-semibold">
                          {selectedRepData
                            ? new Date(selectedRepData.datetime_modified).toLocaleDateString()
                            : "N/A"}
                        </div>
                        <div className="small text-muted">
                          {selectedRepData
                            ? new Date(selectedRepData.datetime_modified).toLocaleTimeString()
                            : ""}
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            {/* Action Bar */}
            <Card className="shadow-sm border-0 mb-4">
              <Card.Body className="p-3">
                <Row className="align-items-center g-3">
                  <Col md={8}>
                    <InputGroup size="lg">
                      <InputGroup.Text className="bg-white">
                        <i className="bi bi-search"></i>
                      </InputGroup.Text>
                      <Form.Control
                        type="text"
                        placeholder="Filter by store, address, or job description..."
                        value={storeFilterValue}
                        onChange={(e) => setStoreFilterValue(e.target.value)}
                        className="border-start-0"
                      />
                      {storeFilterValue !== "" && (
                        <Button
                          variant="link"
                          className="text-secondary"
                          onClick={() => setStoreFilterValue("")}
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </Button>
                      )}
                    </InputGroup>
                  </Col>
                  <Col md={4} className="text-md-end">
                    <Button
                      variant={showMap ? "primary" : "outline-primary"}
                      size="lg"
                      onClick={() => setShowMap((prev) => !prev)}
                      className="w-100 w-md-auto"
                    >
                      <FontAwesomeIcon icon={faMap} className="me-2" />
                      {showMap ? "Hide Map" : "Show Map"}
                    </Button>
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            {/* Territory Map Modal */}
            {selectedRepDetailId !== null && (
              <Modal
                show={showMap}
                onHide={() => setShowMap(false)}
                backdrop="static"
                size="lg"
                aria-labelledby="map-modal"
                centered
              >
                <Modal.Header closeButton className="border-0 pb-0">
                  <Modal.Title id="map-modal" className="w-75 text-truncate">
                    <FontAwesomeIcon icon={faMap} className="me-2 text-primary" />
                    {selectedRepData?.rep_detail.username ?? "Unknown Rep"}
                  </Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-0" style={{ height: "70vh" }}>
                  <Suspense
                    fallback={
                      <div className="d-flex align-items-center justify-content-center h-100">
                        <div className="text-center">
                          <div className="spinner-border text-primary mb-3" role="status">
                            <span className="visually-hidden">Loading...</span>
                          </div>
                          <div className="text-muted">Loading map...</div>
                        </div>
                      </div>
                    }
                  >
                    <TerritoryMap groupedByStore={filteredStores} />
                  </Suspense>
                </Modal.Body>
              </Modal>
            )}

            {/* Store List */}
            <StoreList groupedByStore={filteredStores} />
          </Col>
        </Row>
      </Container>
    </Layout>
  );
}
