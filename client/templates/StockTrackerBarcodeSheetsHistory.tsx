import React from "react";

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

import { reverse, templates } from "@reactivated";

import { Layout } from "@client/components/Layout";
import { NavigationBar } from "@client/components/stockTracker/NavigationBar";

import { format } from "date-fns";

export default function Template(props: templates.StockTrackerBarcodeSheetsHistory) {
  let currentFieldRepName = "";
  props.field_representatives.forEach((field_rep) => {
    if (field_rep.pk === props.current_field_rep_id) {
      currentFieldRepName = field_rep.name;
    }
  });

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

            {props.recent_barcode_sheets.length === 0 ? (
              <div className="text-center py-5">
                <div className="text-muted">
                  <i className="fs-1 mb-3 d-block">📋</i>
                  <h4>No barcode sheets found</h4>
                  <p>No barcode sheets are available for this field representative.</p>
                </div>
              </div>
            ) : (
              <Row className="g-3">
                {props.recent_barcode_sheets.map((barcode_sheet) => {
                  const search_params = `?sheet-type=out-of-dist`;

                  return (
                    <Col key={barcode_sheet.pk} xs={12} md={6} xl={4}>
                      <Card className="shadow-sm border-0 h-100 hover-shadow transition">
                        <Card.Header className="bg-primary bg-opacity-10 border-0">
                          <div className="p-2">
                            <h5 className="mb-2 fw-bold">
                              {barcode_sheet.parent_company?.expanded_name}
                            </h5>
                            <Badge bg="secondary" pill>
                              Cycle: {barcode_sheet.work_cycle?.start_date}
                            </Badge>
                          </div>
                        </Card.Header>
                        <Card.Body className="d-flex flex-column">
                          <h4 className="mb-3 text-primary">{barcode_sheet.store.name}</h4>
                          <div className="text-muted small mb-2">
                            <i className="bi bi-calendar-event me-2"></i>
                            Created on{" "}
                            <strong>
                              {format(new Date(barcode_sheet.datetime_created), "MMMM d, yyyy")}
                            </strong>{" "}
                            at{" "}
                            <strong>
                              {format(new Date(barcode_sheet.datetime_created), "hh:mm a")}
                            </strong>
                          </div>
                          <div className="text-muted small mb-3">
                            <i className="bi bi-box-seam me-2"></i>
                            <Badge bg="info" className="me-1">
                              {barcode_sheet.product_additions.length}
                            </Badge>
                            {barcode_sheet.product_additions.length === 1 ? "item" : "items"} in
                            this document
                          </div>
                          <div className="mt-auto">
                            <a
                              href={
                                reverse("stock_tracker:get_barcode_sheet", {
                                  barcode_sheet_id: barcode_sheet.pk,
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
                    </Col>
                  );
                })}
              </Row>
            )}
          </Col>
        </Row>
      </Container>
    </Layout>
  );
}
