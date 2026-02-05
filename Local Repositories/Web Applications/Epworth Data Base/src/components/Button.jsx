import React from "react";
import PropTypes from "prop-types";
import { LucideIcon } from "./LucideIcon";

export const Button = ({
  children,
  onClick,
  variant = "primary",
  className = "",
  iconName,
  disabled = false,
  title = "",
  type = "button",
}) => {
  const baseStyle =
    "flex items-center justify-center px-4 py-3 sm:px-5 md:px-6 md:py-4 min-h-[44px] md:min-h-[48px] touch-manipulation text-sm sm:text-base rounded-lg font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary:
      "bg-[var(--brand-navy)] text-white hover:bg-[var(--brand-navy-700)] focus:ring-[var(--brand-navy)] shadow-sm",
    secondary: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-gray-500 shadow-sm",
    danger: "bg-red-50 text-red-700 hover:bg-red-100 focus:ring-red-500 border border-red-200",
    ghost: "text-gray-500 hover:text-gray-700 hover:bg-gray-100",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${className}`}
      title={title}
    >
      {iconName && <LucideIcon name={iconName} className="w-5 h-5 md:w-6 md:h-6 mr-2" />}
      {children}
    </button>
  );
};

Button.propTypes = {
  children: PropTypes.node,
  onClick: PropTypes.func,
  variant: PropTypes.oneOf(["primary", "secondary", "danger", "ghost"]),
  className: PropTypes.string,
  iconName: PropTypes.string,
  disabled: PropTypes.bool,
  title: PropTypes.string,
  type: PropTypes.string,
};
