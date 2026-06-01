import React from "react";
import clsx from "clsx";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "success" | "danger" | "warning";
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = "default",
  children,
  ...props
}) => {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold transition-colors",
        {
          "bg-gray-100 text-gray-800": variant === "default",
          "bg-gray-200 text-gray-600": variant === "secondary",
          "bg-green-100 text-green-800": variant === "success",
          "bg-red-100 text-red-800": variant === "danger",
          "bg-yellow-100 text-yellow-800": variant === "warning",
        },
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
