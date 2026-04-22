"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  userLogin,
  get_Hospital_User_Login_Details,
} from "@/app/api/apiService";
import { Eye, EyeOff } from "lucide-react";

import ErrorDialog from "../ErrorDialog/page"; // Import the error dialog
import SuccessDialog from "../SuccessDialog/page"; // Import the success dialog

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null); // State for the error message
  const [isErrorDialogOpen, setIsErrorDialogOpen] = useState(false); // State for the error dialog
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false); // State for the success dialog
  const [successMessage, setSuccessMessage] = useState(""); // State for the success message
  const [errors, setErrors] = useState({ username: "", password: "" });

  const validateForm = () => {
    const newErrors = { username: "", password: "" };
    if (!username) {
      newErrors.username = "Username is required";
    }
    if (!password) {
      newErrors.password = "Password is required";
    }
    setErrors(newErrors);
    return !newErrors.username && !newErrors.password;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validateForm()) {
      try {
        // Convert username to lowercase before sending to API
        const lowercaseUsername = username.toLowerCase();

        const data = await userLogin(lowercaseUsername, password);
        localStorage.setItem("username", lowercaseUsername);
        if (typeof window !== "undefined") {
          localStorage.removeItem("expiry_dialog_shown");
        }

        setSuccessMessage("LogIn Successfully!");
        setIsSuccessDialogOpen(true);
        // if (data) {
        //   console.log("Logged Data===>>>", data);

        //   localStorage.setItem("is_superuser", data.is_superuser);
        //   setTimeout(() => {
        //     if (data.is_superuser) {
        //       router.push("/admin_dashboard");
        //     } else {
        //       router.push("/administration_dashboard");
        //     }
        //   }, 900);
        // }

        if (data) {
          // console.log("✅ Logged Data ===>>>", data);
          localStorage.setItem("is_superuser", data.is_superuser);

          if (data.is_superuser) {
            setTimeout(() => {
              router.push("/admin_dashboard");
            }, 900);
            return;
          }

          // 🔹 Step 2: Fetch Hospital User Details
          const userDetails = await get_Hospital_User_Login_Details(
            lowercaseUsername
          );
          if (userDetails?.app_permissions) {
            localStorage.setItem(
              "app_permissions",
              JSON.stringify(userDetails.app_permissions)
            );
          }
          // console.log("🏥 Hospital User Details ===>>>", userDetails);

          // 🔹 Step 3: Role-based redirection
          setTimeout(() => {
            if (data.is_superuser) {
              router.push("/admin_dashboard");
            } else if (userDetails?.user_type === "company_admin") {
              router.push("/admin_dashboard");
            } else if (userDetails?.role === "administration") {
              router.push("/administration_dashboard");
            } else if (userDetails?.role === "doctor") {
              router.push("/doctor_dashboard");
            } else {
              console.warn("⚠️ Unknown role:", userDetails?.role);
              router.push("/login");
            }
          }, 900);
        }
      } catch (error) {
        setErrorMessage(`Error: ${error.response?.data.error_description}`);
        setIsErrorDialogOpen(true);
      }
    }

    // Example logic: Normally you'd call your API here
    // For now, let's assume admin uses a fixed username
    // if (username === "admin@gmail.com" && password === "") {
    //   // redirect to admin dashboard
    //   router.push("/administration_dashboard");
    // } else if (username === "doctor@medcare.com" && password === "") {
    //   // redirect to staff portal
    //   router.push("/doctor_dashboard");
    // } else {
    //   alert(
    //     "Invalid credentials. Try 'admin@medcare.com' or 'staff@medcare.com'."
    //   );
    // }
  };

  const closeErrorDialog = () => {
    setIsErrorDialogOpen(false); // Close the error dialog
  };

  const closeSuccessDialog = () => {
    setIsSuccessDialogOpen(false); // Close the success dialog
  };
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#e1f5ff] via-white to-[#d7f1ff] flex items-center justify-center px-4 py-10">
      {/* Background wave */}
      <svg
        className="pointer-events-none absolute bottom-0 left-1/2 w-[200%] -translate-x-1/2 text-[#c7e7ff] wave-motion-delayed"
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
        <div className="relative grid md:grid-cols-2 bg-white/80 backdrop-blur-sm rounded-[36px] shadow-2xl overflow-hidden border border-white/60">
          {/* Left - Form */}
          <div className="px-8 sm:px-12 py-12 flex flex-col justify-center bg-white/90">
            <div className="flex items-center gap-2 mb-10">
              <img
                src="https://cdn-icons-png.flaticon.com/512/2966/2966484.png"
                alt="MedCare logo"
                className="w-11 h-11"
              />
              <span className="text-2xl font-semibold text-blue-700">
                MedCare
              </span>
            </div>

            <h2 className="text-3xl font-bold text-gray-900 leading-tight">
              Welcome to Doctor & Administrator Portal
            </h2>
            <p className="text-gray-500 mt-3 mb-10">Login to your account</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email field */}
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="email"
                  className="text-sm font-medium text-gray-700"
                >
                  Email
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="username address"
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                />
                <div className="input-highlight"></div>
                {errors.username && (
                  <span className="text-red-500">{errors.username}</span>
                )}
              </div>

              {/* Password field */}
              {/* Password field with toggle */}
              <div className="flex flex-col gap-2 relative">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-gray-700"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                  <div className="input-highlight"></div>
                  {errors.password && (
                    <span className="text-red-500">{errors.password}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-gray-600">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Remember me
                </label>
                <Link href="#" className="text-blue-600 hover:text-blue-700">
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                className="w-full bg-[#0ea5a5] hover:bg-[#0b8c8c] text-white font-semibold py-3 rounded-xl transition shadow-md hover:shadow-lg"
              >
                Login
              </button>
            </form>

            {/* <p className="text-sm text-gray-500 mt-6">
              Don&apos;t have an account?{" "}
              <Link
                href="/signup"
                className="text-blue-600 font-semibold hover:text-blue-700"
              >
                Sign up
              </Link>
            </p> */}
          </div>

          {/* Right - Illustration */}
          <div className="relative hidden md:flex flex-col items-center justify-center gap-10 rounded-l-[48px] bg-gradient-to-br from-white via-[#f3f8ff] to-[#e7f3ff] px-12 py-12">
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
              <div className="absolute top-16 left-12 text-blue-400 text-4xl font-extrabold opacity-70">
                +
              </div>
              <div className="absolute bottom-16 right-16 text-[#0ea5a5] text-3xl font-extrabold opacity-70">
                +
              </div>
              <div className="absolute top-1/3 right-24 text-blue-300 text-5xl font-extrabold opacity-40">
                +
              </div>
            </div>

            <div className="relative z-10 space-y-4 max-w-sm text-center">
              <h3 className="text-2xl font-semibold leading-snug text-blue-900">
                Creating an ecosystem for Doctor Patient Appointment
              </h3>
              <p className="text-blue-700/80 text-sm leading-relaxed">
                Manage appointments, monitor patient progress, and streamline
                hospital operations with MedCare&apos;s intuitive management
                tools.
              </p>
            </div>

            <div className="relative z-10 flex justify-center">
              <img
                src="https://cdn-icons-png.flaticon.com/512/387/387561.png"
                alt="Doctor illustration"
                className="w-52 h-52 object-contain drop-shadow-xl"
              />
            </div>
          </div>
        </div>
      </div>
      <ErrorDialog
        open={isErrorDialogOpen}
        onClose={closeErrorDialog}
        message={errorMessage}
      />
      {/* Success Dialog */}
      <SuccessDialog
        open={isSuccessDialogOpen}
        onClose={closeSuccessDialog}
        message={successMessage}
      />
    </div>
  );
}
