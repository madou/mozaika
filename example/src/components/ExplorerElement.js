import styles from "./Element.module.css";
import React, { useEffect, useState, useRef } from "react";

export const IMAGES_CDN = "https://images.mariamiragephotography.com";

function buildSrcSet(source, type) {
  const basename = source.split(".")[0];

  switch(type) {
    case "landscape" : {
      return `
                ${IMAGES_CDN}/${basename}_small.jpg 300w,
                ${IMAGES_CDN}/${basename}_medium.jpg 450w,
                ${IMAGES_CDN}/${basename}_large.jpg 600w
            `;

    }
    case "portrait": {
      return `
                ${IMAGES_CDN}/${basename}_small.jpg 200w,
                ${IMAGES_CDN}/${basename}_medium.jpg 300w,
                ${IMAGES_CDN}/${basename}_large.jpg 400w
            `;

    }
    case "square": {
      return `
                ${IMAGES_CDN}/${basename}_small.jpg 200w,
                ${IMAGES_CDN}/${basename}_medium.jpg 450w,
                ${IMAGES_CDN}/${basename}_large.jpg 600w
            `
    }
    default: return null;
  }
}



/**
 * Promises wrapper for loading in an image and determining the orientation of the
 * image. This will accept any 'loadable' image source and return the standardised
 * source and the sizeType of the image
 *
 * @param {string} src Image source to be loaded.
 * @param {type} type of image (horiz, port, square).
 * @returns {Promise<String>} Image source (loaded) or error message if image loading fails.
 * */
const loadImage = (src, type) => {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      resolve({src: image.src, srcset: image.srcset});
    };

    image.onerror = () => {
      reject("Failed to load image from server.")
    };

    image.oncancel = () => {
      resolve("");
    };

    image.src = `${IMAGES_CDN}/${src}`;
    image.srcset = buildSrcSet(src, type);
  });
};


const ExplorerElement = React.memo(
  function GalleryElement({ style, data, updateCallback }) {
    const [image, setImage] = useState({ src: null, srcset: null });
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
      if (loaded) updateCallback(ref);
    });

    if (image.src === null && !error) {
      loadImage(data.source, data.type).then((result) => {
        setImage(result);
      }).catch(() => {
        // If an error occurs during an attempted image load, we can simply use
        // the wire-frame to display a placeholder image.
        setError(true);
      });
    }

    return (
      <div
        className={styles.element + (loaded ? " " + styles.visible : "")}
        ref={ref}
        style={style}
      >
        <img
          src={!error ? image.src : require("../static/images/not-found.png")}
          {...(image.srcset && {srcSet: image.srcset})}
          onLoad={() => {
            setLoaded(true);
          }}
          sizes={`(max-width:${style.width}px) 100vw, ${style.width}px`}
          alt={data.keywords.join(" ")}
        />
      </div>

    );
  }
);


export default ExplorerElement;
