import React from "react";

import { Context, reverse } from "@reactivated";
import { Container, Nav, Navbar } from "react-bootstrap";

export function Navbar2() {
  const djangoContext = React.useContext(Context);

  return (
    <>
      <nav className="navbar navbar-expand-lg bg-body-tertiary border-bottom bg-blue-theme">
        <div className="container-fluid">
          <a className="navbar-brand" href={reverse("stock_tracker:scanner")}>
            Inventory Tracker
          </a>
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarSupportedContent"
            aria-controls="navbarSupportedContent"
            aria-expanded="false"
            aria-label="Toggle navigation">
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarSupportedContent">
            <ul className="navbar-nav me-auto mb-2 mb-lg-0">
              {djangoContext.user.is_authenticated && (
                <>
                  <li className="nav-item">
                    <a className="nav-link" href={reverse("stock_tracker:scan_history")}>
                      Scan History
                    </a>
                  </li>
                  <li className="nav-item">
                    <a className="nav-link" href={reverse("stock_tracker:barcode_sheet_history")}>
                      Barcode Sheets
                    </a>
                  </li>
                  <li className="nav-item">
                    <a className="nav-link" href={reverse("stock_tracker:get_manager_names")}>
                      Manager Update Form
                    </a>
                  </li>
                </>
              )}

              {djangoContext.user.is_superuser && (
                <>
                  <li className="nav-item">
                    <a className="nav-link" href={reverse("stock_tracker:add_new_stores")}>
                      Add New Stores
                    </a>
                  </li>
                  <li className="nav-item">
                    <a className="nav-link" href={reverse("stock_tracker:import_json_data_files")}>
                      Import Old Database
                    </a>
                  </li>
                </>
              )}
            </ul>

            <ul className="navbar-nav mb-2 mb-lg-0">
              <li className="nav-item">
                <a className="nav-link" href={reverse("homepage:index")}>
                  Home
                </a>
              </li>
              {!djangoContext.user.is_authenticated && (
                <>
                  <li className="nav-item">
                    <a className="nav-link" href={reverse("stock_tracker:login_view")}>
                      Log In
                    </a>
                  </li>
                </>
              )}
              {djangoContext.user.is_authenticated && (
                <>
                  <li className="nav-item">
                    <a className="nav-link" href={reverse("stock_tracker:logout_view")}>
                      Log Out
                    </a>
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>
      </nav>
    </>
  );
}

export function NavigationBar() {
  const djangoContext = React.useContext(Context);

  return (
    <Navbar expand="lg" className="bg-body-tertiary bg-blue-theme px-2">
      <Container fluid>
        <Navbar.Brand href="#home">Inventory Tracker</Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto mb-2 mb-lg-0">
            {djangoContext.user.is_superuser && (
              <Nav.Link href={reverse("product_locator:add_new_products")}>
                Add New Products
              </Nav.Link>
            )}
          </Nav>

          <Nav className="mb-2 mb-lg-0">
            <Nav.Link href={reverse("homepage:index")}>Home</Nav.Link>

            {djangoContext.user.is_authenticated && (
              <Nav.Link href={reverse("stock_tracker:logout_view")}>Log Out</Nav.Link>
            )}
            {!djangoContext.user.is_authenticated && (
              <Nav.Link href={reverse("stock_tracker:login_view")}>Log In</Nav.Link>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
