import React from "react";
import PropTypes from "prop-types";
import * as lucide from "lucide-react";

export const LucideIcon = ({ name, className = "" }) => {
  const IconComponent = lucide[name];
  if (!IconComponent) return <span aria-hidden="true" />;
  return <IconComponent className={className} aria-hidden="true" />;
};

LucideIcon.propTypes = {
  name: PropTypes.string.isRequired,
  className: PropTypes.string,
};
