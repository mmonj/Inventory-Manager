import React, { useContext } from "react";

import { CSRFToken, Context, reverse, templates } from "@reactivated";

export function BarcodeSheetContent(props: templates.LoggerBarcodeSheet) {
  const djangoContext = useContext(Context);

  return (
    <section className="mx-auto my-2 p-2">
      <form
        id="stock-update-form"
        action={reverse("logger:set_carried_product_additions")}
        method="POST">
        <CSRFToken />

        <ul
          id="products-container"
          className="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 row-cols-xl-5 row-cols-xxl-6 mx-auto">
          {/* product-container receives a 'hidden' attribute by default. This will be overridden by the client-side javascript */}

          {props.barcodeSheet.product_additions.map((product_addition, idx) => (
            <li
              key={idx}
              className="col product-container card text-center border-0 my-1"
              data-is_carried={product_addition.is_carried}>
              <div className="new-item-indicator-container mb-1">
                {product_addition.is_new && (
                  <img
                    src={djangoContext.STATIC_URL + "public/logger/images/new_item_icon.png"}
                    alt="New Product Indicator"></img>
                )}
              </div>
              <div className="product-images-container d-flex justify-content-center">
                <div className="barcode-container">
                  <img
                    src={`data:image/png;base64,${product_addition.product.barcode_b64}`}
                    className="barcode-image"
                    alt="Product Barcode"
                  />
                  <div className="upc-number d-flex justify-content-center">
                    {product_addition.product.upc_sections.map((upc_section, idx) => (
                      <span key={idx} className="upc-section mx-1">
                        {upc_section}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="product-image-container">
                  <img
                    src={product_addition.product.item_image_url}
                    className="product-image"
                    alt="Product Image"
                  />
                </div>
              </div>
              <div className="card-body">
                <label className="card-text">{product_addition.product.name}</label>
              </div>
              <input
                name="product-addition-id"
                value={product_addition.id}
                type="checkbox"
                className="form-check-input checkbox-stock-update p-2 visually-hidden"
              />
            </li>
          ))}
        </ul>

        <div className="text-center">
          <input
            type="hidden"
            name="barcode-sheet-id"
            value={props.barcodeSheet.barcode_sheet_id}
          />
          <input type="hidden" name="store-name" value={props.barcodeSheet.store_name} />
          <input
            type="hidden"
            name="parent-company"
            value={props.barcodeSheet.parent_company.short_name}
          />
          <button id="btn-stock-update" type="submit" className="btn btn-primary visually-hidden">
            Submit
          </button>
        </div>
      </form>
    </section>
  );
}
