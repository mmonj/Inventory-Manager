import React from "react";

interface Props {
  className?: string;
}

export function CurrentCheckIn({ className = "" }: Props) {
  return <div className={`${className} `}>Current Check-In</div>;
}
