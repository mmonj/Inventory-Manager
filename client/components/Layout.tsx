import React from "react";

import { Context } from "@reactivated";
import { Helmet } from "react-helmet-async";

import { ContribMessages } from "./ContribMessages";

// import "@static/styles/bs-material-dark.css";
import "@static/styles/bs-navbar-overrides.css";
import "@static/styles/bs-overrides.css";
import "@static/styles/logger/scanner.css";
import "@static/styles/shared.css";

interface Props {
  title: string;
  children: React.ReactNode;
  navbarComponent: JSX.Element;
  className?: string;
}

export const Layout = (props: Props) => {
  const djangoContext = React.useContext(Context);

  return (
    <>
      <Helmet>
        <meta charSet="utf-8" />
        <title>{props.title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link
          rel="icon"
          type="image/x-icon"
          href={`${djangoContext.STATIC_URL}public/favicon.png`}
        />
        <link
          rel="stylesheet"
          type="text/css"
          href={`${djangoContext.STATIC_URL}admin/css/fonts.css`}
        />
        <link
          href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css"
          rel="stylesheet"
          integrity="sha384-rbsA2VBKQhggwzxH7pPCaAqO46MgnOM80zW1RWuH61DGLwZJEdK2Kadq2F9CUG65"
          crossOrigin="anonymous"></link>
        <link rel="stylesheet" type="text/css" href={`${djangoContext.STATIC_URL}dist/index.css`} />
        <script defer crossOrigin="anonymous" src={`${djangoContext.STATIC_URL}dist/index.js`} />
      </Helmet>
      <header>{props.navbarComponent}</header>
      <main>
        <ContribMessages />
        {props.children}
      </main>
    </>
  );
};
