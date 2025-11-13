import React, { useEffect } from "react";

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
  bsTheme?: "light" | "dark";
}

export const Layout = ({ extraStyles = [], bsTheme = "light", ...props }: Props) => {
  const djangoContext = React.useContext(Context);

  useEffect(() => {
    document.documentElement.setAttribute("data-bs-theme", bsTheme);
  }, []);

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
          href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css"
          rel="stylesheet"
          integrity="sha384-sRIl4kxILFvY47J16cr9ZwB07vP4J8+LH7qKQnuqkuIAvNWLzeN8tE5YBujZqJLB"
          crossOrigin="anonymous"
        />

        <link
          rel="stylesheet"
          type="text/css"
          href={`${djangoContext.STATIC_URL}styles/bs-dark/bootstrap.css`}
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
