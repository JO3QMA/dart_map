import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import ShareButtons from "./ShareButtons";

describe("ShareButtons", () => {
  const text = "テスト本文";
  const url = "https://example.com/page";

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
});
