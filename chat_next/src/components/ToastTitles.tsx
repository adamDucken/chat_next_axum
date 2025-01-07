import React from "react";
import { CircleCheckBig, CircleAlert } from "lucide-react";

type TitleProps = {
  title: string;
};

export const SuccessTitle: React.FC<TitleProps> = ({ title }) => (
  <div className="flex items-center space-x-2">
    <CircleCheckBig className="w-6 h-6 text-green-600" />
    <span className="text-green-600 font-semibold">{title}</span>
  </div>
);

export const ErrorTitle: React.FC<TitleProps> = ({ title }) => (
  <div className="flex items-center space-x-2">
    <CircleAlert className="w-6 h-6 text-red-600" />
    <span className="text-red-600 font-semibold">{title}</span>
  </div>
);
