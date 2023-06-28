import React from "react";

import { Context, reverse } from "@reactivated";

export function Navbar() {
  const context = React.useContext(Context);

  return (
    <nav className="navbar navbar-expand-lg bg-body-tertiary border-bottom">
      <div className="container-fluid">
        <a className="navbar-brand" href={reverse("product_locator:index")}>
          Product Locator
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
            {context.user.is_superuser && (
              <li className="nav-item">
                <a className="nav-link" href={reverse("product_locator:add_new_products")}>
                  Add New Products
                </a>
              </li>
            )}
          </ul>

          <ul className="navbar-nav mb-2 mb-lg-0">
            <li className="nav-item">
              <a className="nav-link" href={reverse("homepage:index")}>
                Home
              </a>
            </li>
            {!context.user.is_authenticated && (
              <li className="nav-item">
                <a className="nav-link" href={reverse("logger:login_view")}>
                  Log In
                </a>
              </li>
            )}
            {context.user.is_authenticated && (
              <li className="nav-item">
                <a className="nav-link" href={reverse("logger:logout_view")}>
                  Log Out
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
}
