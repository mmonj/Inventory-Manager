import React from "react";

import { Container, Nav, NavDropdown, Navbar } from "react-bootstrap";

import { Context, reverse } from "@reactivated";

import { faHome, faSignInAlt, faSignOutAlt, faUserShield } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { NavLink } from "../NavLink";

interface TLink {
  text: string;
  href: string;
}

function getLink(name: string, path: string) {
  return {
    text: name,
    href: path,
  } satisfies TLink;
}

export function NavigationBar() {
  const djangoContext = React.useContext(Context);
  const currentPath = djangoContext.request.path;

  const privilegedLinks: TLink[] = [
    getLink("Admin", reverse("survey_worker:qt_admin")),
    getLink("View Login Sessions", reverse("survey_worker:qt_view_login_sessions")),
    getLink("View Qt Schedules", reverse("survey_worker:qt_view_schedules")),
    getLink("Update Qt Schedule", reverse("survey_worker:qt_update_schedule")),
    getLink("Autofill Logs", reverse("survey_worker:qt_view_autofill_logs")),
  ];
  const nonPrivilegedLinks: TLink[] = [
    getLink("Territory Viewer", reverse("survey_worker:qt_territory_viewer")),
  ];

  return (
    <Navbar expand="lg" className="border-bottom shadow-sm bg-white" sticky="top">
      <Container fluid>
        <Navbar.Brand href={reverse("survey_worker:index")} className="fw-bold text-primary">
          <span className="fs-5">Survey Worker</span>
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto mb-2 mb-lg-0">
            {djangoContext.user.is_authenticated && (
              <>
                {nonPrivilegedLinks.map((link, idx) => (
                  <NavLink key={idx} href={link.href}>
                    {link.text}
                  </NavLink>
                ))}
              </>
            )}

            {djangoContext.user.is_superuser && (
              <>
                <NavDropdown
                  title={
                    <>
                      <FontAwesomeIcon icon={faUserShield} className="me-1" />
                      Admin Tools
                    </>
                  }
                  id="admin-tools-dropdown"
                >
                  {privilegedLinks.map((link, idx) => (
                    <NavDropdown.Item key={idx} href={link.href} active={link.href === currentPath}>
                      {link.text}
                    </NavDropdown.Item>
                  ))}
                </NavDropdown>
              </>
            )}
          </Nav>

          <Nav className="mb-2 mb-lg-0 align-items-center">
            {djangoContext.user.is_superuser && (
              <Nav.Link
                href="/admin"
                target="_blank"
                rel="noopener noreferrer"
                className="text-warning"
              >
                <FontAwesomeIcon icon={faUserShield} className="me-1" />
                Django Admin
              </Nav.Link>
            )}

            <Nav.Link
              href={reverse("root:index")}
              className={reverse("root:index") === currentPath ? "active fw-semibold" : ""}
            >
              <FontAwesomeIcon icon={faHome} className="me-1" />
              Home
            </Nav.Link>

            {djangoContext.user.is_authenticated && (
              <Nav.Link
                href={reverse("stock_tracker:logout_view")}
                className={
                  reverse("stock_tracker:logout_view") === currentPath ? "active fw-semibold" : ""
                }
              >
                <FontAwesomeIcon icon={faSignOutAlt} className="me-1" />
                Log Out
              </Nav.Link>
            )}
            {!djangoContext.user.is_authenticated && (
              <Nav.Link
                href={reverse("stock_tracker:login_view")}
                className={
                  reverse("stock_tracker:login_view") === currentPath ? "active fw-semibold" : ""
                }
              >
                <FontAwesomeIcon icon={faSignInAlt} className="me-1" />
                Log In
              </Nav.Link>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
