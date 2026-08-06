const MARKER_PIN_PATH =
  "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z";

// Icon.anchor is typed against the google.maps.Point *class* (which requires an equals()
// method), but the Maps runtime accepts a plain {x, y} object just fine - a known gap in
// @types/google.maps, hence the `as` cast rather than `satisfies`.
function getMarkerPinIcon(fillColor: string, strokeColor: string): google.maps.Symbol {
  return {
    path: MARKER_PIN_PATH,
    fillColor,
    fillOpacity: 1,
    strokeColor,
    strokeWeight: 1,
    scale: 1.5,
    anchor: { x: 12, y: 22 } as google.maps.Point,
  };
}

export const SERVICE_ORDER_MARKER_ICON = getMarkerPinIcon("#22c55e", "#15803d");
export const REP_ADDRESS_MARKER_ICON = getMarkerPinIcon("#c052f3", "#b535f1");

// Classic Google "My Location" blue-dot look - a plain circle rather than the pin shape used
// for the other markers, so it reads as "you are here" instead of a place.
export const CURRENT_LOCATION_MARKER_ICON: google.maps.Symbol = {
  path: 0, // google.maps.SymbolPath.CIRCLE - referenced as a literal since the enum itself
  // isn't available until the Maps JS API script has loaded.
  fillColor: "#4285f4",
  fillOpacity: 1,
  strokeColor: "#ffffff",
  strokeWeight: 2,
  scale: 8,
};
