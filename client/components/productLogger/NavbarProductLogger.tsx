import React from "react";

import { Context, reverse } from "@reactivated";

export function NavbarProductLogger() {
  const djangoContext = React.useContext(Context);

  return (
    <>
      <nav className="navbar navbar-expand-lg bg-body-tertiary border-bottom bg-blue-theme">
        <div className="container-fluid">
          <a className="navbar-brand" href={reverse("logger:scanner")}>
            Inventory Logger
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
                    <a className="nav-link" href={reverse("logger:scan_history")}>
                      Scan History
                    </a>
                  </li>
                  <li className="nav-item">
                    <a className="nav-link" href={reverse("logger:barcode_sheet_history")}>
                      Barcode Sheets
                    </a>
                  </li>
                  <li className="nav-item">
                    <a className="nav-link" href={reverse("logger:get_manager_names")}>
                      Manager Update Form
                    </a>
                  </li>
                </>
              )}

              {djangoContext.user.is_superuser && (
                <>
                  <li className="nav-item">
                    <a className="nav-link" href={reverse("logger:add_new_stores")}>
                      Add New Stores
                    </a>
                  </li>
                  <li className="nav-item">
                    <a className="nav-link" href={reverse("logger:import_json_data_files")}>
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
                    <a className="nav-link" href={reverse("logger:login_view")}>
                      Log In
                    </a>
                  </li>
                </>
              )}
              {djangoContext.user.is_authenticated && (
                <>
                  <li className="nav-item">
                    <a className="nav-link" href={reverse("logger:logout_view")}>
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
