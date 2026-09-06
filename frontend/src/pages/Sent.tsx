import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  getEmails,
  searchEmails,
  type Email,
} from "../services/api";

const Sent = () => {
  const navigate = useNavigate();

  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const loadEmails = async () => {
    try {
      setError("");

      const result = await getEmails("sent");

      setEmails(result.emails || []);
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to load sent emails"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmails();

    const interval = window.setInterval(() => {
      if (!search.trim()) {
        loadEmails();
      }
    }, 5000);

    return () => {
      window.clearInterval(interval);
    };
  }, [search]);

  const handleSearch = async () => {
    if (!search.trim()) {
      setLoading(true);
      await loadEmails();
      return;
    }

    try {
      setLoading(true);
      setError("");

      const result = await searchEmails(search.trim());

      const sentEmails = (result.emails || []).filter(
        (email: Email) => email.status === "sent"
      );

      setEmails(sentEmails);
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Search failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold text-[#171717]">
            Sent
          </h1>

          <p className="mt-1 text-[11px] text-[#8b8b8b]">
            Emails that have been sent
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/dashboard/compose")}
          className="rounded-[7px] bg-[#00ae42] px-4 py-2 text-[11px] font-medium text-white hover:bg-[#009c3b]"
        >
          Compose
        </button>
      </div>

      <div className="mb-5 flex gap-2">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              handleSearch();
            }
          }}
          placeholder="Search sent emails"
          className="h-[35px] flex-1 rounded-[7px] bg-[#f3f6f5] px-3 text-[11px] outline-none focus:ring-1 focus:ring-[#00b451]"
        />

        <button
          type="button"
          onClick={handleSearch}
          className="rounded-[7px] bg-[#171717] px-4 text-[11px] text-white"
        >
          Search
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-[7px] bg-red-50 px-4 py-3 text-[11px] text-red-600">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-[8px] border border-[#eeeeee]">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[#eeeeee] bg-[#fafafa] text-left">
              <th className="px-4 py-3 text-[10px] font-medium text-[#777]">
                Recipient
              </th>

              <th className="px-4 py-3 text-[10px] font-medium text-[#777]">
                Subject
              </th>

              <th className="px-4 py-3 text-[10px] font-medium text-[#777]">
                Sent
              </th>

              <th className="px-4 py-3 text-[10px] font-medium text-[#777]">
                Status
              </th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-10 text-center text-[11px] text-[#999]"
                >
                  Loading sent emails...
                </td>
              </tr>
            ) : emails.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-10 text-center text-[11px] text-[#999]"
                >
                  No sent emails
                </td>
              </tr>
            ) : (
              emails.map((email) => (
                <tr
                  key={email.id}
                  onClick={() =>
                    navigate(`/dashboard/email/${email.id}`)
                  }
                  className="cursor-pointer border-b border-[#f0f0f0] hover:bg-[#fafafa]"
                >
                  <td className="px-4 py-3 text-[11px] text-[#333]">
                    {email.recipient}
                  </td>

                  <td className="px-4 py-3 text-[11px] text-[#333]">
                    {email.subject}
                  </td>

                  <td className="px-4 py-3 text-[11px] text-[#777]">
                    {email.sent_at
                      ? new Date(email.sent_at).toLocaleString()
                      : "-"}
                  </td>

                  <td className="px-4 py-3">
                    <span className="rounded-full bg-[#eaf9f0] px-2 py-1 text-[9px] text-[#008f38]">
                      Sent
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Sent;