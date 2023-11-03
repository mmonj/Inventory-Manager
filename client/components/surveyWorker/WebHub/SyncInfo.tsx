import React from "react";

interface Props {
  className?: string;
}

export function SyncInfo({ className = "" }: Props) {
  return (
    <>
      <div
        className={className + " " + "text-center border rounded p-2 rephub-top-action-elements"}
      >
        <label className="fw-bold mb-3">Last Syncced</label>
        <p>1 hr 30 min ago</p>
      </div>
    </>
  );
}
