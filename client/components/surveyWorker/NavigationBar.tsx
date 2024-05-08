import React from "react";

import { Context, reverse } from "@reactivated";
import { Container, Nav, Navbar } from "react-bootstrap";

export function NavigationBar() {
  const djangoContext = React.useContext(Context);
  const currentPath = djangoContext.request.path;

  return (
    <Navbar expand="lg" className="bg-body-tertiary bg-blue-theme border-bottom px-2">
      <Container fluid>
        <Navbar.Brand href={reverse("survey_worker:index")}>Survey Worker</Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto mb-2 mb-lg-0">
            {djangoContext.user.is_authenticated && (
              <>
                <Nav.Link
                  href={reverse("survey_worker:survey_launcher")}
                  className={
                    reverse("survey_worker:survey_launcher") === currentPath ? "active" : ""
                  }
                >
                  Survey Launcher
                </Nav.Link>
                <Nav.Link
                  href={reverse("survey_worker:territory_viewer")}
                  className={
                    reverse("survey_worker:territory_viewer") === currentPath ? "active" : ""
                  }
                >
                  Territory Viewer
                </Nav.Link>
              </>
            )}

            {djangoContext.user.is_superuser && (
              <>
                <Nav.Link
                  href={reverse("survey_worker:webhub")}
                  className={reverse("survey_worker:webhub") === currentPath ? "active" : ""}
                >
                  WebHub
                </Nav.Link>
                <Nav.Link
                  href={reverse("survey_worker:rep_sync_data_viewer")}
                  className={
                    reverse("survey_worker:rep_sync_data_viewer") === currentPath ? "active" : ""
                  }
                >
                  Rep Sync Data Viewer
                </Nav.Link>
                <Nav.Link
                  href={reverse("survey_worker:task_adminer")}
                  className={reverse("survey_worker:task_adminer") === currentPath ? "active" : ""}
                >
                  Task Adminer
                </Nav.Link>
                <Nav.Link
                  href={reverse("survey_worker:manual_cmklaunch_html")}
                  className={
                    reverse("survey_worker:manual_cmklaunch_html") === currentPath ? "active" : ""
                  }
                >
                  CMK HTML Manual Form
                </Nav.Link>
              </>
            )}

            {/* {djangoContext.user.is_superuser && <></>} */}
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
