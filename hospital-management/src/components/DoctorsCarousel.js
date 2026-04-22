"use client";

import { useRef, useEffect, useMemo } from "react";

export function DoctorsCarousel() {
  const doctors = useMemo(
    () => [
      {
        name: "Dr. Priya Sharma",
        spec: "Cardiologist",
        img: "https://cdn-icons-png.flaticon.com/512/387/387564.png",
      },
      {
        name: "Dr. Arjun Patel",
        spec: "Neurologist",
        img: "https://cdn-icons-png.flaticon.com/512/387/387561.png",
      },
      {
        name: "Dr. Neha Kapoor",
        spec: "Pediatrician",
        img: "https://cdn-icons-png.flaticon.com/512/706/706164.png",
      },
      {
        name: "Dr. Rohan Das",
        spec: "Orthopedic Surgeon",
        img: "https://cdn-icons-png.flaticon.com/512/706/706178.png",
      },
      {
        name: "Dr. Sneha Iyer",
        spec: "Dermatologist",
        img: "https://cdn-icons-png.flaticon.com/512/4140/4140037.png",
      },
      {
        name: "Dr. Aditya Mehta",
        spec: "Oncologist",
        img: "https://cdn-icons-png.flaticon.com/512/4140/4140057.png",
      },
      {
        name: "Dr. Kavita Rao",
        spec: "Gynecologist",
        img: "https://cdn-icons-png.flaticon.com/512/4151/4151022.png",
      },
      {
        name: "Dr. Manish Khanna",
        spec: "Radiologist",
        img: "https://cdn-icons-png.flaticon.com/512/4151/4151020.png",
      },
      {
        name: "Dr. Alisha Verma",
        spec: "Psychiatrist",
        img: "https://cdn-icons-png.flaticon.com/512/4151/4151027.png",
      },
      {
        name: "Dr. Rajiv Nair",
        spec: "General Surgeon",
        img: "https://cdn-icons-png.flaticon.com/512/4151/4151033.png",
      },
    ],
    []
  );

  // triple the list to simulate infinite scroll
  const doctorsLoop = useMemo(
    () => [...doctors, ...doctors, ...doctors],
    [doctors]
  );

  const trackRef = useRef(null);
  const isHover = useRef(false);
  const isDrag = useRef(false);
  const startX = useRef(0);
  const startScroll = useRef(0);
  const raf = useRef(null);
  const speed = useRef(0.5);

  // auto scroll
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const seg = el.scrollWidth / 3;
    el.scrollLeft = seg;
    const tick = () => {
      if (!isHover.current && !isDrag.current) el.scrollLeft += speed.current;
      if (el.scrollLeft >= seg * 2) el.scrollLeft -= seg;
      if (el.scrollLeft <= 0) el.scrollLeft += seg;
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, []);

  // drag logic
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    const down = (e) => {
      isDrag.current = true;
      startX.current = e.clientX;
      startScroll.current = el.scrollLeft;
      el.classList.add("dragging");
    };
    const move = (e) => {
      if (!isDrag.current) return;
      const dx = e.clientX - startX.current;
      el.scrollLeft = startScroll.current - dx;
    };
    const up = () => {
      isDrag.current = false;
      el.classList.remove("dragging");
    };
    const enter = () => (isHover.current = true);
    const leave = () => (isHover.current = false);

    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    el.addEventListener("mouseenter", enter);
    el.addEventListener("mouseleave", leave);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      el.removeEventListener("mouseenter", enter);
      el.removeEventListener("mouseleave", leave);
    };
  }, []);

  return (
    <div
      ref={trackRef}
      className="mt-6 flex gap-6 overflow-x-auto scrollbar-hide cursor-grab active:cursor-grabbing select-none"
    >
      {doctorsLoop.map((doc, i) => (
        <div
          key={`${doc.name}-${i}`}
          className="shrink-0 w-[70vw] sm:w-[45vw] md:w-[30vw] lg:w-[22vw] xl:w-[18vw] bg-white rounded-2xl shadow-md hover:-translate-y-1 transition-transform duration-300 flex flex-col items-center p-4"
        >
          <img
            src={doc.img}
            alt={doc.name}
            className="w-28 h-28 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-blue-300 mb-4"
          />
          <h3 className="text-base sm:text-lg font-semibold text-blue-700 text-center">
            {doc.name}
          </h3>
          <p className="text-gray-600 text-sm text-center">{doc.spec}</p>
        </div>
      ))}
    </div>
  );
}
