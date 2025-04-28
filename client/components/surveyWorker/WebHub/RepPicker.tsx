import React from "react";

import { MvRepDetail_3A2416Df6E } from "@reactivated";
import { useNavigate } from "react-router-dom";

interface Props {
  mv_reps_detail: MvRepDetail_3A2416Df6E[];
}

export function RepPicker(props: Props) {
  const [selectedMvRepDetail, setSelectedMvRepDetail] =
    React.useState<MvRepDetail_3A2416Df6E | null>(null);
  const navigate = useNavigate();

  function handleSelectedMvrepDetailChange(event: React.ChangeEvent<HTMLSelectElement>) {
    if (event.target.value === "") {
      return;
    }

    const mvRepDetail = props.mv_reps_detail.find(
      (mvRepDetail) => mvRepDetail.id === parseInt(event.target.value)
    );

    setSelectedMvRepDetail(() => mvRepDetail!);
  }

  function handleEnterRepHub(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedMvRepDetail === null) {
      throw new Error("selectedMvRepDetail is null");
    }

    navigate(`/RepHub/${selectedMvRepDetail.id}`);
  }

  return (
    <>
      <form onSubmit={handleEnterRepHub} className="mb-2">
        <label className="form-label">Select a Field Rep</label>
        <select
          className="form-select"
          defaultValue={""}
          onChange={handleSelectedMvrepDetailChange}
          required
        >
          <option value="" disabled>
            Select a Field Rep
          </option>
          {props.mv_reps_detail.map((mvRepDetail) => (
            <option key={mvRepDetail.id} value={mvRepDetail.id}>
              {mvRepDetail.field_representative.name}
            </option>
          ))}
        </select>
        <button type="submit" className="btn btn-primary my-2">
          Enter Rep&apos;s WebHub
        </button>
      </form>
    </>
  );
}
