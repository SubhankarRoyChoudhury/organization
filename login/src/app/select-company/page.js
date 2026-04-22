"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SelectCompanyPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [userInfo, setUserInfo] = useState({});
  const [error, setError] = useState("");
  const [username, setUsername] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const storedCompanies = localStorage.getItem("company_options");
    const storedUser = localStorage.getItem("login_user");
    const storedUsername = localStorage.getItem("username");
    const parsedCompanies = storedCompanies ? JSON.parse(storedCompanies) : [];
    const parsedUser = storedUser ? JSON.parse(storedUser) : {};
    setCompanies(parsedCompanies);
    setUserInfo(parsedUser);
    setUsername(storedUsername || "");

    if (parsedCompanies.length === 1) {
      localStorage.setItem("company_id", parsedCompanies[0].company_id);
      router.push("/home");
      return;
    }
    if (parsedCompanies.length === 0) {
      router.push("/");
      return;
    }
    if (parsedCompanies.length > 1) {
      setSelectedCompanyId("");
    }
  }, [router]);

  const handleContinue = () => {
    if (!selectedCompanyId) {
      setError("Please select a company to continue.");
      return;
    }
    if (typeof window !== "undefined") {
      localStorage.setItem("company_id", selectedCompanyId);
    }
    router.push("/home");
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#e1f5ff] via-white to-[#d7f1ff] flex items-center justify-center px-4 py-10">
      <svg
        className="pointer-events-none absolute bottom-0 left-1/2 w-[200%] -translate-x-1/2 text-[#c7e7ff]"
        viewBox="0 0 1440 320"
        aria-hidden="true"
      >
        <path
          fill="currentColor"
          d="M0,288L48,256C96,224,192,160,288,128C384,96,480,96,576,122.7C672,149,768,203,864,218.7C960,235,1056,213,1152,197.3C1248,181,1344,171,1392,165.3L1440,160L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"
        />
      </svg>

      <div className="relative max-w-5xl w-full">
        <div className="absolute -top-20 -left-16 w-44 h-44 rounded-full bg-blue-200/40 blur-3xl" />
        <div className="absolute -bottom-24 -right-8 w-56 h-56 rounded-full bg-teal-200/40 blur-3xl" />

        <div className="relative grid md:grid-cols-[1.15fr_0.85fr] bg-white/80 backdrop-blur-sm rounded-[36px] shadow-2xl overflow-hidden border border-white/60">
          <div className="px-8 sm:px-12 py-12 flex flex-col justify-center bg-white/90">
            <div className="flex items-center gap-2 mb-8">
              <img
                src="https://cdn-icons-png.flaticon.com/512/2966/2966484.png"
                alt="OwlHealth logo"
                className="w-11 h-11"
              />
              <span className="text-2xl font-semibold text-blue-700">
                OwlHealth
              </span>
            </div>

            <h2 className="text-3xl font-bold text-gray-900 leading-tight">
              Choose your hospital workspace
            </h2>
            <p className="text-gray-500 mt-3 mb-8">
              This account belongs to multiple hospitals. Select one to
              continue.
            </p>

            <div className="flex items-center gap-4 rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-4">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-200 via-cyan-200 to-teal-200" />
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {userInfo.name || "Welcome"}
                </p>
                <p className="text-xs text-gray-500">
                  {userInfo.email || username || ""}
                </p>
              </div>
            </div>

            <div className="mt-8 space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                Company Name
              </label>
              <select
                value={selectedCompanyId}
                onChange={(event) => {
                  setSelectedCompanyId(event.target.value);
                  setError("");
                }}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
              >
                <option value="" disabled>
                  Select a company
                </option>
                {companies.map((company) => (
                  <option key={company.company_id} value={company.company_id}>
                    {company.company_name || company.company_code || "Company"}
                  </option>
                ))}
              </select>
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>

            <button
              type="button"
              onClick={handleContinue}
              className="mt-8 w-full bg-[#0ea5a5] hover:bg-[#0b8c8c] text-white font-semibold py-3 rounded-xl transition shadow-md hover:shadow-lg"
            >
              Continue
            </button>
          </div>

          <div className="relative hidden md:flex flex-col items-center justify-center gap-6 rounded-l-[48px] bg-gradient-to-br from-white via-[#f3f8ff] to-[#e7f3ff] px-12 py-12">
            <div className="absolute inset-0">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/white-diamond.png')] opacity-30" />
              <svg
                className="absolute -top-24 -right-36 w-[150%] text-[#d5ecff]"
                viewBox="0 0 600 400"
                aria-hidden="true"
              >
                <path
                  fill="currentColor"
                  d="M0,160L40,154.7C80,149,160,139,240,170.7C320,203,400,277,480,277.3C560,277,640,203,720,186.7C800,171,880,213,960,218.7C1040,224,1120,192,1200,165.3C1280,139,1360,117,1400,106.7L1440,96L1440,0L1400,0C1360,0,1280,0,1200,0C1120,0,1040,0,960,0C880,0,800,0,720,0C640,0,560,0,480,0C400,0,320,0,240,0C160,0,80,0,40,0L0,0Z"
                />
              </svg>
            </div>

            <div className="relative z-10 rounded-3xl border border-white bg-white/80 p-6 shadow-xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                What happens next
              </p>
              <ul className="mt-4 space-y-3 text-sm text-gray-700">
                <li>We load your hospital workspace.</li>
                <li>Your permissions are applied automatically.</li>
                <li>You can switch companies later from settings.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
