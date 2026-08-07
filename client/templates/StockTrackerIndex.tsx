import React from "react";

import { Context, reverse, templates } from "@reactivated";

import {
  faArrowCircleRight,
  faBarcode,
  faDatabase,
  faExternalLinkAlt,
  faFileImport,
  faHistory,
  faShieldAlt,
  faStore,
  faUserEdit,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { Layout } from "@client/components/Layout";
import { NavigationBar } from "@client/components/stockTracker/NavigationBar";

export function Template(_props: templates.StockTrackerIndex) {
  const context = React.useContext(Context);
  const { user } = context;

  return (
    <Layout
      title="Inventory Tracker Dashboard"
      navbar={<NavigationBar />}
      className="container-fluid py-5"
    >
      <div className="row justify-content-center">
        <div className="col-lg-10 col-xl-9">
          {/* Header Section */}
          <div className="text-center mb-5">
            <h1 className="display-4 fw-bold mb-3">Inventory Tracker Dashboard</h1>
            <p className="lead text-muted">Scan, track, and manage store product inventory</p>
          </div>

          {/* Main Section */}
          <div className="mb-5">
            <h3 className="h5 text-secondary mb-3">
              <FontAwesomeIcon icon={faBarcode} className="me-2" />
              Tools
            </h3>
            <div className="row g-4">
              {/* scanner */}
              <div className="col-md-6 col-lg-4">
                <div className="card h-100 border-0 shadow-sm hover-shadow transition">
                  <div className="card-body d-flex flex-column p-4">
                    <div className="mb-3">
                      <div
                        className="bg-primary bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center"
                        style={{ width: "60px", height: "60px" }}
                      >
                        <FontAwesomeIcon icon={faBarcode} size="2x" className="text-primary" />
                      </div>
                    </div>
                    <h5 className="card-title fw-bold mb-2">Scanner</h5>
                    <p className="card-text text-muted flex-grow-1">
                      Scan barcodes in-store to quickly log which products a store carries
                    </p>
                    <a
                      href={reverse("stock_tracker:scanner")}
                      className="btn btn-primary btn-lg w-100 mt-3"
                    >
                      <FontAwesomeIcon icon={faArrowCircleRight} className="me-2" />
                      Open Scanner
                    </a>
                  </div>
                </div>
              </div>

              {/* scan_history */}
              <div className="col-md-6 col-lg-4">
                <div className="card h-100 border-0 shadow-sm hover-shadow transition">
                  <div className="card-body d-flex flex-column p-4">
                    <div className="mb-3">
                      <div
                        className="bg-success bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center"
                        style={{ width: "60px", height: "60px" }}
                      >
                        <FontAwesomeIcon icon={faHistory} size="2x" className="text-success" />
                      </div>
                    </div>
                    <h5 className="card-title fw-bold mb-2">Scan History</h5>
                    <p className="card-text text-muted flex-grow-1">
                      View previously scanned and recorded product additions
                    </p>
                    <a
                      href={reverse("stock_tracker:scan_history")}
                      className="btn btn-outline-success btn-lg w-100 mt-3"
                    >
                      <FontAwesomeIcon icon={faHistory} className="me-2" />
                      View Scan History
                    </a>
                  </div>
                </div>
              </div>

              {/* barcode_sheet_history */}
              <div className="col-md-6 col-lg-4">
                <div className="card h-100 border-0 shadow-sm hover-shadow transition">
                  <div className="card-body d-flex flex-column p-4">
                    <div className="mb-3">
                      <div
                        className="bg-info bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center"
                        style={{ width: "60px", height: "60px" }}
                      >
                        <FontAwesomeIcon icon={faBarcode} size="2x" className="text-info" />
                      </div>
                    </div>
                    <h5 className="card-title fw-bold mb-2">Barcode Sheets</h5>
                    <p className="card-text text-muted flex-grow-1">
                      View barcode sheets documenting which products were surveyed at each store
                    </p>
                    <a
                      href={reverse("stock_tracker:barcode_sheet_history")}
                      className="btn btn-outline-info btn-lg w-100 mt-3"
                    >
                      <FontAwesomeIcon icon={faBarcode} className="me-2" />
                      View Barcode Sheets
                    </a>
                  </div>
                </div>
              </div>

              {/* get_manager_names */}
              <div className="col-md-6 col-lg-4">
                <div className="card h-100 border-0 shadow-sm hover-shadow transition">
                  <div className="card-body d-flex flex-column p-4">
                    <div className="mb-3">
                      <div
                        className="bg-secondary bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center"
                        style={{ width: "60px", height: "60px" }}
                      >
                        <FontAwesomeIcon icon={faUserEdit} size="2x" className="text-secondary" />
                      </div>
                    </div>
                    <h5 className="card-title fw-bold mb-2">Manager Update Form</h5>
                    <p className="card-text text-muted flex-grow-1">
                      Update store manager contact names
                    </p>
                    <a
                      href={reverse("stock_tracker:get_manager_names")}
                      className="btn btn-outline-secondary btn-lg w-100 mt-3"
                    >
                      <FontAwesomeIcon icon={faUserEdit} className="me-2" />
                      Update Manager Names
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {user.is_superuser && (
            <>
              {/* Administrative Tools Section */}
              <div className="mb-4">
                <h3 className="h5 text-secondary mb-3">
                  <FontAwesomeIcon icon={faShieldAlt} className="me-2" />
                  Administrative Tools
                </h3>
                <div className="row g-4">
                  {/* add_new_stores */}
                  <div className="col-md-6 col-lg-4">
                    <div className="card h-100 border-0 shadow-sm hover-shadow transition">
                      <div className="card-body d-flex flex-column p-4">
                        <div className="mb-3">
                          <div
                            className="bg-danger bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center"
                            style={{ width: "60px", height: "60px" }}
                          >
                            <FontAwesomeIcon icon={faStore} size="2x" className="text-danger" />
                          </div>
                        </div>
                        <h5 className="card-title fw-bold mb-2">Add New Stores</h5>
                        <p className="card-text text-muted flex-grow-1">
                          Bulk-add new store records to the database
                        </p>
                        <a
                          href={reverse("stock_tracker:add_new_stores")}
                          className="btn btn-outline-danger btn-lg w-100 mt-3"
                        >
                          <FontAwesomeIcon icon={faStore} className="me-2" />
                          Add New Stores
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* import_json_data_files */}
                  <div className="col-md-6 col-lg-4">
                    <div className="card h-100 border-0 shadow-sm hover-shadow transition">
                      <div className="card-body d-flex flex-column p-4">
                        <div className="mb-3">
                          <div
                            className="bg-warning bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center"
                            style={{ width: "60px", height: "60px" }}
                          >
                            <FontAwesomeIcon
                              icon={faFileImport}
                              size="2x"
                              className="text-warning"
                            />
                          </div>
                        </div>
                        <h5 className="card-title fw-bold mb-2">Import Old Database</h5>
                        <p className="card-text text-muted flex-grow-1">
                          Import legacy JSON data files into the database
                        </p>
                        <a
                          href={reverse("stock_tracker:import_json_data_files")}
                          className="btn btn-outline-warning btn-lg w-100 mt-3"
                        >
                          <FontAwesomeIcon icon={faFileImport} className="me-2" />
                          Import Data Files
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Django Admin Section */}
              <div className="mb-4">
                <h3 className="h5 text-secondary mb-3">
                  <FontAwesomeIcon icon={faDatabase} className="me-2" />
                  System Administration
                </h3>
                <div
                  className="card border-0 shadow-sm hover-shadow transition border-warning"
                  style={{ borderWidth: "2px !important" }}
                >
                  <div className="card-body d-flex align-items-center p-4">
                    <div className="me-4">
                      <div
                        className="bg-warning bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center"
                        style={{ width: "70px", height: "70px" }}
                      >
                        <FontAwesomeIcon icon={faDatabase} size="2x" className="text-warning" />
                      </div>
                    </div>
                    <div className="flex-grow-1">
                      <h5 className="card-title fw-bold mb-2">Django Admin Panel</h5>
                      <p className="card-text text-muted mb-0">
                        Access the Django administration panel for full system control and database
                        management
                      </p>
                    </div>
                    <div className="ms-4">
                      <a
                        href="/admin"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-warning btn-lg"
                      >
                        <FontAwesomeIcon icon={faExternalLinkAlt} className="me-2" />
                        Open Django Admin
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
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
      `}</style>
    </Layout>
  );
}
