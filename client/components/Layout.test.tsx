import React from "react";
import { renderToString } from "react-dom/server";

import { describe, expect, it } from "vitest";

import { Context } from "@reactivated";

import { Layout } from "@client/components/Layout";

type TContextValue = React.ContextType<typeof Context>;

function renderLayoutWithQtMode(qtMode: TContextValue["qt_mode"]): string {
  const contextValue = {
    STATIC_URL: "/static/",
    messages: [],
    qt_mode: qtMode,
  } as unknown as TContextValue;

  return renderToString(
    <Context.Provider value={contextValue}>
      <Layout title="Test page" navbar={<nav />}>
        <p>page body</p>
      </Layout>
    </Context.Provider>
  );
}

function textOf(html: string): string {
  return html.replace(/<!-- -->/g, "");
}

describe("Layout's Qt mode banner", () => {
  it("says Qt is fake while the live window is closed", () => {
    const html = textOf(renderLayoutWithQtMode({ mode: "fake", live_until_time: null }));

    expect(html).toContain("Qt: fake");
    expect(html).not.toContain("LIVE");
  });

  it("says Qt is live until the window's end time while it's open", () => {
    const html = textOf(renderLayoutWithQtMode({ mode: "live", live_until_time: "12:10" }));

    expect(html).toContain("Qt: LIVE until 12:10");
    expect(html).not.toContain("Qt: fake");
  });

  it("shows no banner in production", () => {
    const html = textOf(renderLayoutWithQtMode(null));

    expect(html).not.toContain("Qt:");
  });
});
