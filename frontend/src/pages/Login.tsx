const Login = () => {
  const handleGoogleLogin = () => {
    window.location.href =
      "http://localhost:5000/auth/google";
  };

  const handleLogin = (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    console.log(
      "Email login submitted"
    );
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="w-[307px] rounded-md border border-[#e5e7eb] px-[35px] py-[32px]">
        <h1 className="text-center text-[25px] font-semibold leading-[30px] text-[#171717]">
          Login
        </h1>

        <button
          type="button"
          onClick={
            handleGoogleLogin
          }
          className="mt-[20px] flex h-[30px] w-full items-center justify-center gap-2 rounded-[7px] bg-[#e1f4eb] text-[11px] font-normal text-[#202020] transition hover:bg-[#d5efe3]"
        >
          <span className="text-[13px] font-medium">
            G
          </span>

          <span>
            Login with Google
          </span>
        </button>

        <div className="my-[13px] flex items-center gap-2">
          <div className="h-px flex-1 bg-[#eeeeee]" />

          <span className="text-[9px] text-[#b5b5b5]">
            or sign up through email
          </span>

          <div className="h-px flex-1 bg-[#eeeeee]" />
        </div>

        <form
          onSubmit={handleLogin}
        >
          <input
            type="email"
            placeholder="Email ID"
            className="h-[35px] w-full rounded-[7px] border-0 bg-[#f3f6f5] px-[13px] text-[10px] text-[#333333] outline-none placeholder:text-[#7d8584] focus:ring-1 focus:ring-[#00b451]"
          />

          <input
            type="password"
            placeholder="Password"
            className="mt-[9px] h-[35px] w-full rounded-[7px] border-0 bg-[#f3f6f5] px-[13px] text-[10px] text-[#333333] outline-none placeholder:text-[#7d8584] focus:ring-1 focus:ring-[#00b451]"
          />

          <button
            type="submit"
            className="mt-[19px] h-[30px] w-full rounded-[7px] bg-[#00ae42] text-[10px] font-medium text-white transition hover:bg-[#009c3b]"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;