import React from "react";

import { reverse, templates } from "@reactivated";
import { ButtonGroup, Dropdown, DropdownButton } from "react-bootstrap";

import { format } from "date-fns";

import { Layout } from "@client/components/Layout";
import { NavigationBar } from "@client/components/stockTracker/NavigationBar";

export default function (props: templates.StockTrackerBarcodeSheetsHistory) {
  let currentFieldRepName: string | null = null;
  props.field_representatives.forEach((field_rep) => {
    if (field_rep.pk === props.current_field_rep_id) {
      currentFieldRepName = field_rep.name;
    }
  });

  return (
    <Layout title="Barcode Sheet History" navbar={<NavigationBar />}>
      <section className="mw-rem-60 mx-auto">
        <h1 className="m-3 text-center title-color">Barcode Sheet History</h1>

        <div className="text-center my-3">
          <DropdownButton
            as={ButtonGroup}
            title={currentFieldRepName ?? "Field Rep"}
            variant={"secondary"}>
            {props.field_representatives.map((field_rep, idx) => (
              <Dropdown.Item
                className={field_rep.pk === props.current_field_rep_id ? "active" : ""}
                key={field_rep.pk}
                eventKey={idx}
                href={reverse("stock_tracker:barcode_sheet_history_repid", {
                  field_representative_id: field_rep.pk,
                })}>
                {field_rep.name}
              </Dropdown.Item>
            ))}
          </DropdownButton>
        </div>

        <ol className="p-0">
          {props.recent_barcode_sheets.map((barcode_sheet) => {
            const search_params = `?store-name=${encodeURI(
              barcode_sheet.store.name!
            )}&sheet-type=out-of-dist`;

            return (
              <li key={barcode_sheet.pk} className="card collapse show my-2 text-center">
                <h5 className="card-header">
                  {barcode_sheet.parent_company?.short_name} - Cycle:{" "}
                  {barcode_sheet.work_cycle?.start_date}
                </h5>
                <div className="card-body">
                  <h5 className="card-title mb-3">{barcode_sheet.store.name}</h5>
                  <p className="card-text mb-0">
                    Created on{" "}
                    {format(new Date(barcode_sheet.datetime_created), "MMMM d, yyyy, hh:mm a")}{" "}
                  </p>
                  <p className="card-text">
                    {barcode_sheet.product_additions.length} items in this document
                  </p>
                  <a
                    href={
                      reverse("stock_tracker:get_barcode_sheet", {
                        barcode_sheet_id: barcode_sheet.pk,
                      }) + search_params
                    }
                    className="btn btn-primary">
                    View Barcode Sheet
                  </a>
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </Layout>
  );
}
