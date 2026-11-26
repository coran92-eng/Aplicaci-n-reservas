import { Shell } from "@/components/site/Shell";

export default function Loading() {
  return (
    <Shell>
      <div className="cdm-col" aria-busy="true">
        <div className="cdm-skel" style={{ height: 22, width: "60%", margin: "0 auto" }} />
        <div className="cdm-sign">
          <div className="cdm-skel" style={{ width: "45%" }} />
          <div className="cdm-skel" style={{ height: 46, marginTop: 18 }} />
          <div className="cdm-skel" style={{ height: 220, marginTop: 14 }} />
          <div className="cdm-skel" style={{ height: 48, marginTop: 14 }} />
        </div>
      </div>
    </Shell>
  );
}
