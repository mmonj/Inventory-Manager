import React from "react";

import { templates } from "@reactivated";
import { Button, Form, Modal } from "react-bootstrap";

import { getBrandCompanyLabel } from "@client/util/stockTracker";

type TBrandParentCompany = templates.StockTrackerScanHistory["brand_parent_companies"][number];

interface Props {
  show: boolean;
  onHide: () => void;
  brandCompanies: TBrandParentCompany[];
  selectedBrandCompanyIds: Set<number>;
  onChangeBrandCompanyIds: (brandCompanyIds: Set<number>) => void;
  productNameSearchInput: string;
  onChangeProductNameSearchInput: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

export function ScanHistoryFiltersModal(props: Props) {
  const { brandCompanies, selectedBrandCompanyIds, onChangeBrandCompanyIds } = props;

  function toggleBrandCompany(brandCompanyId: number) {
    const next = new Set(selectedBrandCompanyIds);
    if (next.has(brandCompanyId)) {
      next.delete(brandCompanyId);
    } else {
      next.add(brandCompanyId);
    }
    onChangeBrandCompanyIds(next);
  }

  return (
    <Modal show={props.show} onHide={props.onHide} backdrop="static" centered>
      <Modal.Header closeButton>
        <Modal.Title>Filters</Modal.Title>
      </Modal.Header>
      <form onSubmit={props.onSubmit}>
        <Modal.Body>
          <Form.Label htmlFor="scan-history-product-name-search">Search by product name</Form.Label>
          <Form.Control
            id="scan-history-product-name-search"
            type="search"
            className="mb-4"
            placeholder="Search by product name..."
            value={props.productNameSearchInput}
            onChange={(event) => props.onChangeProductNameSearchInput(event.target.value)}
          />

          <p className="mb-2">Filter by Client</p>
          {brandCompanies.length === 0 && <div className="text-muted">No clients available.</div>}
          {brandCompanies.map((brandCompany) => (
            <Form.Check
              key={brandCompany.pk}
              type="checkbox"
              id={`brand-company-filter-${brandCompany.pk}`}
              label={getBrandCompanyLabel(brandCompany)}
              checked={selectedBrandCompanyIds.has(brandCompany.pk)}
              onChange={() => toggleBrandCompany(brandCompany.pk)}
              className="mb-2"
            />
          ))}
        </Modal.Body>
        <Modal.Footer>
          <Button type="submit" variant="primary">
            Search
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
