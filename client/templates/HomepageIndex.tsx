import React from "react";

import { Badge, Card, Col, Container, Navbar, Row } from "react-bootstrap";

import { Context, reverse, templates } from "@reactivated";

import {
  faArrowRight,
  faBarcode,
  faBox,
  faClipboardList,
  faMapMarkedAlt,
  faMapMarkerAlt,
  faSearchLocation,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { Layout } from "@client/components/Layout";

function HomepageNavbar() {
  const context = React.useContext(Context);

  return (
    <Navbar className="shadow-sm bg-white border-bottom">
      <Container fluid className="mw-rem-60 mx-auto">
        <Navbar.Brand href={reverse("root:index")} className="d-flex align-items-center">
          <img
            src={context.STATIC_URL + "public/phone-barcode-image.png"}
            alt="Logo"
            width="30"
            height="50"
            className="d-inline-block me-2"
          />
          <span className="fs-4 fw-bold text-primary">Inventory Manager</span>
        </Navbar.Brand>
      </Container>
    </Navbar>
  );
}

export function Template(_props: templates.HomepageIndex) {
  const context = React.useContext(Context);

  return (
    <Layout title="Inventory Manager" navbar={<HomepageNavbar />} className="p-0">
      <div className="container-fluid py-5">
        <div className="mw-rem-60 mx-auto">
          <div className="text-center mb-5">
            <h1 className="display-4 fw-bold mb-3">Inventory Manager</h1>
          </div>

          {/* cards */}
          <Row className="g-4">
            {/* Inventory Tracker Card */}
            <Col lg={4}>
              <Card className="h-100 border-0 shadow-sm hover-shadow transition">
                <div className="position-relative overflow-hidden" style={{ height: "200px" }}>
                  <img
                    src={context.STATIC_URL + "public/product-logger-logo.png"}
                    className="card-img-top w-100 h-100 object-fit-cover"
                    alt="product-logger-logo"
                  />
                  <div className="position-absolute top-0 start-0 w-100 h-100 bg-primary bg-opacity-10"></div>
                </div>
                <Card.Body className="d-flex flex-column p-4">
                  <div className="mb-3">
                    <div className="d-flex align-items-center mb-2">
                      <div className="bg-primary bg-opacity-10 rounded-circle p-2 me-2">
                        <FontAwesomeIcon icon={faBox} size="lg" className="text-primary" />
                      </div>
                      <h5 className="card-title mb-0 fw-bold">Inventory Tracker</h5>
                    </div>
                  </div>
                  <p className="card-text text-muted flex-grow-1">
                    Adjust and monitor inventory for individual stores with a built-in barcode
                    scanner
                  </p>
                  <div className="d-flex gap-2 mb-3">
                    <Badge bg="primary" className="bg-opacity-10 text-primary">
                      <FontAwesomeIcon icon={faBarcode} className="me-1" />
                      Barcode Scanner
                    </Badge>
                  </div>
                  <a
                    href={reverse("stock_tracker:scanner")}
                    className="btn btn-primary btn-lg w-100 mt-auto"
                  >
                    <FontAwesomeIcon icon={faArrowRight} className="me-2" />
                    Go to Inventory Tracker
                  </a>
                </Card.Body>
              </Card>
            </Col>

            {/* Product Locator Card */}
            <Col lg={4}>
              <Card className="h-100 border-0 shadow-sm hover-shadow transition">
                <div className="position-relative overflow-hidden" style={{ height: "200px" }}>
                  <img
                    src={context.STATIC_URL + "public/product-locator-logo.jpg"}
                    className="card-img-top w-100 h-100 object-fit-cover"
                    alt="product-locator-logo"
                  />
                  <div className="position-absolute top-0 start-0 w-100 h-100 bg-success bg-opacity-10"></div>
                </div>
                <Card.Body className="d-flex flex-column p-4">
                  <div className="mb-3">
                    <div className="d-flex align-items-center mb-2">
                      <div className="bg-success bg-opacity-10 rounded-circle p-2 me-2">
                        <FontAwesomeIcon icon={faMapMarkerAlt} size="lg" className="text-success" />
                      </div>
                      <h5 className="card-title mb-0 fw-bold">Product Locator</h5>
                    </div>
                  </div>
                  <p className="card-text text-muted flex-grow-1">
                    Scan to find a product's home location - useful for stocking large displays
                    efficiently
                  </p>
                  <div className="d-flex gap-2 mb-3">
                    <Badge bg="success" className="bg-opacity-10 text-success">
                      <FontAwesomeIcon icon={faBarcode} className="me-1" />
                      Barcode Scanner
                    </Badge>
                    <Badge bg="info" className="bg-opacity-10 text-info">
                      <FontAwesomeIcon icon={faSearchLocation} className="me-1" />
                      Location Finder
                    </Badge>
                  </div>
                  <a
                    href={reverse("product_locator:index")}
                    className="btn btn-success btn-lg w-100 mt-auto"
                  >
                    <FontAwesomeIcon icon={faArrowRight} className="me-2" />
                    Go to Product Locator
                  </a>
                </Card.Body>
              </Card>
            </Col>

            {/* Survey Worker Card */}
            <Col lg={4}>
              <Card className="h-100 border-0 shadow-sm hover-shadow transition">
                <div className="position-relative overflow-hidden" style={{ height: "200px" }}>
                  <img
                    src={context.STATIC_URL + "public/survey-logo.png"}
                    className="card-img-top w-100 h-100 object-fit-cover"
                    alt="survey-logo"
                  />
                  <div className="position-absolute top-0 start-0 w-100 h-100 bg-info bg-opacity-10"></div>
                </div>
                <Card.Body className="d-flex flex-column p-4">
                  <div className="mb-3">
                    <div className="d-flex align-items-center mb-2">
                      <div className="bg-info bg-opacity-10 rounded-circle p-2 me-2">
                        <FontAwesomeIcon icon={faClipboardList} size="lg" className="text-info" />
                      </div>
                      <h5 className="card-title mb-0 fw-bold">Survey Worker</h5>
                    </div>
                  </div>
                  <p className="card-text text-muted flex-grow-1">Find and launch work surveys</p>
                  <div className="d-flex gap-2 mb-3">
                    <Badge bg="warning" className="bg-opacity-10 text-warning">
                      <FontAwesomeIcon icon={faMapMarkedAlt} className="me-1" />
                      Territory Map
                    </Badge>
                  </div>
                  <a
                    href={reverse("survey_worker:index")}
                    className="btn btn-info btn-lg w-100 mt-auto"
                  >
                    <FontAwesomeIcon icon={faArrowRight} className="me-2" />
                    Go to Survey Launcher
                  </a>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </div>
      </div>

      <style>{`
        .hover-shadow {
          transition: box-shadow 0.3s ease-in-out, transform 0.3s ease-in-out;
        }
        .hover-shadow:hover {
          box-shadow: 0 0.5rem 1.5rem rgba(0, 0, 0, 0.15) !important;
          transform: translateY(-5px);
        }
        .transition {
          transition: all 0.3s ease-in-out;
        }
        .object-fit-cover {
          object-fit: cover;
          object-position: center;
        }
      `}</style>
    </Layout>
  );
}
