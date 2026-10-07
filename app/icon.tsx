import { ImageResponse } from "next/og";

// Az AURUM favicon: fekete négyzet, ezüst A, arany lezáró vonal.
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
          background: "#08080A",
          position: "relative",
        }}
      >
        <div
          style={{
            color: "#ECECED",
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
