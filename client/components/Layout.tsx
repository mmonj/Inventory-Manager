import React from "react";

import { Context } from "@reactivated";
import { Helmet } from "react-helmet-async";

import { Navbar } from "./Navbar";

import "@client/styles/bs-material-dark.css";
import "@client/styles/shared.css";
import "@client/styles/logger/scanner.css";

interface Props {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export const Layout = (props: Props) => {
  const context = React.useContext(Context);

  return (
    <>
      <Helmet>
        <meta charSet="utf-8" />
        <title>{props.title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/x-icon" href={`${context.STATIC_URL}public/favicon.png`} />
        <link rel="stylesheet" type="text/css" href={`${context.STATIC_URL}admin/css/fonts.css`} />
        <link rel="stylesheet" type="text/css" href={`${context.STATIC_URL}dist/index.css`} />
        <script defer crossOrigin="anonymous" src={`${context.STATIC_URL}dist/index.js`} />
      </Helmet>
      <header>
        <Navbar />
      </header>
      <main>{props.children}</main>
    </>
  );
};
