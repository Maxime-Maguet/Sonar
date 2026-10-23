import { SiteErrorScreen } from "@/components/site-error-screen";
import { siteErrorPage } from "@/lib/site-error/page-copy";

export default function NotFound() {
  return <SiteErrorScreen copy={siteErrorPage("unknown-address")} />;
}
