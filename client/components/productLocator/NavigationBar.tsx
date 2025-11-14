import React from "react";

import { Container, Nav, NavDropdown, Navbar } from "react-bootstrap";

import { Context, reverse } from "@reactivated";

import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faClipboardCheck,
  faCog,
  faHome,
  faPlusCircle,
  faSearchLocation,
  faSignInAlt,
  faSignOutAlt,
  faUserShield,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

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

export function NavigationBar() {
  const djangoContext = React.useContext(Context);
  const currentPath = djangoContext.request.path;

  const authenticatedLinks: TLink[] = [
    getLink("Scan Audit", reverse("product_locator:scan_audit"), faClipboardCheck),
  ];

  const superuserLinks: TLink[] = [
    getLink("Add New Products", reverse("product_locator:add_new_products"), faPlusCircle),
    getLink("Manage Planograms", reverse("product_locator:manage_planograms"), faCog),
  ];

  return (
    <Navbar expand="lg" className="border-bottom shadow-sm bg-white" sticky="top">
      <Container fluid>
        <Navbar.Brand href={reverse("product_locator:index")} className="fw-bold text-primary">
          <FontAwesomeIcon icon={faSearchLocation} className="me-2" />
          <span className="fs-5">Product Locator</span>
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
