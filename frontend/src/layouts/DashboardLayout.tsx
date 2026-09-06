import {
  useEffect,
  useState,
} from "react";

import {
  NavLink,
  Outlet,
  useNavigate,
} from "react-router-dom";

import { jwtDecode } from "jwt-decode";

import {
  getEmails,
  getSlackStatus,
  connectSlack,
} from "../services/api";

interface AuthUser {
  userId: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
}

const DashboardLayout = () => {
  const navigate = useNavigate();

  const [user, setUser] =
    useState<AuthUser | null>(null);

  const [
    scheduledCount,
    setScheduledCount,
  ] = useState(0);

  const [
    sentCount,
    setSentCount,
  ] = useState(0);

  const [
    slackConnected,
    setSlackConnected,
  ] = useState(false);

  const [
    slackTeamName,
    setSlackTeamName,
  ] = useState<string | null>(
    null
  );

  const [loading, setLoading] =
    useState(true);

  const [
    slackLoading,
    setSlackLoading,
  ] = useState(false);

  const [
    slackError,
    setSlackError,
  ] = useState("");

  useEffect(() => {
    const token =
      localStorage.getItem(
        "auth_token"
      );

    if (!token) {
      navigate("/", {
        replace: true,
      });

      return;
    }

    try {
      const decoded =
        jwtDecode<AuthUser>(
          token
        );

      if (!decoded.userId) {
        throw new Error(
          "Invalid authentication token"
        );
      }

      setUser(decoded);
    } catch (error) {
      console.error(
        "Invalid authentication token:",
        error
      );

      localStorage.removeItem(
        "auth_token"
      );

      navigate("/", {
        replace: true,
      });
    }
  }, [navigate]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const loadDashboardData =
      async () => {
        try {
          setLoading(true);

          const [
            scheduledResult,
            sentResult,
            slackResult,
          ] = await Promise.all([
            getEmails("scheduled"),
            getEmails("sent"),
            getSlackStatus(),
          ]);

          setScheduledCount(
            (
              scheduledResult.emails ||
              []
            ).length
          );

          setSentCount(
            (
              sentResult.emails ||
              []
            ).length
          );

          setSlackConnected(
            Boolean(
              slackResult.connected
            )
          );

          setSlackTeamName(
            slackResult.teamName ||
              null
          );
        } catch (error) {
          console.error(
            "Failed to load dashboard data:",
            error
          );
        } finally {
          setLoading(false);
        }
      };

    loadDashboardData();
  }, [user]);

  const handleLogout = () => {
    localStorage.removeItem(
      "auth_token"
    );

    navigate("/", {
      replace: true,
    });
  };

  const handleSlackConnect =
    async () => {
      try {
        setSlackLoading(true);
        setSlackError("");

        const result =
          await connectSlack();

        if (!result.authUrl) {
          throw new Error(
            "Slack authorization URL was not returned"
          );
        }

        window.location.href =
          result.authUrl;
      } catch (error) {
        console.error(
          "Slack connection failed:",
          error
        );

        setSlackError(
          error instanceof Error
            ? error.message
            : "Failed to connect Slack"
        );

        setSlackLoading(false);
      }
    };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-[11px] text-[#999]">
          Loading dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-white">
      <aside className="flex w-[220px] flex-col border-r border-[#eeeeee] bg-white">
        <div className="border-b border-[#eeeeee] px-5 py-5">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#00ae42] text-[12px] font-bold text-white">
              R
            </div>

            <span className="text-[15px] font-semibold text-[#171717]">
              ReachInbox
            </span>
          </div>
        </div>

        <div className="border-b border-[#eeeeee] px-5 py-5">
          <div className="flex items-center gap-3">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="h-9 w-9 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e8f6ee] text-[12px] font-semibold text-[#00ae42]">
                {user.name
                  ?.charAt(0)
                  .toUpperCase() ||
                  "U"}
              </div>
            )}

            <div className="min-w-0">
              <p className="truncate text-[11px] font-medium text-[#222]">
                {user.name}
              </p>

              <p className="truncate text-[9px] text-[#999]">
                {user.email}
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4">
          <NavLink
            to="/dashboard/compose"
            className={({ isActive }) =>
              `mb-2 flex h-[38px] items-center rounded-[7px] px-3 text-[11px] font-medium transition ${
                isActive
                  ? "bg-[#e8f6ee] text-[#00ae42]"
                  : "text-[#555] hover:bg-[#f7f7f7]"
              }`
            }
          >
            <span className="mr-2 text-[15px]">
              +
            </span>

            Compose
          </NavLink>

          <NavLink
            to="/dashboard/scheduled"
            className={({ isActive }) =>
              `mb-1 flex h-[38px] items-center justify-between rounded-[7px] px-3 text-[11px] transition ${
                isActive
                  ? "bg-[#e8f6ee] font-medium text-[#00ae42]"
                  : "text-[#555] hover:bg-[#f7f7f7]"
              }`
            }
          >
            <span className="flex items-center">
              <span className="mr-2 text-[13px]">
                ◷
              </span>

              Scheduled
            </span>

            <span className="text-[9px] text-[#999]">
              {loading
                ? "..."
                : scheduledCount}
            </span>
          </NavLink>

          <NavLink
            to="/dashboard/sent"
            className={({ isActive }) =>
              `mb-4 flex h-[38px] items-center justify-between rounded-[7px] px-3 text-[11px] transition ${
                isActive
                  ? "bg-[#e8f6ee] font-medium text-[#00ae42]"
                  : "text-[#555] hover:bg-[#f7f7f7]"
              }`
            }
          >
            <span className="flex items-center">
              <span className="mr-2 text-[13px]">
                ✓
              </span>

              Sent
            </span>

            <span className="text-[9px] text-[#999]">
              {loading
                ? "..."
                : sentCount}
            </span>
          </NavLink>

          <div className="border-t border-[#eeeeee] pt-4">
            <p className="mb-2 px-3 text-[9px] font-medium uppercase tracking-wide text-[#aaa]">
              Integrations
            </p>

            <button
              type="button"
              disabled={
                slackLoading
              }
              onClick={
                handleSlackConnect
              }
              className="flex w-full items-center justify-between rounded-[7px] px-3 py-2 text-left text-[11px] text-[#555] hover:bg-[#f7f7f7] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="flex items-center">
                <span className="mr-2 text-[13px]">
                  #
                </span>

                Slack
              </span>

              <span
                className={
                  slackConnected
                    ? "text-[9px] text-[#00ae42]"
                    : "text-[9px] text-[#999]"
                }
              >
                {slackLoading
                  ? "Connecting..."
                  : slackConnected
                    ? "Connected"
                    : "Connect"}
              </span>
            </button>

            {slackConnected &&
              slackTeamName && (
                <p className="mt-1 px-3 text-[9px] text-[#999]">
                  {slackTeamName}
                </p>
              )}

            {slackError && (
              <p className="mt-2 px-3 text-[9px] text-red-500">
                {slackError}
              </p>
            )}
          </div>
        </nav>

        <div className="border-t border-[#eeeeee] px-3 py-4">
          <button
            type="button"
            onClick={
              handleLogout
            }
            className="flex h-[36px] w-full items-center rounded-[7px] px-3 text-[11px] text-[#777] hover:bg-[#f7f7f7] hover:text-[#333]"
          >
            <span className="mr-2 text-[13px]">
              ↪
            </span>

            Logout
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 bg-white">
        <div className="mx-auto w-full max-w-[1100px] px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;