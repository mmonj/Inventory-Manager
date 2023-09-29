import React, { useContext } from "react";

import { CSRFToken, Context, reverse, templates } from "@reactivated";
import { Button } from "react-bootstrap";

interface Props extends templates.StockTrackerBarcodeSheet {
  isEditMode: boolean;
}

export function BarcodeSheetContent(props: Props) {
  const [isDistributionUpdate, setIsDistributionUpdate] = React.useState(true);
  const djangoContext = useContext(Context);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.target as HTMLFormElement);
    const allProductAdditionIds = formData.getAll("product-addition-id");

    if (allProductAdditionIds.length === 0) {
      event.preventDefault();
      alert("You must pick at least one item");
      return;
    }

    if (!isDistributionUpdate) {
      const isAccept = confirm(
        `You have marked ${allProductAdditionIds.length} item(s) as ordered. Are you sure?`
      );
      if (!isAccept) {
        event.preventDefault();
        return;
      }
    }
  }

  return (
    <section className="mx-auto my-2 p-2 pb-4">
      <form onSubmit={handleSubmit} id="stock-update-form" method="POST">
        <CSRFToken />

        <ul
          id="products-container"
          className="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 row-cols-xl-5 row-cols-xxl-6 mx-auto"
        >
          {/* product-container receives a 'hidden' attribute by default. This will be overridden by the client-side javascript */}

          {props.barcodeSheet.product_additions.map((product_addition, idx) => (
            <li
              key={idx}
              className="col product-container card text-center border-0 my-1"
              data-is_carried={product_addition.is_carried}
            >
              <div className="new-item-indicator-container mb-1">
                {product_addition.is_new && (
                  <img
                    src={djangoContext.STATIC_URL + "public/stock_tracker/images/new_item_icon.png"}
                    alt="New Product Indicator"
                  ></img>
                )}
                {product_addition.date_ordered !== null && (
                  <img
                    src={djangoContext.STATIC_URL + "public/stock_tracker/images/ordered_icon.png"}
                    alt="Item Previously Ordered"
                  ></img>
                )}
              </div>
              <div className="product-images-container d-flex justify-content-center">
                <div className="barcode-container">
                  <img
                    src={`data:image/png;base64,${product_addition.product.barcode_b64}`}
                    className="barcode-image"
                    alt="Product Barcode"
                  />
                  <div className="d-flex justify-content-center">
                    <div className="upc-number">
                      {product_addition.product.upc_sections.map((upc_section, idx) => (
                        <span key={idx} className="upc-section mx-1">
                          {upc_section}
                        </span>
                      ))}
                    </div>
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
              {props.isEditMode && (
                <input
                  name="product-addition-id"
                  value={product_addition.id}
                  type="checkbox"
                  className="form-check-input checkbox-stock-update p-2"
                />
              )}
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
          {props.isEditMode && (
            <Button
              onClick={() => setIsDistributionUpdate(() => true)}
              id="btn-stock-update"
              type="submit"
              formAction={reverse("stock_tracker:set_carried_product_additions")}
              variant="primary"
              className="mx-3 my-2"
            >
              Submit as In-Distribution
            </Button>
          )}
          {props.isEditMode && (
            <Button
              onClick={() => setIsDistributionUpdate(() => false)}
              id="btn-stock-order"
              type="submit"
              variant="primary"
              className="mx-3 my-2"
              formAction={reverse("stock_tracker:set_product_distribution_order_status")}
            >
              Submit as ordered
            </Button>
          )}
        </div>
      </form>
    </section>
  );
}
