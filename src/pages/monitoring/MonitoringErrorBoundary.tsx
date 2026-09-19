import { Link, isRouteErrorResponse, useRouteError } from "react-router-dom";
import { Button } from "@/components/ui";

export function MonitoringErrorBoundary() {
  const error = useRouteError();
  const unavailable = isRouteErrorResponse(error) ? error.status >= 500 : true;
  return <main className="grid min-h-dvh place-items-center bg-white p-6 text-forest"><div className="max-w-md"><h1 className="text-2xl font-extrabold">Unable to open monitoring</h1><p className="mt-3 text-sm leading-7 text-muted-foreground">{unavailable ? "Monitoring data or this page could not be loaded. Your session may still be active." : "This monitoring record is unavailable."}</p><div className="mt-5 flex flex-wrap gap-3"><Button onClick={() => window.location.reload()}>Retry</Button><Button asChild variant="outline"><Link to="/monitoring">Monitoring overview</Link></Button></div></div></main>;
}
