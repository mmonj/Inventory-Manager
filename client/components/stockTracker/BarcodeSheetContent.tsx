import React, { useContext } from "react";

import { CSRFToken, Context, reverse, templates } from "@reactivated";
import { Button } from "react-bootstrap";

type TProductAddition =
  templates.StockTrackerBarcodeSheet["barcodeSheet"]["product_additions"][number];

interface Props extends templates.StockTrackerBarcodeSheet {
  visibleProductAdditions: TProductAddition[];
  isEditMode: boolean;
}

interface SubmitAction {
  id: string;
  label: string;
  formAction: string;
  // Message to confirm() before submitting, or null to submit without confirming. Only
  // "Submit as ordered" currently asks for confirmation.
  confirmMessage: ((itemCount: number) => string) | null;
}

function getSubmitActions(props: Props): SubmitAction[] {
  if (!props.isEditMode) {
    return [];
  }

  if (props.sheetTypeInfo.sheetType === "out-of-dist") {
    return [
      {
        id: "btn-stock-update",
        label: "Submit as In-Distribution",
        formAction: reverse("stock_tracker:set_carried_product_additions"),
        confirmMessage: null,
      },
      {
        id: "btn-stock-order",
        label: "Submit as ordered",
        formAction: reverse("stock_tracker:set_product_distribution_order_status"),
        confirmMessage: (itemCount) =>
          `You have marked ${itemCount} item(s) as ordered. Are you sure?`,
      },
    ];
  }

  if (props.sheetTypeInfo.sheetType === "in-dist") {
    return [
      {
        id: "btn-stock-uncarry",
        label: "Submit as Not-Carried",
        formAction: reverse("stock_tracker:set_not_carried_product_additions"),
        confirmMessage: null,
      },
    ];
  }

  return [];
}

export function BarcodeSheetContent(props: Props) {
  const djangoContext = useContext(Context);
  const [selectedAction, setSelectedAction] = React.useState<SubmitAction | null>(null);
  const submitActions = getSubmitActions(props);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.target as HTMLFormElement);
    const allProductAdditionIds = formData.getAll("product-addition-id");

    if (allProductAdditionIds.length === 0) {
      event.preventDefault();
      alert("You must pick at least one item");
      return;
    }

    if (selectedAction?.confirmMessage != null) {
      const isAccept = confirm(selectedAction.confirmMessage(allProductAdditionIds.length));
      if (!isAccept) {
        event.preventDefault();
        return;
      }
    }
  }

  if (props.visibleProductAdditions.length === 0) {
    return (
      <section className="mx-auto my-2 p-2 pb-4 text-center py-5">
        <div className="text-muted">
          <i className="fs-1 mb-3 d-block">📋</i>
          <h4>No products match this filter</h4>
          <p>No items on this sheet are currently {props.sheetTypeInfo.sheetTypeVerbose}.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto my-2 p-2 pb-4">
      <form onSubmit={handleSubmit} id="stock-update-form" method="POST">
        <CSRFToken />

        <ul className="products-container row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 row-cols-xl-5 row-cols-xxl-6 mx-auto">
          {/* product-container receives a 'hidden' attribute by default. This will be overridden by the client-side javascript */}

          {props.visibleProductAdditions.map((product_addition, idx) => (
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
          {submitActions.map((action) => (
            <Button
              key={action.id}
              onClick={() => setSelectedAction(action)}
              id={action.id}
              type="submit"
              formAction={action.formAction}
              variant="primary"
              className="mx-3 my-2"
            >
              {action.label}
            </Button>
          ))}
        </div>
      </form>
    </section>
  );
}
