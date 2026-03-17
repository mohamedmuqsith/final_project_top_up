
import React from "react";

const StatCard = ({ title, value, icon: Icon, color = "bg-primary" }) => {
  return (
    <div className="stat bg-base-100 rounded-xl shadow-sm border border-base-200">
      <div className="stat-figure text-primary">
        {Icon && <Icon className={`w-8 h-8 ${color.replace('bg-', 'text-')}`} />}
      </div>
      <div className="stat-title">{title}</div>
      <div className="stat-value text-2xl truncate max-w-50" title={value}>{value}</div>
    </div>
  );
};

export default StatCard;
