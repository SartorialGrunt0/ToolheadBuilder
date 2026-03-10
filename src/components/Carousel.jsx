import { useEffect, useState } from "react";

export default function Carousel({ images = [], interval = 3000 }) {
  const [current, setCurrent] = useState(0);
  const [prev, setPrev] = useState(null);
  const [showCurrent, setShowCurrent] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      // Step 1: fade out current image
      setPrev(current);
      setShowCurrent(false);

      // Step 2: after fade-out, switch image but keep it hidden
      setTimeout(() => {
        const next = (current + 1) % images.length;
        setCurrent(next);
      }, 600); // fade-out duration

      // Step 3: after a brief gap, fade new image in
      setTimeout(() => {
        setPrev(null);
        setShowCurrent(true);
      }, 900); // fade-out + gap
    }, interval);

    return () => clearInterval(id);
  }, [images, interval, current]);

  return (
    <div
      style={{
        position: "relative",
        width: "500px",
        height: "500px",
        margin: "0 auto",
        overflow: "hidden",
        borderRadius: "8px",
      }}
    >
      {/* Current image (fades in) */}
      <img
        key={current}
        src={images[current]}
        alt=""
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "contain",
          opacity: showCurrent ? 1 : 0,
          transition: "opacity 0.6s ease-in-out",
        }}
      />

      {/* Previous image fading out */}
      {prev !== null && (
        <img
          key={prev}
          src={images[prev]}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "contain",
            opacity: 0,
            transition: "opacity 0.6s ease-in-out",
          }}
        />
      )}
    </div>
  );
}







