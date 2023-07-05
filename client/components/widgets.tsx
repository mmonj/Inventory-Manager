import React from "react";

import { Types } from "reactivated/dist/generated";

import {
  PreliminarySelectProps,
  PreliminaryTextAreaProps,
  SelectProps,
  TextAreaProps,
} from "@client/types";

export type CoreWidget = Types["Widget"];

export const CheckboxInput = (props: {
  name: string;
  className?: string;
  value: true | false;
  onChange: (value: boolean) => void;
}) => {
  return (
    <input
      type="checkbox"
      name={props.name}
      className={props.className}
      checked={props.value}
      onChange={(event) => props.onChange(event.target.checked)}
    />
  );
};

export const TextInput = (props: {
  name: string;
  className?: string;
  value: string | null;
  onChange: (value: string) => void;
}) => {
  return (
    <input
      type="text"
      name={props.name}
      className={props.className}
      value={props.value ?? ""}
      onChange={(event) => props.onChange(event.target.value)}
    />
  );
};

export const Select = (props: PreliminarySelectProps) => {
  // eslint-disable-next-line unused-imports/no-unused-vars
  const { template_name, attrs, tag, is_hidden, optgroups, ...finalProps } = {
    ...props,
    ...props.attrs,
    value: props.value ?? "",
  };

  return (
    <select {...(finalProps satisfies SelectProps)}>
      {props.optgroups.map((optgroup) => {
        const optgroupValue = (optgroup[1][0].value ?? "").toString();
        return (
          <option key={optgroupValue} value={optgroupValue}>
            {optgroup[1][0].label}
          </option>
        );
      })}
    </select>
  );
};

export const Textarea = (props: PreliminaryTextAreaProps) => {
  // eslint-disable-next-line unused-imports/no-unused-vars
  const { template_name, attrs, tag, is_hidden, ...finalProps } = {
    ...props,
    ...props.attrs,
    value: props.value ?? "",
    cols: parseInt(props.attrs.cols),
    rows: parseInt(props.attrs.rows),
  };

  return <textarea {...(finalProps satisfies TextAreaProps)} />;
};
