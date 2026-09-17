import { redirect } from "next/navigation";

/** Legacy path — Lead pipeline is a top-level app route. */
export default function LegacyLeadPipelineRedirect() {
  redirect("/lead-pipeline");
}
