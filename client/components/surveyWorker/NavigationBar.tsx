import React from "react";

import { Context, reverse } from "@reactivated";
import { Container, Nav, Navbar } from "react-bootstrap";

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
  ];
  const nonPrivilegedLinks: TLink[] = [
    getLink("Territory Viewer", reverse("survey_worker:qt_view_territory")),
  ];

  return (
    <Navbar expand="lg" className="bg-body-tertiary bg-blue-theme border-bottom px-2">
      <Container fluid>
        <Navbar.Brand href={reverse("survey_worker:index")}>Survey Worker</Navbar.Brand>
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
                {privilegedLinks.map((link, idx) => (
                  <NavLink key={idx} href={link.href}>
                    {link.text}
                  </NavLink>
                ))}
              </>
            )}
          </Nav>

          <Nav className="mb-2 mb-lg-0">
            <Nav.Link href={reverse("homepage:index")}>Home</Nav.Link>

            {djangoContext.user.is_authenticated && (
              <Nav.Link
                href={reverse("stock_tracker:logout_view")}
                className={reverse("stock_tracker:logout_view") === currentPath ? "active" : ""}
              >
                Log Out
              </Nav.Link>
            )}
            {!djangoContext.user.is_authenticated && (
              <Nav.Link
                href={reverse("stock_tracker:login_view")}
                className={reverse("stock_tracker:login_view") === currentPath ? "active" : ""}
              >
                Log In
              </Nav.Link>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
