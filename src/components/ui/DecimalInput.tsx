"use client";

import type { InputHTMLAttributes } from "react";

type DecimalInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange" | "inputMode"
> & {
  value: string;
  onChange: (value: string) => void;
  integer?: boolean;
};

export function DecimalInput({
  value,
  onChange,
  integer = false,
  ...rest
}: DecimalInputProps) {
  const allowed = integer ? /^\d*$/ : /^\d*\.?\d*$/;

  return (
    <input
      {...rest}
      type="text"
      inputMode={integer ? "numeric" : "decimal"}
      autoComplete="off"
      value={value}
      onChange={(e) => {
        const next = e.target.value.replace(/,/g, "");
        if (allowed.test(next)) onChange(next);
      }}
    />
  );
}
