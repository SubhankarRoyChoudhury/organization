import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";

const ErrorDialog = ({ open, onClose, message }) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in-0 zoom-in-95 duration-300 border border-red-100"
        showCloseButton={false}
      >
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-3">
            <div className="bg-red-100 text-red-600 p-2 rounded-full">
              <AlertTriangle className="h-6 w-6 animate-bounce" />
            </div>
            <DialogTitle className="text-lg font-semibold text-gray-900">
              Error
            </DialogTitle>
          </div>
        </div>

        <DialogDescription asChild>
          <div className="mt-4 text-gray-700">
            <p className="text-base leading-relaxed whitespace-pre-line">
              {message}
            </p>
            <div className="mt-6 flex justify-end">
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-lg bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-red-300 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
};

export default ErrorDialog;
