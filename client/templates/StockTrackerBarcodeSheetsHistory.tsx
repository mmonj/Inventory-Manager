import React, { useState } from "react";

import {
  Badge,
  ButtonGroup,
  Card,
  Col,
  Container,
  Dropdown,
  DropdownButton,
  Row,
} from "react-bootstrap";

import { Context, reverse, templates } from "@reactivated";

import { format } from "date-fns";
import { LazyMotion, domAnimation, m } from "motion/react";

import { Layout } from "@client/components/Layout";
import { LoadMoreButton } from "@client/components/LoadMoreButton";
import { LoadingSpinner } from "@client/components/LoadingSpinner";
import { NavigationBar } from "@client/components/stockTracker/NavigationBar";
import { useFetch } from "@client/hooks/useFetch";
import { getBarcodeSheets } from "@client/util/stockTracker";
import { BasicBarcodeSheet } from "@client/util/stockTracker/ajaxInterfaces";

export function Template(props: templates.StockTrackerBarcodeSheetsHistory) {
  const djangoContext = React.useContext(Context);
  const [barcodeSheets, setBarcodeSheets] = useState<BasicBarcodeSheet[]>([]);
  const [nextPageNumber, setNextPageNumber] = useState(1);
  const barcodeSheetPaginationState = useFetch<BasicBarcodeSheet[]>();
  const paginationErrorMessage = React.useRef<HTMLDivElement>(null);
  const hasFetchedInitialPage = React.useRef(false);

  let currentFieldRepName = "";
  props.field_representatives.forEach((field_rep) => {
    if (field_rep.pk === props.current_field_rep_id) {
      currentFieldRepName = field_rep.name;
    }
  });

  async function handleGetBarcodeSheets(page: number) {
    const barcodeSheetsCallback = () =>
      getBarcodeSheets(djangoContext.csrf_token, {
        page,
        ...(props.current_field_rep_id !== null && {
          field_representative_id: props.current_field_rep_id,
        }),
      });

    const [isSuccess, result] = await barcodeSheetPaginationState.fetchData(barcodeSheetsCallback);
    if (isSuccess) {
      setBarcodeSheets((prev) => [...prev, ...result]);
      setNextPageNumber(page + 1);
    } else {
      paginationErrorMessage.current?.scrollIntoView();
    }
  }

  // fetch the first page on mount - the field-rep filter is a full page navigation (href), so
  // this only ever needs to run once per mount
  React.useEffect(() => {
    if (hasFetchedInitialPage.current) {
      return;
    }
    hasFetchedInitialPage.current = true;
    void handleGetBarcodeSheets(1);
  }, []);

  return (
    <Layout title="Barcode Sheet History" navbar={<NavigationBar />}>
      <Container fluid className="py-4">
        <Row className="justify-content-center">
          <Col lg={10} xl={8}>
            <div className="text-center mb-4">
              <h1 className="display-5 fw-bold mb-3">Barcode Sheet History</h1>
              <p className="text-muted">View and manage barcode sheets by field representative</p>
            </div>

            <div className="d-flex justify-content-center align-items-center gap-3 mb-4">
              <span className="text-muted fw-semibold">Filter by:</span>
              <DropdownButton
                as={ButtonGroup}
                title={currentFieldRepName || "Select Field Rep"}
                variant="outline-primary"
                size="lg"
              >
                {props.field_representatives.map((field_rep, idx) => (
                  <Dropdown.Item
                    className={field_rep.pk === props.current_field_rep_id ? "active" : ""}
                    key={field_rep.pk}
                    eventKey={idx}
                    href={reverse("stock_tracker:barcode_sheet_history_repid", {
                      field_representative_id: field_rep.pk,
                    })}
                  >
                    {field_rep.name}
                  </Dropdown.Item>
                ))}
              </DropdownButton>
            </div>

            {barcodeSheets.length === 0 && barcodeSheetPaginationState.isLoading && (
              <div className="text-center py-5">
                <LoadingSpinner isBlockElement />
              </div>
            )}

            {barcodeSheets.length === 0 &&
              !barcodeSheetPaginationState.isLoading &&
              !barcodeSheetPaginationState.isError && (
                <div className="text-center py-5">
                  <div className="text-muted">
                    <i className="fs-1 mb-3 d-block">📋</i>
                    <h4>No barcode sheets found</h4>
                    <p>No barcode sheets are available for this field representative.</p>
                  </div>
                </div>
              )}

            {barcodeSheets.length > 0 && (
              <LazyMotion features={domAnimation}>
                <Row className="g-3">
                  {barcodeSheets.map((barcode_sheet) => {
                    const search_params = `?sheet-type=out-of-dist`;

                    return (
                      <Col key={barcode_sheet.id} xs={12} md={6} xl={4}>
                        <m.div
                          className="h-100"
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <Card className="shadow-sm border-0 h-100 hover-shadow transition">
                            <Card.Header className="bg-primary bg-opacity-10 border-0">
                              <div className="p-2">
                                <h5 className="mb-2 fw-bold">
                                  {barcode_sheet.parent_company?.expanded_name}
                                </h5>
                                <Badge bg="secondary" pill>
                                  Cycle:{" "}
                                  {barcode_sheet.work_cycle?.start_date !== undefined &&
                                    format(
                                      new Date(barcode_sheet.work_cycle.start_date),
                                      "MMM d, yyyy"
                                    )}
                                </Badge>
                              </div>
                            </Card.Header>
                            <Card.Body className="d-flex flex-column">
                              <h4 className="mb-3 text-primary">{barcode_sheet.store.name}</h4>
                              <div className="text-muted small mb-2">
                                <i className="bi bi-calendar-event me-2"></i>
                                Created on{" "}
                                <strong>
                                  {barcode_sheet.datetime_created !== undefined &&
                                    format(
                                      new Date(barcode_sheet.datetime_created),
                                      "MMMM d, yyyy"
                                    )}
                                </strong>{" "}
                                at{" "}
                                <strong>
                                  {barcode_sheet.datetime_created !== undefined &&
                                    format(new Date(barcode_sheet.datetime_created), "hh:mm a")}
                                </strong>
                              </div>
                              <div className="text-muted small mb-3">
                                <i className="bi bi-box-seam me-2"></i>
                                <Badge bg="info" className="me-1">
                                  {barcode_sheet.product_additions_count}
                                </Badge>
                                {barcode_sheet.product_additions_count === 1 ? "item" : "items"} in
                                this document
                              </div>
                              <div className="mt-auto">
                                <a
                                  href={
                                    reverse("stock_tracker:get_barcode_sheet", {
                                      barcode_sheet_id: barcode_sheet.id ?? 0,
                                    }) + search_params
                                  }
                                  className="btn btn-primary w-100"
                                >
                                  <i className="bi bi-eye me-2"></i>
                                  View Sheet
                                </a>
                              </div>
                            </Card.Body>
                          </Card>
                        </m.div>
                      </Col>
                    );
                  })}
                </Row>
              </LazyMotion>
            )}

            {barcodeSheets.length > 0 && (
              <LoadMoreButton
                ref={paginationErrorMessage}
                label="barcode sheets"
                isLoading={barcodeSheetPaginationState.isLoading}
                isError={barcodeSheetPaginationState.isError}
                errorMessages={barcodeSheetPaginationState.errorMessages}
                onClick={() => void handleGetBarcodeSheets(nextPageNumber)}
              />
            )}
          </Col>
        </Row>
      </Container>
    </Layout>
  );
}
