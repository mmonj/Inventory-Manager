import React from "react";

import { CSRFToken, Context, reverse, templates } from "@reactivated";
import { Alert } from "react-bootstrap";

import { Layout } from "@client/components/Layout";
import { NavigationBar } from "@client/components/stockTracker/NavigationBar";

export function Template(props: templates.StockTrackerLogin) {
  const djangoContext = React.useContext(Context);
  const nextUrl = new URL(djangoContext.request.url).searchParams.get("next") ?? "";

  return (
    <Layout title="Log In" navbar={<NavigationBar />}>
      <section className="m-2 p-2 rounded mw-rem-60 mx-auto">
        <form action={reverse("stock_tracker:login_view")} method="POST">
          <CSRFToken />

          {props.is_invalid_credentials && (
            <Alert variant="danger">Invalid username or password.</Alert>
          )}

          <fieldset>
            <legend>Log In</legend>
            <p>
              <label htmlFor="logger-username" className="form-label">
                Username
              </label>
              <input
                id="logger-username"
                name="username"
                type="text"
                className="form-control"
                autoComplete="username"
                required
              />
            </p>
            <p>
              <label htmlFor="logger-password" className="form-label">
                Password
              </label>
              <input
                id="logger-password"
                name="password"
                type="password"
                className="form-control"
                autoComplete="current-password"
                required
              />
            </p>
            <p>
              <button type="submit" className="btn btn-primary col-12">
                Submit
              </button>
            </p>
            <input type="hidden" name="next" value={nextUrl} />
          </fieldset>
        </form>
      </section>
    </Layout>
  );
}
