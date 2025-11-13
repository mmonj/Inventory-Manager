import React from "react";

import { Context } from "@reactivated";
import { Helmet } from "react-helmet-async";

import { ContribMessages } from "./ContribMessages";

interface IExternalStyles {
  src: string;
  integrity?: string;
}

interface Props {
  title: string;
  children: React.ReactNode;
  navbar: JSX.Element;
  className?: string;
  extraStyles?: string[];
  extraExternalStyles?: IExternalStyles[];
  excludeBsBodyOverrides?: boolean;
}

export const Layout = ({ extraStyles = [], excludeBsBodyOverrides = false, ...props }: Props) => {
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
          crossOrigin="anonymous"
        ></link>

        <link
          rel="stylesheet"
          type="text/css"
          href={`${djangoContext.STATIC_URL}styles/bs-navbar-overrides.css`}
        />
        <link
          rel="stylesheet"
          type="text/css"
          href={`${djangoContext.STATIC_URL}styles/shared.css`}
        />
        <link
          rel="stylesheet"
          type="text/css"
          href={`${djangoContext.STATIC_URL}styles/survey_worker/styles.css`}
        />

        {!excludeBsBodyOverrides && (
          <link
            rel="stylesheet"
            type="text/css"
            href={`${djangoContext.STATIC_URL}styles/bs-overrides.css`}
          />
        )}

        {extraStyles.map((staticBasePath, idx) => (
          <link
            key={idx}
            rel="stylesheet"
            type="text/css"
            href={djangoContext.STATIC_URL + staticBasePath}
          />
        ))}

        {props.extraExternalStyles?.map((style, idx) => (
          <link
            key={idx}
            rel="stylesheet"
            href={style.src}
            integrity={style.integrity}
            crossOrigin=""
          />
        ))}

        <script defer crossOrigin="anonymous" src={`${djangoContext.STATIC_URL}dist/index.js`} />
      </Helmet>
      <header>{props.navbar}</header>
      <main className={props.className}>
        <ContribMessages />
        {props.children}
      </main>
    </>
  );
};
