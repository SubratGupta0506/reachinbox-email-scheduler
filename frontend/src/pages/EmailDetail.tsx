import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  getEmailById,
  type Email,
} from "../services/api";

const EmailDetail = () => {
  const { emailId } = useParams();
  const navigate = useNavigate();

  const [email, setEmail] =
    useState<Email | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    const loadEmail = async () => {
      if (!emailId) {
        setError("Email ID is missing");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const result =
          await getEmailById(emailId);

        setEmail(result);
      } catch (error) {
        console.error(error);

        setError(
          error instanceof Error
            ? error.message
            : "Failed to load email"
        );
      } finally {
        setLoading(false);
      }
    };

    loadEmail();
  }, [emailId]);

  if (loading) {
    return (
      <div className="py-10 text-center text-[11px] text-[#999]">
        Loading email...
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <button
          onClick={() => navigate(-1)}
          className="mb-5 text-[11px] text-[#00ae42]"
        >
          ← Back
        </button>

        <div className="rounded-[7px] bg-red-50 px-4 py-3 text-[11px] text-red-600">
          {error}
        </div>
      </div>
    );
  }

  if (!email) {
    return (
      <div className="py-10 text-center text-[11px] text-[#999]">
        Email not found
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        className="mb-6 text-[11px] text-[#00ae42] hover:underline"
      >
        ← Back
      </button>

      <div className="rounded-[8px] border border-[#eeeeee] bg-white p-6">
        <div className="mb-5 border-b border-[#eeeeee] pb-5">
          <h1 className="text-[20px] font-semibold text-[#171717]">
            {email.subject}
          </h1>

          <div className="mt-4 space-y-2 text-[11px]">
            <p>
              <span className="font-medium text-[#555]">
                From:
              </span>{" "}
              <span className="text-[#777]">
                {email.sender || "-"}
              </span>
            </p>

            <p>
              <span className="font-medium text-[#555]">
                To:
              </span>{" "}
              <span className="text-[#777]">
                {email.recipient}
              </span>
            </p>

            <p>
              <span className="font-medium text-[#555]">
                Status:
              </span>{" "}
              <span className="text-[#777]">
                {email.status}
              </span>
            </p>

            {email.sent_at && (
              <p>
                <span className="font-medium text-[#555]">
                  Sent:
                </span>{" "}
                <span className="text-[#777]">
                  {new Date(
                    email.sent_at
                  ).toLocaleString()}
                </span>
              </p>
            )}

            {email.scheduled_at && (
              <p>
                <span className="font-medium text-[#555]">
                  Scheduled:
                </span>{" "}
                <span className="text-[#777]">
                  {new Date(
                    email.scheduled_at
                  ).toLocaleString()}
                </span>
              </p>
            )}
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-[11px] font-medium text-[#555]">
            Message
          </h2>

          <div className="whitespace-pre-wrap rounded-[7px] bg-[#f8faf9] p-4 text-[12px] leading-6 text-[#333]">
            {email.body}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailDetail;