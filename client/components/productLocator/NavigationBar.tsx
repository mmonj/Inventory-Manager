import React from "react";

import { Container, Nav, Navbar } from "react-bootstrap";

import { Context, reverse } from "@reactivated";

export function NavigationBar() {
  const djangoContext = React.useContext(Context);
  const currentPath = djangoContext.request.path;

  return (
    <Navbar expand="lg" className="border-bottom px-2">
      <Container fluid>
        <Navbar.Brand href={reverse("product_locator:index")}>Inventory Tracker</Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto mb-2 mb-lg-0">
            {djangoContext.user.is_superuser && (
              <Nav.Link
                href={reverse("product_locator:add_new_products")}
                className={
                  reverse("product_locator:add_new_products") === currentPath ? "active" : ""
                }
              >
                Add New Products
              </Nav.Link>
            )}
            {djangoContext.user.is_authenticated && (
              <Nav.Link
                href={reverse("product_locator:scan_audit")}
                className={reverse("product_locator:scan_audit") === currentPath ? "active" : ""}
              >
                Scan Audit
              </Nav.Link>
            )}
          </Nav>

          <Nav className="mb-2 mb-lg-0">
            {djangoContext.user.is_superuser && (
              <Nav.Link href="/admin" target="_blank" rel="noopener noreferrer">
                Admin
              </Nav.Link>
            )}

            <Nav.Link href={reverse("homepage:index")}>Home</Nav.Link>

            {djangoContext.user.is_authenticated && (
              <Nav.Link href={reverse("stock_tracker:logout_view")}>Log Out</Nav.Link>
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
