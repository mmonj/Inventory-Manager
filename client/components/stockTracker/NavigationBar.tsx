import React from "react";

import { Context, reverse } from "@reactivated";
import { Container, Nav, Navbar } from "react-bootstrap";

import classNames from "classnames";

interface Props {
  extraClassName?: string;
}

export function NavigationBar({ extraClassName = "" }: Props) {
  const djangoContext = React.useContext(Context);
  const currentPath = djangoContext.request.path;

  return (
    <Navbar expand="lg" className={classNames("border-bottom px-2", extraClassName)}>
      <Container fluid>
        <Navbar.Brand href={reverse("stock_tracker:scanner")}>Inventory Tracker</Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto mb-2 mb-lg-0">
            {djangoContext.user.is_authenticated && (
              <>
                <Nav.Link
                  href={reverse("stock_tracker:scan_history")}
                  className={reverse("stock_tracker:scan_history") === currentPath ? "active" : ""}
                >
                  Scan History
                </Nav.Link>

                <Nav.Link
                  href={reverse("stock_tracker:barcode_sheet_history")}
                  className={
                    reverse("stock_tracker:barcode_sheet_history") === currentPath ? "active" : ""
                  }
                >
                  Barcode Sheets
                </Nav.Link>

                <Nav.Link
                  href={reverse("stock_tracker:get_manager_names")}
                  className={
                    reverse("stock_tracker:get_manager_names") === currentPath ? "active" : ""
                  }
                >
                  Manager Update Form
                </Nav.Link>
              </>
            )}

            {djangoContext.user.is_superuser && (
              <>
                <Nav.Link
                  href={reverse("stock_tracker:add_new_stores")}
                  className={
                    reverse("stock_tracker:add_new_stores") === currentPath ? "active" : ""
                  }
                >
                  Add New Stores
                </Nav.Link>

                <Nav.Link
                  href={reverse("stock_tracker:import_json_data_files")}
                  className={
                    reverse("stock_tracker:import_json_data_files") === currentPath ? "active" : ""
                  }
                >
                  Import Old Database
                </Nav.Link>
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
