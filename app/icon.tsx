import { ImageResponse } from "next/og";

// Az AURUM favicon: fekete négyzet, ezüst A, arany lezáró vonal.
// A fájlnév (app/icon.tsx) a Next favicon-konvenciója, ezért Response-t kell adni.
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0A0A0B",
          position: "relative",
        }}
      >
        <div
          style={{
            color: "#E8E8EA",
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: -1,
            fontFamily: "sans-serif",
          }}
        >
          A
        </div>
        <div
          style={{
            position: "absolute",
            right: 5,
            top: 5,
            width: 2,
            height: 22,
            background: "#C9A227",
          }}
        />
      </div>
    ),
    size
  );
}
