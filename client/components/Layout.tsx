import React from "react";

import { Context } from "@reactivated";

import { ContribMessages } from "./ContribMessages";

interface IExternalStyles {
  src: string;
  integrity?: string;
}

interface Props {
  title: string;
  children: React.ReactNode;
  navbar: React.JSX.Element;
  className?: string;
  extraExternalStyles?: IExternalStyles[];
  bsTheme?: "light" | "dark";
}

export const Layout = ({ bsTheme = "light", ...props }: Props) => {
  const djangoContext = React.useContext(Context);

  return (
    <html data-bs-theme={bsTheme}>
      <head>
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
};
