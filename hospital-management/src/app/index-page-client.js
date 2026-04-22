"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";
import { DoctorsCarousel } from "@/components/DoctorsCarousel";

export default function IndexPage() {
  const [active, setActive] = useState("home");
  const [isMobileOpen, setMobileOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (!el) return;

    const header = document.getElementById("site-header");
    const headerHeight = header?.offsetHeight ?? 0;
    const extraGap = window.innerWidth < 640 ? 32 : 16;
    const top =
      el.getBoundingClientRect().top +
      window.scrollY -
      (headerHeight + extraGap);

    window.scrollTo({ top, behavior: "smooth" });
    setActive(id);
  };

  const handleNavClick = (id) => {
    scrollToSection(id);
    setMobileOpen(false);
  };

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 240);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () =>
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

  const navItems = [
    { id: "home", label: "Home" },
    { id: "about", label: "About" },
    { id: "doctors", label: "Doctors" },
    { id: "departments", label: "Departments" },
    { id: "contact", label: "Contact" },
  ];

  return (
    <div className="w-full">
      <header
        id="site-header"
        className="sticky top-0 left-0 w-full bg-white shadow z-50"
      >
        <nav className="max-w-7xl mx-auto flex justify-between items-center px-6 py-4">
          <div className="flex items-center gap-2 cursor-pointer">
            <img
              src="https://cdn-icons-png.flaticon.com/512/2966/2966484.png"
              alt="logo"
              className="w-8 h-8"
            />
            <h1 className="text-xl font-bold text-blue-700">MedCare</h1>
          </div>
          <div className="hidden md:flex items-center gap-6 text-gray-700 font-medium">
            <ul className="flex items-center gap-6">
              {navItems.map((item) => (
                <li
                  key={item.id}
                  className={`cursor-pointer hover:text-blue-600 ${
                    active === item.id ? "text-blue-700 font-semibold" : ""
                  }`}
                  onClick={() => handleNavClick(item.id)}
                >
                  {item.label}
                </li>
              ))}
            </ul>
            {/* <Link
              href="/opd-booking"
              className="inline-flex items-center 0 px-5 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-50"
            >
              OPD
            </Link> */}
            <Link
              href="/login"
              className="inline-flex items-center rounded-full border border-blue-500 px-5 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-50"
            >
              Login
            </Link>
          </div>
          <button
            className="md:hidden px-3 py-2 border rounded-full border-blue-300 text-blue-700 text-sm"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-expanded={isMobileOpen}
            aria-controls="mobile-nav"
            aria-label="Toggle navigation menu"
          >
            ☰
          </button>
        </nav>
        <div
          id="mobile-nav"
          className={`md:hidden bg-white border-t border-gray-200 shadow-inner transition-all duration-200 ${
            isMobileOpen
              ? "max-h-80 opacity-100"
              : "max-h-0 opacity-0 overflow-hidden"
          }`}
        >
          <ul className="flex flex-col px-6 py-3 space-y-3 text-gray-700 font-medium">
            {navItems.map((item) => (
              <li
                key={item.id}
                className={`cursor-pointer hover:text-blue-600 ${
                  active === item.id ? "text-blue-700 font-semibold" : ""
                }`}
                onClick={() => handleNavClick(item.id)}
              >
                {item.label}
              </li>
            ))}
          </ul>
          <div className="px-6 pb-4">
            <Link
              href="/login"
              className="inline-flex w-full justify-center rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 transition"
              onClick={() => setMobileOpen(false)}
            >
              Opd
            </Link>
          </div>
          <div className="px-6 pb-4">
            <Link
              href="/login"
              className="inline-flex w-full justify-center rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 transition"
              onClick={() => setMobileOpen(false)}
            >
              Login
            </Link>
          </div>
        </div>
      </header>

      <main className="scroll-smooth">
        <section
          id="home"
          className="relative w-full min-h-[80vh] bg-cover bg-center flex flex-col justify-center scroll-mt-24 sm:scroll-mt-28 md:scroll-mt-[72px]"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1576765607924-bc6c56b56f57?auto=format&fit=crop&w=1600&q=80')",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-900/80 via-blue-800/60 to-transparent"></div>
          <div className="relative z-10 max-w-7xl mx-auto flex flex-col md:flex-row items-center px-6 py-16">
            <div className="w-full md:w-1/2 text-center md:text-left text-white">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-4">
                Your Health, <span className="text-blue-200">Our Priority</span>
              </h1>
              <p className="text-gray-200 max-w-md mx-auto md:mx-0">
                Providing world-class healthcare with compassion, modern
                technology, and highly trained medical professionals.
              </p>
              <button
                onClick={() => scrollToSection("about")}
                className="mt-8 bg-white text-blue-700 px-6 py-3 rounded-md font-semibold hover:bg-blue-100 transition"
              >
                Learn More
              </button>
            </div>
            <div className="hidden md:flex w-1/2 justify-end">
              <div className="relative w-80 h-80">
                <div className="absolute inset-0 rounded-full bg-blue-200/40 blur-xl animate-pulse"></div>
                <Image
                  src="/banner.gif"
                  alt="Doctor illustration from Flaticon"
                  width={320}
                  height={320}
                  className="relative w-full h-full object-contain drop-shadow-2xl animate-float rounded-full"
                />
              </div>
            </div>
          </div>
        </section>

        <section
          id="about"
          className="py-16 px-6 bg-gray-50 scroll-mt-24 sm:scroll-mt-28 md:scroll-mt-[72px]"
        >
          <div className="max-w-6xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-blue-900 mb-4">
              Compassionate Care, Advanced Technology
            </h2>
            <p className="text-gray-600 max-w-3xl mx-auto">
              Our team of experienced doctors, nurses, and staff are dedicated
              to delivering personalized care using the latest medical
              technology.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto mt-12">
            {[
              {
                title: "24/7 Emergency",
                desc: "Rapid response with advanced life support and critical care specialists.",
              },
              {
                title: "Expert Doctors",
                desc: "Board-certified physicians across multiple specialties.",
              },
              {
                title: "Modern Facilities",
                desc: "State-of-the-art equipment and comfortable patient rooms.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-white shadow-md rounded-lg p-6 border border-gray-100"
              >
                <h3 className="text-xl font-semibold text-blue-800 mb-2">
                  {item.title}
                </h3>
                <p className="text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section
          id="doctors"
          className="py-16 px-6 bg-white scroll-mt-24 sm:scroll-mt-28 md:scroll-mt-[72px]"
        >
          <div className="max-w-6xl mx-auto text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-blue-900 mb-3">
              Meet Our Specialists
            </h2>
            <p className="text-gray-600 max-w-3xl mx-auto">
              Highly skilled and compassionate professionals here to provide the
              best care.
            </p>
          </div>
          <DoctorsCarousel />
        </section>

        <section
          id="departments"
          className="py-16 px-6 bg-gray-50 scroll-mt-24 sm:scroll-mt-28 md:scroll-mt-[72px]"
        >
          <div className="max-w-6xl mx-auto text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-blue-900 mb-3">
              Centers of Excellence
            </h2>
            <p className="text-gray-600 max-w-3xl mx-auto">
              Comprehensive medical services across multiple specialties.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[
              {
                title: "Cardiology",
                desc: "Advanced heart care with minimally invasive procedures.",
              },
              {
                title: "Orthopedics",
                desc: "Joint replacements, sports medicine, and trauma care.",
              },
              {
                title: "Pediatrics",
                desc: "Compassionate care for children from infancy to adolescence.",
              },
              {
                title: "Neurology",
                desc: "Comprehensive brain and spine care.",
              },
              {
                title: "Oncology",
                desc: "Personalized cancer treatment plans with multidisciplinary teams.",
              },
              {
                title: "Women’s Health",
                desc: "Maternal care, gynecology, and reproductive health services.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-white shadow-md rounded-lg p-6 border border-gray-100"
              >
                <h3 className="text-xl font-semibold text-blue-800 mb-2">
                  {item.title}
                </h3>
                <p className="text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section
          id="contact"
          className="py-16 px-6 bg-white scroll-mt-24 sm:scroll-mt-28 md:scroll-mt-[72px]"
        >
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-blue-900 mb-4">
              Get In Touch
            </h2>
            <p className="text-gray-600 mb-8">
              Have questions? Reach out to our care team for appointments,
              consultations, or emergencies.
            </p>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-6">
              <a
                href="tel:+1234567890"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 transition"
              >
                Call Us: +1 (234) 567-890
              </a>
              <a
                href="mailto:care@medcare.com"
                className="inline-flex items-center gap-2 px-6 py-3 border border-blue-600 text-blue-700 rounded-md hover:bg-blue-50 transition"
              >
                Email: care@medcare.com
              </a>
            </div>
          </div>
        </section>
      </main>

      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 p-3 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition"
          aria-label="Scroll to top"
        >
          <ArrowUp size={20} />
        </button>
      )}
    </div>
  );
}
