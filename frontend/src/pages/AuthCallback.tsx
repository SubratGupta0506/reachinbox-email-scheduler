import { useEffect } from "react";

const AuthCallback = () => {
  useEffect(() => {
    console.log("AUTH CALLBACK PAGE LOADED");

    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    console.log("Token received:", !!token);

    if (!token) {
      console.error("No token found in callback URL");
      window.location.href = "/";
      return;
    }

    // Save authentication token
    localStorage.setItem("auth_token", token);

    console.log("Token saved successfully");

    // Redirect to dashboard
    window.location.href = "/dashboard/scheduled";
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#00ae42] border-t-transparent" />

        <p className="mt-4 text-sm text-gray-500">
          Signing you in...
        </p>
      </div>
    </div>
  );
};

export default AuthCallback;