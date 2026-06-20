import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import ShareButtons from "./ShareButtons";

describe("ShareButtons", () => {
  const text = "テスト本文";
  const url = "https://example.com/page";

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses current page URL when url prop is omitted", () => {
    render(<ShareButtons text={text} />);
    const xLink = screen.getByTitle("Xでシェア");
    expect(xLink.getAttribute("href")).toContain(
      encodeURIComponent(window.location.href),
    );
  });

  it("does not render Web Share button when navigator.share is unavailable", () => {
    vi.stubGlobal("navigator", {});

    render(<ShareButtons text={text} url={url} />);

    expect(
      screen.queryByRole("button", { name: "その他のアプリでシェア" }),
    ).not.toBeInTheDocument();
  });

  it("renders X share link with encoded text and url", () => {
    render(<ShareButtons text={text} url={url} />);
    const xLink = screen.getByTitle("Xでシェア");
    expect(xLink).toHaveAttribute(
      "href",
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
    );
    expect(xLink).toHaveAttribute("target", "_blank");
  });

  it("renders Facebook share link with encoded text and url", () => {
    render(<ShareButtons text={text} url={url} />);
    const facebookLink = screen.getByTitle("Facebookでシェア");
    expect(facebookLink).toHaveAttribute(
      "href",
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`,
    );
  });

  it("renders LINE share link with encoded text and url", () => {
    render(<ShareButtons text={text} url={url} />);
    const lineLink = screen.getByTitle("LINEでシェア");
    expect(lineLink).toHaveAttribute(
      "href",
      `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
    );
  });

  it("renders Mastodon (donshare) share link with encoded text and url", () => {
    render(<ShareButtons text={text} url={url} />);
    const mastodonLink = screen.getByTitle("Mastodonでシェア");
    expect(mastodonLink).toBeInTheDocument();
    expect(mastodonLink).toHaveAttribute("href");
    expect(mastodonLink.getAttribute("href")).toMatch(
      /^https:\/\/donshare\.net\/share\.html\?/,
    );
    expect(mastodonLink.getAttribute("href")).toContain("text=");
    expect(mastodonLink.getAttribute("href")).toContain("url=");
    expect(mastodonLink).toHaveAttribute("target", "_blank");
    expect(mastodonLink).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("renders Misskey (misskeyshare) share link with encoded text and url", () => {
    render(<ShareButtons text={text} url={url} />);
    const misskeyLink = screen.getByTitle("Misskeyでシェア");
    expect(misskeyLink).toBeInTheDocument();
    expect(misskeyLink).toHaveAttribute("href");
    expect(misskeyLink.getAttribute("href")).toMatch(
      /^https:\/\/misskeyshare\.link\/share\.html\?/,
    );
    expect(misskeyLink.getAttribute("href")).toContain("text=");
    expect(misskeyLink.getAttribute("href")).toContain("url=");
    expect(misskeyLink).toHaveAttribute("target", "_blank");
    expect(misskeyLink).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("shows Web Share API button when navigator.share exists", () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, share });

    render(<ShareButtons text={text} url={url} />);

    expect(
      screen.getByRole("button", { name: "その他のアプリでシェア" }),
    ).toBeInTheDocument();
  });

  it("calls navigator.share from Web Share button", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, share });

    render(<ShareButtons text={text} url={url} />);
    fireEvent.click(
      screen.getByRole("button", { name: "その他のアプリでシェア" }),
    );

    expect(share).toHaveBeenCalledWith({
      title: "ダーツの旅",
      text,
      url,
    });
  });

  it("swallows user cancel from navigator.share", async () => {
    const share = vi.fn().mockRejectedValue(new Error("AbortError"));
    vi.stubGlobal("navigator", { ...navigator, share });

    render(<ShareButtons text={text} url={url} />);

    await expect(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "その他のアプリでシェア" }),
      );
      await Promise.resolve();
    }).not.toThrow();
  });
});
