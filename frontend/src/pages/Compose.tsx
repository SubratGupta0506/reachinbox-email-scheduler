import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  createCampaign,
  uploadRecipients,
} from "../services/api";

import { jwtDecode } from "jwt-decode";

import type { AuthUser } from "../types/auth";

const Compose = () => {
  const navigate = useNavigate();

  const fileInputRef =
    useRef<HTMLInputElement>(null);

  const [recipients, setRecipients] =
    useState<string[]>([]);

  const [recipientInput, setRecipientInput] =
    useState("");

  const [subject, setSubject] =
    useState("");

  const [body, setBody] =
    useState("");

  const [minimumDelay, setMinimumDelay] =
    useState("");

  const [hourlyLimit, setHourlyLimit] =
    useState("");

  const [showSchedule, setShowSchedule] =
    useState(false);

  const [selectedDateTime, setSelectedDateTime] =
    useState("");

  const getCurrentUser = (): AuthUser | null => {
    try {
      const token =
        localStorage.getItem(
          "auth_token"
        );

      if (!token) {
        return null;
      }

      return jwtDecode<AuthUser>(
        token
      );
    } catch (error) {
      console.error(
        "Failed to decode auth token:",
        error
      );

      return null;
    }
  };

  const addRecipient = () => {
    const email =
      recipientInput.trim().toLowerCase();

    if (!email) {
      return;
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
      )
    ) {
      return;
    }

    if (!recipients.includes(email)) {
      setRecipients((current) => [
        ...current,
        email,
      ]);
    }

    setRecipientInput("");
  };

  const handleRecipientKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (
      event.key === "Enter" ||
      event.key === "," ||
      event.key === " "
    ) {
      event.preventDefault();

      addRecipient();
    }
  };

  const removeRecipient = (
    email: string
  ) => {
    setRecipients((current) =>
      current.filter(
        (item) => item !== email
      )
    );
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const data =
        await uploadRecipients(file);

      setRecipients(
        data.recipients || []
      );

      alert(
        `${data.count} recipient${
          data.count === 1
            ? ""
            : "s"
        } loaded successfully`
      );
    } catch (error) {
      console.error(
        "Upload failed:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Failed to upload recipient file"
      );
    } finally {
      event.target.value = "";
    }
  };

  const handleSend = async () => {
    try {
      const user =
        getCurrentUser();

      if (!user) {
        alert(
          "Your session has expired. Please login again."
        );

        localStorage.removeItem(
          "auth_token"
        );

        navigate("/");

        return;
      }

      if (
        recipients.length === 0
      ) {
        alert(
          "Please add at least one recipient"
        );

        return;
      }

      if (!subject.trim()) {
        alert(
          "Please enter a subject"
        );

        return;
      }

      if (!body.trim()) {
        alert(
          "Please enter email content"
        );

        return;
      }

      const startTime =
        selectedDateTime
          ? new Date(
              selectedDateTime
            ).toISOString()
          : new Date().toISOString();

      const result =
        await createCampaign({
          recipients,

          subject:
            subject.trim(),

          body,

          startTime,

          minimumDelaySeconds:
            Number(
              minimumDelay
            ) || 0,

          hourlyLimit:
            Number(
              hourlyLimit
            ) || 100,
        });

      alert(
        `${result.count} emails scheduled successfully`
      );

      navigate(
        "/dashboard/scheduled"
      );
    } catch (error) {
      console.error(
        "Failed to send campaign:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Failed to schedule campaign"
      );
    }
  };

  const handleScheduleDone = () => {
    if (!selectedDateTime) {
      alert(
        "Please select a date and time"
      );

      return;
    }

    setShowSchedule(false);

    console.log(
      "Scheduled for:",
      selectedDateTime
    );
  };

  const user =
    getCurrentUser();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}

      <header className="flex h-[45px] items-center border-b border-[#f1f1f1] px-[11px]">
        <button
          type="button"
          onClick={() =>
            navigate(-1)
          }
          className="mr-[7px] text-[20px] leading-none text-[#333]"
        >
          ←
        </button>

        <h1 className="text-[14px] font-medium text-[#333]">
          Compose New Email
        </h1>

        <div className="ml-auto flex items-center gap-[12px]">
          <button
            type="button"
            className="text-[16px] text-[#9a9a9a]"
            title="Attach file"
          >
            📎
          </button>

          <button
            type="button"
            onClick={() =>
              setShowSchedule(
                true
              )
            }
            className="text-[15px] text-[#00ae42]"
            title="Schedule"
          >
            ◷
          </button>

          <button
            type="button"
            onClick={handleSend}
            className="h-[24px] rounded-[12px] border border-[#00ae42] px-[14px] text-[9px] font-medium text-[#00ae42] transition hover:bg-[#eaf9f0]"
          >
            {selectedDateTime
              ? "Send Later"
              : "Send"}
          </button>
        </div>
      </header>

      <div className="relative mx-auto max-w-[760px] px-[5px] pt-[11px]">
        {/* From */}

        <div className="flex min-h-[32px] items-center border-b border-[#eeeeee]">
          <label className="w-[40px] text-[9px] font-medium text-[#303030]">
            From
          </label>

          <div className="rounded-[6px] bg-[#f5f6f6] px-[10px] py-[6px] text-[9px] text-[#777]">
            {user?.email ||
              "Authenticated user"}

            <span className="ml-[7px] text-[8px]">
              ⌄
            </span>
          </div>
        </div>

        {/* To */}

        <div className="flex min-h-[35px] items-center border-b border-[#eeeeee]">
          <label className="w-[40px] shrink-0 text-[9px] font-medium text-[#303030]">
            To
          </label>

          <div className="flex flex-1 flex-wrap items-center gap-[4px]">
            {recipients.map(
              (email) => (
                <span
                  key={email}
                  className="flex items-center rounded-[9px] border border-[#00b84f] bg-[#f5fff9] px-[7px] py-[3px] text-[8px] text-[#333]"
                >
                  {email}

                  <button
                    type="button"
                    onClick={() =>
                      removeRecipient(
                        email
                      )
                    }
                    className="ml-[5px] text-[9px] text-[#777]"
                  >
                    ×
                  </button>
                </span>
              )
            )}

            <input
              value={
                recipientInput
              }
              onChange={(event) =>
                setRecipientInput(
                  event.target
                    .value
                )
              }
              onKeyDown={
                handleRecipientKeyDown
              }
              onBlur={
                addRecipient
              }
              placeholder={
                recipients.length ===
                0
                  ? "recipient@example.com"
                  : ""
              }
              className="min-w-[150px] flex-1 bg-transparent py-[7px] text-[9px] outline-none placeholder:text-[#a6a6a6]"
            />

            <button
              type="button"
              onClick={() =>
                fileInputRef.current?.click()
              }
              className="mr-[2px] text-[9px] font-medium text-[#00ae42]"
            >
              ↑ Upload List
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={
                handleFileUpload
              }
              className="hidden"
            />
          </div>
        </div>

        {/* Subject */}

        <div className="flex h-[35px] items-center border-b border-[#eeeeee]">
          <label className="w-[40px] text-[9px] font-medium text-[#303030]">
            Subject
          </label>

          <input
            value={subject}
            onChange={(event) =>
              setSubject(
                event.target
                  .value
              )
            }
            placeholder="Subject"
            className="flex-1 bg-transparent text-[9px] outline-none placeholder:text-[#a6a6a6]"
          />
        </div>

        {/* Delay / Hourly Limit */}

        <div className="flex h-[40px] items-center gap-[25px]">
          <div className="flex items-center gap-[8px]">
            <label className="text-[9px] font-medium text-[#303030]">
              Delay between 2 emails
            </label>

            <input
              type="number"
              min="0"
              value={
                minimumDelay
              }
              onChange={(event) =>
                setMinimumDelay(
                  event.target
                    .value
                )
              }
              placeholder="00"
              className="h-[25px] w-[43px] rounded-[6px] border border-[#e8e8e8] bg-white px-[7px] text-[9px] outline-none focus:border-[#00ae42]"
            />
          </div>

          <div className="flex items-center gap-[8px]">
            <label className="text-[9px] font-medium text-[#303030]">
              Hourly Limit
            </label>

            <input
              type="number"
              min="1"
              value={
                hourlyLimit
              }
              onChange={(event) =>
                setHourlyLimit(
                  event.target
                    .value
                )
              }
              placeholder="00"
              className="h-[25px] w-[43px] rounded-[6px] border border-[#e8e8e8] bg-white px-[7px] text-[9px] outline-none focus:border-[#00ae42]"
            />
          </div>
        </div>

        {/* Editor */}

        <div className="overflow-hidden rounded-[5px] bg-[#fafafa]">
          <div className="flex h-[30px] items-center gap-[12px] border-b border-white bg-white px-[12px] text-[12px] text-[#929292]">
            <button type="button">
              ↶
            </button>

            <button type="button">
              ↷
            </button>

            <span className="h-[15px] w-px bg-[#e5e5e5]" />

            <button type="button">
              Tᵀ
            </button>

            <button
              type="button"
              className="font-bold"
            >
              B
            </button>

            <button
              type="button"
              className="italic"
            >
              I
            </button>

            <button
              type="button"
              className="underline"
            >
              U
            </button>

            <span className="h-[15px] w-px bg-[#e5e5e5]" />

            <button type="button">
              ≡
            </button>

            <button type="button">
              ↕
            </button>

            <button type="button">
              1.
            </button>

            <button type="button">
              ☷
            </button>

            <button type="button">
              ❯
            </button>

            <button type="button">
              ❮
            </button>

            <button type="button">
              ❝
            </button>

            <button type="button">
              ▣
            </button>

            <button type="button">
              S̶
            </button>
          </div>

          <textarea
            value={body}
            onChange={(event) =>
              setBody(
                event.target
                  .value
              )
            }
            placeholder="Type Your Reply..."
            className="h-[290px] w-full resize-none bg-[#fafafa] px-[12px] py-[10px] text-[10px] text-[#333] outline-none placeholder:text-[#a6a6a6]"
          />
        </div>

        {/* Schedule popup */}

        {showSchedule && (
          <div className="absolute right-[-5px] top-[5px] z-20 w-[198px] rounded-[5px] border border-[#e6e6e6] bg-white p-[10px] shadow-lg">
            <p className="text-[11px] font-medium text-[#303030]">
              Send Later
            </p>

            <div className="mt-[8px]">
              <label className="text-[8px] text-[#777]">
                Pick date & time
              </label>

              <input
                type="datetime-local"
                value={
                  selectedDateTime
                }
                onChange={(event) =>
                  setSelectedDateTime(
                    event.target
                      .value
                  )
                }
                className="mt-[5px] h-[27px] w-full rounded-[5px] border border-[#e5e5e5] px-[6px] text-[8px] outline-none"
              />
            </div>

            <div className="mt-[10px] space-y-[2px]">
              <button
                type="button"
                onClick={() => {
                  const tomorrow =
                    new Date();

                  tomorrow.setDate(
                    tomorrow.getDate() +
                      1
                  );

                  tomorrow.setHours(
                    9,
                    0,
                    0,
                    0
                  );

                  const local =
                    new Date(
                      tomorrow.getTime() -
                        tomorrow.getTimezoneOffset() *
                          60000
                    )
                      .toISOString()
                      .slice(
                        0,
                        16
                      );

                  setSelectedDateTime(
                    local
                  );
                }}
                className="block w-full rounded-[4px] px-[5px] py-[5px] text-left text-[8px] text-[#555] hover:bg-[#f5f5f5]"
              >
                Tomorrow
              </button>

              <button
                type="button"
                onClick={() => {
                  const tomorrow =
                    new Date();

                  tomorrow.setDate(
                    tomorrow.getDate() +
                      1
                  );

                  tomorrow.setHours(
                    10,
                    0,
                    0,
                    0
                  );

                  const local =
                    new Date(
                      tomorrow.getTime() -
                        tomorrow.getTimezoneOffset() *
                          60000
                    )
                      .toISOString()
                      .slice(
                        0,
                        16
                      );

                  setSelectedDateTime(
                    local
                  );
                }}
                className="block w-full rounded-[4px] px-[5px] py-[5px] text-left text-[8px] text-[#555] hover:bg-[#f5f5f5]"
              >
                Tomorrow, 10:00 AM
              </button>

              <button
                type="button"
                onClick={() => {
                  const tomorrow =
                    new Date();

                  tomorrow.setDate(
                    tomorrow.getDate() +
                      1
                  );

                  tomorrow.setHours(
                    11,
                    0,
                    0,
                    0
                  );

                  const local =
                    new Date(
                      tomorrow.getTime() -
                        tomorrow.getTimezoneOffset() *
                          60000
                    )
                      .toISOString()
                      .slice(
                        0,
                        16
                      );

                  setSelectedDateTime(
                    local
                  );
                }}
                className="block w-full rounded-[4px] px-[5px] py-[5px] text-left text-[8px] text-[#555] hover:bg-[#f5f5f5]"
              >
                Tomorrow, 11:00 AM
              </button>

              <button
                type="button"
                onClick={() => {
                  const tomorrow =
                    new Date();

                  tomorrow.setDate(
                    tomorrow.getDate() +
                      1
                  );

                  tomorrow.setHours(
                    15,
                    0,
                    0,
                    0
                  );

                  const local =
                    new Date(
                      tomorrow.getTime() -
                        tomorrow.getTimezoneOffset() *
                          60000
                    )
                      .toISOString()
                      .slice(
                        0,
                        16
                      );

                  setSelectedDateTime(
                    local
                  );
                }}
                className="block w-full rounded-[4px] px-[5px] py-[5px] text-left text-[8px] text-[#555] hover:bg-[#f5f5f5]"
              >
                Tomorrow, 3:00 PM
              </button>
            </div>

            <div className="mt-[10px] flex items-center justify-end gap-[8px]">
              <button
                type="button"
                onClick={() =>
                  setShowSchedule(
                    false
                  )
                }
                className="px-[8px] py-[5px] text-[8px] font-medium text-[#555]"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  handleScheduleDone
                }
                className="rounded-[11px] border border-[#00ae42] px-[10px] py-[5px] text-[8px] font-medium text-[#00ae42]"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Compose;