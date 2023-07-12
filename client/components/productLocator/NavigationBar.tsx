import React from "react";

import { Context, reverse } from "@reactivated";
import { Container, Nav, Navbar } from "react-bootstrap";

export function NavigationBar() {
  const djangoContext = React.useContext(Context);

  return (
    <Navbar expand="lg" className="bg-body-tertiary bg-blue-theme border-bottom px-2">
      <Container fluid>
        <Navbar.Brand href={reverse("product_locator:index")}>Inventory Tracker</Navbar.Brand>
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
