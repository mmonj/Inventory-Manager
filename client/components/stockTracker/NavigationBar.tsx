import React from "react";

import { Container, Nav, NavDropdown, Navbar } from "react-bootstrap";

import { Context, reverse } from "@reactivated";

import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faBarcode,
  faCalendarAlt,
  faCalendarCheck,
  faChartBar,
  faEdit,
  faHistory,
  faHome,
  faMapMarkedAlt,
  faSignInAlt,
  faSignOutAlt,
  faStore,
  faUserCheck,
  faUserShield,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { AlertsBellIcon } from "../AlertsBellIcon";
import { NavLink } from "../NavLink";

interface TLink {
  text: string;
  href: string;
  icon?: IconDefinition;
}

function getLink(name: string, path: string, icon?: IconDefinition) {
  return {
    text: name,
    href: path,
    icon,
  } satisfies TLink;
}

interface Props {
  extraClassName?: string;
}

const authenticatedLinks: TLink[] = [
  getLink("Scanner", reverse("stock_tracker:scanner"), faBarcode),
  getLink("Scan History", reverse("stock_tracker:scan_history"), faHistory),
  getLink("Barcode Sheets", reverse("stock_tracker:barcode_sheet_history"), faBarcode),
  getLink("Territory Viewer", reverse("survey_worker:qt_territory_viewer"), faMapMarkedAlt),
  getLink("Schedule", reverse("survey_worker:qt_schedule_calendar"), faCalendarAlt),
];

const superuserLinks: TLink[] = [
  getLink("Add New Stores", reverse("stock_tracker:add_new_stores"), faStore),
  getLink("View Login Sessions", reverse("survey_worker:qt_view_login_sessions"), faUserCheck),
  getLink("View Schedule JSON", reverse("survey_worker:qt_view_schedules"), faCalendarCheck),
  getLink("Update Qt Schedule", reverse("survey_worker:qt_update_schedule"), faEdit),
  getLink("Autofill Logs", reverse("survey_worker:qt_view_autofill_logs"), faChartBar),
];

export function NavigationBar({ extraClassName = undefined }: Props) {
  const djangoContext = React.useContext(Context);
  const currentPath = djangoContext.request.path;

  return (
    <Navbar
      expand="lg"
      className={`border-bottom shadow-sm bg-white ${extraClassName ?? ""}`}
      sticky="top"
    >
      <Container fluid>
        <Navbar.Brand href={reverse("stock_tracker:index")} className="fw-bold text-primary">
          <span className="fs-5">Inventory Tracker</span>
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto mb-2 mb-lg-0">
            {djangoContext.user.is_authenticated && (
              <>
                {authenticatedLinks.map((link, idx) => (
                  <NavLink key={idx} href={link.href}>
                    {link.icon && <FontAwesomeIcon icon={link.icon} className="me-1" />}
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
                  {superuserLinks.map((link, idx) => (
                    <NavDropdown.Item key={idx} href={link.href} active={link.href === currentPath}>
                      {link.icon && <FontAwesomeIcon icon={link.icon} className="me-2" />}
                      {link.text}
                    </NavDropdown.Item>
                  ))}
                </NavDropdown>
              </>
            )}
          </Nav>

          <Nav className="mb-2 mb-lg-0 align-items-center">
            {djangoContext.user.is_authenticated && <AlertsBellIcon />}

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
