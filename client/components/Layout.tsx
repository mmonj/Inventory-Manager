import React, { type JSX } from "react";

import { Context } from "@reactivated";

import { ContribMessages } from "@client/components/ContribMessages";

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

export function Layout({ bsTheme = "light", extraStyles = [], ...props }: Props) {
  const djangoContext = React.useContext(Context);

  return (
    <html lang="en" data-bs-theme={bsTheme}>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />

        <title>{props.title}</title>

        <link
          rel="icon"
          type="image/x-icon"
          href={`${djangoContext.STATIC_URL}public/favicon.png`}
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
      </head>
      <body>
        <header>{props.navbar}</header>
        <main className={props.className}>
          <ContribMessages />
          {props.children}
        </main>
      </body>
    </html>
  );
}
