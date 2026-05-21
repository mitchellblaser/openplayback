import React, { useEffect, useState, useRef } from 'react';

export default function ServerPreview({ selectedServer }) {

  const imgRef = useRef(null);

  useEffect(() => {
    if (!selectedServer?.addr) {
      if (imgRef.current) {
        imgRef.current.src = './noimg.png';
      }
      return;
    }

    let intervalId;
    let failedSince = null;

    const refresh = () => {
      const url =
        `http://${selectedServer.addr}/get-screenshot?cb=${Date.now()}`;
      const testImage = new Image();
      testImage.onload = () => {
        failedSince = null;
        if (imgRef.current) {
          imgRef.current.src = url;
        }
      };

      testImage.onerror = () => {
        if (!failedSince) {
          failedSince = Date.now();
        }
        // Show no image after 10s
        if (
          Date.now() - failedSince > 10000
        ) {
          if (imgRef.current) {
            imgRef.current.src = './noimg.png';
          }
        }
      };
      testImage.src = url;
    };

    refresh();
    intervalId = setInterval(refresh, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [selectedServer?.addr]);

  return (
    <img
      ref={imgRef}
      className='server-preview-img'
      src='./noimg.png'
      alt='Server Preview'
    />
  );
}