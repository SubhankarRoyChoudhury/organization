"use client";

import React, { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const SuccessDialog = ({ open, onClose, message }) => {
  useEffect(() => {
    if (open) {
      const timeout = setTimeout(() => {
        createConfetti();
      }, 100); // wait for dialog DOM to render
      return () => clearTimeout(timeout);
    }
  }, [open]);

  const createConfetti = () => {
    const container = document.getElementById("confetti-container");

    if (!container) {
      console.error("Confetti container not found!");
      return;
    }

    const colors = ["#4ade80", "#3b82f6", "#f59e0b", "#ec4899", "#8b5cf6"];
    container.innerHTML = "";

    for (let i = 0; i < 60; i++) {
      const confetti = document.createElement("div");
      confetti.className = "confetti";

      const size = Math.random() * 10 + 6;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const angle = Math.random() * 2 * Math.PI; // Random direction (radians)
      const distance = Math.random() * 150 + 50; // How far they travel
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;

      confetti.style.width = `${size}px`;
      confetti.style.height = `${size}px`;
      confetti.style.backgroundColor = color;
      confetti.style.borderRadius = Math.random() > 0.5 ? "50%" : "20%";
      confetti.style.position = "absolute";
      confetti.style.top = "50%";
      confetti.style.left = "50%";
      confetti.style.transform = `translate(-50%, -50%)`;
      confetti.style.setProperty("--x", `${x}px`);
      confetti.style.setProperty("--y", `${y}px`);
      confetti.style.animation = `burst 1.5s ease-out forwards`;
      confetti.style.animationDelay = `${Math.random() * 0.5}s`;

      container.appendChild(confetti);
    }
  };

  const handleClose = () => {
    onClose();
    // const dialog = document.querySelector(".success-dialog");
    // dialog.style.animation = "scaleIn 0.5s reverse forwards";

    setTimeout(() => {}, 500);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      className="p-0"
      overlayClassName="custom-dialog-overlay"
    >
      <DialogContent
        className="custom-dialog-content bg-white p-0"
        style={{
          maxHeight: "90vh",
          maxWidth: "500px",
          overflowY: "auto",
          padding: "0px",
        }}
      >
        <DialogHeader style={{ display: "none" }}>
          <DialogTitle></DialogTitle>
        </DialogHeader>
        <DialogDescription asChild className="p-0">
          <div className="dialog-container">
            <div className="bg-gradient-to-br from-green-200 to-green-200 p-4 relative overflow-hidden">
              <div className="flex flex-col items-center text-center">
                <div className="relative w-32 h-32 mb-6">
                  <svg className="w-full h-full" viewBox="0 0 100 100">
                    <circle
                      className="circle"
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="#4ade80"
                      strokeWidth="8"
                      strokeLinecap="round"
                    />
                    <path
                      className="check"
                      d="M30,50 L45,65 L70,35"
                      fill="none"
                      stroke="#4ade80"
                      strokeWidth="8"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-24 h-24 bg-green-100 rounded-full opacity-30 animate-ping"></div>
                  </div>
                </div>
                <p className="text-2xl text-gray-800 font-bold mb-6">
                  {message}
                </p>
                <button
                  id="closeBtn"
                  onClick={handleClose}
                  className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
                >
                  Continue
                </button>
              </div>
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-400 to-green-600"></div>
              <div
                id="confetti-container"
                className="absolute inset-0 overflow-hidden pointer-events-none"
              ></div>
            </div>

            <style jsx>{`
              @keyframes burst {
                0% {
                  transform: translate(-50%, -50%) scale(1);
                  opacity: 1;
                }
                100% {
                  transform: translate(
                      calc(-50% + var(--x)),
                      calc(-50% + var(--y))
                    )
                    scale(0.7);
                  opacity: 0;
                }
              }

              #confetti-container {
                position: absolute;
                inset: 0;
                overflow: hidden;
                pointer-events: none;
              }

              .confetti {
                position: absolute;
                animation: burst 1.5s ease-out forwards;
              }
            `}</style>
          </div>
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
};

export default SuccessDialog;
