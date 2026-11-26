import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const sendMail = vi.fn();
vi.mock("nodemailer", () => ({ default: { createTransport: () => ({ sendMail }) } }));

const { sendEmail, sendPasswordResetEmail } = await import("@/lib/email");

const message = { to: "a@example.test", subject: "s", text: "t", html: "<p>h</p>" };
const ENV_KEYS = ["RESEND_API_KEY", "EMAIL_FROM", "SMTP_FROM", "SMTP_HOST"] as const;

describe("email", () => {
  const saved: Record<string, string | undefined> = {};
  beforeEach(() => {
    for (const k of ENV_KEYS) { saved[k] = process.env[k]; delete process.env[k]; }
    sendMail.mockReset();
  });
  afterEach(() => {
    for (const k of ENV_KEYS) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; }
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sends through the Resend API when RESEND_API_KEY is set", async () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.EMAIL_FROM = "Yivol <no-reply@yivol.test>";
    process.env.SMTP_HOST = "smtp.example.test";
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(sendEmail(message)).resolves.toBe(true);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.headers.Authorization).toBe("Bearer re_test");
    expect(JSON.parse(init.body)).toEqual({ from: "Yivol <no-reply@yivol.test>", to: ["a@example.test"], subject: "s", text: "t", html: "<p>h</p>" });
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("throws with the API status when Resend rejects the request", async () => {
    process.env.RESEND_API_KEY = "re_test";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("domain not verified", { status: 403 })));
    await expect(sendEmail(message)).rejects.toThrow(/403.*domain not verified/);
  });

  it("falls back to SMTP when only SMTP_HOST is set", async () => {
    process.env.SMTP_HOST = "smtp.example.test";
    process.env.SMTP_FROM = "Old <old@example.test>";
    await expect(sendEmail(message)).resolves.toBe(true);
    expect(sendMail).toHaveBeenCalledWith({ from: "Old <old@example.test>", ...message });
  });

  it("logs the reset link when no provider is configured", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await sendPasswordResetEmail("a@example.test", "https://x.test/reset-password?token=abc");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(log.mock.calls[0]?.[0]).toContain("https://x.test/reset-password?token=abc");
  });
});
