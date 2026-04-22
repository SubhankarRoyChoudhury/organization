"use client";

import { useRouter } from "next/navigation";

function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-12 w-12" fill="none" stroke="currentColor" strokeWidth="1.4">
      <circle cx="12" cy="7.3" r="3.2" />
      <path d="M4.6 18.5a7.4 7.4 0 0 1 14.8 0" />
    </svg>
  );
}

function UsernameIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
      <circle cx="12" cy="8" r="4" />
      <path d="M5 19a7 7 0 0 1 14 0v1H5v-1Z" />
    </svg>
  );
}

function PasswordIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
      <path d="M17 9h-1V7a4 4 0 1 0-8 0v2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2ZM10 7a2 2 0 1 1 4 0v2h-4V7Zm3 8.7V18h-2v-2.3a2 2 0 1 1 2 0Z" />
    </svg>
  );
}

export default function Login() {
  const router = useRouter();

  const handleSubmit = (event) => {
    event.preventDefault();
    router.push("/dashboard");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_80%_94%,#53cf57_0%,transparent_38%),radial-gradient(circle_at_12%_84%,#00958e_0%,transparent_44%),linear-gradient(160deg,#0f45a9_0%,#073c9a_36%,#0c6f7f_68%,#31a863_100%)] px-4 py-12">
      <section className="relative w-full max-w-[360px]">
        <div className="absolute inset-x-2 bottom-[-28px] top-[58px] rounded bg-[#35d369]/35 blur-2xl" />

        <div className="relative border border-[#18589d] bg-[#0b3f89]/55 p-2 shadow-[0_18px_42px_rgba(0,23,67,0.5)]">
          <div className="relative border border-[#14539b] bg-[linear-gradient(180deg,#001e5a_0%,#012456_48%,#014b53_100%)] px-4 pb-6 pt-14">
            <div className="absolute left-1/2 top-0 flex h-[104px] w-[104px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#86bea8]/70 bg-[#3f8e83] text-[#f3f5f4] shadow-[0_8px_18px_rgba(0,0,0,0.25)]">
              <ProfileIcon />
            </div>

            <form className="space-y-3" onSubmit={handleSubmit}>
              <label htmlFor="username" className="sr-only">
                Username
              </label>
              <div className="flex h-11 overflow-hidden border border-[#a9acb2] bg-[#d8d8da]">
                <span className="grid w-11 place-items-center border-r border-[#a7aab0] bg-[#c7c8cb] text-[#595d63]">
                  <UsernameIcon />
                </span>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  placeholder="Username"
                  className="h-full w-full bg-transparent px-3 text-[15px] text-[#404349] placeholder:text-[#a2a6ac] focus:outline-none"
                />
              </div>

              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <div className="flex h-11 overflow-hidden border border-[#a9acb2] bg-[#d8d8da]">
                <span className="grid w-11 place-items-center border-r border-[#a7aab0] bg-[#c7c8cb] text-[#595d63]">
                  <PasswordIcon />
                </span>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="***********"
                  className="h-full w-full bg-transparent px-3 text-[15px] text-[#404349] placeholder:text-[#a2a6ac] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between px-1 pt-1 text-[12px] text-[#bdcad2]">
                <label htmlFor="remember" className="flex cursor-pointer items-center gap-2">
                  <input
                    id="remember"
                    name="remember"
                    type="checkbox"
                    className="h-3.5 w-3.5 accent-[#4aa38d]"
                    defaultChecked
                  />
                  <span>Remember me</span>
                </label>
                <a href="#" className="italic text-[#ccd6dc] transition-colors duration-200 hover:text-white">
                  Forgot Password?
                </a>
              </div>

              <button
                type="submit"
                className="mt-4 h-11 w-full border border-[#4f9889] bg-[#4a9584] text-sm font-semibold tracking-[0.16em] text-white transition-colors duration-200 hover:bg-[#428473]"
              >
                LOGIN
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
