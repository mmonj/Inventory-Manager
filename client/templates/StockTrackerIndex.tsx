import React from "react";

import { Context, reverse, templates } from "@reactivated";

import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faArrowCircleRight,
  faBarcode,
  faDatabase,
  faExternalLinkAlt,
  faHistory,
  faShieldAlt,
  faStore,
  faUserEdit,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { Layout } from "@client/components/Layout";
import { NavigationBar } from "@client/components/stockTracker/NavigationBar";

interface DashboardCardInfo {
  title: string;
  description: string;
  href: string;
  icon: IconDefinition;
  buttonIcon: IconDefinition;
  buttonLabel: string;
  colorVariant: string;
  buttonVariant: "solid" | "outline";
}

function DashboardCard(props: DashboardCardInfo) {
  const buttonClassName =
    props.buttonVariant === "solid"
      ? `btn btn-${props.colorVariant} btn-lg w-100 mt-3`
      : `btn btn-outline-${props.colorVariant} btn-lg w-100 mt-3`;

  return (
    <div className="col-md-6 col-lg-4">
      <div className="card h-100 border-0 shadow-sm hover-shadow transition">
        <div className="card-body d-flex flex-column p-4">
          <div className="mb-3">
            <div
              className={`bg-${props.colorVariant} bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center`}
              style={{ width: "60px", height: "60px" }}
            >
              <FontAwesomeIcon
                icon={props.icon}
                size="2x"
                className={`text-${props.colorVariant}`}
              />
            </div>
          </div>
          <h5 className="card-title fw-bold mb-2">{props.title}</h5>
          <p className="card-text text-muted flex-grow-1">{props.description}</p>
          <a href={props.href} className={buttonClassName}>
            <FontAwesomeIcon icon={props.buttonIcon} className="me-2" />
            {props.buttonLabel}
          </a>
        </div>
      </div>
    </div>
  );
}

export function Template(_props: templates.StockTrackerIndex) {
  const context = React.useContext(Context);
  const { user } = context;

  const toolCards: DashboardCardInfo[] = [
    {
      title: "Scanner",
      description: "Scan barcodes in-store to quickly log which products a store carries",
      href: reverse("stock_tracker:scanner"),
      icon: faBarcode,
      buttonIcon: faArrowCircleRight,
      buttonLabel: "Open Scanner",
      colorVariant: "primary",
      buttonVariant: "solid",
    },
    {
      title: "Scan History",
      description: "View previously scanned and recorded product additions",
      href: reverse("stock_tracker:scan_history"),
      icon: faHistory,
      buttonIcon: faHistory,
      buttonLabel: "View Scan History",
      colorVariant: "success",
      buttonVariant: "outline",
    },
    {
      title: "Barcode Sheets",
      description: "View barcode sheets documenting which products were surveyed at each store",
      href: reverse("stock_tracker:barcode_sheet_history"),
      icon: faBarcode,
      buttonIcon: faBarcode,
      buttonLabel: "View Barcode Sheets",
      colorVariant: "info",
      buttonVariant: "outline",
    },
    {
      title: "Manager Update Form",
      description: "Update store manager contact names",
      href: reverse("stock_tracker:get_manager_names"),
      icon: faUserEdit,
      buttonIcon: faUserEdit,
      buttonLabel: "Update Manager Names",
      colorVariant: "secondary",
      buttonVariant: "outline",
    },
  ];

  const adminCards: DashboardCardInfo[] = [
    {
      title: "Add New Stores",
      description: "Bulk-add new store records to the database",
      href: reverse("stock_tracker:add_new_stores"),
      icon: faStore,
      buttonIcon: faStore,
      buttonLabel: "Add New Stores",
      colorVariant: "danger",
      buttonVariant: "outline",
    },
  ];

  return (
    <Layout
      title="Inventory Tracker Dashboard"
      navbar={<NavigationBar />}
      className="container-fluid py-5"
    >
      <div className="row justify-content-center">
        <div className="col-lg-10 col-xl-9">
          {/* Header Section */}
          <div className="text-center mb-5">
            <h1 className="display-4 fw-bold mb-3">Inventory Tracker Dashboard</h1>
            <p className="lead text-muted">Scan, track, and manage store product inventory</p>
          </div>

          {/* Main Section */}
          <div className="mb-5">
            <h3 className="h5 text-secondary mb-3">
              <FontAwesomeIcon icon={faBarcode} className="me-2" />
              Tools
            </h3>
            <div className="row g-4">
              {toolCards.map((card) => (
                <DashboardCard key={card.title} {...card} />
              ))}
            </div>
          </div>

          {user.is_superuser && (
            <>
              {/* Administrative Tools Section */}
              <div className="mb-4">
                <h3 className="h5 text-secondary mb-3">
                  <FontAwesomeIcon icon={faShieldAlt} className="me-2" />
                  Administrative Tools
                </h3>
                <div className="row g-4">
                  {adminCards.map((card) => (
                    <DashboardCard key={card.title} {...card} />
                  ))}
                </div>
              </div>

              {/* Django Admin Section */}
              <div className="mb-4">
                <h3 className="h5 text-secondary mb-3">
                  <FontAwesomeIcon icon={faDatabase} className="me-2" />
                  System Administration
                </h3>
                <div
                  className="card border-0 shadow-sm hover-shadow transition border-warning"
                  style={{ borderWidth: "2px !important" }}
                >
                  <div className="card-body d-flex align-items-center p-4">
                    <div className="me-4">
                      <div
                        className="bg-warning bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center"
                        style={{ width: "70px", height: "70px" }}
                      >
                        <FontAwesomeIcon icon={faDatabase} size="2x" className="text-warning" />
                      </div>
                    </div>
                    <div className="flex-grow-1">
                      <h5 className="card-title fw-bold mb-2">Django Admin Panel</h5>
                      <p className="card-text text-muted mb-0">
                        Access the Django administration panel for full system control and database
                        management
                      </p>
                    </div>
                    <div className="ms-4">
                      <a
                        href="/admin"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-warning btn-lg"
                      >
                        <FontAwesomeIcon icon={faExternalLinkAlt} className="me-2" />
                        Open Django Admin
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        .hover-shadow {
          transition: box-shadow 0.3s ease-in-out, transform 0.3s ease-in-out;
        }
        .hover-shadow:hover {
          box-shadow: 0 0.5rem 1.5rem rgba(0, 0, 0, 0.15) !important;
          transform: translateY(-5px);
        }
        .transition {
          transition: all 0.3s ease-in-out;
        }
      `}</style>
    </Layout>
  );
}
