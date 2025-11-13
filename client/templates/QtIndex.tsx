import React from "react";

import { Context, reverse, templates } from "@reactivated";

import {
  faArrowCircleRight,
  faCalendarAlt,
  faCalendarCheck,
  faChartBar,
  faCog,
  faCogs,
  faDatabase,
  faEdit,
  faExternalLinkAlt,
  faListCheck,
  faMapMarkedAlt,
  faPencilAlt,
  faShieldAlt,
  faUserCheck,
  faUserShield,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { Layout } from "@client/components/Layout";
import { NavigationBar } from "@client/components/qtSurveyWorker/NavigationBar";

export default function Template(_props: templates.QtIndex) {
  const context = React.useContext(Context);
  const { user } = context;

  return (
    <Layout
      title="Survey Worker Dashboard"
      navbar={<NavigationBar />}
      className="container-fluid py-5"
    >
      <div className="row justify-content-center">
        <div className="col-lg-10 col-xl-9">
          {/* Header Section */}
          <div className="text-center mb-5">
            <h1 className="display-4 fw-bold mb-3">Survey Worker Dashboard</h1>
            <p className="lead text-muted">
              Manage territories, schedules, and administrative tasks
            </p>
          </div>

          {/* Main Section */}
          <div className="mb-5">
            <h3 className="h5 text-secondary mb-3">
              <FontAwesomeIcon icon={faMapMarkedAlt} className="me-2" />
              Territory Management
            </h3>
            <div className="row g-4">
              {/* qt_territory_viewer */}
              <div className="col-md-6 col-lg-4">
                <div className="card h-100 border-0 shadow-sm hover-shadow transition">
                  <div className="card-body d-flex flex-column p-4">
                    <div className="mb-3">
                      <div
                        className="bg-primary bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center"
                        style={{ width: "60px", height: "60px" }}
                      >
                        <FontAwesomeIcon icon={faMapMarkedAlt} size="2x" className="text-primary" />
                      </div>
                    </div>
                    <h5 className="card-title fw-bold mb-2">View Qt Territory</h5>
                    <p className="card-text text-muted flex-grow-1">
                      View and manage Qt territory assignments with interactive maps and scheduling
                    </p>
                    <a
                      href={reverse("survey_worker:qt_territory_viewer")}
                      className="btn btn-primary btn-lg w-100 mt-3"
                    >
                      <FontAwesomeIcon icon={faArrowCircleRight} className="me-2" />
                      Launch Territory Viewer
                    </a>
                  </div>
                </div>
              </div>

              {user.is_superuser && <>{/* Admin Section - close the territory management row */}</>}
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
                  {/* qt_admin */}
                  <div className="col-md-6 col-lg-4">
                    <div className="card h-100 border-0 shadow-sm hover-shadow transition">
                      <div className="card-body d-flex flex-column p-4">
                        <div className="mb-3">
                          <div
                            className="bg-warning bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center"
                            style={{ width: "60px", height: "60px" }}
                          >
                            <FontAwesomeIcon icon={faCogs} size="2x" className="text-warning" />
                          </div>
                        </div>
                        <h5 className="card-title fw-bold mb-2">Qt Admin</h5>
                        <p className="card-text text-muted flex-grow-1">
                          Manage Qt territories and administrative settings
                        </p>
                        <a
                          href={reverse("survey_worker:qt_admin")}
                          className="btn btn-outline-warning btn-lg w-100 mt-3"
                        >
                          <FontAwesomeIcon icon={faCog} className="me-2" />
                          Go to Qt Admin
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* qt_view_login_sessions */}
                  <div className="col-md-6 col-lg-4">
                    <div className="card h-100 border-0 shadow-sm hover-shadow transition">
                      <div className="card-body d-flex flex-column p-4">
                        <div className="mb-3">
                          <div
                            className="bg-info bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center"
                            style={{ width: "60px", height: "60px" }}
                          >
                            <FontAwesomeIcon icon={faUserCheck} size="2x" className="text-info" />
                          </div>
                        </div>
                        <h5 className="card-title fw-bold mb-2">View Login Sessions</h5>
                        <p className="card-text text-muted flex-grow-1">
                          Monitor and manage active user login sessions
                        </p>
                        <a
                          href={reverse("survey_worker:qt_view_login_sessions")}
                          className="btn btn-outline-info btn-lg w-100 mt-3"
                        >
                          <FontAwesomeIcon icon={faUserShield} className="me-2" />
                          View Sessions
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* qt_view_schedules */}
                  <div className="col-md-6 col-lg-4">
                    <div className="card h-100 border-0 shadow-sm hover-shadow transition">
                      <div className="card-body d-flex flex-column p-4">
                        <div className="mb-3">
                          <div
                            className="bg-success bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center"
                            style={{ width: "60px", height: "60px" }}
                          >
                            <FontAwesomeIcon
                              icon={faCalendarAlt}
                              size="2x"
                              className="text-success"
                            />
                          </div>
                        </div>
                        <h5 className="card-title fw-bold mb-2">View Schedules</h5>
                        <p className="card-text text-muted flex-grow-1">
                          View and manage territory schedules
                        </p>
                        <a
                          href={reverse("survey_worker:qt_view_schedules")}
                          className="btn btn-outline-success btn-lg w-100 mt-3"
                        >
                          <FontAwesomeIcon icon={faCalendarCheck} className="me-2" />
                          View Schedules
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* qt_update_schedule */}
                  <div className="col-md-6 col-lg-4">
                    <div className="card h-100 border-0 shadow-sm hover-shadow transition">
                      <div className="card-body d-flex flex-column p-4">
                        <div className="mb-3">
                          <div
                            className="bg-danger bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center"
                            style={{ width: "60px", height: "60px" }}
                          >
                            <FontAwesomeIcon icon={faEdit} size="2x" className="text-danger" />
                          </div>
                        </div>
                        <h5 className="card-title fw-bold mb-2">Update Schedule</h5>
                        <p className="card-text text-muted flex-grow-1">
                          Update and modify schedules for Qt territories
                        </p>
                        <a
                          href={reverse("survey_worker:qt_update_schedule")}
                          className="btn btn-outline-danger btn-lg w-100 mt-3"
                        >
                          <FontAwesomeIcon icon={faPencilAlt} className="me-2" />
                          Update Schedule
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* qt_view_autofill_logs */}
                  <div className="col-md-6 col-lg-4">
                    <div className="card h-100 border-0 shadow-sm hover-shadow transition">
                      <div className="card-body d-flex flex-column p-4">
                        <div className="mb-3">
                          <div
                            className="bg-secondary bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center"
                            style={{ width: "60px", height: "60px" }}
                          >
                            <FontAwesomeIcon
                              icon={faChartBar}
                              size="2x"
                              className="text-secondary"
                            />
                          </div>
                        </div>
                        <h5 className="card-title fw-bold mb-2">Autofill Logs</h5>
                        <p className="card-text text-muted flex-grow-1">
                          View detailed logs for all autofill actions
                        </p>
                        <a
                          href={reverse("survey_worker:qt_view_autofill_logs")}
                          className="btn btn-outline-secondary btn-lg w-100 mt-3"
                        >
                          <FontAwesomeIcon icon={faListCheck} className="me-2" />
                          View Logs
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
