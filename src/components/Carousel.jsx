import { useEffect, useState } from "react";

export default function Carousel({ images = [], interval = 3000 }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % images.length);
    }, interval);
    return () => clearInterval(id);
  }, [images, interval]);

  return (
    <div style={{ textAlign: "center" }}>
      <img
        src={images[index]}
        alt=""
        style={{
          width: "300px",
          borderRadius: "8px",
          transition: "opacity 0.6s ease-in-out",
        }}
      />
    </div>
  );
}





